import Analysis from '../models/Analysis.js';

export const saveAnalysis = async (req, res) => {
  try {

    console.log('Recibiendo petición de análisis:', {
        body: req.body,
        headers: req.headers
      });
    const analysisData = req.body;
    
    // Verificar si ya existe un análisis para esta combinación de vacante/postulante
    const existingAnalysis = await Analysis.findOne({
      vacancyId: analysisData.vacancyId,
      postulantId: analysisData.postulantId
    });

    console.log('Análisis existente:', existingAnalysis);
    let analysis;
    if (existingAnalysis) {
      // Actualizar el existente
      analysis = await Analysis.findByIdAndUpdate(
        existingAnalysis._id,
        analysisData,
        { new: true }
      );
      console.log('Análisis actualizado:', analysis);
    } else {
      // Crear nuevo
      analysis = await Analysis.create(analysisData);
      console.log('Análisis creado:', analysis);
    }

    res.status(200).json({
      message: 'Análisis guardado correctamente',
      analysis
    });
  } catch (error) {
    console.error('Error al guardar análisis:', error);
    res.status(500).json({
      message: 'Error al guardar el análisis',
      error: error.message
    });
  }
}; 

export const getAnalysis = async (req, res) => {
    try {
      const { vacancyId, postulantId } = req.params;
      const analysis = await Analysis.findOne({ vacancyId, postulantId });
      
      if (!analysis) {
        return res.status(404).json({
          message: 'Análisis no encontrado'
        });
      }
  
      res.json(analysis);
    } catch (error) {
      console.error('Error al obtener análisis:', error);
      res.status(500).json({
        message: 'Error al obtener el análisis',
        error: error.message
      });
    }
  };
  
  export const getAnalysesByVacancy = async (req, res) => {
    try {
      const { vacancyId } = req.params;
      console.log('Buscando análisis para vacante:', vacancyId);
    
      const analyses = await Analysis.find({ vacancyId });
      console.log('Análisis encontrados:', analyses.length);
      res.json(analyses);
    } catch (error) {
      console.error('Error al obtener análisis de la vacante:', error);
      res.status(500).json({
        message: 'Error al obtener los análisis',
        error: error.message
      });
    }
  };