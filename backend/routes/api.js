import express from 'express';
import fetch from 'node-fetch';
import apiRouter from './routes/api.js';  // en lugar de const apiRouter = express.Router();

const router = express.Router();

// Ruta de prueba para verificar que el router está funcionando
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ruta para descargar archivos
router.post('/download-file', async (req, res) => {
  console.log('Recibida petición de descarga:', req.body);
  
  try {
    const { url, token } = req.body;
    
    if (!url || !token) {
      throw new Error('URL y token son requeridos');
    }

    console.log('Intentando descargar desde:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en la descarga: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    
    // Configurar headers para la respuesta
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);

  } catch (error) {
    console.error('Error en download-file:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('Rutas definidas en el router:', router.stack);
export default router; 