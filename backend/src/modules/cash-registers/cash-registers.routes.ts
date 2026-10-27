import { Router } from 'express';
import { CashRegistersController } from './cash-registers.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/current', CashRegistersController.getCurrent);
router.post('/open', CashRegistersController.open);
router.post('/:id/close', CashRegistersController.close);
router.get('/:id/movements', CashRegistersController.listMovements);
router.post('/:id/movements', CashRegistersController.addMovement);
router.delete('/movements/:movementId', CashRegistersController.deleteMovement);
router.delete('/:id/movements/:movementId', CashRegistersController.deleteMovement);
router.post('/movements/:movementId/delete', CashRegistersController.deleteMovement);
router.post('/:id/movements/:movementId/delete', CashRegistersController.deleteMovement);

export default router;
