import { browserDatabase } from './browserDatabase';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  sessionToken?: string;
  sessionExpires?: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

class LocalAuthService {
  private currentSession: AuthSession | null = null;
  private static instance: LocalAuthService;

  public static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }

  // Simple password verification (in production, use proper hashing)
  private verifyPassword(password: string, hash: string): boolean {
    // For simplicity, we'll use a basic comparison with the stored hash
    // The hash in the database is just the default password for now
    // In production, use bcrypt or similar
    if (hash === '$2a$10$rQKJz5Z5J5z5J5z5J5z5JOkK5z5J5z5J5z5J5z5J5z5J5z5J5z5JO') {
      return password === 'admin123';
    }
    return password === hash; // Fallback for other users
  }

  // Generate session token
  private generateSessionToken(): string {
    return uuidv4();
  }

  // Check if session is valid
  private isSessionValid(session: any): boolean {
    if (!session || !session.session_expires) {
      return false;
    }
    return new Date(session.session_expires) > new Date();
  }

  // Sign in user
  public async signIn(username: string, password: string): Promise<{ user: User; session: AuthSession } | null> {
    try {
      console.log('Attempting sign in for username:', username);
      
      // Ensure database is initialized and seeded (including admin user creation)
      await browserDatabase.ensureInitialized();
      
      // Wait a bit for any async seeding operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to get the user, but if not found and this is admin, wait and retry
      let user = await browserDatabase.getUserByUsername(username);
      console.log('User lookup result:', user ? 'Found' : 'Not found');
      
      // If admin user not found, try to create it and retry
      if (!user && username === 'admin') {
        console.log('Admin user not found, ensuring it exists...');
        // Force creation of admin user
        await this.ensureAdminUserExists();
        // Wait a bit more
        await new Promise(resolve => setTimeout(resolve, 100));
        // Try again
        user = await browserDatabase.getUserByUsername(username);
        console.log('Admin user lookup retry result:', user ? 'Found' : 'Not found');
      }
      
      if (!user) {
        console.error('User not found:', username);
        throw new Error('User not found');
      }

      console.log('Verifying password...');
      if (!this.verifyPassword(password, user.password_hash)) {
        console.error('Password verification failed');
        throw new Error('Invalid password');
      }

      console.log('Password verified, creating session...');
      
      // Create new session
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await browserDatabase.createOrUpdateSession(username, sessionToken, expiresAt.toISOString());

      const authUser: User = {
        id: user.id,
        username: user.username,
        sessionToken,
        sessionExpires: expiresAt.toISOString(),
        lastLogin: new Date().toISOString()
      };

      const session: AuthSession = {
        user: authUser,
        token: sessionToken,
        expiresAt
      };

      this.currentSession = session;

      // Log the sign-in
      await browserDatabase.insertAuditEntry({
        action: `User ${username} signed in`,
        user: username,
        type: 'auth'
      });

      console.log('Sign in successful');
      return { user: authUser, session };
    } catch (error) {
      console.error('Sign in failed:', error);
      return null;
    }
  }

  // Ensure admin user exists (direct creation)
  private async ensureAdminUserExists(): Promise<void> {
    try {
      const adminUser = {
        id: this.generateSessionToken(), // Use session token generator for unique ID
        username: 'admin',
        password_hash: '$2a$10$rQKJz5Z5J5z5J5z5J5z5JOkK5z5J5z5J5z5J5z5J5z5J5z5J5z5JO',
        session_token: null,
        session_expires: null,
        last_login: null,
        created_at: new Date().toISOString()
      };
      
      // Try to insert directly
      await browserDatabase.insert('user_sessions', adminUser);
      console.log('Admin user created directly by auth service');
    } catch (error) {
      console.log('Could not create admin user (may already exist):', error);
    }
  }

  // Sign out user
  public async signOut(): Promise<void> {
    try {
      if (this.currentSession) {
        await browserDatabase.clearSession(this.currentSession.user.username);
        
        // Log the sign-out
        await browserDatabase.insertAuditEntry({
          action: `User ${this.currentSession.user.username} signed out`,
          user: this.currentSession.user.username,
          type: 'auth'
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
      const session = await browserDatabase.getSessionByToken(token);
      
      if (!session || !this.isSessionValid(session)) {
        return null;
      }

      const user: User = {
        id: session.id,
        username: session.username,
        sessionToken: token,
        sessionExpires: session.session_expires,
        lastLogin: session.last_login
      };

      // Update current session
      this.currentSession = {
        user,
        token,
        expiresAt: new Date(session.session_expires)
      };

      return user;
    } catch (error) {
      console.error('Session verification failed:', error);
      return null;
    }
  }

  // Initialize session from storage (for app startup)
  public async initializeFromStorage(): Promise<User | null> {
    try {
      // Try to restore session from localStorage
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        const user = await this.verifySession(storedToken);
        if (user) {
          return user;
        } else {
          // Clear invalid token
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
    }
    return null;
  }

  // Save session to storage
  public saveSessionToStorage(): void {
    if (this.currentSession) {
      localStorage.setItem('auth_token', this.currentSession.token);
    }
  }

  // Clear session from storage
  public clearSessionFromStorage(): void {
    localStorage.removeItem('auth_token');
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

      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await browserDatabase.createOrUpdateSession(
        this.currentSession.user.username,
        this.currentSession.token,
        newExpiresAt.toISOString()
      );

      this.currentSession.expiresAt = newExpiresAt;
      this.currentSession.user.sessionExpires = newExpiresAt.toISOString();

      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const localAuth = LocalAuthService.getInstance();

// Utility functions for components
export const useAuth = () => {
  return {
    user: localAuth.getCurrentUser(),
    isAuthenticated: localAuth.isAuthenticated(),
    signIn: localAuth.signIn.bind(localAuth),
    signOut: localAuth.signOut.bind(localAuth),
    refreshSession: localAuth.refreshSession.bind(localAuth)
  };
};