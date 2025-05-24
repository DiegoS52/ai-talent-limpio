import express from 'express';
import { saveSearch,  getSearchHistory ,getSearchById } from '../controllers/searchHistoryController.js';
// import { authMiddleware } from '../middleware/auth.js'; // Necesitarás crear este middleware

const router = express.Router();

// router.use(authMiddleware); // Descomentar cuando tengas el middleware de autenticación
router.post('/', saveSearch);
router.get('/:id', getSearchById);
router.get('/', getSearchHistory);


export default router; 