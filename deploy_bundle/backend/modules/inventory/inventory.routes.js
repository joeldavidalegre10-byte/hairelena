import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/roles.js';
const router = Router();
router.use(authenticate);
// Categorías
router.get('/categories', InventoryController.listCategories);
// Servicios
router.get('/services', InventoryController.listServices);
router.post('/services', requirePermission('inventory'), InventoryController.createService);
router.put('/services/:id', requirePermission('inventory'), InventoryController.updateService);
// Productos
router.get('/products', InventoryController.listProducts);
router.post('/products', requirePermission('inventory'), InventoryController.createProduct);
router.put('/products/:id', requirePermission('inventory'), InventoryController.updateProduct);
router.patch('/products/:id/stock', requirePermission('inventory', 'pos'), InventoryController.adjustStock);
export default router;
