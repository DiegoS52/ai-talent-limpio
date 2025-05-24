import axios from 'axios';

const current_env = () => {
  return import.meta.env.VITE_NODE_ENV
}
const BASE_URL = current_env() === 'production'
  ? "https://aitalent.sooft.tech" 
  : "http://127.0.0.1:3005";

function sanitizePostulant(postulant) {
  try {
      const toNumber = (value) => {
          if (value === '' || value === null || value === undefined) return null;
          const num = Number(value);
          return isNaN(num) ? null : num;
      };

      // Sanitizar estudios
      const estudios = postulant.estudios?.map(estudio => ({
          ...estudio,
          mesDesde: toNumber(estudio.mesDesde),
          añoDesde: toNumber(estudio.añoDesde),
          mesHasta: toNumber(estudio.mesHasta),
          añoHasta: toNumber(estudio.añoHasta),
          estudioActual: Boolean(estudio.estudioActual),
          pais: String(estudio.pais || '')
      })) || [];

      // Sanitizar experiencias laborales
      const experienciasLaborales = postulant.experienciasLaborales?.map(exp => ({
          ...exp,
          mesDesde: toNumber(exp.mesDesde),
          añoDesde: toNumber(exp.añoDesde),
          mesHasta: toNumber(exp.mesHasta),
          añoHasta: toNumber(exp.añoHasta),
          trabajoActual: Boolean(exp.trabajoActual)
      })) || [];

       // Sanitizar dirección (ahora como objeto)
       const direccion = postulant.direccion ? {
        ...postulant.direccion,
        paisId: toNumber(postulant.direccion.paisId),
        provinciaId: toNumber(postulant.direccion.provinciaId),
        ciudadId: toNumber(postulant.direccion.ciudadId)
    } : {};

      return {
          ...postulant,
          hiringRoomId: String(postulant.id || postulant.hiringRoomId),
          calificacion: toNumber(postulant.calificacion),
          estudios,
          experienciasLaborales,
          direccion,
          isActive: true
      };
  } catch (error) {
      console.error('Error sanitizing postulant:', error);
      return null;
  }
}
// Probemos diferentes combinaciones de URLs
const API_URLS = [
  'https://api.hiringroom.com',
  'https://api.hiringroom.com/v1',
  'https://hiringroom.com/api',
  'https://hiringroom.com/api/v1'
]

// Y diferentes endpoints
const AUTH_ENDPOINTS = [
  '/authenticate/login/users',
  '/auth/login/users',
  '/auth/login',
  '/oauth/token'
]

const API_URL = 'https://api.hiringroom.com/v0';

export const hiringRoomService = {
  async authenticate(credentials) {
    try {
      console.log('\n=== INTENTO DE AUTENTICACIÓN ===');
      console.log('Request URL:', `${API_URL}/authenticate/login/users`);
      
      const requestBody = {
        grand_type: 'password',
        username: credentials.username,
        password: credentials.password,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret
      };

      console.log('Request Body:', {
        ...requestBody,
        password: '***'
      });

     // ELIMINAR: Ya no usamos la configuración hardcodeada
      // console.log('Configuración actual:', {
      //   username: hiringRoomConfig.username,
      //   clientId: hiringRoomConfig.clientId,
      // });

      const response = await axios.post(`${API_URL}/authenticate/login/users`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('\n=== RESPUESTA DE AUTENTICACIÓN ===');
      console.log('Status:', response.status);
      console.log('Datos completos:', response.data);
      console.log('================================\n');

      const token = response.data.token;
      if (!token) {
        throw new Error('No se recibió token en la respuesta');
      }
      
      console.log('Token guardado:', token);
      localStorage.setItem('hr_token', token);
      return { token };
    } catch (error) {
      console.error('\n=== ERROR EN AUTENTICACIÓN ===');
      console.error('Error completo:', error);
      console.error('Datos del error:', error.response?.data);
      if (error.response?.data?.errors) {
        console.error('Errores de validación:', JSON.stringify(error.response.data.errors, null, 2));
      }
      console.error('Status del error:', error.response?.status);
      console.error('================================\n');
      throw new Error('Error de autenticación: ' + (error.response?.data?.message || error.message));
    }
  },

  async getVacancyPostulantsCount(vacancyId) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      const response = await fetch(`${API_URLS[0]}/v0/postulants?vacancyId=${vacancyId}&token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error al obtener postulantes')
      }

      const data = await response.json()
      return data.total || 0
    } catch (error) {
      console.error('Error al obtener cantidad de postulantes:', error)
      return 0
    }
  },

  async getVacancies(page = 0, pageSize = 20, searchText = '') {
    try {
      const token = localStorage.getItem('hr_token');
      if (!token) {
        throw new Error('No hay token disponible');
      }
  
      const params = {
        page: page,
        pageSize: -1, // Usamos -1 para obtener todas las vacantes
        listStatus: 'activa,confidencial,espontanea',
        token
      };
  
      // Agregamos el término de búsqueda si existe
      if (searchText && searchText.trim()) {
        params.search = searchText.trim();
      }
  
      const response = await axios.get(`${API_URL}/vacancies`, { params });
  
      // Ordenamos las vacantes por fecha de creación (más reciente primero)
      const vacantesOrdenadas = (response.data.vacantes || []).sort((a, b) => {
        // Convertimos las fechas a objetos Date para comparar
        const fechaA = new Date(a.fechaCreacion.split('-').reverse().join('-'));
        const fechaB = new Date(b.fechaCreacion.split('-').reverse().join('-'));
        return fechaB - fechaA; // Orden descendente (más reciente primero)
      });
  
      return {
        items: vacantesOrdenadas,
        pagination: {
          currentPage: 1,
          limit: vacantesOrdenadas.length,
          total: response.data.total || 0,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error('Error al obtener vacantes:', error);
      throw error;
    }
  },

  async getVacancyNotes(vacancyId) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      const response = await fetch(`${API_URLS[0]}/v0/vacancies/${vacancyId}/notes?token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al obtener descripción')
      }

      return await response.json()
    } catch (error) {
      console.error('Error al obtener descripción:', error)
      throw error
    }
  },

  async getVacancyRequirements(vacancyId) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      const response = await fetch(`${API_URLS[0]}/v0/vacancies/${vacancyId}/requirements?token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al obtener requerimientos')
      }

      return await response.json()
    } catch (error) {
      console.error('Error al obtener requerimientos:', error)
      throw error
    }
  },

  async getVacancyPostulants(vacancyId, page = 0, pageSize = 100) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      const response = await fetch(`${API_URLS[0]}/v0/postulants?vacancyId=${vacancyId}&page=${page}&pageSize=${pageSize}&token=${token}`
, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al obtener postulantes')
      }

      return await response.json()
    } catch (error) {
      console.error('Error al obtener postulantes:', error)
      throw error
    }
  },

  async getVacancyBase(vacancyId) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      const response = await fetch(`${API_URLS[0]}/v0/vacancies/base?token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al obtener vacante base')
      }

      return await response.json()
    } catch (error) {
      console.error('Error al obtener vacante base:', error)
      throw error
    }
  },

  async getPostulantDetails(postulantId) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      //console.log(`Intentando obtener detalles del postulante ${postulantId}...`)
      
      const response = await fetch(`${API_URLS[0]}/v0/postulants/${postulantId}?token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      //console.log('Status de respuesta:', response.status);
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error en respuesta del servidor:', error)
        throw new Error(error.message || 'Error al obtener detalles del postulante')
      }

      const data = await response.json()
     // console.log('Respuesta completa:', data);
      
      // Procesamos los adjuntos para convertirlos en un array más fácil de manejar
      const adjuntos = data.postulant?.adjuntos || {};
      //console.log('Adjuntos encontrados:', adjuntos);
      
      const archivosFormateados = Object.entries(adjuntos).map(([nombre, url]) => ({
        nombre: nombre,
        url: url
      }));

     // console.log('Archivos procesados:', archivosFormateados);

      return {
        ...data.postulant,
        archivos: archivosFormateados
      }
    } catch (error) {
      console.error(`Error al obtener detalles del postulante ${postulantId}:`, error)
      throw error
    }
  },

  async searchActivePostulants(page = 0, pageSize = 100) {
    try {
      const token = localStorage.getItem('hr_token')
      if (!token) throw new Error('No hay token disponible')

      const response = await fetch(`${API_URLS[0]}/v0/postulants?page=${page}&pageSize=${pageSize}&token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al obtener postulantes activos')
      }

      return await response.json()
    } catch (error) {
      console.error('Error al obtener postulantes activos:', error)
      throw error
    }
  },

  // async getAllActivePostulants(progressCallback = null) {
  //   try {
  //     // Obtener primera página para saber el total
  //     const firstPage = await this.searchActivePostulants(0, 100)
     
  //     const totalPages = firstPage.totalPaginas


  //      //     // TEMPORAL: Forzar solo una página de 40 postulantes
  //      //const totalPages = 10 // En lugar de firstPage.totalPaginas
  //     let allPostulants = [...firstPage.curriculums.slice(0, 70000)] // Limitamos a 40

  //     // Si hay más páginas, obtenerlas todas
  //     if (totalPages > 1) {
  //       const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1)
        
  //       // Procesar páginas en grupos de 3 para no sobrecargar la API
  //       for (let i = 0; i < remainingPages.length; i += 3) {
  //         const pageGroup = remainingPages.slice(i, i + 3)
  //         const pagePromises = pageGroup.map(page => 
  //           this.searchActivePostulants(page, 100)
  //         )

  //         const results = await Promise.all(pagePromises)
  //         results.forEach(result => {
  //           allPostulants = [...allPostulants, ...result.curriculums]
  //         })

  //         if (progressCallback) {
  //           const progress = Math.min(
  //             ((i + 3) / totalPages) * 100,
  //             100
  //           )
  //           progressCallback(progress)
  //         }
  //       }
  //     }

  //     return {
  //       postulants: allPostulants,
  //       total: 70000, // TEMPORAL: Forzar total
  //       totalPages: totalPages
  //     }
  //   } catch (error) {
  //     if (error.message === 'CANCELED') {
  //       return { canceled: true }; // En lugar de relanzar, retornamos un objeto indicando la cancelación
  //     } else {
  //       console.error('Error al obtener todos los postulantes:', error)
  //       throw error;
  //     }
  //   }
  // },

  async getAllActivePostulants(progressCallback = null) {
    try {
        const token = localStorage.getItem('hr_token');
        if (!token) throw new Error('No hay token disponible');

        // Verificar sincronización desde MongoDB
        let lastSync = null;
        let count = 0;
        let totalPostulants = 0;
        
        try {
            const syncStatusResponse = await axios.get(BASE_URL+'/api/postulants/sync-status');
            lastSync = syncStatusResponse.data?.lastSync;
            count = syncStatusResponse.data?.count || 0;
        } catch (error) {
            console.log('Error al obtener estado de sincronización, asumiendo que necesita sincronizar:', error);
        }

        const today = new Date().toISOString().split('T')[0];
        
        console.log('Iniciando getAllActivePostulants');
        console.log('Última sincronización:', lastSync);

        //lastSync = '2024-04-02T00:00:00.000Z'; // ayer
        if (lastSync?.split('T')[0] !== today) {
            console.log('Necesita sincronización');
            
            // Obtener primera página y total
            const firstPage = await this.searchActivePostulants(0, 100);
            //console.log('Primera página obtenida:', firstPage);
            const totalPages = firstPage.totalPaginas;
            
            // Procesar primera página inmediatamente
            const OPTIMAL_BATCH_SIZE = 500;
            let currentBatch = firstPage.curriculums
                .map(sanitizePostulant)
                .filter(p => p !== null);

                totalPostulants += currentBatch.length; // ✅ Sumar al contador

            if (currentBatch.length > 0) {
                await axios.post(BASE_URL+`/api/postulants/sync-batch`, {
                    postulants: currentBatch
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            // Procesar páginas restantes
            if (totalPages > 1) {
                console.log('Total de páginas:', totalPages);
                
                // Función de utilidad para espera
                const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                // Función de reintento con espera exponencial
                const retryFetch = async (page, retries = 3, delay = 2000) => {
                    for (let i = 0; i < retries; i++) {
                        try {
                            return await this.searchActivePostulants(page, 100);
                        } catch (error) {
                            if (i === retries - 1) throw error;
                            console.log(`Reintentando página ${page} después de ${delay}ms...`);
                            await wait(delay);
                            delay *= 2;
                        }
                    }
                };

                // Procesar páginas en grupos de 3
                for (let i = 1; i < totalPages; i += 3) {
                    const pageGroup = Array.from(
                        { length: Math.min(3, totalPages - i) },
                        (_, index) => i + index
                    );
                    
                       /*  // ⚠️ Esto corta el bucle después de la página 50 (útil para pruebas)
                        if (i > 6) {
                          console.log('🛑 Cortando bucle de prueba en página', i);
                          break;
                      } */
                      console.log(`Procesando grupo de páginas ${i} a ${Math.min(i + 2, totalPages - 1)}`);

                    try {
                        // Obtener páginas en paralelo
                        const results = await Promise.all(
                            pageGroup.map(page => retryFetch(page))
                        );

                        // Procesar resultados inmediatamente
                        for (const result of results) {
                            const processedPostulants = result.curriculums
                                .map(sanitizePostulant)
                                .filter(p => p !== null);

                            totalPostulants += processedPostulants.length; // ✅ Sumar al contador

                            // Guardar en lotes óptimos
                            for (let j = 0; j < processedPostulants.length; j += OPTIMAL_BATCH_SIZE) {
                                const batchToSave = processedPostulants.slice(j, j + OPTIMAL_BATCH_SIZE);
                                await axios.post(BASE_URL+`/api/postulants/sync-batch`, {
                                    postulants: batchToSave
                                }, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                            }
                        }

                        // Actualizar progreso
                        if (progressCallback) {
                            const progress = Math.min((i / totalPages) * 100, 100);
                            progressCallback(progress);
                        }
                        console.log(`Progreso: ${Math.min((i / totalPages) * 100, 100)}%`);

                    } catch (error) {
                        console.error(`Error en grupo de páginas ${i}-${i+2}:`, error);
                        // Continuar con el siguiente grupo
                    }

                    // Esperar entre grupos
                    await wait(1000);
                }
            }

            // Actualizar fecha de última sincronización
            localStorage.setItem('lastPostulantsSync', today);
            
            // Obtener postulantes sincronizados
            /* const syncedPostulants = await axios.get(`http://localhost:3005/api/postulants/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }); */

            // Generar una clave temporal única para identificar los datos
            const tempKey = `sync_${Date.now()}`;
            console.log('📦 Enviando tempKey al backend para almacenar:', tempKey);

            // Ordenar al backend que agrupe los datos bajo esa clave
            await axios.post(BASE_URL+`/api/postulants/store-temp`, {
                key: tempKey
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
           /*  return {
                postulants: syncedPostulants.data,
                total: syncedPostulants.data.length,
                totalPages: Math.ceil(syncedPostulants.data.length / 100)
            }; */
            console.log('✅ Clave guardada aparentemente con éxito:', tempKey);
            try {
              const testResponse = await axios.get(BASE_URL+`/api/postulants/retrieve-temp?key=${tempKey}`);
              console.log('🎉 ¡Clave ya está disponible en backend! Total postulantes:', testResponse.data?.length);
          } catch (err) {
              console.warn('❌ Clave aún NO disponible en backend inmediatamente después del POST:', tempKey);
          }
            return {
              tempKey: tempKey,
              total: totalPostulants,
              totalPages: Math.ceil(totalPostulants / 100)
          };
        }


        // Si ya sincronizamos hoy, solo generamos la tempKey y dejamos que otro proceso los recupere
        const tempKey = `sync_${Date.now()}`;

          // Pedimos al backend que agrupe los datos bajo esa clave
          await axios.post(BASE_URL+`/api/postulants/store-temp`, {
              key: tempKey
          }, {
              headers: { 'Authorization': `Bearer ${token}` }
          });

          // Obtenemos el total para el frontend, sin traer todos los datos
          const countResponse = await axios.get(BASE_URL+`/api/postulants/count`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const total = countResponse.data.total || 0;

          return {
              tempKey: tempKey,
              total: total,
              totalPages: Math.ceil(total / 100)
          };

       /*  // Si ya sincronizamos hoy, obtener de la base local
        const localPostulants = await axios.get(`http://localhost:3005/api/postulants/active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        return {
            postulants: localPostulants.data,
            total: localPostulants.data.length,
            totalPages: Math.ceil(localPostulants.data.length / 100)
        };
 */
    } catch (error) {
        console.error('Error al obtener postulantes:', error);
        throw error;
    }
},

  async loadVacancies() {
    if (!this.token) {
      console.warn('No hay token disponible para cargar vacantes');
      return;
    }

    console.log('Iniciando carga de vacantes...');
    try {
      this.loadingVacancies = true;
      this.loadingMessage = 'Cargando vacantes...';
      
      // Aquí está el cambio: getVacancies en lugar de getVacantes
      const response = await hiringRoomService.getVacancies(
        this.pagination.currentPage - 1, // restamos 1 porque la API usa base 0
        this.pagination.limit
      );

      this.vacancies = response.items.map(v => ({
        ...v,
        showCardContent: false,
        activeSection: null,
        downloading: false,
        downloadProgress: 0
      }));
      this.pagination = response.pagination;
      this.totalVacancies = response.pagination.total;

    } catch (error) {
      console.error('Error al cargar vacantes:', error);
      this.error = 'Error al cargar las vacantes';
    } finally {
      this.loadingVacancies = false;
      this.loadingMessage = '';
    }
  },  


async getPostulantsByStatus(status = 'active') {
  try {
      const token = localStorage.getItem('hr_token');
      if (!token) throw new Error('No hay token disponible');

      const response = await axios.get(
          BASE_URL+`/api/postulants/status?status=${status}`,
          {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          }
      );

      return response.data;
  } catch (error) {
      console.error(`Error obteniendo postulantes ${status}:`, error);
      throw error;
  }
},

async getPostulantInterviewEvent(postulantId) {
  try {
    const token = localStorage.getItem('hr_token');
    if (!token) throw new Error('No hay token disponible');

    const response = await axios.get(
      `${API_URL}/postulants/${postulantId}/event`,
      {
        params: {
          token: token
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
     console.log('entrevistas de postulante', postulantId, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener eventos de entrevista para el postulante ${postulantId}:`, error);
    throw error;
  }
}
};