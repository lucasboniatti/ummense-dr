import React, { useState } from 'react';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';
import { Card } from './ui/CardUI';

interface CommentSectionProps {
  comments?: any[];
  onAddComment?: (comment: string) => void;
}

export function CommentSection({ comments = [], onAddComment }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');

  return (
    <div className="space-y-4">
      <FormInput placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
      <Button onClick={() => { onAddComment?.(newComment); setNewComment(''); }} variant="primary">Post</Button>
      {comments.map((c, i) => (
        <Card key={i} className="p-3">
          <p className="text-sm">{c.text}</p>
        </Card>
      ))}
    </div>
  );
}
