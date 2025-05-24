import { Router } from 'express';
import { 
    syncBatchPostulants,
    markInactivePostulants,
    getActivePostulants,
    getPostulantById,
    getSyncStatus,
    getAllPostulants,
    storeTempPostulants,
  retrieveTempPostulants,
  countPostulants,
  getEtapasUnicas
} from '../controllers/postulantController.js';

const router = Router();

router.get('/', getAllPostulants);  // Agregar esta nueva ruta
router.post('/sync-batch', syncBatchPostulants);
router.post('/mark-inactive', markInactivePostulants);
router.get('/active', getActivePostulants);
router.get('/sync-status', getSyncStatus);
router.get('/count', countPostulants);
router.post('/store-temp', storeTempPostulants);
router.get('/retrieve-temp', retrieveTempPostulants);
router.get('/etapas', getEtapasUnicas);
router.get('/:id', getPostulantById);


export default router; 