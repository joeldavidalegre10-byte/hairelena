import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('reports'));

router.get('/dashboard', ReportsController.dashboard);

export default router;
