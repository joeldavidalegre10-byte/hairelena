import { Router } from 'express';
import { CashRegistersController } from './cash-registers.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, authorize } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);
// El POS necesita saber si hay caja abierta; el resto es exclusivo del permiso «register»
router.get('/current', requirePermission('register', 'pos'), CashRegistersController.getCurrent);
router.use(requirePermission('register'));
// Solo el administrador ve el listado de las cajas de todos los usuarios
router.get('/', authorize(['admin']), CashRegistersController.list);
router.get('/eligible-users', authorize(['admin']), CashRegistersController.eligibleUsers);
router.get('/:id', CashRegistersController.getById);
router.post('/open', CashRegistersController.open);
router.post('/:id/close', CashRegistersController.close);
router.get('/:id/movements', CashRegistersController.listMovements);
router.post('/:id/movements', CashRegistersController.addMovement);
router.delete('/movements/:movementId', CashRegistersController.deleteMovement);
router.delete('/:id/movements/:movementId', CashRegistersController.deleteMovement);
router.post('/movements/:movementId/delete', CashRegistersController.deleteMovement);
router.post('/:id/movements/:movementId/delete', CashRegistersController.deleteMovement);

export default router;
