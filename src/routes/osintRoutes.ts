import { Router } from "express";
import { OSINTController } from "../controllers/osintController.js";


const router = Router();


// =============================
// OSINT SIMULATION
// =============================

router.post(
  "/osint/simulate",
  OSINTController.simulate
);


// =============================
// OSINT RISK MATRIX
// =============================

router.post(
  "/osint/risk-matrix",
  OSINTController.calculateRisk
);


export default router;