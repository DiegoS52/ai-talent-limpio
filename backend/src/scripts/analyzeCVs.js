import cvAnalysisService from '../../services/cvAnalysisService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const start = Date.now();
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Conectado a MongoDB (${new Date().toLocaleString()})`);

        // Crear directorio temporal si no existe
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const tempDir = path.join(__dirname, '../tempPostulants');

        try {
            await fs.access(tempDir);
        } catch {
            await fs.mkdir(tempDir);
            console.log(`Directorio temporal creado en: ${tempDir}`);
        }

        // Iniciar el proceso de análisis
        console.log(`Iniciando análisis de CVs... (${new Date().toLocaleString()})`);
        await cvAnalysisService.processAllPostulantes();
        const end = Date.now();
        console.log(`Análisis completado (${new Date().toLocaleString()})`);
        console.log(`Duración total: ${Math.floor((end - start) / 1000 / 60)} min ${(Math.floor((end - start) / 1000) % 60)} seg`);

    } catch (error) {
        console.error('Error en el proceso:', error);
        if (error && error.stack) {
            console.error(error.stack);
        }
    } finally {
        // Cerrar la conexión a MongoDB
        await mongoose.disconnect();
        console.log(`Conexión a MongoDB cerrada (${new Date().toLocaleString()})`);
    }
}

// Ejecutar el script
main().catch(console.error);