import { Router } from 'express';
import { OSINTController } from '../controllers/osintController.js';

const router = Router();

router.post('/osint/simulate', OSINTController.simulate);
router.post('/osint/risk-matrix', OSINTController.calculateRisk);

export default router;
