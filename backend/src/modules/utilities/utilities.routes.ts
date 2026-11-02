import { Router } from 'express';
import { UtilitiesController } from './utilities.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);

// Datos para el punto de venta (quienes cobran necesitan ver qué servicios admiten
// utilidad y qué estilistas pueden ayudar, aunque no tengan acceso a los márgenes).
router.get('/pos-config', requirePermission('pos'), UtilitiesController.getPosConfig);

// Consulta de utilidades generadas: desde Márgenes y ganancias o desde Pagos.
router.get('/', requirePermission('margins', 'stylists'), UtilitiesController.list);
router.get('/summary', requirePermission('margins', 'stylists'), UtilitiesController.summary);

// Configuración: misma restricción que la pestaña "Márgenes y ganancias".
router.get('/config', requirePermission('margins'), UtilitiesController.getConfig);
router.put('/general', requirePermission('margins'), UtilitiesController.updateGeneral);
router.put('/services/:serviceId', requirePermission('margins'), UtilitiesController.setServiceConfig);
router.delete('/services/:serviceId', requirePermission('margins'), UtilitiesController.removeServiceConfig);
router.put('/stylists/:stylistId', requirePermission('margins'), UtilitiesController.setStylistEnabled);

export default router;
