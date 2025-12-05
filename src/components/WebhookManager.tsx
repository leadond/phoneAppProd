import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { dataService } from '../services/dataService';

const WebhookManager = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newEventTypes, setNewEventTypes] = useState('');

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    const fetchedWebhooks = await dataService.getWebhooks();
    setWebhooks(fetchedWebhooks);
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName || !newWebhookUrl) {
      toast.error('Please enter a name and URL for the webhook.');
      return;
    }
    try {
      await dataService.createWebhook(newWebhookName, newWebhookUrl, newEventTypes.split(','));
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewEventTypes('');
      fetchWebhooks();
      toast.success('Webhook created successfully!');
    } catch (error) {
      toast.error('Failed to create webhook.');
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      await dataService.deleteWebhook(id);
      fetchWebhooks();
      toast.success('Webhook deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete webhook.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Webhook name"
            value={newWebhookName}
            onChange={(e) => setNewWebhookName(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Webhook URL"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Event types (comma-separated)"
            value={newEventTypes}
            onChange={(e) => setNewEventTypes(e.target.value)}
          />
          <Button onClick={handleCreateWebhook}>Create Webhook</Button>
        </div>
        <div>
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="flex items-center justify-between p-2 border-b">
              <div>
                <p className="font-medium">{webhook.name}</p>
                <p className="text-sm text-gray-500">{webhook.url}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteWebhook(webhook.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookManager;
