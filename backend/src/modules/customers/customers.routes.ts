import { Router } from 'express';
import { CustomersController } from './customers.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);

// Buscar y crear: lo necesita quien cobra (pos) y quien consulta ventas o reportes.
router.get('/', requirePermission('pos', 'sales', 'reports', 'settings'), CustomersController.list);
router.get('/:id', requirePermission('pos', 'sales', 'reports', 'settings'), CustomersController.getById);
router.post('/', requirePermission('pos', 'settings'), CustomersController.create);
router.put('/:id', requirePermission('pos', 'settings'), CustomersController.update);

// Unir duplicados: solo administración.
router.post('/:id/merge', requirePermission('settings'), CustomersController.merge);

export default router;
