import { enhancedAuth, AuthResult, User } from './enhancedAuth';

// Client-side authentication service for React frontend
export interface ClientAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  groups: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
  authMethod?: 'auto' | 'local' | 'ldap';
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  session?: any;
  token?: string;
  error?: string;
  reason?: string;
  code?: string;
}

class ClientAuthService {
  private static instance: ClientAuthService;
  private apiBaseUrl: string;
  private listeners: Set<(state: ClientAuthState) => void> = new Set();
  private currentState: ClientAuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    permissions: [],
    groups: []
  };

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.initializeAuth();
  }

  public static getInstance(apiBaseUrl?: string): ClientAuthService {
    if (!ClientAuthService.instance) {
      ClientAuthService.instance = new ClientAuthService(apiBaseUrl);
    }
    return ClientAuthService.instance;
  }

  // Initialize authentication state on app startup
  private async initializeAuth(): Promise<void> {
    this.updateState({ isLoading: true });

    try {
      // Try to restore session from localStorage
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        const isValid = await this.verifyToken(storedToken);
        if (!isValid) {
          localStorage.removeItem('auth_token');
        }
      }

      // Try to get current session from server
      await this.getCurrentUser();
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateState({ 
        isLoading: false, 
        error: 'Failed to initialize authentication' 
      });
    }
  }

  // Update state and notify listeners
  private updateState(updates: Partial<ClientAuthState>): void {
    this.currentState = { ...this.currentState, ...updates };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  // Subscribe to auth state changes
  public subscribe(listener: (state: ClientAuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.currentState);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current auth state
  public getState(): ClientAuthState {
    return { ...this.currentState };
  }

  // Make API request with error handling
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth token to headers if available
    const token = localStorage.getItem('auth_token');
    if (token && !options.headers?.['Authorization']) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        'Authorization': `Bearer ${token}`
      };
    }

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Network error',
        code: 'NETWORK_ERROR' 
      }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Login with credentials
  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    this.updateState({ isLoading: true, error: null });

    try {
      const response: AuthResponse = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.success && response.user && response.token) {
        // Store token
        localStorage.setItem('auth_token', response.token);
        
        // Update state
        this.updateState({
          user: this.convertApiUserToUser(response.user),
          isAuthenticated: true,
          isLoading: false,
          error: null,
          permissions: response.user.permissions || [],
          groups: response.user.groups || []
        });

        // Save username if remember me is enabled
        if (credentials.rememberMe) {
          localStorage.setItem('saved_username', credentials.username);
        }

        return {
          success: true,
          user: this.convertApiUserToUser(response.user)
        };
      } else {
        this.updateState({
          isLoading: false,
          error: response.error || 'Login failed'
        });

        return {
          success: false,
          error: response.error,
          reason: response.reason
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.updateState({
        isLoading: false,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        reason: 'network_error'
      };
    }
  }

  // Logout
  public async logout(): Promise<void> {
    this.updateState({ isLoading: true });

    try {
      await this.apiRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with logout even if API call fails
    }

    // Clear local state
    localStorage.removeItem('auth_token');
    this.updateState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      permissions: [],
      groups: []
    });
  }

  // Verify token
  public async verifyToken(token?: string): Promise<boolean> {
    try {
      const tokenToVerify = token || localStorage.getItem('auth_token');
      if (!tokenToVerify) return false;

      const response: AuthResponse = await this.apiRequest('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token: tokenToVerify })
      });

      if (response.success && response.user) {
        this.updateState({
          user: this.convertApiUserToUser(response.user),
          isAuthenticated: true,
          isLoading: false,
          permissions: response.user.permissions || [],
          groups: response.user.groups || []
        });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  // Get current user
  public async getCurrentUser(): Promise<User | null> {
    try {
      const response: AuthResponse = await this.apiRequest('/auth/verify', {
        method: 'POST'
      });

      if (response.success && response.user) {
        const user = this.convertApiUserToUser(response.user);
        this.updateState({
          user,
          isAuthenticated: true,
          isLoading: false,
          permissions: response.user.permissions || [],
          groups: response.user.groups || []
        });
        return user;
      } else {
        this.updateState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          permissions: [],
          groups: []
        });
        return null;
      }
    } catch (error) {
      console.error('Get current user failed:', error);
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        permissions: [],
        groups: []
      });
      return null;
    }
  }

  // Refresh token
  public async refreshToken(): Promise<boolean> {
    try {
      const response: AuthResponse = await this.apiRequest('/auth/refresh', {
        method: 'POST'
      });

      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Get user permissions
  public async getUserPermissions(): Promise<any> {
    try {
      return await this.apiRequest('/auth/permissions');
    } catch (error) {
      console.error('Get permissions failed:', error);
      throw error;
    }
  }

  // Get user profile
  public async getUserProfile(): Promise<any> {
    try {
      return await this.apiRequest('/auth/profile');
    } catch (error) {
      console.error('Get profile failed:', error);
      throw error;
    }
  }

  // Change password (local users only)
  public async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      return { success: response.success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      };
    }
  }

  // Check if user has permission
  public hasPermission(permission: string): boolean {
    return this.currentState.permissions.includes('admin') || 
           this.currentState.permissions.includes(permission);
  }

  // Check if user belongs to group
  public inGroup(group: string): boolean {
    return this.currentState.groups.includes(group);
  }

  // Convert API user format to internal User format
  private convertApiUserToUser(apiUser: any): User {
    return {
      id: apiUser.id,
      username: apiUser.username,
      email: apiUser.email,
      displayName: apiUser.displayName,
      firstName: apiUser.firstName,
      lastName: apiUser.lastName,
      department: apiUser.department,
      title: apiUser.title,
      authType: apiUser.authType,
      groups: apiUser.groups || [],
      permissions: apiUser.permissions || [],
      lastLogin: apiUser.lastLogin,
      isActive: apiUser.isActive
    };
  }

  // Clear error state
  public clearError(): void {
    this.updateState({ error: null });
  }

  // Auto refresh token periodically
  public startTokenRefresh(intervalMs: number = 15 * 60 * 1000): void {
    setInterval(async () => {
      if (this.currentState.isAuthenticated) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          console.warn('Token refresh failed, user may need to re-login');
        }
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const clientAuth = ClientAuthService.getInstance();

// React hook for using auth state
export function useClientAuth() {
  const [state, setState] = React.useState<ClientAuthState>(clientAuth.getState());

  React.useEffect(() => {
    const unsubscribe = clientAuth.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    login: clientAuth.login.bind(clientAuth),
    logout: clientAuth.logout.bind(clientAuth),
    refreshToken: clientAuth.refreshToken.bind(clientAuth),
    hasPermission: clientAuth.hasPermission.bind(clientAuth),
    inGroup: clientAuth.inGroup.bind(clientAuth),
    clearError: clientAuth.clearError.bind(clientAuth),
    getCurrentUser: clientAuth.getCurrentUser.bind(clientAuth),
    getUserPermissions: clientAuth.getUserPermissions.bind(clientAuth),
    getUserProfile: clientAuth.getUserProfile.bind(clientAuth),
    changePassword: clientAuth.changePassword.bind(clientAuth)
  };
}

// Backward compatibility - export as useAuth
export const useAuth = useClientAuth;

// Export for direct usage without React
export { clientAuth as authService };

// Import React for the hook
import React from 'react';