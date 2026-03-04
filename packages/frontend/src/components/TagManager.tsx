import React, { useState } from 'react';
import { Button } from './ui/Button';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagManagerProps {
  tags: Tag[];
  onAddTag?: (tag: { name: string; color: string }) => void;
  onDeleteTag?: (tagId: number) => void;
}

export function TagManager({ tags, onAddTag, onDeleteTag }: TagManagerProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FF0000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddTag?.({ name, color });
      setName('');
      setColor('#FF0000');
    }
  };

  return (
    <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
      <h4 className="font-semibold mb-3 text-neutral-900">Tag Manager</h4>

      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tag name"
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-12 h-10 border border-neutral-300 rounded-md cursor-pointer"
          />
          <Button type="submit" variant="primary" className="flex-1 text-sm">
            Add Tag
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center justify-between p-2 bg-white rounded-md border border-neutral-200 hover:border-neutral-300 transition-colors">
            <span
              className="inline-block px-3 py-1 rounded text-white text-sm font-medium"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
            <Button
              onClick={() => onDeleteTag?.(tag.id)}
              variant="destructive"
              size="sm"
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
