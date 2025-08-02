import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface UserSession {
  id: string;
  username: string;
  token: string;
  expires: Date;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
  createdAt: Date;
}

export class SessionManager {
  private static sessions = new Map<string, UserSession>();
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static sessionDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

  static initialize(): void {
    // Cleanup expired sessions every 15 minutes
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredSessions();
      }, 15 * 60 * 1000);
    }
  }

  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }

  static createSession(username: string, ipAddress: string, userAgent: string): UserSession {
    // Remove any existing sessions for this user
    this.revokeUserSessions(username);

    const now = new Date();
    const session: UserSession = {
      id: uuidv4(),
      username,
      token: randomBytes(32).toString('hex'),
      expires: new Date(now.getTime() + this.sessionDuration),
      ipAddress,
      userAgent,
      lastActivity: now,
      createdAt: now
    };

    this.sessions.set(session.token, session);
    console.log(`Session created for user: ${username}, token: ${session.token.substring(0, 8)}...`);
    return session;
  }

  static validateSession(token: string): UserSession | null {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    const now = new Date();
    if (session.expires < now) {
      this.sessions.delete(token);
      console.log(`Session expired for user: ${session.username}`);
      return null;
    }
    
    // Update last activity
    session.lastActivity = now;
    return session;
  }

  static refreshSession(token: string): UserSession | null {
    const session = this.validateSession(token);
    if (!session) {
      return null;
    }

    // Extend session expiration
    const now = new Date();
    session.expires = new Date(now.getTime() + this.sessionDuration);
    session.lastActivity = now;
    
    console.log(`Session refreshed for user: ${session.username}`);
    return session;
  }

  static revokeSession(token: string): boolean {
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.delete(token);
      console.log(`Session revoked for user: ${session.username}`);
      return true;
    }
    return false;
  }

  static revokeUserSessions(username: string): number {
    let revokedCount = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (session.username === username) {
        this.sessions.delete(token);
        revokedCount++;
      }
    }
    if (revokedCount > 0) {
      console.log(`${revokedCount} sessions revoked for user: ${username}`);
    }
    return revokedCount;
  }

  static getActiveSessions(): UserSession[] {
    const now = new Date();
    return Array.from(this.sessions.values())
      .filter(session => session.expires > now)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  static getSessionsByUser(username: string): UserSession[] {
    const now = new Date();
    return Array.from(this.sessions.values())
      .filter(session => session.username === username && session.expires > now);
  }

  static getSessionCount(): number {
    const now = new Date();
    let activeCount = 0;
    for (const session of this.sessions.values()) {
      if (session.expires > now) {
        activeCount++;
      }
    }
    return activeCount;
  }

  static getSessionStats(): {
    total: number;
    active: number;
    expired: number;
    uniqueUsers: number;
  } {
    const now = new Date();
    let active = 0;
    let expired = 0;
    const uniqueUsers = new Set<string>();

    for (const session of this.sessions.values()) {
      if (session.expires > now) {
        active++;
        uniqueUsers.add(session.username);
      } else {
        expired++;
      }
    }

    return {
      total: this.sessions.size,
      active,
      expired,
      uniqueUsers: uniqueUsers.size
    };
  }

  private static cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [token, session] of this.sessions.entries()) {
      if (session.expires < now) {
        this.sessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  static setSessionDuration(durationMs: number): void {
    this.sessionDuration = durationMs;
  }

  static getSessionDuration(): number {
    return this.sessionDuration;
  }
}

// Initialize session manager
SessionManager.initialize();

// Graceful shutdown handling
process.on('SIGINT', () => {
  SessionManager.shutdown();
});

process.on('SIGTERM', () => {
  SessionManager.shutdown();
});