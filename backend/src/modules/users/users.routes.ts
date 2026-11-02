import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('settings'));

router.get('/', UsersController.list);
router.get('/:id', UsersController.getById);
router.post('/', UsersController.create);
router.put('/:id', UsersController.update);
// Se usa POST (igual que servicios/productos) para poder enviar la contraseña de confirmación en el cuerpo
router.delete('/:id', UsersController.remove);
router.post('/:id/delete', UsersController.remove);

export default router;
