import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { dataService } from '../services/dataService';

const AuditLogViewer = () => {
  const [auditLog, setAuditLog] = useState([]);
  const [filters, setFilters] = useState({ user: '', action: '', date: '' });

  useEffect(() => {
    fetchAuditLog();
  }, [filters]);

  const fetchAuditLog = async () => {
    // This is a placeholder for actual data fetching with filters
    const log = await dataService.getAuditLog(filters);
    setAuditLog(log);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Filter by user..."
            value={filters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
          />
          <Input
            placeholder="Filter by action..."
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
          />
          <Input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Timestamp</th>
                <th className="text-left">User</th>
                <th className="text-left">Action</th>
                <th className="text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.user}</td>
                  <td>{entry.action}</td>
                  <td>{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer;
