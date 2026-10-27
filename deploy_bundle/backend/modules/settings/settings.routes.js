import { Router } from 'express';
import { SettingsController } from './settings.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/roles.js';
const router = Router();
// Todas las rutas de configuración de ganancias son exclusivas para el Administrador
router.use(authenticate);
router.use(authorize(['admin']));
// Margen General Predeterminado
router.get('/', SettingsController.getSettings);
router.put('/', SettingsController.updateSettings);
router.get('/profit-margins', SettingsController.getSettings);
router.put('/profit-margins', SettingsController.updateSettings);
// Márgenes particulares por servicio y estilista
router.get('/services-margins', SettingsController.getServicesMargins);
router.put('/services/:serviceId/toggle', SettingsController.toggleServiceCustom);
router.put('/services/:serviceId/stylists/:stylistId', SettingsController.setStylistMargin);
router.put('/services/:serviceId/stylists/:stylistId/active', SettingsController.toggleStylistActive);
router.put('/services/:serviceId/stylists/:stylistId/visibility', SettingsController.toggleStylistVisibility);
router.delete('/services/:serviceId/stylists/:stylistId', SettingsController.removeStylistMargin);
export default router;
