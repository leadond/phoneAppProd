import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { dataService } from '../services/dataService';

const TagManager = () => {
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#000000');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const fetchedTags = await dataService.getTags();
    setTags(fetchedTags);
  };

  const handleCreateTag = async () => {
    if (!newTagName) {
      toast.error('Please enter a tag name.');
      return;
    }
    try {
      await dataService.createTag(newTagName, newTagColor);
      setNewTagName('');
      setNewTagColor('#000000');
      fetchTags();
      toast.success('Tag created successfully!');
    } catch (error) {
      toast.error('Failed to create tag.');
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await dataService.deleteTag(id);
      fetchTags();
      toast.success('Tag deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete tag.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <Input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
          />
          <Button onClick={handleCreateTag}>Create Tag</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color, color: 'white' }}
              className="cursor-pointer"
              onClick={() => handleDeleteTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TagManager;
