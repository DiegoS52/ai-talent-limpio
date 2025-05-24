import axios from 'axios';
//import { API_URL } from '@/config';
import { jwtDecode } from "jwt-decode";
const API_URL = 'http://localhost:3005/api';


axios.interceptors.response.use(
    response => response,
    error => {
      // Si es un 404, lo manejamos silenciosamente
      if (error.response && error.response.status === 404) {
        return Promise.resolve({ status: 404, data: null });
      }
      return Promise.reject(error);
    }
  );

export const analysisService = {
    saveAnalysis: async (data) => {
        console.log('Iniciando saveAnalysis con datos:', data);
      try {
        const token = localStorage.getItem('hr_token');
        console.log('Token:', token);
        // Obtener información del usuario del token
        let userInfo = {
          userId: null,
          userEmail: null
        };
        
        if (token) {
          try {
            const decoded = jwtDecode(token);
            userInfo = {
              userId: decoded.uid || decoded.id || decoded.userId,
              userEmail: decoded.uem || decoded.email || decoded.userEmail
            };
          } catch (tokenError) {
            console.error('Error al decodificar el token:', tokenError);
          }
        }
  
        // Agregar información del usuario a los datos
        const analysisData = {
          ...data,
          userId: userInfo.userId,
          userEmail: userInfo.userEmail,
          timestamp: new Date().toISOString()
        };
  
        const response = await axios.post(`${API_URL}/analysis`, analysisData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Respuesta de análisis:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error guardando análisis:', error);
        throw error;
      }
    },
// Obtener análisis por vacante y postulante
getAnalysis: async (vacancyId, postulantId) => {
    try {
      const token = localStorage.getItem('hr_token');
      const response = await axios.get(`${API_URL}/analysis/${vacancyId}/${postulantId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
       });
          // Caso: No hay análisis (404 o mensaje específico)
          if (response.status === 404 || 
            (response.data && response.data.message === 'Análisis no encontrado')) {
          return null; // Esto indicará al frontend que debe mostrar estado 'pendiente'
        }
      console.log('Respuesta de MongoDB:', response.data); // Agregar este log
      return response.data;
    } catch (error) {
        if (!error.response || error.response.status !== 404) {
            console.error('Error obteniendo análisis:', error);
          }
      //console.error('Error obteniendo análisis:', error);
      // Si no existe en MongoDB, intentar obtener de localStorage (para compatibilidad)
      const analysisKey = `analysis_${vacancyId}_${postulantId}`;
      const localData = localStorage.getItem(analysisKey);
      return localData ? JSON.parse(localData) : null;
    }
  },

  // Obtener todos los análisis de una vacante
  getAnalysesByVacancy: async (vacancyId) => {
    try {
      const token = localStorage.getItem('hr_token');
      console.log('Solicitando análisis para vacante:', vacancyId);
      const response = await axios.get(`${API_URL}/analysis/vacancy/${vacancyId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Análisis recibidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo análisis de la vacante:', error);
      throw error;
    }
  }
    
  };
  