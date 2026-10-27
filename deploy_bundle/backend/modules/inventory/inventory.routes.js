import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/roles.js';
const router = Router();
router.use(authenticate);
// Categorías
router.get('/categories', InventoryController.listCategories);
// Servicios
router.get('/services', InventoryController.listServices);
router.post('/services', authorize(['admin']), InventoryController.createService);
router.put('/services/:id', authorize(['admin']), InventoryController.updateService);
// Productos
router.get('/products', InventoryController.listProducts);
router.post('/products', authorize(['admin']), InventoryController.createProduct);
router.put('/products/:id', authorize(['admin']), InventoryController.updateProduct);
router.patch('/products/:id/stock', authorize(['admin', 'cashier']), InventoryController.adjustStock);
export default router;
