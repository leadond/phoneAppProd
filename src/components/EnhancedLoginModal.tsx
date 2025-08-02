import React, { useState, useEffect } from 'react';
import { Phone, Lock, User, AlertCircle, Shield, CheckCircle, Info, Settings } from 'lucide-react';
import { enhancedAuth, AuthResult } from '../lib/enhancedAuth';

interface LoginModalProps {
  onLogin: (result: AuthResult) => Promise<void>;
  onClose?: () => void;
  config?: {
    enableLDAP?: boolean;
    ldapPrimary?: boolean;
    allowMethodToggle?: boolean;
    showAuthTypeInfo?: boolean;
  };
}

type AuthMode = 'auto' | 'local' | 'ldap';

interface LoginState {
  username: string;
  password: string;
  loading: boolean;
  error: string;
  authMode: AuthMode;
  showAdvanced: boolean;
  rememberMe: boolean;
}

export const EnhancedLoginModal: React.FC<LoginModalProps> = ({ 
  onLogin, 
  onClose,
  config = {}
}) => {
  const {
    enableLDAP = process.env.REACT_APP_ENABLE_LDAP === 'true',
    ldapPrimary = process.env.REACT_APP_LDAP_PRIMARY === 'true',
    allowMethodToggle = true,
    showAuthTypeInfo = true
  } = config;

  const [state, setState] = useState<LoginState>({
    username: '',
    password: '',
    loading: false,
    error: '',
    authMode: 'auto',
    showAdvanced: false,
    rememberMe: false
  });

  // Load saved username if available
  useEffect(() => {
    const savedUsername = localStorage.getItem('saved_username');
    if (savedUsername) {
      setState(prev => ({ ...prev, username: savedUsername }));
    }
  }, []);

  const updateState = (updates: Partial<LoginState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const getAuthModeLabel = (mode: AuthMode): string => {
    switch (mode) {
      case 'auto': return ldapPrimary ? 'LDAP with local fallback' : 'Local with LDAP fallback';
      case 'local': return 'Local account only';
      case 'ldap': return 'LDAP/Active Directory only';
      default: return 'Automatic';
    }
  };

  const getAuthModeDescription = (mode: AuthMode): string => {
    switch (mode) {
      case 'auto': return 'Try both authentication methods automatically';
      case 'local': return 'Use local database credentials only';
      case 'ldap': return 'Use LDAP/Active Directory credentials only';
      default: return '';
    }
  };

  const validateInput = (): boolean => {
    if (!state.username.trim()) {
      updateState({ error: 'Please enter your username' });
      return false;
    }
    if (!state.password.trim()) {
      updateState({ error: 'Please enter your password' });
      return false;
    }
    return true;
  };

  const getErrorMessage = (error: string, reason?: string): string => {
    switch (reason) {
      case 'user_not_found':
        return 'User not found. Please check your username.';
      case 'invalid_password':
        return 'Invalid password. Please try again.';
      case 'account_disabled':
        return 'Your account has been disabled. Please contact your administrator.';
      case 'account_locked':
        return 'Your account has been locked due to too many failed attempts. Please try again later or contact your administrator.';
      case 'ldap_auth_failed':
        return 'LDAP authentication failed. Please check your domain credentials.';
      case 'ldap_error':
        return 'LDAP server error. Please try again or contact your administrator.';
      case 'session_expired':
        return 'Your session has expired. Please log in again.';
      case 'all_methods_failed':
        return 'Authentication failed with all available methods. Please check your credentials.';
      case 'system_error':
        return 'System error occurred. Please try again later.';
      default:
        return error || 'Authentication failed. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInput()) {
      return;
    }
    
    updateState({ loading: true, error: '' });
    
    try {
      // Save username for future sessions if remember me is checked
      if (state.rememberMe) {
        localStorage.setItem('saved_username', state.username);
      } else {
        localStorage.removeItem('saved_username');
      }

      // Authenticate using the enhanced auth service
      const result = await enhancedAuth.signIn(state.username, state.password);
      
      if (result.success) {
        // Save session to storage
        enhancedAuth.saveSessionToStorage();
        
        // Call the parent's onLogin handler
        await onLogin(result);
      } else {
        updateState({ 
          error: getErrorMessage(result.error || 'Authentication failed', result.reason),
          loading: false 
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      updateState({ 
        error: 'An unexpected error occurred. Please try again.',
        loading: false 
      });
    }
  };

  const handleUsernameChange = (value: string) => {
    updateState({ username: value, error: '' });
  };

  const handlePasswordChange = (value: string) => {
    updateState({ password: value, error: '' });
  };

  const AuthModeSelector = () => {
    if (!enableLDAP || !allowMethodToggle) return null;

    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Authentication Method
          </label>
          <button
            type="button"
            onClick={() => updateState({ showAdvanced: !state.showAdvanced })}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            <Settings className="w-4 h-4 inline mr-1" />
            {state.showAdvanced ? 'Hide' : 'Advanced'}
          </button>
        </div>
        
        {state.showAdvanced && (
          <div className="space-y-2">
            {(['auto', 'local', 'ldap'] as AuthMode[]).map((mode) => (
              <label key={mode} className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="authMode"
                  value={mode}
                  checked={state.authMode === mode}
                  onChange={(e) => updateState({ authMode: e.target.value as AuthMode })}
                  className="mt-1"
                  disabled={mode === 'ldap' && !enableLDAP}
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {getAuthModeLabel(mode)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getAuthModeDescription(mode)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
        
        {!state.showAdvanced && (
          <div className="text-sm text-gray-600">
            {getAuthModeLabel(state.authMode)}
          </div>
        )}
      </div>
    );
  };

  const AuthTypeInfo = () => {
    if (!showAuthTypeInfo || !enableLDAP) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Multiple Authentication Methods Available</div>
            <div className="space-y-1 text-xs">
              <div>• Use your domain credentials for LDAP/Active Directory authentication</div>
              <div>• Use your local account credentials for database authentication</div>
              <div>• The system will automatically try both methods when using "auto" mode</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Range Nexus</h1>
          <p className="text-gray-500">Enhanced Authentication System</p>
          {enableLDAP && (
            <div className="flex items-center justify-center mt-2 space-x-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">LDAP Enabled</span>
            </div>
          )}
        </div>

        <AuthTypeInfo />

        {state.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-red-700 text-sm">{state.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthModeSelector />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={state.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={enableLDAP ? "username or domain\\username" : "username"}
                required
                disabled={state.loading}
                autoComplete="username"
              />
            </div>
            {enableLDAP && (
              <div className="mt-1 text-xs text-gray-500">
                For LDAP: Use 'username' or 'domain\username' format
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={state.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Password"
                required
                disabled={state.loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.rememberMe}
                onChange={(e) => updateState({ rememberMe: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={state.loading}
              />
              <span className="ml-2 text-sm text-gray-600">Remember username</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={state.loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {state.loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Authenticating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500 space-y-1">
            {!enableLDAP && <div>Default credentials: admin / admin123</div>}
            {enableLDAP && (
              <div className="space-y-1">
                <div>Use your domain credentials for LDAP authentication</div>
                <div>Local fallback available for admin accounts</div>
              </div>
            )}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            disabled={state.loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// For backward compatibility, also export as LoginModal
export const LoginModal = EnhancedLoginModal;

export default EnhancedLoginModal;