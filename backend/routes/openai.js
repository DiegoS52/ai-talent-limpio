import express from 'express';
import { analyzeCandidate } from '../services/openaiService.js';

const router = express.Router();

router.post('/analyze-candidate', async (req, res) => {
    try {
        console.log('\n🔄 RECIBIENDO PETICIÓN EN RUTA /analyze-candidate');
        const { jobDescription, candidateInfo } = req.body;
        
        // Aquí es donde conectamos el frontend con el backend
        const result = await analyzeCandidate(jobDescription, candidateInfo);
        
        res.json(result);
    } catch (error) {
        console.error('Error en ruta analyze-candidate:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 