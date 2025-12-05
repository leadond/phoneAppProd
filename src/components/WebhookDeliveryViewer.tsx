import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { dataService } from '../services/dataService';
import type { WebhookDelivery } from '../services/api';

const WebhookDeliveryViewer: React.FC = () => {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [filters, setFilters] = useState({ webhookId: '', eventType: '', importId: '', limit: '100' });
  const [loading, setLoading] = useState(false);
  const [showFailuresOnly, setShowFailuresOnly] = useState(false);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const result = await dataService.getWebhookDeliveries({
        webhookId: filters.webhookId || undefined,
        eventType: filters.eventType || undefined,
        importId: filters.importId || undefined,
        limit: filters.limit ? Number(filters.limit) : undefined,
      });
      setDeliveries(result);
    } catch (error) {
      console.error('Failed to load webhook deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDeliveries();
  }, []);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatStatus = (d: WebhookDelivery) => {
    if (d.error) return `Error: ${d.error}`;
    if (d.status_code != null) return String(d.status_code);
    return 'N/A';
  };

  const isFailure = (d: WebhookDelivery) => {
    if (d.error) return true;
    if (d.status_code == null) return false;
    // Treat non-2xx as failure
    return d.status_code < 200 || d.status_code >= 300;
  };

  const formatPayload = (payload: any) => {
    if (!payload) return '';
    try {
      const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
      return text.length > 120 ? text.slice(0, 120) + '…' : text;
    } catch {
      return '';
    }
  };

  const visibleDeliveries = showFailuresOnly ? deliveries.filter(isFailure) : deliveries;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Deliveries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-sm text-gray-600 mr-2">Quick filters:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({ webhookId: '', eventType: 'import.completed', importId: '', limit: '100' });
              void loadDeliveries();
            }}
          >
            Imports (import.completed)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({ webhookId: '', eventType: '', importId: '', limit: '100' });
              void loadDeliveries();
            }}
          >
            Clear filters
          </Button>
          <div className="flex items-center ml-auto space-x-2">
            <Label htmlFor="failures-only" className="text-xs text-gray-600">
              Failures only
            </Label>
            <Switch
              id="failures-only"
              checked={showFailuresOnly}
              onCheckedChange={setShowFailuresOnly}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            placeholder="Webhook ID"
            value={filters.webhookId}
            onChange={(e) => handleFilterChange('webhookId', e.target.value)}
            className="w-32"
          />
          <Input
            placeholder="Event type (e.g. import.completed)"
            value={filters.eventType}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
            className="w-56"
          />
          <Input
            placeholder="Import ID"
            value={filters.importId}
            onChange={(e) => handleFilterChange('importId', e.target.value)}
            className="w-64"
          />
          <Input
            placeholder="Limit"
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', e.target.value)}
            className="w-20"
          />
          <Button onClick={loadDeliveries} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-left py-2 pr-4">Event</th>
                <th className="text-left py-2 pr-4">Webhook ID</th>
                <th className="text-left py-2 pr-4">URL</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2">Payload</th>
              </tr>
            </thead>
            <tbody>
              {visibleDeliveries.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="py-1 pr-4 whitespace-nowrap">
                    {new Date(d.attempt_timestamp).toLocaleString()}
                  </td>
                  <td className="py-1 pr-4 whitespace-nowrap">{d.event_type}</td>
                  <td className="py-1 pr-4 whitespace-nowrap">{d.webhook_id ?? ''}</td>
                  <td className="py-1 pr-4 max-w-xs truncate" title={d.url}>{d.url}</td>
                  <td className="py-1 pr-4 whitespace-nowrap">{formatStatus(d)}</td>
                  <td className="py-1 align-top text-xs max-w-md truncate" title={formatPayload(d.payload)}>
                    {formatPayload(d.payload)}
                  </td>
                </tr>
              ))}
              {visibleDeliveries.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    No webhook deliveries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookDeliveryViewer;
