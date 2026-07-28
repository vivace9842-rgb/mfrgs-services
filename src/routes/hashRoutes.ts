import { Router } from 'express';
import { HashController } from '../controllers/hashController.js';

const router = Router();

router.post('/verify', HashController.verifySingle);
router.post('/verify/batch', HashController.verifyBatch);

export default router;
