import pdfplumber  # Para Python
// Para JavaScript/Node
const pdfParse = require('pdf-parse');

async function extractPDFText(pdfBuffer) {
    try {
        // Extraer texto del PDF
        const data = await pdfParse(pdfBuffer);
        
        // Limpiar y formatear el texto
        let texto = data.text
            .replace(/\s+/g, ' ')        // Normalizar espacios
            .replace(/[^\x20-\x7E]/g, '') // Remover caracteres no imprimibles
            .trim();
            
        return {
            textoOriginal: data.text,    // Texto con formato original
            textoLimpio: texto,          // Texto procesado para API
            numPaginas: data.numpages,
            info: data.info
        };
    } catch (error) {
        console.error('Error al procesar PDF:', error);
        throw new Error('No se pudo procesar el archivo PDF');
    }
} 