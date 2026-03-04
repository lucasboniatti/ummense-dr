import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber } from '../utils/http';

const router = Router();

// POST /api/tags - Create tag
router.post('/', authMiddleware, (req, res) => {
  const { name, color } = req.body;
  res.status(201).json({
    id: 1,
    name,
    color,
    userId: req.user?.id,
  });
});

// GET /api/tags - List user's tags
router.get('/', authMiddleware, (req, res) => {
  res.json([
    { id: 1, name: 'Urgent', color: '#FF0000' },
    { id: 2, name: 'Important', color: '#FFA500' },
    { id: 3, name: 'Done', color: '#00AA00' },
  ]);
});

// PUT /api/tags/:id - Update tag
router.put('/:id', authMiddleware, (req, res) => {
  res.json({ id: asNumber((req.params as any).id, 0), ...req.body });
});

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', authMiddleware, (req, res) => {
  res.status(204).send();
});

// POST /api/cards/:cardId/tags/:tagId - Add tag to card
router.post('/cards/:cardId/tags/:tagId', authMiddleware, (req, res) => {
  res.status(201).json({ cardId: req.params.cardId, tagId: req.params.tagId });
});

// DELETE /api/cards/:cardId/tags/:tagId - Remove tag from card
router.delete('/cards/:cardId/tags/:tagId', authMiddleware, (req, res) => {
  res.status(204).send();
});

export default router;
