import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber } from '../utils/http';

const router = Router();

// POST /api/flows - Create new flow
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Flow name required' });
    return;
  }
  // Mock implementation - replace with real DB
  res.status(201).json({ id: 1, name, user_id: req.user?.id });
});

// GET /api/flows/:id - Get flow with columns
router.get('/:id', authMiddleware, (req, res) => {
  // Mock implementation
  res.json({
    id: asNumber((req.params as any).id, 0),
    name: 'Default',
    columns: [
      { id: 1, name: 'Backlog', order: 0 },
      { id: 2, name: 'A Fazer', order: 1 },
      { id: 3, name: 'Em Progresso', order: 2 },
      { id: 4, name: 'Finalizado', order: 3 },
    ],
  });
});

// PUT /api/flows/:id/columns - Update column
router.put('/:id/columns', authMiddleware, (req, res) => {
  const { columnId, name } = req.body;
  res.json({ id: columnId, name });
});

// POST /api/flows/:id/columns - Add column
router.post('/:id/columns', authMiddleware, (req, res) => {
  const { name } = req.body;
  res.status(201).json({ id: 5, name, order: 4 });
});

export default router;
