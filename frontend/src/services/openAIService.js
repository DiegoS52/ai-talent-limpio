import axios from 'axios';

const API_URL = 'http://localhost:3005/api';

export const openAIService = {
    async analyzeCandidate(jobDescription, candidateInfo) {
        try {
            const requestData = {
                jobDescription,
                candidateInfo
            };

            console.log('=== DATOS ENVIADOS AL BACKEND ===');
            console.log('Request Body:', JSON.stringify(requestData, null, 2));
            console.log('================================');

            const response = await axios.post(
                `${API_URL}/openai/analyze-candidate`, 
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('=== RESPUESTA DEL BACKEND ===');
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
            console.log('============================');

            return response.data;
        } catch (error) {
            console.error('=== ERROR EN LLAMADA AL BACKEND ===');
            console.error('Error completo:', error);
            console.error('Datos del error:', error.response?.data);
            console.error('Status del error:', error.response?.status);
            console.error('=====================');
            throw error;
        }
    },


    async analizarPerfil(descripcion) {
        try {
            const requestData = {
                descripcion
            };

            console.log('=== DATOS ENVIADOS AL BACKEND PARA ANÁLISIS DE PERFIL ===');
            console.log('Request Body:', JSON.stringify(requestData, null, 2));
            console.log('================================');

            const response = await axios.post(
                `${API_URL}/openai/analizar-perfil`, 
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('=== RESPUESTA DEL BACKEND PARA ANÁLISIS DE PERFIL ===');
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
            console.log('============================');

            return response.data;
        } catch (error) {
            console.error('=== ERROR EN LLAMADA AL BACKEND PARA ANÁLISIS DE PERFIL ===');
            console.error('Error completo:', error);
            console.error('Datos del error:', error.response?.data);
            console.error('Status del error:', error.response?.status);
            console.error('=====================');
            throw error;
        }
    },

    async generateInterview(jobDescription) {
        try {
            const requestData = {
                jobDescription
            };

            console.log('=== DATOS ENVIADOS AL BACKEND PARA ENTREVISTA ===');
            console.log('Request Body:', JSON.stringify(requestData, null, 2));
            console.log('================================');

            const response = await axios.post(
                `${API_URL}/openai/generate-interview`, 
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('=== RESPUESTA DEL BACKEND PARA ENTREVISTA ===');
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
            console.log('============================');

            return response.data;
        } catch (error) {
            console.error('=== ERROR EN LLAMADA AL BACKEND PARA ENTREVISTA ===');
            console.error('Error completo:', error);
            console.error('Datos del error:', error.response?.data);
            console.error('Status del error:', error.response?.status);
            console.error('=====================');
            throw error;
        }
    },

    async generateCurriculumFicha(postulantInfo, archivos, analisisPostulante) {
        try {
            const requestData = {
                postulantInfo,
                archivos,
                analisisPostulante,
                templatePath: 'files/Template CV sooft.docx' 
            };
    
            console.log('=== DATOS ENVIADOS AL BACKEND PARA GENERAR DOCUMENTOS ===');
            console.log('Request Body:', JSON.stringify(requestData, null, 2));
    
            const response = await axios.post(
                `${API_URL}/openai/generate-curriculum-ficha`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer' // Para manejar la descarga del ZIP
                }
            );
    
            return response.data;
        } catch (error) {
            console.error('=== ERROR EN LLAMADA AL BACKEND PARA GENERAR DOCUMENTOS ===');
            console.error('Error completo:', error);
            console.error('Datos del error:', error.response?.data);
            console.error('Status del error:', error.response?.status);
            throw error;
        }
    },
    async generateCurriculumFichaOneSelect(postulantInfo, archivos, analisisPostulante) {
        try {
            const requestData = {
                postulantInfo,
                archivos,
                analisisPostulante,
                templatePath: 'files/Template CV oneSelect.docx' 
            };
    
            console.log('=== DATOS ENVIADOS AL BACKEND PARA GENERAR DOCUMENTOS ===');
            console.log('Request Body:', JSON.stringify(requestData, null, 2));
    
            const response = await axios.post(
                `${API_URL}/openai/generate-curriculum-fichaOS`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer' // Para manejar la descarga del ZIP
                }
            );
    
            return response.data;
        } catch (error) {
            console.error('=== ERROR EN LLAMADA AL BACKEND PARA GENERAR DOCUMENTOS ===');
            console.error('Error completo:', error);
            console.error('Datos del error:', error.response?.data);
            console.error('Status del error:', error.response?.status);
            throw error;
        }
    },
    async detectPostulantesByProactivePerfil(jobDescription, candidateInfo, archivos) {
        try {
            const requestData = {
                jobDescription,
                candidateInfo,
                archivos
            };

          //  console.log('=== DATOS ENVIADOS AL BACKEND PARA DETECCIÓN ===');
          //  console.log('Request Body:', JSON.stringify(requestData, null, 2));
          //  console.log('================================');

            const response = await axios.post(
                `${API_URL}/openai/detect-postulantes`, 
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
          //  console.log('=== RESPUESTA DEL BACKEND PARA DETECCIÓN ===');
          //  console.log('Response Data:', JSON.stringify(response.data, null, 2));
          //  console.log('============================');

            return response.data;
        } catch (error) {
            console.error('=== ERROR EN LLAMADA AL BACKEND PARA DETECCIÓN ===');
            console.error('Error completo:', error);
            console.error('Datos del error:', error.response?.data);
            console.error('Status del error:', error.response?.status);
            console.error('=====================');
            throw error;
        }
    }
}; 