import { Router } from 'express';
import { CommissionsController } from './commissions.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/roles.js';
const router = Router();
router.use(authenticate);
router.use(authorize(['admin']));
// Módulo de Pagos a Estilistas
router.get('/pending', CommissionsController.getPendingByStylist);
router.post('/payouts', CommissionsController.createPayout);
router.post('/payouts/:id/revert', CommissionsController.revertPayout);
router.get('/payouts', CommissionsController.listPayouts);
router.get('/payouts/:id', CommissionsController.getPayoutById);
router.delete('/pending/:id', CommissionsController.deletePendingCommission);
router.delete('/stylists/:stylistId/pending', CommissionsController.deleteAllPendingByStylist);
router.delete('/:id', CommissionsController.deletePendingCommission);
// Rutas legacy de comisiones
router.get('/', CommissionsController.list);
router.get('/summary', CommissionsController.summary);
router.post('/pay', CommissionsController.markAsPaid);
export default router;
