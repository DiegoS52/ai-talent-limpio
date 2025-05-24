import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import apiRoutes from './routes/api.js';  // Nota: necesitamos la extensión .js

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Debug middleware - debe ir DESPUÉS de cors y express.json
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log('Request recibido:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

// Ruta de prueba en la raíz
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando' });
});

// Montamos las rutas directamente sin /api
app.use('/api', apiRoutes);  // Cambiado de '/api' a '/api'

console.log('Rutas disponibles en apiRoutes:', apiRoutes.stack);

// Ruta de prueba directa
app.post('/test-download', (req, res) => {
  console.log('Test download route hit');
  res.json({ status: 'ok' });
});

// Manejador de errores 404
app.use((req, res) => {
  console.log(`[404] Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores general
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  
  // Debug: Imprimir todas las rutas registradas
  console.log('\nRutas registradas:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
    } else if (r.name === 'router') {
      console.log('Router middleware:', r);
    }
  });
});

export default app; 