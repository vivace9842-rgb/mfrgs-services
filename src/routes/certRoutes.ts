import { Router } from 'express';
import { CertController } from '../controllers/certController.js';

const router = Router();

router.post('/verify/cert', CertController.verifyCertificate);

export default router;
