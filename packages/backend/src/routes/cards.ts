import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber } from '../utils/http';

const router = Router();

// POST /api/cards - Create card
router.post('/', authMiddleware, (req, res) => {
  const { title, description, columnId } = req.body;
  res.status(201).json({
    id: 1,
    title,
    description,
    columnId,
    userId: req.user?.id,
    comments: [],
  });
});

// GET /api/cards/:id - Get card
router.get('/:id', authMiddleware, (req, res) => {
  res.json({
    id: asNumber((req.params as any).id, 0),
    title: 'Card Title',
    description: 'Card description',
    columnId: 2,
    comments: [{ id: 1, text: 'Comment', userId: 1, createdAt: new Date() }],
  });
});

// PUT /api/cards/:id - Update card
router.put('/:id', authMiddleware, (req, res) => {
  res.json({ id: asNumber((req.params as any).id, 0), ...req.body });
});

// DELETE /api/cards/:id - Delete card
router.delete('/:id', authMiddleware, (req, res) => {
  res.status(204).send();
});

export default router;
