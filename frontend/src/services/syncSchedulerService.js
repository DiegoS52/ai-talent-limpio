import * as hiringRoomService from './hiringRoomService';
import axios from 'axios';

class SyncSchedulerService {
    constructor() {
        this.isSyncing = false;
        this.lastSyncAttempt = null;
        this.SYNC_USER = {
            email: 'rsantillan@sooft.com',  // Usuario dedicado para sincronización
            password: 'Rasa1608'   // Debería venir de variables de entorno
        };
    }

    async initialize() {
        try {
            // Intentar hacer login con el usuario de sincronización
            const loginResponse = await axios.post('https://api.hiringroom.com/v0/login', this.SYNC_USER);
            const syncToken = loginResponse.data.token;
            
            // Guardar el token temporalmente
            localStorage.setItem('hr_token', syncToken);
            
            // Verificar si necesitamos sincronizar al inicio
            await this.checkAndSync();

            // Programar la sincronización diaria a las 00:15
            this.scheduleDailySync();
            
            console.log('Sincronización automática inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar sincronización automática:', error);
        }
    }

    scheduleDailySync() {
        const now = new Date();
        const scheduledTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0, // Hora 00
            15, // Minuto 15
            0  // Segundo 0
        );

        // Si ya pasó la hora de hoy, programar para mañana
        if (now > scheduledTime) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const timeUntilSync = scheduledTime - now;
        console.log(`Próxima sincronización programada para: ${scheduledTime}`);

        setTimeout(async () => {
            await this.doSync();
            this.scheduleDailySync(); // Reprogramar para el siguiente día
        }, timeUntilSync);
    }

    async doSync() {
        try {
            // Hacer login nuevamente para asegurar token fresco
            const loginResponse = await axios.post('https://api.hiringroom.com/v0/login', this.SYNC_USER);
            const syncToken = loginResponse.data.token;
            localStorage.setItem('hr_token', syncToken);

            await this.checkAndSync();
        } catch (error) {
            console.error('Error en sincronización programada:', error);
        }
    }

    async checkAndSync() {
        if (this.isSyncing) {
            console.log('Ya hay una sincronización en proceso');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        if (this.lastSyncAttempt === today) {
            console.log('Ya se intentó sincronizar hoy');
            return;
        }

        try {
            console.log('Iniciando sincronización automática...');
            this.isSyncing = true;
            this.lastSyncAttempt = today;

            await hiringRoomService.getAllActivePostulants(progress => {
                console.log(`Progreso de sincronización: ${progress}%`);
            });

            console.log('Sincronización automática completada');
        } catch (error) {
            console.error('Error en sincronización automática:', error);
        } finally {
            this.isSyncing = false;
        }
    }
}

// Crear instancia y exportar
const syncScheduler = new SyncSchedulerService();
export default syncScheduler; 