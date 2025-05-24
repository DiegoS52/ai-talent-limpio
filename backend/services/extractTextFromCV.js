import fs from 'fs';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import PDFParser from 'pdf2json';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import { convert } from 'pdf-poppler';
import mammoth from 'mammoth';
import path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function checkFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_FILE_SIZE) {
            console.log(`[WARN] Archivo demasiado grande (${stats.size} bytes): ${filePath}`);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`[ERROR] Error verificando tamaño del archivo: ${filePath}`, error);
        return false;
    }
}

function cleanupMemory() {
    if (global.gc) {
        global.gc();
    }
}

// Palabras clave comunes en CVs para diferentes idiomas
const CV_KEYWORDS = {
    es: [
        'experiencia', 'habilidades', 'educación', 'formación', 'proyectos',
        'objetivos', 'resumen', 'perfil', 'contacto', 'referencias',
        'trabajo', 'empleo', 'carrera', 'profesional', 'desarrollo',
        'conocimientos', 'aptitudes', 'competencias', 'logros', 'responsabilidades'
    ],
    en: [
        'experience', 'skills', 'education', 'projects', 'objectives',
        'summary', 'profile', 'contact', 'references', 'work',
        'employment', 'career', 'professional', 'development', 'achievements',
        'knowledge', 'abilities', 'competencies', 'accomplishments', 'responsibilities'
    ],
    pt: [
        'experiência', 'habilidades', 'educação', 'formação', 'projetos',
        'objetivos', 'resumo', 'perfil', 'contato', 'referências',
        'trabalho', 'emprego', 'carreira', 'profissional', 'desenvolvimento',
        'conhecimentos', 'aptidões', 'competências', 'conquistas', 'responsabilidades'
    ]
};

// Detectar el idioma del texto
function detectLanguage(text) {
    const textLower = text.toLowerCase();
    const scores = {
        es: 0,
        en: 0,
        pt: 0
    };

    Object.entries(CV_KEYWORDS).forEach(([lang, keywords]) => {
        scores[lang] = keywords.filter(keyword => 
            textLower.includes(keyword.toLowerCase())
        ).length;
    });

    return Object.entries(scores).reduce((a, b) => 
        b[1] > a[1] ? b : a
    )[0];
}

// Limpieza y normalización del texto
function cleanAndNormalizeText(text) {
    return text
        .replace(/\s+/g, ' ')                    // Normalizar espacios
        .replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1$2') // Corregir espacios entre letras
        .replace(/(\d)\s+(\d)/g, '$1$2')         // Corregir espacios entre números
        .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, match => match.replace(/\s+/g, '')) // Corregir emails
        .replace(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, match => match.replace(/\s+/g, '')) // Corregir teléfonos
        .replace(/[^\x20-\x7E]/g, '')           // Eliminar caracteres no imprimibles
        .replace(/\s*([.,;:!?])\s*/g, '$1 ')    // Normalizar puntuación
        .replace(/\s+/g, ' ')                    // Eliminar espacios múltiples
        .replace(/([A-Z])\s+([A-Z])/g, '$1$2')  // Corregir espacios entre siglas
        .replace(/([a-z])\s+([A-Z])/g, '$1 $2') // Asegurar espacio entre palabras
        .replace(/(\d)\s+([A-Za-z])/g, '$1 $2') // Asegurar espacio entre números y letras
        .replace(/([A-Za-z])\s+(\d)/g, '$1 $2') // Asegurar espacio entre letras y números
        .trim();
}

// Utilidad para validar si el texto extraído es suficiente
function isValidText(text) {
    if (!text) return false;
    
    const cleanedText = text.trim();
    if (cleanedText.length < 100) return false;
    
    // Verificar que el texto contiene caracteres legibles
    const hasReadableContent = /[a-zA-Z0-9]/.test(cleanedText);
    if (!hasReadableContent) return false;
    
    // Verificar que no es solo caracteres especiales o basura
    const specialCharsRatio = (cleanedText.match(/[^a-zA-Z0-9\s]/g) || []).length / cleanedText.length;
    if (specialCharsRatio > 0.7) return false;
    
    // Verificar estructura básica de un CV
    const hasBasicStructure = /(experiencia|education|skills|habilidades|educación|formación)/i.test(cleanedText);
    if (!hasBasicStructure) return false;
    
    // Detectar idioma y verificar palabras clave correspondientes
    const detectedLang = detectLanguage(cleanedText);
    const foundKeywords = CV_KEYWORDS[detectedLang].filter(keyword => 
        cleanedText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Asegurar que encontramos al menos 3 palabras clave (aumentado de 2)
    if (foundKeywords.length < 3) {
        console.log(`[WARN] Solo se encontraron ${foundKeywords.length} palabras clave`);
        return false;
    }
    
    return true;
}

async function preprocessPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        
        // Verificar si el archivo está vacío
        if (!dataBuffer || dataBuffer.length === 0) {
            console.log(`[WARN] PDF vacío detectado: ${filePath}`);
            return false;
        }
        
        const pdfDoc = await PDFDocument.load(dataBuffer);
        
        if (pdfDoc.isEncrypted) {
          //  console.log(`[WARN] PDF encriptado detectado: ${filePath}`);
            return false;
        }
        
        if (pdfDoc.getPageCount() === 0) {
          //  console.log(`[WARN] PDF sin páginas detectado: ${filePath}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error(`[ERROR] Error en preprocesamiento de PDF: ${filePath}`, error);
        return false;
    }
}

async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Función para extraer texto de DOCX
async function extractFromDocx(filePath) {
    try {
        if (!await checkFileSize(filePath)) {
            return '';
        }

        console.log(`[INFO] Procesando documento DOCX: ${filePath}`);
        const result = await mammoth.extractRawText({ 
            path: filePath,
            styleMap: [], // No procesar estilos
            includeDefaultStyleMap: false,
            includeEmbeddedStyleMap: false
        });
        
        const text = cleanAndNormalizeText(result.value);
        
        if (!isValidText(text)) {
            console.log(`[WARN] Texto extraído de DOCX no es válido`);
            return '';
        }
        
        return text;
    } catch (error) {
        console.error(`[DOCX_ERROR] Error procesando DOCX: ${filePath}`, error);
        return '';
    }
}

// 1. pdfjs-dist (más rápido)
export async function tryPdfjsDist(filePath) {
    try {
        const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.entry.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

        const data = new Uint8Array(fs.readFileSync(filePath));
        
        const loadingTask = pdfjsLib.getDocument({
            data,
            standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts/',
            cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
            cMapPacked: true,
            disableFontFace: true,
            maxImageSize: 1024 * 1024, // Limitar tamaño de imágenes
            disableRange: true,
            disableStream: true,
            disableAutoFetch: true
        });

        const pdf = await loadingTask.promise;
        let text = '';
        
        // Limitar número de páginas
        const maxPages = Math.min(pdf.numPages, 20);
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
            page.cleanup(); // Liberar memoria de la página
        }
        
        pdf.destroy(); // Liberar memoria del PDF
        return cleanAndNormalizeText(text);
    } catch (error) {
        console.error(`[PDFJS_ERROR] Error en PDF.js: ${filePath}`, error);
        return '';
    }
}

// 2. pdf-parse (más robusto)
export async function tryPdfParse(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return cleanAndNormalizeText(data.text);
    } catch (error) {
        console.error(`[PDFPARSE_ERROR] Error en pdf-parse: ${filePath}`, error);
        return '';
    }
}

// 3. pdf2json (más lento pero más preciso)
export async function tryPdf2json(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return cleanAndNormalizeText(data.text);
    } catch (error) {
        console.error(`[PDF2JSON_ERROR] Error en pdf2json: ${filePath}`, error);
        return '';
    }
}

// 4. pdf-lib (para manipulación previa)
export async function tryPdfLib(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        let text = '';
        
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
            const page = pdfDoc.getPage(i);
            // Implementar extracción de texto con pdf-lib si es necesario
        }
        
        return cleanAndNormalizeText(text);
    } catch (error) {
        console.error(`[PDFLIB_ERROR] Error en pdf-lib: ${filePath}`, error);
        return '';
    }
}

// 5. Tesseract OCR (para imágenes o PDFs escaneados)
export async function tryTesseract(filePath, text) {
    try {
        // Crear directorio temporal para las imágenes si no existe
        const tempDir = path.join(path.dirname(filePath), 'temp_images');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Convertir PDF a imágenes
        const outputPath = path.join(tempDir, path.basename(filePath, '.pdf'));
        try {
            await convert(filePath, {
                out_dir: tempDir,
                out_prefix: path.basename(filePath, '.pdf'),
                page: 1, // Procesar solo la primera página inicialmente
                format: 'png',
                dpi: 300
            });
        } catch (convertError) {
            console.error(`[CONVERT_ERROR] Error convirtiendo PDF a imagen: ${filePath}`, convertError);
            return '';
        }

        // Verificar si la imagen se creó correctamente
        const imagePath = `${outputPath}-1.png`;
        if (!fs.existsSync(imagePath)) {
            console.error(`[OCR_ERROR] No se pudo crear la imagen del PDF: ${filePath}`);
            return '';
        }

        // Detectar idioma del texto existente si lo hay
        let lang = 'spa'; // español por defecto
        if (text) {
            const detectedLang = detectLanguage(text);
            const langMap = {
                'es': 'spa',
                'en': 'eng',
                'pt': 'por'
            };
            lang = langMap[detectedLang] || 'spa';
        }

        // Procesar la imagen convertida
        const { data: { text: ocrText } } = await Tesseract.recognize(imagePath, lang);

        // Limpiar archivos temporales
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.warn(`[WARN] Error limpiando archivos temporales: ${cleanupError.message}`);
        }

        return cleanAndNormalizeText(ocrText);
    } catch (error) {
        console.error(`[OCR_ERROR] Error en OCR: ${filePath}`, error);
        // Limpiar archivos temporales en caso de error
        try {
            const tempDir = path.join(path.dirname(filePath), 'temp_images');
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.warn(`[WARN] Error limpiando archivos temporales después de error: ${cleanupError.message}`);
        }
        return '';
    }
}

// Función principal de extracción
export async function extractTextFromCV(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`El archivo ${filePath} no existe`);
        }

        // Verificar tamaño del archivo
        if (!await checkFileSize(filePath)) {
            return '';
        }

        const ext = path.extname(filePath).toLowerCase();
        let text = '';
        let detectedLang = 'es';

        if (ext === '.docx') {
            text = await extractFromDocx(filePath);
        } else if (ext === '.pdf') {
            const isValidPDF = await preprocessPDF(filePath);
            if (!isValidPDF) {
                return '';
            }

            // Intentar métodos en orden de eficiencia
            const methods = [
                { name: 'PDF.js', fn: tryPdfjsDist, priority: 1 },
                { name: 'pdf-parse', fn: tryPdfParse, priority: 2 },
                { name: 'pdf2json', fn: tryPdf2json, priority: 3 }
            ];

            for (const method of methods) {
                try {
                    text = await retryOperation(() => method.fn(filePath));
                    if (isValidText(text)) {
                        break;
                    }
                } catch (error) {
                    console.error(`[ERROR] Fallo en ${method.name}:`, error.message);
                    continue;
                }
            }
        } else {
            throw new Error(`Tipo de archivo no soportado: ${ext}`);
        }

        if (!isValidText(text)) {
            return '';
        }

        // Limitar el tamaño del texto final
        text = cleanAndNormalizeText(text).slice(0, 50000); // Limitar a 50KB de texto
        
        const result = text;
        cleanupMemory();
        return result;
    } catch (error) {
        cleanupMemory();
        console.error(`[ERROR] Error general en extracción de texto: ${filePath}`, error);
        return '';
    }
}