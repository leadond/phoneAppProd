import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle, Eye, EyeOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { enhancedAuth, SecurityChallenge, Permission } from '@/lib/enhancedAuth';

interface AdminChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: any) => void;
  requiredPermissions: Permission[];
  title?: string;
  description?: string;
}

interface ChallengeState {
  password: string;
  mfaCode: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
  challenges: SecurityChallenge[];
  currentStep: number;
}

export const AdminChallengeModal: React.FC<AdminChallengeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requiredPermissions,
  title = "Administrative Access Required",
  description = "This action requires elevated administrative privileges. Please verify your identity."
}) => {
  const [state, setState] = useState<ChallengeState>({
    password: '',
    mfaCode: '',
    showPassword: false,
    loading: false,
    error: '',
    challenges: [],
    currentStep: 0
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setState(prev => ({
        ...prev,
        password: '',
        mfaCode: '',
        error: '',
        loading: false,
        currentStep: 0
      }));
      
      // Request initial challenges
      requestChallenges();
    }
  }, [isOpen]);

  const requestChallenges = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));
      
      const result = await enhancedAuth.requestElevatedAccess(requiredPermissions);
      
      if (result.success && result.session) {
        // No challenges needed, direct success
        onSuccess(result.session);
        return;
      }
      
      if (result.challenges) {
        setState(prev => ({
          ...prev,
          challenges: result.challenges!,
          loading: false
        }));
      } else if (result.error) {
        setState(prev => ({
          ...prev,
          error: result.error!,
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to request administrative access',
        loading: false
      }));
    }
  };

  const handleSubmitChallenge = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));
      
      const challengeResponse: { password?: string; mfaCode?: string } = {};
      
      // Include password if required
      const passwordChallenge = state.challenges.find(c => c.type === 'password');
      if (passwordChallenge && state.password) {
        challengeResponse.password = state.password;
      }
      
      // Include MFA if required
      const mfaChallenge = state.challenges.find(c => c.type === 'mfa');
      if (mfaChallenge && state.mfaCode) {
        challengeResponse.mfaCode = state.mfaCode;
      }
      
      const result = await enhancedAuth.requestElevatedAccess(
        requiredPermissions,
        challengeResponse
      );
      
      if (result.success && result.session) {
        onSuccess(result.session);
        setState(prev => ({ ...prev, loading: false }));
      } else if (result.error) {
        setState(prev => ({
          ...prev,
          error: result.error,
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Authentication failed. Please try again.',
        loading: false
      }));
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !state.loading) {
      handleSubmitChallenge();
    }
  };

  const getCurrentChallenge = (): SecurityChallenge | null => {
    return state.challenges[state.currentStep] || null;
  };

  const canProceed = (): boolean => {
    const passwordChallenge = state.challenges.find(c => c.type === 'password');
    const mfaChallenge = state.challenges.find(c => c.type === 'mfa');
    
    let passwordValid = !passwordChallenge || state.password.length > 0;
    let mfaValid = !mfaChallenge || state.mfaCode.length === 6;
    
    return passwordValid && mfaValid;
  };

  const renderSecurityBadges = () => {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {requiredPermissions.map((perm, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            {perm.resource}: {perm.actions.join(', ')}
          </Badge>
        ))}
      </div>
    );
  };

  const renderPasswordChallenge = () => {
    const challenge = state.challenges.find(c => c.type === 'password');
    if (!challenge) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <Label htmlFor="admin-password">Administrator Password</Label>
        </div>
        <div className="relative">
          <Input
            id="admin-password"
            type={state.showPassword ? 'text' : 'password'}
            value={state.password}
            onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
            onKeyPress={handleKeyPress}
            placeholder="Enter your administrator password"
            className="pr-10"
            disabled={state.loading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
          >
            {state.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-500">{challenge.prompt}</p>
      </div>
    );
  };

  const renderMFAChallenge = () => {
    const challenge = state.challenges.find(c => c.type === 'mfa');
    if (!challenge) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-4 h-4 text-green-600" />
          <Label htmlFor="mfa-code">Multi-Factor Authentication</Label>
        </div>
        <Input
          id="mfa-code"
          type="text"
          value={state.mfaCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setState(prev => ({ ...prev, mfaCode: value }));
          }}
          onKeyPress={handleKeyPress}
          placeholder="000000"
          className="font-mono text-center text-lg tracking-widest"
          maxLength={6}
          disabled={state.loading}
        />
        <p className="text-xs text-gray-500">{challenge.prompt}</p>
      </div>
    );
  };

  const renderSecurityWarning = () => {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Security Notice:</strong> This action will grant you elevated administrative privileges. 
          All activities will be logged and audited. Only proceed if you are authorized to perform system administration tasks.
        </AlertDescription>
      </Alert>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={() => !state.loading && onClose()}>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-600" />
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Security badges showing required permissions */}
          {renderSecurityBadges()}

          {/* Security warning */}
          {renderSecurityWarning()}

          {/* Error display */}
          {state.error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Challenge forms */}
          {state.challenges.length > 0 && (
            <div className="space-y-4">
              {renderPasswordChallenge()}
              {renderMFAChallenge()}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={state.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitChallenge}
              disabled={state.loading || !canProceed()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {state.loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Grant Access
                </>
              )}
            </Button>
          </div>

          {/* Session info */}
          <div className="text-xs text-gray-500 text-center">
            Elevated session will expire automatically after 15 minutes of inactivity
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook for using the admin challenge modal
export const useAdminChallenge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<{
    permissions: Permission[];
    resolve: (session: any) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const requestElevatedAccess = (permissions: Permission[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      setCurrentRequest({ permissions, resolve, reject });
      setIsOpen(true);
    });
  };

  const handleSuccess = (session: any) => {
    if (currentRequest) {
      currentRequest.resolve(session);
      setCurrentRequest(null);
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    if (currentRequest) {
      currentRequest.reject(new Error('User cancelled administrative access request'));
      setCurrentRequest(null);
    }
    setIsOpen(false);
  };

  const AdminChallengeComponent = () => (
    <AdminChallengeModal
      isOpen={isOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
      requiredPermissions={currentRequest?.permissions || []}
    />
  );

  return {
    requestElevatedAccess,
    AdminChallengeModal: AdminChallengeComponent
  };
};