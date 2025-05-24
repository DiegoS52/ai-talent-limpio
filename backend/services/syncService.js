import cron from 'node-cron';
import axios from 'axios';
import Postulant from '../src/models/Postulant.js';
import dotenv from 'dotenv';

dotenv.config();

class SyncService {
    constructor() {
        this.syncInProgress = false;
        this.start();
    }

    start() {
        console.log('[SYNC] Iniciando servicio de sincronización...');
        //    cron.schedule('0 */12 * * *', async () => {
        //    cron.schedule('*/5 * * * *', async () => {  // Cada 5 minutos
         cron.schedule('0 */12 * * *', async () => {             // Para testear se puede poner por minuto: '* * * * *'
            console.log('[SYNC] Verificando si es necesario sincronizar...');
            await this.checkAndSync();
        });
        console.log('[SYNC] Servicio de sincronización iniciado');
    }

    async checkAndSync() {
        if (this.syncInProgress) {
            console.log('[SYNC] Ya hay una sincronización en progreso');
            return;
        }
    
        try {
            console.log('[SYNC] Iniciando sincronización...');
            await this.syncCandidates();
        } catch (error) {
            console.error('[SYNC] Error al verificar estado:', error);
        }
    }

    async cleanExperienciasLaborales(experiencias) {
        if (!Array.isArray(experiencias)) return [];
        return experiencias.map(exp => ({
            ...exp,
            mesDesde: isNaN(Number(exp.mesDesde)) ? null : Number(exp.mesDesde),
            añoDesde: isNaN(Number(exp['añoDesde'])) ? null : Number(exp['añoDesde']),
            mesHasta: isNaN(Number(exp.mesHasta)) ? null : Number(exp.mesHasta),
            añoHasta: isNaN(Number(exp['añoHasta'])) ? null : Number(exp['añoHasta']),
        }));
    }

    async syncCandidates() {
        try {
            this.syncInProgress = true;
            console.log('[SYNC] Iniciando sincronización de candidatos...');
    
            // 1. Obtener credenciales
            const credentials = {
                clientId: process.env.HIRINGROOM_CLIENT_ID,
                clientSecret: process.env.HIRINGROOM_CLIENT_SECRET,
                username: process.env.HIRINGROOM_USERNAME,
                password: process.env.HIRINGROOM_PASSWORD
            };
    
            // 2. Obtener token
            const authResponse = await axios.post('https://api.hiringroom.com/v0/authenticate/login/users', {
                grand_type: "password",
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret,
                username: credentials.username,
                password: credentials.password
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
    
            const token = authResponse.data.token;
    
            // 3. Paginación real
            const pageSize = 100; // máximo permitido
            let page = 0;
            let totalPages = 1;
            let created = 0;
            let updated = 0;
            const today = new Date();
    
            do {
                const response = await axios.get('https://api.hiringroom.com/v0/postulants', {
                    params: {
                        page,
                        pageSize,
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
            
                const postulants = response.data.curriculums || [];
                const totalItems = Number(response.data.total) || 0;
            
                if (page === 0) {
                    totalPages = Math.ceil(totalItems / pageSize);
                    console.log(`[SYNC] Total de páginas calculado: ${totalPages}`);
                }
            
                let pageCreated = 0;
                let pageUpdated = 0;
                let pageUnchanged = 0;
                for (const hrPostulant of postulants) {
                    // Limpia las experiencias laborales si existen
                    if (Array.isArray(hrPostulant.experienciasLaborales)) {
                        hrPostulant.experienciasLaborales = await this.cleanExperienciasLaborales(hrPostulant.experienciasLaborales);
                    }
                
                    const existing = await Postulant.findOne({ hiringRoomId: hrPostulant.id });
                
                    if (!existing) {
                        await Postulant.create({
                            ...hrPostulant,
                            hiringRoomId: hrPostulant.id,
                            lastUpdate: today,
                            isActive: true
                        });
                        pageCreated++;
                        created++;
                    } else {
                        // Compara campos importantes para ver si hay cambios
                        const fieldsToCheck = [
                            'nombre', 'apellido', 'email', 'telefono', 'estado', 'etapa', 'ultimaActualizacion'
                        ];
                        const changed = fieldsToCheck.some(field => existing[field] !== hrPostulant[field]);
                
                        if (changed) {
                            await Postulant.findOneAndUpdate(
                                { hiringRoomId: hrPostulant.id },
                                {
                                    $set: {
                                        ...hrPostulant,
                                        hiringRoomId: hrPostulant.id,
                                        lastUpdate: today,
                                        isActive: true
                                    }
                                },
                                { new: true }
                            );
                            pageUpdated++;
                            updated++;
                        } else {
                            pageUnchanged++;
                        }
                    }
                }
            
                console.log(`[SYNC] Página ${page + 1}/${totalPages}: ${postulants.length} procesados | ${pageCreated} nuevos | ${pageUpdated} actualizados | ${pageUnchanged} sin cambios`);
                page++;
                await new Promise(resolve => setTimeout(resolve, 100));
            } while (page < totalPages);
    
            console.log(`[SYNC] Sincronización completada: ${created} nuevos, ${updated} actualizados`);
    
        } catch (error) {
            console.error('[SYNC] Error en sincronización:', error);
            if (error.response) {
                console.error('[SYNC] Detalles del error:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
        } finally {
            this.syncInProgress = false;
        }
    }
}

// Exportar una instancia única del servicio
const syncService = new SyncService();
export default syncService;