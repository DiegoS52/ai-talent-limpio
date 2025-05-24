import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

// Configurar el worker usando la ruta del paquete
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractPDFText(pdfBuffer) {
    try {
        // Cargar el PDF
        const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        // Extraer texto de todas las páginas
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }
        
        // Limpiar y formatear el texto
        const textoLimpio = fullText
            .replace(/\s+/g, ' ')        // Normalizar espacios
            .replace(/[^\x20-\x7E]/g, '') // Remover caracteres no imprimibles
            .trim();
            
        return {
            textoOriginal: fullText,     // Texto con formato original
            textoLimpio: textoLimpio,    // Texto procesado para API
            numPaginas: pdf.numPages,
            info: await pdf.getMetadata()
        };
    } catch (error) {
        console.error('Error al procesar PDF:', error);
        throw new Error('No se pudo procesar el archivo PDF');
    }
} 