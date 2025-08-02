import { browserDatabase } from './browserDatabase';
import { serverDatabase } from './serverDatabase';

/**
 * Database factory that returns the appropriate database instance
 * based on the runtime environment
 */
export function getDatabaseInstance() {
  // Use server database in Node.js environment, browser database in browser
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    // Server environment
    return serverDatabase;
  } else {
    // Browser environment
    return browserDatabase;
  }
}

/**
 * Check if we're running in a server environment
 */
export function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined';
}

/**
 * Check if we're running in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Database connection retry logic
 */
export class DatabaseConnection {
  private static retryAttempts = 3;
  private static retryDelay = 1000;

  static async withRetry<T>(operation: () => T): Promise<T> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return operation();
      } catch (error) {
        if (attempt === this.retryAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    throw new Error('Maximum retry attempts exceeded');
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const db = getDatabaseInstance();
      return db.healthCheck();
    } catch {
      return false;
    }
  }
}