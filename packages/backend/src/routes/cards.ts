import { Router } from 'express';
import {
  createCard,
  deleteCard,
  getCard,
  listCards,
  reorderCards,
  updateCard,
} from '../controllers/card.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listCards);
router.post('/', createCard);
router.put('/reorder', reorderCards);
router.get('/:cardId', getCard);
router.put('/:cardId', updateCard);
router.delete('/:cardId', deleteCard);

export default router;
