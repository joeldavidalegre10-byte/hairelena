import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import stylistsRoutes from './modules/stylists/stylists.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import cashRegistersRoutes from './modules/cash-registers/cash-registers.routes.js';
import commissionsRoutes from './modules/commissions/commissions.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import systemRoutes from './modules/system/system.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import { getDb } from './db/database.js';

const router = Router();

// Health check endpoint (público): informa el motor real y comprueba la conexión.
// No expone detalles del error ni credenciales.
router.get('/health', async (_req, res) => {
  let engine: 'mysql' | 'sqlite' = 'sqlite';
  try {
    const db = getDb();
    engine = db.isMySQL() ? 'mysql' : 'sqlite';
    await db.prepare('SELECT 1 AS ok').get();

    res.json({
      status: 'ok',
      database: engine,
      timestamp: new Date().toISOString(),
      service: 'Elite Studio POS API',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      database: engine,
      timestamp: new Date().toISOString(),
      service: 'Elite Studio POS API',
    });
  }
});

// Module Routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/stylists', stylistsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/cash-registers', cashRegistersRoutes);
router.use('/commissions', commissionsRoutes);
router.use('/reports', reportsRoutes);
router.use('/system', systemRoutes);
router.use('/settings', settingsRoutes);

export default router;