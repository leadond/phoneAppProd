import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, Unlock, Lock, Tag } from 'lucide-react';

const BulkEditToolbar = ({ selectedCount, onBulkAction }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
      <span className="text-sm font-medium">{selectedCount} items selected</span>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction('assign')}
        >
          <Users className="w-4 h-4 mr-2" />
          Assign
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction('release')}
        >
          <Unlock className="w-4 h-4 mr-2" />
          Release
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction('reserve')}
        >
          <Lock className="w-4 h-4 mr-2" />
          Reserve
        </Button>
        <Button variant="outline" size="sm" onClick={() => onBulkAction('tag')}>
          <Tag className="w-4 h-4 mr-2" />
          Tag
        </Button>
      </div>
    </div>
  );
};

export default BulkEditToolbar;
