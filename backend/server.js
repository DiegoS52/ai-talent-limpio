import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fetch from 'node-fetch';
import openaiRoutes from './routes/openaiRoutes.js';  // Nota: agregamos .js por ser ES modules
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import searchHistoryRoutes from './src/routes/searchHistory.js';
import analysisRoutes from './src/routes/analysisRoutes.js';
import postulantRoutes from './src/routes/postulantRoutes.js';
import tokenRoutes from './src/routes/tokenRoutes.js';
import syncService from './services/syncService.js'; //no borrar
import morgan from 'morgan';

dotenv.config();

const app = express();

// Definir las constantes al inicio del archivo
const HIRING_ROOM_API = 'https://api.hiringroom.com/v0';
const PORT = process.env.PORT || 3005;

app.use(morgan('dev'));

// Configuración básica
app.use(cors());
//app.use(express.json());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/api/tokens', tokenRoutes);


// Logging middleware mejorado
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Agregar justo después de app.use(express.json());
app.use((req, res, next) => {
  console.log('Petición recibida:', {
    method: req.method,
    url: req.url,
    path: req.path,
    body: req.body
  });
  next();
});

// Crear un router para las rutas /api
const apiRouter = express.Router();

// Conectar a MongoDB
connectDB();

// Rutas de prueba
apiRouter.get('/test', (req, res) => {
  console.log('[TEST] Test endpoint called');
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Agregar las nuevas rutas al apiRouter (agregar junto con las otras rutas del apiRouter)
apiRouter.use('/search-history', searchHistoryRoutes);
apiRouter.use('/analysis', analysisRoutes);
apiRouter.use('/postulants', postulantRoutes);
console.log('Rutas disponibles:', {
  analysis: '/api/analysis',
  // ... otras rutas
});
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ruta de autenticación
apiRouter.post('/auth', async (req, res) => {
  console.log('[AUTH] Iniciando autenticación');
  
  try {
    if (!req.body) {
      throw new Error('No request body provided');
    }

    const { clientId, clientSecret, username, password } = req.body;
    
    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('Missing required fields');
    }

    console.log('[AUTH] Iniciando autenticación con nueva URL');
    
    const requestBody = {
        grand_type: "password",
        client_id: clientId,
        client_secret: clientSecret,
        username: username,
        password: password
    };

    console.log('[AUTH] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await axios({
        method: 'post',
        url: 'https://api.hiringroom.com/v0/authenticate/login/users',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    console.log('[AUTH] Respuesta exitosa');
    res.json(response.data);
  } catch (error) {
    console.error('[AUTH] Error de validación:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        errors: error.response?.data?.errors,
        requestBody: {
            grand_type: req.body.grand_type,
            client_id: req.body.clientId,
            client_secret: '***',
            username: req.body.username
        }
    });

    if (error.response?.status === 422) {
        console.error('[AUTH] Detalles de validación:', 
            JSON.stringify(error.response.data, null, 2)
        );
    }

    res.status(error.response?.status || 500).json({
        error: error.response?.data || error.message
    });
  }
});

// Agregar este nuevo endpoint en el apiRouter junto con los demás
apiRouter.get('/vacancies', async (req, res) => {
    console.log('[VACANCIES] Iniciando petición de vacantes');
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('No se proporcionó token de autorización');
        }

        console.log('[VACANCIES] Enviando request a HiringRoom con token:', 
            token.substring(0, 20) + '...');

        const response = await axios.get(`${HIRING_ROOM_API}/vacancies`, {
            params: {
                page: 0,
                pageSize: 20,
                token: token
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('[VACANCIES] Respuesta recibida:', {
            status: response.status,
            count: response.data?.length || 0
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('[VACANCIES] Error:', {
            status: error.response?.status,
            message: error.response?.data?.message,
            error: error.message,
            headers: error.response?.config?.headers
        });
        
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Agregar la ruta de download-file aquí
apiRouter.post('/download-file', async (req, res) => {
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

// Agregar las rutas de OpenAI al apiRouter
apiRouter.use('/openai', openaiRoutes);

// Montar el router en /api
app.use('/api', apiRouter);

// Ruta raíz para verificar que el servidor está funcionando
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Server is running',
//     endpoints: {
//       test: '/api/test',
//       health: '/api/health',
//       auth: '/api/auth',
//       openai: '/api/openai/analyze-candidate',  // Agregamos el nuevo endpoint
//    searchHistory: '/api/search-history'  // Agregamos el nuevo endpoint
//     }
//   });
// });

// Catch-all route para debugging
// app.use('*', (req, res) => {
//   console.log(`[404] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
//   res.status(404).json({
//     error: 'Route not found',
//     method: req.method,
//     url: req.originalUrl,
//     availableRoutes: [
//       'GET /api/test',
//       'GET /api/health',
//       'POST /api/auth',
//       'POST /api/openai/analyze-candidate',
//       'GET /api/search-history',
//       'POST /api/search-history',
//       'GET /api/search-history/:id', 
//       'POST /api/analysis',
//       'GET /api/analysis' 
//     ]
//   });
// });

// Error handling
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
=================================
Server started successfully!
---------------------------------
Available endpoints:
  GET  http://localhost:${PORT}/api/test
  GET  http://localhost:${PORT}/api/health
  POST http://localhost:${PORT}/api/auth
  POST http://localhost:${PORT}/api/download-file
  POST http://localhost:${PORT}/api/search-history
  GET  http://localhost:${PORT}/api/search-history
  GET  http://localhost:${PORT}/api/search-history/:id  
  POST http://localhost:${PORT}/api/analysis
  GET  http://localhost:${PORT}/api/analysis

---------------------------------
Timestamp: ${new Date().toISOString()}
=================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
}); 