const express = require('express');
const router = express.Router();
const { analyzeCandidate } = require('../services/openaiService');

// 🔥 Función nueva para limpiar caracteres invisibles y parsear
const safeParseOpenAIResponse = (text) => {
    if (typeof text !== 'string') {
      text = JSON.stringify(text);
    }
  
    let sanitized = text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // limpia lo dañino pero deja \n y \t
      .replace(/[\u001f]/g, '') // limpia específicamente el \u001f de tu problema
      .replace(/[^\u0020-\u007E]/g, ' '); // reemplaza lo no-ASCII por espacios
    
    try {
      return JSON.parse(sanitized);
    } catch (error) {
      console.error('❌ Error parseando JSON sanitizado:', error);
      console.error('Contenido que falló:', sanitized.slice(0, 1000)); // Muestra primeros 1000 caracteres
      throw error;
    }
  };
router.post('/analyze-candidate', async (req, res) => {
    try {
        const { jobDescription, candidateInfo } = req.body;
        
        if (!jobDescription || !candidateInfo) {
            return res.status(400).json({ 
                error: 'Se requieren tanto la descripción del trabajo como la información del candidato' 
            });
        }

        /* const analysis = await analyzeCandidate(jobDescription, candidateInfo);
        res.json({ analysis }); */
        const analysisRaw = await analyzeCandidate(jobDescription, candidateInfo);

         // 📢 Agregá estos console.log
         console.log('💬 Análisis bruto recibido de OpenAI:', analysisRaw);
         console.log('📏 Tipo de analysisRaw:', typeof analysisRaw);

        const analysis = safeParseOpenAIResponse(analysisRaw);
        
        res.json({ analysis });

        
    } catch (error) {
        console.error('Error en la ruta de análisis:', error);
        res.status(500).json({ 
            error: 'Error al analizar el candidato',
            details: error.message 
        });
    }
});

module.exports = router; 