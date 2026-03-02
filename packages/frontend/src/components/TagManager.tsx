import React, { useState } from 'react';

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
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold mb-3">Tag Manager</h4>

      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tag name"
          className="w-full px-2 py-1 text-sm border rounded"
          required
        />
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-12 h-8 border rounded"
          />
          <button
            type="submit"
            className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Tag
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center justify-between p-2 bg-white rounded border">
            <span
              className="inline-block px-2 py-1 rounded text-white text-sm"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
            <button
              onClick={() => onDeleteTag?.(tag.id)}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
