import { Router } from 'express';
import {
  addColumn,
  createFlow,
  deleteColumn,
  deleteFlow,
  getFlow,
  listFlows,
  reorderColumns,
  updateColumn,
  updateFlow,
} from '../controllers/flow.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listFlows);
router.post('/', createFlow);
router.get('/:flowId', getFlow);
router.put('/:flowId', updateFlow);
router.delete('/:flowId', deleteFlow);
router.post('/:flowId/columns', addColumn);
router.put('/:flowId/columns/reorder', reorderColumns);
router.put('/:flowId/columns/:columnId', updateColumn);
router.delete('/:flowId/columns/:columnId', deleteColumn);

export default router;
