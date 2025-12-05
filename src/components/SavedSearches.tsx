import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { dataService } from '../services/dataService';

interface SavedSearch {
  id: string | number;
  name: string;
  filters: any;
}

interface SavedSearchesProps {
  filters: any;
  onApplyFilters: (filters: any) => void;
  onSaveSearch: (name: string, filters: any) => Promise<void> | void;
}

const SavedSearches: React.FC<SavedSearchesProps> = ({ filters, onApplyFilters, onSaveSearch }) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [newSearchName, setNewSearchName] = useState('');

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const searches = await dataService.getSavedSearches();
        setSavedSearches(searches);
      } catch (error) {
        console.error('Failed to load saved searches:', error);
      }
    };
    loadSaved();
  }, []);

  const handleSaveSearch = async () => {
    if (!newSearchName) {
      toast.error('Please enter a name for your search.');
      return;
    }
    try {
      await onSaveSearch(newSearchName, filters);
      setNewSearchName('');
      const searches = await dataService.getSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      // onSaveSearch already toasts; just log here
      console.error('Failed to save search via parent handler:', error);
    }
  };

  const handleApplySearch = (search: SavedSearch) => {
    onApplyFilters(search.filters);
  };

  const handleSelectChange = (id: string) => {
    const search = savedSearches.find((s) => String(s.id) === id);
    if (search) {
      handleApplySearch(search);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="saved-searches">Load a Saved Search</Label>
        <Select onValueChange={handleSelectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a search..." />
          </SelectTrigger>
          <SelectContent>
            {savedSearches.map((search) => (
              <SelectItem key={search.id} value={String(search.id)}>
                {search.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Save current search as..."
          value={newSearchName}
          onChange={(e) => setNewSearchName(e.target.value)}
        />
        <Button onClick={handleSaveSearch}>Save</Button>
      </div>
    </div>
  );
};

export default SavedSearches;
