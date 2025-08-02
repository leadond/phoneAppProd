import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

// Enhanced interfaces for the new authentication system
export interface User {
  id: string;
  username: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  title?: string;
  auth_type: 'local' | 'ldap';
  ldap_dn?: string;
  ldap_guid?: string;
  password_hash?: string;
  salt?: string;
  is_active: boolean;
  is_verified: boolean;
  failed_login_attempts: number;
  locked_until?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  last_login?: string;
  last_password_change?: string;
  created_at: string;
  updated_at: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  group_type: 'ldap' | 'local' | 'system';
  ldap_dn?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: string;
  resource?: string;
  action?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthSession {
  id: string;
  session_id: string;
  user_id: string;
  token_hash?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  login_method: 'local' | 'ldap' | 'sso';
  is_active: boolean;
  created_at: string;
  expires_at: string;
  last_activity: string;
  is_suspicious: boolean;
  login_location?: string;
}

export interface AuthEvent {
  id: string;
  user_id?: string;
  username: string;
  event_type: string;
  auth_method: 'local' | 'ldap' | 'sso';
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  location?: string;
  success: boolean;
  failure_reason?: string;
  details?: string;
  is_suspicious: boolean;
  risk_score: number;
  session_id?: string;
  related_user_id?: string;
  created_at: string;
}

// Enhanced database client with authentication support
export class AuthDatabase {
  private db: Database.Database;
  private static instance: AuthDatabase;

  constructor() {
    // Create database file in the root directory
    this.db = new Database('phone-range-nexus.db');
    this.initializeDatabase();
  }

  // Singleton pattern to ensure only one database connection
  public static getInstance(): AuthDatabase {
    if (!AuthDatabase.instance) {
      AuthDatabase.instance = new AuthDatabase();
    }
    return AuthDatabase.instance;
  }

  private initializeDatabase(): void {
    try {
      // Read and execute the original schema SQL file
      const originalSchemaPath = join(process.cwd(), 'src', 'lib', 'local-database-schema.sql');
      const originalSchema = readFileSync(originalSchemaPath, 'utf8');
      
      // Read and execute the enhanced auth schema SQL file
      const authSchemaPath = join(process.cwd(), 'src', 'lib', 'auth-database-schema.sql');
      const authSchema = readFileSync(authSchemaPath, 'utf8');
      
      // Execute both schema creation scripts
      this.db.exec(originalSchema);
      this.db.exec(authSchema);
      console.log('Enhanced authentication database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize enhanced database:', error);
      throw error;
    }
  }

  // Generic query methods
  public prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  public exec(sql: string): Database.Database {
    return this.db.exec(sql);
  }

  public close(): void {
    this.db.close();
  }

  // ================== USER MANAGEMENT ==================

  // Get user by username (checks both new users table and legacy user_sessions)
  public getUser(identifier: string, by: 'username' | 'email' | 'id' = 'username'): User | null {
    let stmt: Database.Statement;
    
    switch (by) {
      case 'email':
        stmt = this.db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
        break;
      case 'id':
        stmt = this.db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
        break;
      default:
        stmt = this.db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
    }
    
    const user = stmt.get(identifier) as User | undefined;
    
    if (!user && by === 'username') {
      // Fallback to legacy user_sessions table for backward compatibility
      const legacyStmt = this.db.prepare('SELECT * FROM user_sessions WHERE username = ?');
      const legacyUser = legacyStmt.get(identifier) as any;
      
      if (legacyUser) {
        // Convert legacy user to new format
        return {
          id: legacyUser.id,
          username: legacyUser.username,
          auth_type: 'local' as const,
          password_hash: legacyUser.password_hash,
          is_active: true,
          is_verified: true,
          failed_login_attempts: 0,
          created_at: legacyUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User;
      }
    }
    
    return user || null;
  }

  // Create or update user (for LDAP sync and local user management)
  public createOrUpdateUser(userData: Partial<User>): User {
    const now = new Date().toISOString();
    
    if (userData.id) {
      // Update existing user
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.keys(userData).forEach(key => {
        if (userData[key as keyof User] !== undefined && key !== 'id') {
          updateFields.push(`${key} = ?`);
          values.push(userData[key as keyof User]);
        }
      });
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?');
        values.push(now, userData.id);
        
        const stmt = this.db.prepare(`
          UPDATE users 
          SET ${updateFields.join(', ')} 
          WHERE id = ?
        `);
        
        stmt.run(...values);
      }
      
      return this.getUser(userData.id, 'id')!;
    } else {
      // Create new user
      const id = uuidv4();
      const stmt = this.db.prepare(`
        INSERT INTO users (
          id, username, email, display_name, first_name, last_name, department, title,
          auth_type, ldap_dn, ldap_guid, password_hash, salt, is_active, is_verified,
          failed_login_attempts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        userData.username,
        userData.email || null,
        userData.display_name || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.department || null,
        userData.title || null,
        userData.auth_type || 'local',
        userData.ldap_dn || null,
        userData.ldap_guid || null,
        userData.password_hash || null,
        userData.salt || null,
        userData.is_active !== undefined ? userData.is_active : true,
        userData.is_verified !== undefined ? userData.is_verified : false,
        userData.failed_login_attempts || 0,
        now,
        now
      );
      
      return this.getUser(id, 'id')!;
    }
  }

  // ================== GROUP MANAGEMENT ==================

  // Get user groups
  public getUserGroups(userId: string): UserGroup[] {
    const stmt = this.db.prepare(`
      SELECT g.* FROM user_groups g
      JOIN user_group_memberships ugm ON g.id = ugm.group_id
      WHERE ugm.user_id = ? AND ugm.is_active = 1 AND g.is_active = 1
    `);
    return stmt.all(userId) as UserGroup[];
  }

  // Add user to group
  public addUserToGroup(userId: string, groupId: string, assignedBy: string = 'system'): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_group_memberships (user_id, group_id, assigned_by, assigned_at, is_active)
      VALUES (?, ?, ?, datetime('now'), 1)
    `);
    stmt.run(userId, groupId, assignedBy);
  }

  // Get group by name
  public getGroupByName(name: string): UserGroup | null {
    const stmt = this.db.prepare('SELECT * FROM user_groups WHERE name = ? AND is_active = 1');
    return stmt.get(name) as UserGroup | null;
  }

  // ================== PERMISSIONS ==================

  // Get user permissions (both direct and through groups)
  public getUserPermissions(userId: string): Permission[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT p.* FROM permissions p
      LEFT JOIN user_permissions up ON p.id = up.permission_id 
        AND up.user_id = ? AND up.is_active = 1 AND up.is_denied = 0
      LEFT JOIN group_permissions gp ON p.id = gp.permission_id AND gp.is_active = 1
      LEFT JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id 
        AND ugm.user_id = ? AND ugm.is_active = 1
      WHERE (up.id IS NOT NULL OR (gp.id IS NOT NULL AND ugm.id IS NOT NULL)) 
        AND p.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM user_permissions up2 
          WHERE up2.user_id = ? AND up2.permission_id = p.id 
            AND up2.is_active = 1 AND up2.is_denied = 1
        )
    `);
    return stmt.all(userId, userId, userId) as Permission[];
  }

  // Check if user has specific permission
  public userHasPermission(userId: string, permissionName: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM permissions p
      LEFT JOIN user_permissions up ON p.id = up.permission_id 
        AND up.user_id = ? AND up.is_active = 1 AND up.is_denied = 0
      LEFT JOIN group_permissions gp ON p.id = gp.permission_id AND gp.is_active = 1
      LEFT JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id 
        AND ugm.user_id = ? AND ugm.is_active = 1
      WHERE p.name = ? AND p.is_active = 1
        AND (up.id IS NOT NULL OR (gp.id IS NOT NULL AND ugm.id IS NOT NULL))
        AND NOT EXISTS (
          SELECT 1 FROM user_permissions up2 
          WHERE up2.user_id = ? AND up2.permission_id = p.id 
            AND up2.is_active = 1 AND up2.is_denied = 1
        )
    `);
    return !!stmt.get(userId, userId, permissionName, userId);
  }

  // ================== SESSION MANAGEMENT ==================

  // Create auth session
  public createAuthSession(sessionData: Partial<AuthSession>): AuthSession {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO auth_sessions (
        id, session_id, user_id, token_hash, ip_address, user_agent, device_info,
        login_method, is_active, created_at, expires_at, last_activity, is_suspicious, login_location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      sessionData.session_id,
      sessionData.user_id,
      sessionData.token_hash || null,
      sessionData.ip_address || null,
      sessionData.user_agent || null,
      sessionData.device_info || null,
      sessionData.login_method || 'local',
      sessionData.is_active !== undefined ? sessionData.is_active : true,
      now,
      sessionData.expires_at,
      now,
      sessionData.is_suspicious !== undefined ? sessionData.is_suspicious : false,
      sessionData.login_location || null
    );
    
    return this.getAuthSession(sessionData.session_id!)!;
  }

  // Get auth session
  public getAuthSession(sessionId: string): AuthSession | null {
    const stmt = this.db.prepare(`
      SELECT * FROM auth_sessions 
      WHERE session_id = ? AND is_active = 1 AND expires_at > datetime('now')
    `);
    return stmt.get(sessionId) as AuthSession | null;
  }

  // Update session activity
  public updateSessionActivity(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE auth_sessions 
      SET last_activity = datetime('now') 
      WHERE session_id = ? AND is_active = 1
    `);
    stmt.run(sessionId);
  }

  // Deactivate session
  public deactivateSession(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE auth_sessions 
      SET is_active = 0 
      WHERE session_id = ?
    `);
    stmt.run(sessionId);
  }

  // Clean up expired sessions
  public cleanupExpiredSessions(): void {
    const stmt = this.db.prepare(`
      UPDATE auth_sessions 
      SET is_active = 0 
      WHERE expires_at <= datetime('now') AND is_active = 1
    `);
    stmt.run();
  }

  // ================== AUTHENTICATION EVENTS ==================

  // Log authentication event
  public logAuthEvent(eventData: Partial<AuthEvent>): void {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO auth_events (
        id, user_id, username, event_type, auth_method, ip_address, user_agent,
        device_info, location, success, failure_reason, details, is_suspicious,
        risk_score, session_id, related_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      eventData.user_id || null,
      eventData.username,
      eventData.event_type,
      eventData.auth_method || 'local',
      eventData.ip_address || null,
      eventData.user_agent || null,
      eventData.device_info || null,
      eventData.location || null,
      eventData.success !== undefined ? eventData.success : true,
      eventData.failure_reason || null,
      eventData.details || null,
      eventData.is_suspicious !== undefined ? eventData.is_suspicious : false,
      eventData.risk_score || 0,
      eventData.session_id || null,
      eventData.related_user_id || null,
      now
    );
  }

  // Get recent auth events
  public getAuthEvents(limit: number = 100, userId?: string): AuthEvent[] {
    let stmt: Database.Statement;
    
    if (userId) {
      stmt = this.db.prepare(`
        SELECT * FROM auth_events 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      return stmt.all(userId, limit) as AuthEvent[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM auth_events 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      return stmt.all(limit) as AuthEvent[];
    }
  }

  // ================== PASSWORD MANAGEMENT ==================

  // Update user password (with history tracking)
  public updatePassword(userId: string, newPasswordHash: string, salt?: string): void {
    const user = this.getUser(userId, 'id');
    if (!user) throw new Error('User not found');
    
    // Save old password to history if it exists
    if (user.password_hash) {
      const historyStmt = this.db.prepare(`
        INSERT INTO password_history (user_id, password_hash, salt, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      historyStmt.run(userId, user.password_hash, user.salt || null);
    }
    
    // Update user with new password
    const updateStmt = this.db.prepare(`
      UPDATE users 
      SET password_hash = ?, salt = ?, last_password_change = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `);
    updateStmt.run(newPasswordHash, salt || null, userId);
  }

  // Increment failed login attempts
  public incrementFailedLoginAttempts(username: string): void {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts >= 4 THEN datetime('now', '+30 minutes')
            ELSE locked_until
          END,
          updated_at = datetime('now')
      WHERE username = ?
    `);
    stmt.run(username);
  }

  // Reset failed login attempts
  public resetFailedLoginAttempts(username: string): void {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL, last_login = datetime('now'), updated_at = datetime('now')
      WHERE username = ?
    `);
    stmt.run(username);
  }

  // ================== LEGACY COMPATIBILITY ==================

  // These methods maintain compatibility with the existing localDatabase interface
  public getUserByUsername(username: string): any | null {
    return this.getUser(username, 'username');
  }

  public createOrUpdateSession(username: string, sessionToken: string, expiresAt: string): void {
    const user = this.getUser(username, 'username');
    if (!user) return;

    // Create session in new auth_sessions table
    this.createAuthSession({
      session_id: sessionToken,
      user_id: user.id,
      expires_at: expiresAt,
      login_method: user.auth_type
    });

    // Also update legacy user_sessions table for backward compatibility
    const legacyStmt = this.db.prepare(`
      UPDATE user_sessions 
      SET session_token = ?, session_expires = ?, last_login = datetime('now')
      WHERE username = ?
    `);
    legacyStmt.run(sessionToken, expiresAt, username);
  }

  public getSessionByToken(token: string): any | null {
    const session = this.getAuthSession(token);
    if (!session) {
      // Fallback to legacy table
      const legacyStmt = this.db.prepare(`
        SELECT * FROM user_sessions 
        WHERE session_token = ? AND session_expires > datetime('now')
      `);
      return legacyStmt.get(token) || null;
    }
    
    // Convert to legacy format
    const user = this.getUser(session.user_id, 'id');
    return {
      id: user?.id,
      username: user?.username,
      session_expires: session.expires_at,
      last_login: user?.last_login
    };
  }

  public clearSession(username: string): void {
    const user = this.getUser(username, 'username');
    if (user) {
      // Deactivate all active sessions for the user
      const stmt = this.db.prepare(`
        UPDATE auth_sessions 
        SET is_active = 0 
        WHERE user_id = ? AND is_active = 1
      `);
      stmt.run(user.id);
    }

    // Also clear legacy session
    const legacyStmt = this.db.prepare(`
      UPDATE user_sessions 
      SET session_token = NULL, session_expires = NULL
      WHERE username = ?
    `);
    legacyStmt.run(username);
  }

  // ================== EXISTING METHODS (unchanged) ==================
  // Include all the existing phone numbers, ranges, bulk operations, and audit methods...
  // [The existing methods from localDatabase.ts would go here - abbreviated for space]
  
  public insertAuditEntry(entry: any): void {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, action, user, timestamp, type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.action,
      entry.user,
      entry.timestamp || now,
      entry.type,
      entry.details ? JSON.stringify(entry.details) : null,
      now
    );
  }
}

// Export singleton instance
export const authDatabase = AuthDatabase.getInstance();