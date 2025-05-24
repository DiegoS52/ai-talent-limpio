import express from 'express';
import TokenUsage from '../models/TokenUsage.js';

const router = express.Router();

// Ruta para guardar tokens
router.post('/guardar', async (req, res) => {
  try {
    const newEntry = new TokenUsage(req.body);
    await newEntry.save();
    res.status(200).json({ mensaje: 'Tokens guardados con éxito' });
  } catch (error) {
    console.error('Error al guardar tokens:', error);
    res.status(500).json({ error: 'Error al guardar tokens' });
  }
});

// Ruta para consultar históricos
router.get('/historico', async (req, res) => {
  try {
    console.log('[TOKENS] Recibida petición de histórico');
    
    const { 
      sortField = 'fecha', 
      sortOrder = 'desc', 
      startDate, 
      endDate, 
      query,
      page = 1,
      limit = 10
    } = req.query;
    
    console.log('[TOKENS] Parámetros recibidos:', { 
      sortField, 
      sortOrder, 
      startDate, 
      endDate, 
      query,
      page,
      limit
    });
    
    let filter = {};
    
    if (startDate || endDate) {
      filter.fecha = {};
      if (startDate) {
        // Para la fecha de inicio, usamos el inicio del día
        const start = new Date(startDate + 'T00:00:00.000Z');
        filter.fecha.$gte = start;
        console.log('[TOKENS] Fecha inicio:', start);
      }
      if (endDate) {
        // Para la fecha de fin, usamos el inicio del día siguiente
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const end = new Date(nextDay.toISOString().split('T')[0] + 'T00:00:00.000Z');
        filter.fecha.$lt = end;
        console.log('[TOKENS] Fecha fin:', end);
      }
    }
    
    if (query) {
      const queryTypes = query.split(',');
      filter.consulta = { $in: queryTypes };
    }
    
    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
    
    // Calcular skip para la paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtener total de documentos y total consumido
    const [total, totalConsumido] = await Promise.all([
      TokenUsage.countDocuments(filter),
      TokenUsage.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: { $toDouble: "$costo_total" } } } }
      ])
    ]);
    
    // Obtener datos paginados
    const tokens = await TokenUsage.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
      
    console.log('[TOKENS] Datos encontrados:', tokens.length);
    console.log('[TOKENS] Filtro aplicado:', JSON.stringify(filter, null, 2));
    
    res.json({
      tokens,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      totalConsumido: totalConsumido[0]?.total || 0
    });
  } catch (error) {
    console.error('[TOKENS] Error:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

export default router; 




