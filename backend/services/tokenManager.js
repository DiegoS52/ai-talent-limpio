import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

class TokenManager {
    constructor() {
        this.token = null;
        this.lastUpdate = null;
        this.tokenExpiration = 23 * 60 * 60 * 1000; // 23 horas en milisegundos (un poco menos para tener margen)
        this.tokenFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.token.json');
        this.loadToken();
    }

    loadToken() {
        try {
            if (fs.existsSync(this.tokenFile)) {
                const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
                this.token = data.token;
                this.lastUpdate = data.lastUpdate;
            }
        } catch (error) {
            console.log('No se pudo cargar el token guardado');
        }
    }

    saveToken() {
        try {
            fs.writeFileSync(this.tokenFile, JSON.stringify({
                token: this.token,
                lastUpdate: this.lastUpdate
            }));
        } catch (error) {
            console.error('Error guardando token:', error.message);
        }
    }

    isTokenValid() {
        return this.token && 
               this.lastUpdate && 
               (Date.now() - this.lastUpdate < this.tokenExpiration);
    }

    async getToken() {
        if (this.isTokenValid()) {
            return this.token;
        }
        return await this.refreshToken();
    }

    async refreshToken() {
        try {
            console.log('Refrescando token de HiringRoom...');
            const payload = {
                grand_type: "password",
                username: process.env.HIRINGROOM_USERNAME,
                password: process.env.HIRINGROOM_PASSWORD,
                client_id: process.env.HIRINGROOM_CLIENT_ID,
                client_secret: process.env.HIRINGROOM_CLIENT_SECRET
            };
            
            console.log('Payload:', payload); // Debug del payload
            
            const response = await axios.post('https://api.hiringroom.com/v0/authenticate/login/users', payload);
            
            console.log('Response:', response.data); // Debug de la respuesta
            
            this.token = response.data.token;
            this.tokenType = response.data.tokenType;
            this.refreshTokenValue = response.data.refreshToken;
            this.expiresIn = response.data.expiresIn;
            this.lastUpdate = Date.now();
            
            this.saveToken();
            
            console.log('Token refrescado exitosamente');
            return this.token;
        } catch (error) {
            console.error('Error completo:', error.response?.data || error.message); // Debug del error completo
            throw error;
        }
    }
    
    saveToken() {
        try {
            fs.writeFileSync(this.tokenFile, JSON.stringify({
                token: this.token,
                tokenType: this.tokenType,
                refreshToken: this.refreshTokenValue,
                expiresIn: this.expiresIn,
                lastUpdate: this.lastUpdate
            }));
        } catch (error) {
            console.error('Error guardando token:', error.message);
        }
    }
    
    loadToken() {
        try {
            if (fs.existsSync(this.tokenFile)) {
                const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
                this.token = data.token;
                this.tokenType = data.tokenType;
                this.refreshTokenValue = data.refreshToken;
                this.expiresIn = data.expiresIn;
                this.lastUpdate = data.lastUpdate;
            }
        } catch (error) {
            console.log('No se pudo cargar el token guardado');
        }
    }
}

export default TokenManager; 