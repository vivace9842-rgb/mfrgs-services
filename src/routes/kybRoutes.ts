import { Router } from 'express';
import { KYBController } from '../controllers/kybController.js';

const router = Router();

router.post('/kyb/intake', KYBController.createCase);

export default router;
