interface LockInfo {
  acquired: Date;
  user: string;
  resource: string;
  expiresAt: Date;
}

export class LockManager {
  private static locks = new Map<string, LockInfo>();
  private static lockTimeout = 30000; // 30 seconds
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static initialize(): void {
    // Cleanup expired locks every 10 seconds
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredLocks();
      }, 10000);
    }
  }

  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.locks.clear();
  }

  static async acquireLock(resource: string, userId: string, timeoutMs?: number): Promise<boolean> {
    const existing = this.locks.get(resource);
    const now = new Date();
    const timeout = timeoutMs || this.lockTimeout;

    // Check if lock exists and hasn't expired
    if (existing && existing.expiresAt > now) {
      // Lock is held by someone else
      if (existing.user !== userId) {
        return false;
      }
      // Lock is held by the same user, refresh it
      existing.expiresAt = new Date(now.getTime() + timeout);
      existing.acquired = now;
      return true;
    }

    // Acquire new lock
    const lockInfo: LockInfo = {
      acquired: now,
      user: userId,
      resource,
      expiresAt: new Date(now.getTime() + timeout)
    };

    this.locks.set(resource, lockInfo);
    console.log(`Lock acquired on ${resource} by ${userId}`);
    return true;
  }

  static releaseLock(resource: string, userId: string): boolean {
    const existing = this.locks.get(resource);
    if (!existing) {
      return false;
    }

    // Only the lock owner can release it
    if (existing.user !== userId) {
      return false;
    }

    this.locks.delete(resource);
    console.log(`Lock released on ${resource} by ${userId}`);
    return true;
  }

  static isLocked(resource: string): boolean {
    const existing = this.locks.get(resource);
    if (!existing) {
      return false;
    }

    const now = new Date();
    if (existing.expiresAt <= now) {
      this.locks.delete(resource);
      return false;
    }

    return true;
  }

  static getLockOwner(resource: string): string | null {
    const existing = this.locks.get(resource);
    if (!existing) {
      return null;
    }

    const now = new Date();
    if (existing.expiresAt <= now) {
      this.locks.delete(resource);
      return null;
    }

    return existing.user;
  }

  static getLockInfo(resource: string): LockInfo | null {
    const existing = this.locks.get(resource);
    if (!existing) {
      return null;
    }

    const now = new Date();
    if (existing.expiresAt <= now) {
      this.locks.delete(resource);
      return null;
    }

    return { ...existing };
  }

  static getUserLocks(userId: string): LockInfo[] {
    const now = new Date();
    const userLocks: LockInfo[] = [];

    for (const [resource, lockInfo] of this.locks.entries()) {
      if (lockInfo.user === userId && lockInfo.expiresAt > now) {
        userLocks.push({ ...lockInfo });
      }
    }

    return userLocks;
  }

  static getAllLocks(): LockInfo[] {
    const now = new Date();
    const activeLocks: LockInfo[] = [];

    for (const [resource, lockInfo] of this.locks.entries()) {
      if (lockInfo.expiresAt > now) {
        activeLocks.push({ ...lockInfo });
      }
    }

    return activeLocks;
  }

  static releaseUserLocks(userId: string): number {
    let releasedCount = 0;
    const toDelete: string[] = [];

    for (const [resource, lockInfo] of this.locks.entries()) {
      if (lockInfo.user === userId) {
        toDelete.push(resource);
        releasedCount++;
      }
    }

    toDelete.forEach(resource => {
      this.locks.delete(resource);
    });

    if (releasedCount > 0) {
      console.log(`Released ${releasedCount} locks for user ${userId}`);
    }

    return releasedCount;
  }

  static forceReleaseLock(resource: string): boolean {
    const existing = this.locks.get(resource);
    if (!existing) {
      return false;
    }

    this.locks.delete(resource);
    console.log(`Force released lock on ${resource} (was owned by ${existing.user})`);
    return true;
  }

  static setDefaultTimeout(timeoutMs: number): void {
    this.lockTimeout = timeoutMs;
  }

  static getDefaultTimeout(): number {
    return this.lockTimeout;
  }

  static getLockStats(): {
    totalLocks: number;
    expiredLocks: number;
    uniqueUsers: number;
    uniqueResources: number;
  } {
    const now = new Date();
    let activeLocks = 0;
    let expiredLocks = 0;
    const uniqueUsers = new Set<string>();
    const uniqueResources = new Set<string>();

    for (const [resource, lockInfo] of this.locks.entries()) {
      uniqueResources.add(resource);
      uniqueUsers.add(lockInfo.user);

      if (lockInfo.expiresAt > now) {
        activeLocks++;
      } else {
        expiredLocks++;
      }
    }

    return {
      totalLocks: activeLocks,
      expiredLocks,
      uniqueUsers: uniqueUsers.size,
      uniqueResources: uniqueResources.size
    };
  }

  private static cleanupExpiredLocks(): void {
    const now = new Date();
    let cleanedCount = 0;
    const toDelete: string[] = [];

    for (const [resource, lockInfo] of this.locks.entries()) {
      if (lockInfo.expiresAt <= now) {
        toDelete.push(resource);
        cleanedCount++;
      }
    }

    toDelete.forEach(resource => {
      this.locks.delete(resource);
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired locks`);
    }
  }

  // Utility methods for common locking patterns
  static async withLock<T>(
    resource: string,
    userId: string,
    operation: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const acquired = await this.acquireLock(resource, userId, timeoutMs);
    if (!acquired) {
      throw new Error(`Unable to acquire lock on resource: ${resource}`);
    }

    try {
      return await operation();
    } finally {
      this.releaseLock(resource, userId);
    }
  }

  static async tryWithLock<T>(
    resource: string,
    userId: string,
    operation: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T | null> {
    try {
      return await this.withLock(resource, userId, operation, timeoutMs);
    } catch (error) {
      console.warn(`Lock operation failed for ${resource}:`, error);
      return null;
    }
  }
}

// Initialize lock manager
LockManager.initialize();

// Graceful shutdown handling
process.on('SIGINT', () => {
  LockManager.shutdown();
});

process.on('SIGTERM', () => {
  LockManager.shutdown();
});