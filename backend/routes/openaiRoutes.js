import express from 'express';
import { analyzeCandidate, generateInterview, analizarPerfil,  detectPostulantesByProactivePerfil, generateCurriculumFicha,generateCurriculumFichaOS, analyzeTemplateCV} from '../services/openaiService.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/analyze-candidate', async (req, res) => {
    try {
        const { jobDescription, candidateInfo } = req.body;
        
        if (!jobDescription || !candidateInfo) {
            return res.status(400).json({ 
                error: 'Se requieren tanto la descripción del trabajo como la información del candidato' 
            });
        }

       const analysis = await analyzeCandidate(jobDescription, candidateInfo);
        res.json({ analysis }); 


        
    } catch (error) {
        console.error('Error en la ruta de análisis:', error);
        res.status(500).json({ 
            error: 'Error al analizar el candidato',
            details: error.message 
        });
    }
});

// Nueva ruta para analizar perfil
router.post('/analizar-perfil', async (req, res) => {
    try {
        const { descripcion } = req.body;
        
        if (!descripcion) {
            return res.status(400).json({ 
                error: 'Se requiere la descripción del perfil' 
            });
        }

        const analisis = await analizarPerfil(descripcion);
        res.json(analisis);
        
    } catch (error) {
        console.error('Error en la ruta de análisis de perfil:', error);
        res.status(500).json({ 
            error: 'Error al analizar el perfil',
            details: error.message 
        });
    }
});


// Nueva ruta para generar entrevista
router.post('/generate-interview', async (req, res) => {
    try {
        const { jobDescription } = req.body;
        
        if (!jobDescription) {
            return res.status(400).json({ 
                error: 'Se requiere la descripción del trabajo' 
            });
        }

        const interview = await generateInterview(jobDescription);
        res.json(interview);
        
    } catch (error) {
        console.error('Error en la ruta de entrevista:', error);
        res.status(500).json({ 
            error: 'Error al generar la entrevista',
            details: error.message 
        });
    }
});

// Nueva ruta para detección de postulantes
router.post('/detect-postulantes', async (req, res) => {
    try {
        const { jobDescription, candidateInfo, archivos } = req.body;
        
        if (!jobDescription || !candidateInfo) {
            return res.status(400).json({ 
                error: 'Se requieren tanto la descripción del trabajo como la información del candidato' 
            });
        }

        const analysis = await detectPostulantesByProactivePerfil(jobDescription, candidateInfo, archivos || []);
        res.json({ analysis });
        
    } catch (error) {
        console.error('Error en la ruta de detección:', error);
        res.status(500).json({ 
            error: 'Error al analizar el candidato',
            details: error.message 
        });
    }
});

router.get('/analyze-template', async (req, res) => {
    try {
        const templatePath = 'C:/Users/Usuario.Sooft/Downloads/AITALENT/backend/files/Template CV sooft.docx';
        const analysis = await analyzeTemplateCV(templatePath);
        res.json(analysis);
    } catch (error) {
        console.error('Error en análisis de template:', error);
        res.status(500).json({ 
            error: 'Error al analizar el template',
            details: error.message 
        });
    }
});


router.post('/generate-curriculum-ficha', async (req, res) => {
    try {
        const { postulantInfo, archivos, analisisPostulante, templatePath } = req.body;
        
        if (!postulantInfo || !archivos) {
            return res.status(400).json({ 
                error: 'Se requiere la información del postulante y sus archivos' 
            });
        }

        const result = await generateCurriculumFicha(
            postulantInfo, 
            archivos, 
            analisisPostulante,
            templatePath
           
        );
        
                // Configurar headers para DOCX
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=CV_${postulantInfo.nombre}_${postulantInfo.apellido}.docx`);
                
                res.send(result);
        
    } catch (error) {
        console.error('Error en la generación de ficha curricular:', error);
        res.status(500).json({ 
            error: 'Error al generar la ficha curricular',
            details: error.message 
        });
    }
});
router.post('/generate-curriculum-fichaOS', async (req, res) => {
    try {
        const { postulantInfo, archivos, analisisPostulante, templatePath } = req.body;
        
        if (!postulantInfo || !archivos) {
            return res.status(400).json({ 
                error: 'Se requiere la información del postulante y sus archivos' 
            });
        }

        const result = await generateCurriculumFichaOS(
            postulantInfo, 
            archivos, 
            analisisPostulante,
            templatePath
           
        );
        
                // Configurar headers para DOCX
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=CV_${postulantInfo.nombre}_${postulantInfo.apellido}.docx`);
                
                res.send(result);
        
    } catch (error) {
        console.error('Error en la generación de ficha curricular:', error);
        res.status(500).json({ 
            error: 'Error al generar la ficha curricular',
            details: error.message 
        });
    }
});

// Endpoint para obtener el saldo de OpenAI
router.get('/balance', async (req, res) => {
  try {
    console.log('Consultando balance de OpenAI...')
    
    // Obtener el saldo de la cuenta
    const response = await fetch('https://api.openai.com/v1/dashboard/billing/usage', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Respuesta de error de OpenAI:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`Error de API: ${response.status} ${response.statusText}`);
    }
    
    const billingData = await response.json();
    console.log('Respuesta de OpenAI:', billingData)
    
    // Calcular el saldo disponible
    const totalGranted = billingData.total_usage || 0;
    const totalUsed = billingData.total_usage || 0;
    const availableBalance = totalGranted - totalUsed;
    
    // Obtener la fecha actual
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    console.log('Métricas calculadas:', {
      totalGranted,
      totalUsed,
      availableBalance,
      date: today
    })
    
    res.json({ 
      balance: {
        available: availableBalance,
        totalGranted,
        totalUsed
      },
      details: {
        lastUpdated: new Date().toISOString(),
        currentMonth,
        date: today
      }
    });
  } catch (error) {
    console.error('Error detallado al obtener el saldo:', {
      message: error.message,
      code: error.code,
      type: error.type
    });
    res.status(500).json({ 
      error: 'Error al obtener el saldo de OpenAI',
      details: error.message
    });
  }
});

export default router; 