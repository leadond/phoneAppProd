import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const SyncManager = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncSchedule, setSyncSchedule] = useState('0 0 * * *');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch initial sync status from the server
    // This is a placeholder for the actual API call
    setSyncEnabled(true);
    setLastSync(new Date().toISOString());
  }, []);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Placeholder for saving settings to the server
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Sync settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save sync settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      // Placeholder for triggering a manual sync
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setLastSync(new Date().toISOString());
      toast.success('Manual sync completed successfully!');
    } catch (error) {
      toast.error('Manual sync failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PBX Sync Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="sync-enabled" className="text-lg">
            Enable Scheduled Sync
          </Label>
          <Switch
            id="sync-enabled"
            checked={syncEnabled}
            onCheckedChange={setSyncEnabled}
          />
        </div>
        <div>
          <Label htmlFor="sync-schedule" className="text-lg">
            Sync Schedule (Cron Expression)
          </Label>
          <Input
            id="sync-schedule"
            value={syncSchedule}
            onChange={(e) => setSyncSchedule(e.target.value)}
            disabled={!syncEnabled}
          />
          <p className="text-sm text-gray-500 mt-2">
            Default is '0 0 * * *' which runs every night at midnight.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-lg">Last Sync:</p>
          <p>{lastSync ? new Date(lastSync).toLocaleString() : 'Never'}</p>
        </div>
        <div className="flex justify-end space-x-4">
          <Button
            onClick={handleManualSync}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Syncing...' : 'Run Manual Sync'}
          </Button>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncManager;
