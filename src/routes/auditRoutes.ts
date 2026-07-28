import { Router } from 'express';
import { AuditController } from '../controllers/auditController.js';

const router = Router();

router.post('/audit/report', AuditController.generateReport);

export default router;
