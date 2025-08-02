import ldap from 'ldapjs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

// LDAP Configuration Interface
export interface LDAPConfig {
  url: string;
  baseDN: string;
  userSearchBase: string;
  userSearchFilter: string;
  bindDN?: string;
  bindPassword?: string;
  tlsOptions?: {
    rejectUnauthorized: boolean;
    ca?: string[];
  };
  timeout?: number;
  connectTimeout?: number;
  idleTimeout?: number;
}

// User interfaces
export interface LDAPUser {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  title?: string;
  groups?: string[];
  distinguishedName?: string;
  lastLogin?: Date;
  isActive?: boolean;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  username: string;
  email?: string;
  displayName?: string;
  groups?: string[];
  permissions?: string[];
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface JWTPayload {
  sub: string; // user ID
  username: string;
  email?: string;
  displayName?: string;
  groups?: string[];
  permissions?: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Session storage interface for fallback
interface SessionStore {
  get(sessionId: string): Promise<AuthSession | null>;
  set(sessionId: string, session: AuthSession, ttl?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}

// In-memory session store fallback
class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, AuthSession>();
  private timers = new Map<string, NodeJS.Timeout>();

  async get(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.delete(sessionId);
      return null;
    }
    
    return session;
  }

  async set(sessionId: string, session: AuthSession, ttl?: number): Promise<void> {
    this.sessions.set(sessionId, session);
    
    // Set cleanup timer
    const timeout = ttl || (session.expiresAt.getTime() - Date.now());
    if (timeout > 0) {
      const timer = setTimeout(() => {
        this.delete(sessionId);
      }, timeout);
      
      // Clear existing timer
      const existingTimer = this.timers.get(sessionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      this.timers.set(sessionId, timer);
    }
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      await this.delete(sessionId);
    }
  }
}

// Redis session store
class RedisSessionStore implements SessionStore {
  private redis: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  async get(sessionId: string): Promise<AuthSession | null> {
    try {
      const data = await this.redis.get(`session:${sessionId}`);
      if (!data) return null;
      
      const session = JSON.parse(data as string);
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.expiresAt = new Date(session.expiresAt);
      session.lastActivity = new Date(session.lastActivity);
      
      return session;
    } catch (error) {
      console.error('Redis session get error:', error);
      return null;
    }
  }

  async set(sessionId: string, session: AuthSession, ttl?: number): Promise<void> {
    try {
      const ttlSeconds = ttl ? Math.floor(ttl / 1000) : Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
      await this.redis.setEx(`session:${sessionId}`, Math.max(ttlSeconds, 1), JSON.stringify(session));
    } catch (error) {
      console.error('Redis session set error:', error);
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.redis.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Redis session delete error:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, no manual cleanup needed
  }
}

export class LDAPAuthService {
  private config: LDAPConfig;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private sessionStore: SessionStore;
  private redis?: RedisClientType;

  constructor(
    config: LDAPConfig,
    jwtSecret: string = process.env.JWT_SECRET || 'default-secret-change-me',
    jwtExpiresIn: string = '24h',
    redisUrl?: string
  ) {
    this.config = config;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.initializeSessionStore(redisUrl);
  }

  private async initializeSessionStore(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = createClient({ url: redisUrl });
        await this.redis.connect();
        this.sessionStore = new RedisSessionStore(this.redis);
        console.log('LDAP Auth: Connected to Redis for session storage');
      } catch (error) {
        console.warn('LDAP Auth: Failed to connect to Redis, falling back to memory store:', error);
        this.sessionStore = new MemorySessionStore();
      }
    } else {
      console.log('LDAP Auth: Using memory session store');
      this.sessionStore = new MemorySessionStore();
    }
  }

  // LDAP client creation with proper error handling
  private createLDAPClient(): ldap.Client {
    const client = ldap.createClient({
      url: this.config.url,
      timeout: this.config.timeout || 5000,
      connectTimeout: this.config.connectTimeout || 10000,
      idleTimeout: this.config.idleTimeout || 10000,
      tlsOptions: this.config.tlsOptions
    });

    client.on('error', (err) => {
      console.error('LDAP Client Error:', err);
    });

    return client;
  }

  // Authenticate user against LDAP/Active Directory
  public async authenticateUser(username: string, password: string): Promise<LDAPUser | null> {
    const client = this.createLDAPClient();

    try {
      // First, bind with service account if configured
      if (this.config.bindDN && this.config.bindPassword) {
        await new Promise<void>((resolve, reject) => {
          client.bind(this.config.bindDN!, this.config.bindPassword!, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Search for user
      const userFilter = this.config.userSearchFilter.replace('{username}', username);
      const searchOptions = {
        filter: userFilter,
        scope: 'sub' as const,
        attributes: [
          'sAMAccountName', 'userPrincipalName', 'mail', 'displayName',
          'givenName', 'sn', 'department', 'title', 'memberOf',
          'distinguishedName', 'objectGUID', 'whenCreated', 'userAccountControl'
        ]
      };

      const searchResults = await new Promise<ldap.SearchEntry[]>((resolve, reject) => {
        const entries: ldap.SearchEntry[] = [];
        
        const searchRequest = client.search(this.config.userSearchBase, searchOptions, (err, searchRes) => {
          if (err) {
            reject(err);
            return;
          }

          searchRes.on('searchEntry', (entry) => {
            entries.push(entry);
          });

          searchRes.on('error', (err) => {
            reject(err);
          });

          searchRes.on('end', (result) => {
            if (result?.status === 0) {
              resolve(entries);
            } else {
              reject(new Error(`Search failed with status: ${result?.status}`));
            }
          });
        });
      });

      if (searchResults.length === 0) {
        console.log(`LDAP: User not found: ${username}`);
        return null;
      }

      if (searchResults.length > 1) {
        console.warn(`LDAP: Multiple users found for: ${username}`);
        return null;
      }

      const userEntry = searchResults[0];
      const userDN = userEntry.objectName;

      // Authenticate user with their password
      await new Promise<void>((resolve, reject) => {
        client.bind(userDN, password, (err) => {
          if (err) {
            console.log(`LDAP: Authentication failed for ${username}:`, err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Extract user information
      const user = this.extractUserInfo(userEntry);
      console.log(`LDAP: Successfully authenticated user: ${username}`);
      
      return user;

    } catch (error) {
      console.error('LDAP Authentication Error:', error);
      return null;
    } finally {
      client.unbind();
    }
  }

  // Extract user information from LDAP entry
  private extractUserInfo(entry: ldap.SearchEntry): LDAPUser {
    const attributes = entry.pojo;
    
    // Extract groups from memberOf attribute
    const memberOf = attributes.memberOf || [];
    const groups = Array.isArray(memberOf) ? memberOf : [memberOf];
    const groupNames = groups
      .map((dn: string) => {
        const match = dn.match(/CN=([^,]+),/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    // Check if account is active (userAccountControl)
    const userAccountControl = parseInt(attributes.userAccountControl as string) || 0;
    const isActive = !(userAccountControl & 0x0002); // 0x0002 = ACCOUNTDISABLE

    return {
      id: attributes.objectGUID as string || uuidv4(),
      username: (attributes.sAMAccountName as string) || (attributes.userPrincipalName as string),
      email: attributes.mail as string,
      displayName: attributes.displayName as string,
      firstName: attributes.givenName as string,
      lastName: attributes.sn as string,
      department: attributes.department as string,
      title: attributes.title as string,
      groups: groupNames,
      distinguishedName: entry.objectName,
      lastLogin: new Date(),
      isActive
    };
  }

  // Generate JWT token
  public generateToken(user: LDAPUser, sessionId: string, permissions?: string[]): string {
    const payload: JWTPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      groups: user.groups,
      permissions: permissions || [],
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiresIn(this.jwtExpiresIn),
      iss: 'phone-range-nexus-ldap',
      aud: 'phone-range-nexus'
    };

    return jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256'
    });
  }

  // Verify JWT token
  public verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'phone-range-nexus-ldap',
        audience: 'phone-range-nexus'
      }) as JWTPayload;

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  // Create session
  public async createSession(
    user: LDAPUser,
    permissions?: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ session: AuthSession; token: string }> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.parseExpiresIn(this.jwtExpiresIn) * 1000);

    const session: AuthSession = {
      sessionId,
      userId: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      groups: user.groups,
      permissions: permissions || [],
      createdAt: now,
      expiresAt,
      lastActivity: now,
      ipAddress,
      userAgent
    };

    // Store session
    await this.sessionStore.set(sessionId, session);

    // Generate JWT token
    const token = this.generateToken(user, sessionId, permissions);

    return { session, token };
  }

  // Get session
  public async getSession(sessionId: string): Promise<AuthSession | null> {
    return await this.sessionStore.get(sessionId);
  }

  // Update session activity
  public async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
      const session = await this.sessionStore.get(sessionId);
      if (!session) return false;

      session.lastActivity = new Date();
      await this.sessionStore.set(sessionId, session);
      return true;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return false;
    }
  }

  // Destroy session
  public async destroySession(sessionId: string): Promise<void> {
    await this.sessionStore.delete(sessionId);
  }

  // Cleanup expired sessions
  public async cleanupSessions(): Promise<void> {
    await this.sessionStore.cleanup();
  }

  // Parse expires in string to seconds
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  // Get user permissions based on groups
  public getUserPermissions(groups: string[]): string[] {
    const permissions: string[] = [];
    
    // Basic permission mapping - customize based on your needs
    const permissionMap: Record<string, string[]> = {
      'Domain Admins': ['admin', 'read', 'write', 'delete', 'manage-users'],
      'IT Admins': ['admin', 'read', 'write', 'delete'],
      'Phone Managers': ['read', 'write', 'manage-phones'],
      'Phone Users': ['read', 'use-phones'],
      'Employees': ['read']
    };

    for (const group of groups) {
      const groupPermissions = permissionMap[group];
      if (groupPermissions) {
        permissions.push(...groupPermissions);
      }
    }

    // Remove duplicates
    return [...new Set(permissions)];
  }

  // Close resources
  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Default LDAP configuration
export const defaultLDAPConfig: LDAPConfig = {
  url: process.env.LDAP_URL || 'ldaps://localhost:636',
  baseDN: process.env.LDAP_BASE_DN || 'dc=example,dc=com',
  userSearchBase: process.env.LDAP_USER_SEARCH_BASE || 'ou=users,dc=example,dc=com',
  userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || '(sAMAccountName={username})',
  bindDN: process.env.LDAP_BIND_DN,
  bindPassword: process.env.LDAP_BIND_PASSWORD,
  tlsOptions: {
    rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
  }
};

// Export singleton instance
export const ldapAuth = new LDAPAuthService(
  defaultLDAPConfig,
  process.env.JWT_SECRET,
  process.env.JWT_EXPIRES_IN || '24h',
  process.env.REDIS_URL
);