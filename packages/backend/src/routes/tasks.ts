import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/tasks - Create task
router.post('/', authMiddleware, (req, res) => {
  const { title, priority, dueDate, cardId } = req.body;
  res.status(201).json({
    id: 1,
    title,
    priority: priority || 'P3',
    status: 'open',
    dueDate,
    cardId,
  });
});

// GET /api/tasks - List tasks with filters
router.get('/', authMiddleware, (req, res) => {
  const { priority, status } = req.query;
  // Mock implementation
  res.json([
    {
      id: 1,
      title: 'Task 1',
      priority: 'P1',
      status: 'open',
      dueDate: '2026-03-15',
      cardId: 1,
    },
    {
      id: 2,
      title: 'Task 2',
      priority: 'P2',
      status: 'open',
      dueDate: '2026-03-20',
      cardId: 1,
    },
  ]);
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), ...req.body });
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authMiddleware, (req, res) => {
  res.status(204).send();
});

export default router;
