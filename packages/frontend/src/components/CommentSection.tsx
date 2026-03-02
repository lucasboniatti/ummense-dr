import React, { useState } from 'react';

interface Comment {
  id: number;
  text: string;
  userId: number;
  createdAt: Date;
}

interface CommentSectionProps {
  cardId: number;
  comments: Comment[];
  onAddComment?: (text: string) => void;
}

export function CommentSection({
  cardId,
  comments,
  onAddComment,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment?.(newComment);
      setNewComment('');
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h5 className="font-semibold mb-3">Comments ({comments.length})</h5>

      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
        {comments.map(comment => (
          <div key={comment.id} className="text-sm">
            <p className="text-gray-700">{comment.text}</p>
            <p className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-2 py-1 text-sm border rounded"
        />
        <button
          type="submit"
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Post
        </button>
      </form>
    </div>
  );
}
