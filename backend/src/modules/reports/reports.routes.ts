import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/roles.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/dashboard', ReportsController.dashboard);

export default router;
