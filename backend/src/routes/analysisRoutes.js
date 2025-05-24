import { Router } from 'express';
//import { saveAnalysis } from '../controllers/analysisController.js';
import { 
    saveAnalysis, 
    getAnalysis,
    getAnalysesByVacancy 
  } from '../controllers/analysisController.js';

const router = Router();

router.post('/', saveAnalysis);
router.get('/:vacancyId/:postulantId', getAnalysis);
router.get('/vacancy/:vacancyId', getAnalysesByVacancy);

export default router; 