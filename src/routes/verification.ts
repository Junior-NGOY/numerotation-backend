import { Router } from 'express';
import { verifyVehicleByCode, getVerificationStats } from '../controllers/verification-prod';

const router = Router();

// Route publique de vérification par code unique
// GET /api/v1/verify/:codeUnique
router.get('/:codeUnique', verifyVehicleByCode);

// Route pour les statistiques de vérification (optionnel)
// GET /api/v1/verify/stats/overview
router.get('/stats/overview', getVerificationStats);

export default router;
