import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import SavedSearches from './SavedSearches';
import { dataService } from '../services/dataService';
import { toast } from 'sonner';

const AdvancedFilter = ({ onFilterChange }) => {
  const [status, setStatus] = useState('');
  const [system, setSystem] = useState('');
  const [range, setRange] = useState('');

  const handleApplyFilters = () => {
    onFilterChange({ status, system, range });
  };

  const handleClearFilters = () => {
    setStatus('');
    setSystem('');
    setRange('');
    onFilterChange({});
  };

  const handleSaveSearch = async (name, filters) => {
    try {
      await dataService.saveSearch(name, filters);
      toast.success('Search saved successfully!');
    } catch (error) {
      toast.error('Failed to save search.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SavedSearches
          filters={{ status, system, range }}
          onApplyFilters={(filters) => {
            setStatus(filters.status || '');
            setSystem(filters.system || '');
            setRange(filters.range || '');
            onFilterChange(filters);
          }}
          onSaveSearch={handleSaveSearch}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="system">PBX System</Label>
            <Input
              id="system"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="e.g., Teams, Genesys"
            />
          </div>
          <div>
            <Label htmlFor="range">Number Range</Label>
            <Input
              id="range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="e.g., Main Office Range"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <Button onClick={handleClearFilters} variant="outline">
            Clear Filters
          </Button>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilter;
