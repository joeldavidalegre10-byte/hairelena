import { Router } from 'express';
import { StylistsController } from './stylists.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);
router.get('/', StylistsController.list);
router.get('/:id', StylistsController.getById);
router.post('/', requirePermission('stylists'), StylistsController.create);
router.put('/:id', requirePermission('stylists'), StylistsController.update);
router.delete('/:id', requirePermission('stylists'), StylistsController.remove);

export default router;