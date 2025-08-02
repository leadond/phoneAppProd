import { authDatabase, User as DBUser } from './authDatabase';
import { ldapAuth, LDAPUser } from './ldapAuth';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  title?: string;
  authType: 'local' | 'ldap';
  groups?: string[];
  permissions?: string[];
  sessionToken?: string;
  sessionExpires?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  sessionId: string;
  expiresAt: Date;
  permissions: string[];
  groups: string[];
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: AuthSession;
  error?: string;
  reason?: string;
}

// Authentication configuration
export interface AuthConfig {
  enableLDAP: boolean;
  ldapPrimary: boolean; // If true, try LDAP first, then fallback to local
  jwtSecret: string;
  sessionDuration: string;
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
}

class EnhancedAuthService {
  private currentSession: AuthSession | null = null;
  private static instance: EnhancedAuthService;
  private config: AuthConfig;

  constructor() {
    this.config = {
      enableLDAP: process.env.ENABLE_LDAP === 'true',
      ldapPrimary: process.env.LDAP_PRIMARY === 'true',
      jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
      sessionDuration: process.env.SESSION_DURATION || '24h',
      maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5'),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '30')
    };
  }

  public static getInstance(): EnhancedAuthService {
    if (!EnhancedAuthService.instance) {
      EnhancedAuthService.instance = new EnhancedAuthService();
    }
    return EnhancedAuthService.instance;
  }

  // Convert database user to interface user
  private convertDBUserToUser(dbUser: DBUser, permissions: string[] = [], groups: string[] = []): User {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      displayName: dbUser.display_name,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      department: dbUser.department,
      title: dbUser.title,
      authType: dbUser.auth_type,
      groups,
      permissions,
      lastLogin: dbUser.last_login,
      isActive: dbUser.is_active
    };
  }

  // Convert LDAP user to database user format
  private convertLDAPUserToDBUser(ldapUser: LDAPUser): Partial<DBUser> {
    return {
      username: ldapUser.username,
      email: ldapUser.email,
      display_name: ldapUser.displayName,
      first_name: ldapUser.firstName,
      last_name: ldapUser.lastName,
      department: ldapUser.department,
      title: ldapUser.title,
      auth_type: 'ldap',
      ldap_dn: ldapUser.distinguishedName,
      ldap_guid: ldapUser.id,
      is_active: ldapUser.isActive !== false,
      is_verified: true,
      last_login: new Date().toISOString()
    };
  }

  // Check if user account is locked
  private isAccountLocked(user: DBUser): boolean {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  }

  // Hash password for local users
  private async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  // Verify password for local users
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Authenticate with LDAP
  private async authenticateLDAP(username: string, password: string): Promise<AuthResult> {
    try {
      console.log(`Attempting LDAP authentication for: ${username}`);
      
      const ldapUser = await ldapAuth.authenticateUser(username, password);
      if (!ldapUser) {
        return { success: false, error: 'LDAP authentication failed', reason: 'ldap_auth_failed' };
      }

      // Create or update user in local database
      const dbUser = authDatabase.createOrUpdateUser(this.convertLDAPUserToDBUser(ldapUser));
      
      // Sync user groups from LDAP
      if (ldapUser.groups) {
        this.syncLDAPGroups(dbUser.id, ldapUser.groups);
      }

      // Get user permissions
      const permissions = authDatabase.getUserPermissions(dbUser.id);
      const permissionNames = permissions.map(p => p.name);
      
      // Get user groups
      const groups = authDatabase.getUserGroups(dbUser.id);
      const groupNames = groups.map(g => g.name);

      // Create session
      const { session, token } = await ldapAuth.createSession(
        ldapUser,
        permissionNames,
        undefined, // IP will be set by middleware
        undefined  // User agent will be set by middleware
      );

      // Store session in local database
      authDatabase.createAuthSession({
        session_id: session.sessionId,
        user_id: dbUser.id,
        token_hash: this.hashToken(token),
        login_method: 'ldap',
        expires_at: session.expiresAt.toISOString()
      });

      // Log successful authentication
      authDatabase.logAuthEvent({
        user_id: dbUser.id,
        username: dbUser.username,
        event_type: 'login_success',
        auth_method: 'ldap',
        success: true,
        details: JSON.stringify({ groups: groupNames.length, permissions: permissionNames.length })
      });

      const user = this.convertDBUserToUser(dbUser, permissionNames, groupNames);
      user.sessionToken = token;
      user.sessionExpires = session.expiresAt.toISOString();

      const authSession: AuthSession = {
        user,
        token,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        permissions: permissionNames,
        groups: groupNames
      };

      this.currentSession = authSession;

      return { success: true, user, session: authSession };
    } catch (error) {
      console.error('LDAP authentication error:', error);
      return { success: false, error: 'LDAP authentication failed', reason: 'ldap_error' };
    }
  }

  // Authenticate with local credentials
  private async authenticateLocal(username: string, password: string): Promise<AuthResult> {
    try {
      console.log(`Attempting local authentication for: ${username}`);
      
      const user = authDatabase.getUser(username, 'username');
      if (!user) {
        return { success: false, error: 'User not found', reason: 'user_not_found' };
      }

      if (!user.is_active) {
        return { success: false, error: 'Account is disabled', reason: 'account_disabled' };
      }

      if (this.isAccountLocked(user)) {
        return { success: false, error: 'Account is locked', reason: 'account_locked' };
      }

      if (!user.password_hash) {
        return { success: false, error: 'No local password set', reason: 'no_password' };
      }

      // Verify password
      const isValid = await this.verifyPassword(password, user.password_hash);
      if (!isValid) {
        // Increment failed attempts
        authDatabase.incrementFailedLoginAttempts(username);
        
        authDatabase.logAuthEvent({
          user_id: user.id,
          username: username,
          event_type: 'login_failed',
          auth_method: 'local',
          success: false,
          failure_reason: 'invalid_password'
        });

        return { success: false, error: 'Invalid password', reason: 'invalid_password' };
      }

      // Reset failed attempts on successful login
      authDatabase.resetFailedLoginAttempts(username);

      // Get user permissions and groups
      const permissions = authDatabase.getUserPermissions(user.id);
      const permissionNames = permissions.map(p => p.name);
      
      const groups = authDatabase.getUserGroups(user.id);
      const groupNames = groups.map(g => g.name);

      // Create JWT session
      const sessionId = uuidv4();
      const token = ldapAuth.generateToken(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          groups: groupNames
        },
        sessionId,
        permissionNames
      );

      const expiresAt = new Date(Date.now() + this.parseExpiresIn(this.config.sessionDuration) * 1000);

      // Store session in database
      authDatabase.createAuthSession({
        session_id: sessionId,
        user_id: user.id,
        token_hash: this.hashToken(token),
        login_method: 'local',
        expires_at: expiresAt.toISOString()
      });

      // Log successful authentication
      authDatabase.logAuthEvent({
        user_id: user.id,
        username: user.username,
        event_type: 'login_success',
        auth_method: 'local',
        success: true,
        details: JSON.stringify({ groups: groupNames.length, permissions: permissionNames.length })
      });

      const authUser = this.convertDBUserToUser(user, permissionNames, groupNames);
      authUser.sessionToken = token;
      authUser.sessionExpires = expiresAt.toISOString();

      const session: AuthSession = {
        user: authUser,
        token,
        sessionId,
        expiresAt,
        permissions: permissionNames,
        groups: groupNames
      };

      this.currentSession = session;

      return { success: true, user: authUser, session };
    } catch (error) {
      console.error('Local authentication error:', error);
      return { success: false, error: 'Local authentication failed', reason: 'local_error' };
    }
  }

  // Sync LDAP groups to local database
  private syncLDAPGroups(userId: string, ldapGroups: string[]): void {
    try {
      // Remove user from existing LDAP groups that are no longer present
      const currentGroups = authDatabase.getUserGroups(userId);
      const ldapGroupsInDB = currentGroups.filter(g => g.group_type === 'ldap');
      
      for (const group of ldapGroupsInDB) {
        if (!ldapGroups.includes(group.name)) {
          // Remove from group - would need to implement removeUserFromGroup method
          console.log(`Should remove user from LDAP group: ${group.name}`);
        }
      }

      // Add user to new LDAP groups
      for (const groupName of ldapGroups) {
        let group = authDatabase.getGroupByName(groupName);
        
        if (!group) {
          // Would need to implement createGroup method
          console.log(`Should create LDAP group: ${groupName}`);
        } else {
          // Check if user is already in group
          const isInGroup = currentGroups.some(g => g.id === group!.id);
          if (!isInGroup) {
            authDatabase.addUserToGroup(userId, group.id, 'ldap');
          }
        }
      }
    } catch (error) {
      console.error('Error syncing LDAP groups:', error);
    }
  }

  // Hash token for storage
  private hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex');
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

  // Main sign in method
  public async signIn(username: string, password: string): Promise<AuthResult> {
    try {
      console.log(`Authentication attempt for: ${username}`);
      
      // Determine authentication strategy
      const strategies = this.config.ldapPrimary ? ['ldap', 'local'] : ['local', 'ldap'];
      
      for (const strategy of strategies) {
        if (strategy === 'ldap' && this.config.enableLDAP) {
          const result = await this.authenticateLDAP(username, password);
          if (result.success) {
            return result;
          }
          // If LDAP fails and it's primary, log but continue to local
          if (this.config.ldapPrimary) {
            console.log('LDAP authentication failed, trying local fallback');
          }
        } else if (strategy === 'local') {
          const result = await this.authenticateLocal(username, password);
          if (result.success) {
            return result;
          }
          // If local fails and LDAP is not enabled, return the error
          if (!this.config.enableLDAP) {
            return result;
          }
        }
      }

      // If we get here, both methods failed
      authDatabase.logAuthEvent({
        username: username,
        event_type: 'login_failed',
        auth_method: 'local',
        success: false,
        failure_reason: 'all_methods_failed'
      });

      return { success: false, error: 'Authentication failed', reason: 'all_methods_failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Authentication system error', reason: 'system_error' };
    }
  }

  // Sign out user
  public async signOut(): Promise<void> {
    try {
      if (this.currentSession) {
        // Deactivate session in local database
        authDatabase.deactivateSession(this.currentSession.sessionId);
        
        // Destroy session in LDAP service
        await ldapAuth.destroySession(this.currentSession.sessionId);
        
        // Log the sign-out
        authDatabase.logAuthEvent({
          user_id: this.currentSession.user.id,
          username: this.currentSession.user.username,
          event_type: 'logout',
          auth_method: this.currentSession.user.authType,
          success: true,
          session_id: this.currentSession.sessionId
        });
        
        this.currentSession = null;
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  // Get current user
  public getCurrentUser(): User | null {
    if (!this.currentSession) {
      return null;
    }

    // Check if session is still valid
    if (new Date() > this.currentSession.expiresAt) {
      this.currentSession = null;
      return null;
    }

    return this.currentSession.user;
  }

  // Verify session token
  public async verifySession(token: string): Promise<User | null> {
    try {
      // Verify JWT token
      const payload = ldapAuth.verifyToken(token);
      if (!payload) {
        return null;
      }

      // Check session in database
      const session = authDatabase.getAuthSession(payload.sessionId);
      if (!session || !session.is_active) {
        return null;
      }

      // Get user
      const user = authDatabase.getUser(payload.sub, 'id');
      if (!user || !user.is_active) {
        return null;
      }

      // Update session activity
      authDatabase.updateSessionActivity(payload.sessionId);

      // Get current permissions and groups
      const permissions = authDatabase.getUserPermissions(user.id);
      const permissionNames = permissions.map(p => p.name);
      
      const groups = authDatabase.getUserGroups(user.id);
      const groupNames = groups.map(g => g.name);

      const authUser = this.convertDBUserToUser(user, permissionNames, groupNames);
      authUser.sessionToken = token;
      authUser.sessionExpires = session.expires_at;

      // Update current session
      this.currentSession = {
        user: authUser,
        token,
        sessionId: payload.sessionId,
        expiresAt: new Date(session.expires_at),
        permissions: permissionNames,
        groups: groupNames
      };

      return authUser;
    } catch (error) {
      console.error('Session verification failed:', error);
      return null;
    }
  }

  // Initialize session from storage (for app startup)
  public async initializeFromStorage(): Promise<User | null> {
    try {
      // Try to restore session from localStorage
      const storedToken = localStorage?.getItem('auth_token');
      if (storedToken) {
        const user = await this.verifySession(storedToken);
        if (user) {
          return user;
        } else {
          // Clear invalid token
          localStorage?.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
    }
    return null;
  }

  // Save session to storage
  public saveSessionToStorage(): void {
    if (this.currentSession && typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', this.currentSession.token);
    }
  }

  // Clear session from storage
  public clearSessionFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Get session token
  public getSessionToken(): string | null {
    return this.currentSession?.token || null;
  }

  // Refresh session (extend expiration)
  public async refreshSession(): Promise<boolean> {
    try {
      if (!this.currentSession) {
        return false;
      }

      const newExpiresAt = new Date(Date.now() + this.parseExpiresIn(this.config.sessionDuration) * 1000);
      
      // Update session in database
      const session = authDatabase.getAuthSession(this.currentSession.sessionId);
      if (session) {
        authDatabase.createAuthSession({
          session_id: session.session_id,
          user_id: session.user_id,
          token_hash: session.token_hash,
          ip_address: session.ip_address,
          user_agent: session.user_agent,
          device_info: session.device_info,
          login_method: session.login_method,
          is_active: session.is_active,
          expires_at: newExpiresAt.toISOString(),
          is_suspicious: session.is_suspicious,
          login_location: session.login_location
        });
      }

      this.currentSession.expiresAt = newExpiresAt;
      this.currentSession.user.sessionExpires = newExpiresAt.toISOString();

      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }

  // Get user permissions
  public getUserPermissions(): string[] {
    return this.currentSession?.permissions || [];
  }

  // Check if user has permission
  public hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions();
    return permissions.includes('admin') || permissions.includes(permission);
  }

  // Get user groups
  public getUserGroups(): string[] {
    return this.currentSession?.groups || [];
  }

  // Check if user belongs to group
  public inGroup(group: string): boolean {
    return this.getUserGroups().includes(group);
  }
}

// Export singleton instance
export const enhancedAuth = EnhancedAuthService.getInstance();

// Export utility functions for components (maintaining backward compatibility)
export const useAuth = () => {
  return {
    user: enhancedAuth.getCurrentUser(),
    isAuthenticated: enhancedAuth.isAuthenticated(),
    signIn: enhancedAuth.signIn.bind(enhancedAuth),
    signOut: enhancedAuth.signOut.bind(enhancedAuth),
    refreshSession: enhancedAuth.refreshSession.bind(enhancedAuth),
    hasPermission: enhancedAuth.hasPermission.bind(enhancedAuth),
    inGroup: enhancedAuth.inGroup.bind(enhancedAuth),
    permissions: enhancedAuth.getUserPermissions(),
    groups: enhancedAuth.getUserGroups()
  };
};

// Backward compatibility - export as localAuth
export const localAuth = enhancedAuth;