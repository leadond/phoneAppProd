import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ApiTokenManager = () => {
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch the current API token from the server
    // This is a placeholder for the actual API call
    setApiToken('**********');
  }, []);

  const handleGenerateToken = async () => {
    setIsLoading(true);
    try {
      // Placeholder for generating a new token
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newToken = Math.random().toString(36).substring(2);
      setApiToken(newToken);
      toast.success('New API token generated successfully!');
    } catch (error) {
      toast.error('Failed to generate API token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeToken = async () => {
    setIsLoading(true);
    try {
      // Placeholder for revoking the token
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setApiToken(null);
      toast.success('API token revoked successfully!');
    } catch (error) {
      toast.error('Failed to revoke API token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Token Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="api-token" className="text-lg">
            Your API Token
          </Label>
          <div className="flex items-center space-x-2">
            <Input
              id="api-token"
              value={apiToken || 'No token generated'}
              readOnly
            />
            <Button
              onClick={() => navigator.clipboard.writeText(apiToken || '')}
              disabled={!apiToken}
              variant="outline"
            >
              Copy
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Use this token to authenticate with the read-only API.
          </p>
        </div>
        <div className="flex justify-end space-x-4">
          <Button
            onClick={handleRevokeToken}
            disabled={isLoading || !apiToken}
            variant="destructive"
          >
            {isLoading ? 'Revoking...' : 'Revoke Token'}
          </Button>
          <Button onClick={handleGenerateToken} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate New Token'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiTokenManager;
