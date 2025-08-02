// Local client to replace Supabase functionality
// This provides the same interface as Supabase but uses local database and auth

import { browserDatabase } from './browserDatabase';
import { localAuth, User } from './localAuth';

// Mock Supabase-like auth response
interface AuthResponse {
  data: {
    user: User | null;
    session: {
      access_token: string;
      user: User;
    } | null;
  };
  error: Error | null;
}

// Mock Supabase-like data response
interface DataResponse<T> {
  data: T | null;
  error: Error | null;
}

// Local client that mimics Supabase interface
class LocalClient {
  auth = {
    // Sign in with email and password
    signInWithPassword: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
      try {
        const result = await localAuth.signIn(credentials.email, credentials.password);
        
        if (result) {
          localAuth.saveSessionToStorage();
          return {
            data: {
              user: result.user,
              session: {
                access_token: result.session.token,
                user: result.user
              }
            },
            error: null
          };
        } else {
          return {
            data: { user: null, session: null },
            error: new Error('Invalid credentials')
          };
        }
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: error as Error
        };
      }
    },

    // Sign out
    signOut: async (): Promise<{ error: Error | null }> => {
      try {
        await localAuth.signOut();
        localAuth.clearSessionFromStorage();
        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },

    // Get current user
    getUser: async (): Promise<{ data: { user: User | null }; error: Error | null }> => {
      try {
        const user = localAuth.getCurrentUser();
        return {
          data: { user },
          error: null
        };
      } catch (error) {
        return {
          data: { user: null },
          error: error as Error
        };
      }
    },

    // Get session
    getSession: async (): Promise<AuthResponse> => {
      try {
        const user = localAuth.getCurrentUser();
        const token = localAuth.getSessionToken();
        
        if (user && token) {
          return {
            data: {
              user,
              session: {
                access_token: token,
                user
              }
            },
            error: null
          };
        } else {
          return {
            data: { user: null, session: null },
            error: null
          };
        }
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: error as Error
        };
      }
    },

    // Listen to auth changes (simplified)
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Initialize with current session
      const user = localAuth.getCurrentUser();
      const token = localAuth.getSessionToken();
      
      if (user && token) {
        callback('SIGNED_IN', {
          access_token: token,
          user
        });
      } else {
        callback('SIGNED_OUT', null);
      }

      // Return unsubscribe function
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  };

  // Initialize auth from storage on startup
  async initialize(): Promise<void> {
    try {
      await localAuth.initializeFromStorage();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }
}

// Export singleton instance
export const localClient = new LocalClient();

// Initialize on import
localClient.initialize();