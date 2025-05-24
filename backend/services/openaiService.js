import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';
import { promisify } from 'util';
import { createRequire } from 'module';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import Tesseract from 'tesseract.js';
import pdf2image from 'pdf2image';
import pkg from 'pdfjs-dist/legacy/build/pdf.js';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { fromPath } from 'pdf2pic';
import { fileTypeFromBuffer } from 'file-type';
const { getDocument, GlobalWorkerOptions } = pkg;

const require = createRequire(import.meta.url);
const ImageModule = require('docxtemplater-image-module-free');  // Agregamos .default

const libre = require('libreoffice-convert');
dotenv.config();
const API_URL = process.env.API_URL || 'http://localhost:3005';

/*const CloudConvert = require('cloudconvert');
const cloudConvert = new CloudConvert({
    apiKey: process.env.CLOUDCONVERT_API_KEY
});*/






/* const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}); */

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000 
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/*
// Función para extraer texto de PDFs
async function extractTextFromPDF(buffer) {
    let data = await pdfParse(buffer);
    return data.text;
}
*/

function sanitizeCVText(texto) {
    if (!texto) return '';
    
    // Primero, eliminar espacios entre letras
    let textoLimpio = texto;
    
    // Detectar y corregir el patrón de espacios entre letras
    textoLimpio = textoLimpio.replace(/([A-Za-z])\s+([A-Za-z])/g, '$1$2');
    
    // Corregir emails
    textoLimpio = textoLimpio.replace(/([a-zA-Z0-9])\s+(@)/g, '$1$2');
    textoLimpio = textoLimpio.replace(/(@)\s+([a-zA-Z0-9])/g, '$1$2');
    textoLimpio = textoLimpio.replace(/([a-zA-Z0-9])\s+(\.)\s+([a-zA-Z0-9])/g, '$1$2$3');
    
    // Corregir números de teléfono
    textoLimpio = textoLimpio.replace(/(\d)\s+(-)\s+(\d)/g, '$1$2$3');
    
    // Corregir palabras pegadas entre letras y números
    textoLimpio = textoLimpio.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    textoLimpio = textoLimpio.replace(/(\d)([a-zA-Z])/g, '$1 $2');
    
    // Eliminar caracteres de control y caracteres no ASCII
    textoLimpio = textoLimpio
        .replace(/[\u0000-\u0019\u007F-\u009F]/g, '')
        .replace(/[^\u0020-\u007E]/g, ' ');
    
    // Corregir espacios múltiples
    textoLimpio = textoLimpio.replace(/\s+/g, ' ').trim();
    
    // Corregir casos específicos comunes en CVs
    textoLimpio = textoLimpio
        .replace(/Product\s*Owner/g, 'Product Owner')
        .replace(/Product\s*Manager/g, 'Product Manager')
        .replace(/Product\s*Analyst/g, 'Product Analyst')
        .replace(/Analista\s*de\s*Procesos/g, 'Analista de Procesos')
        .replace(/Ingeniero\s*Industrial/g, 'Ingeniero Industrial')
        .replace(/Scrum\s*Master/g, 'Scrum Master')
        .replace(/Business\s*Analyst/g, 'Business Analyst')
        .replace(/Senior\s*Developer/g, 'Senior Developer')
        .replace(/Full\s*Stack/g, 'Full Stack')
        .replace(/Back\s*End/g, 'Back End')
        .replace(/Front\s*End/g, 'Front End')
        .replace(/DevOps/g, 'DevOps')
        .replace(/QA/g, 'QA')
        .replace(/UI\/UX/g, 'UI/UX');
    
    return textoLimpio;
}

// Crear una versión promisificada de la función convert
function convertToPromise(buffer, outputFormat) {
    return new Promise((resolve, reject) => {
        libre.convert(buffer, outputFormat, undefined, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Función para extraer texto de DOCX

async function extractTextFromDOCX(buffer) {
    let result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
}  

/*
async function extractTextFromPDF(buffer) {
    try {
        const pdfParse = require('pdf-parse');
        const testFilePath = path.join(__dirname, '../node_modules/pdf-parse/test/data/05-versions-space.pdf');
        
        // Imprimir las rutas para debug
        console.log('Current directory:', __dirname);
        console.log('Test file path:', testFilePath);
        console.log('Process cwd:', process.cwd());
        
        // Configurar pdf-parse con la ruta correcta
        process.env.PDF_TEST_FILE = testFilePath;
        
        let data = await pdfParse(buffer, {
            max: 0,
            version: 'v2.0.0'
        });
        return data.text;
    } catch (error) {
        console.error('Error al procesar PDF:', error);
        console.error('Error stack:', error.stack);
        return `Error al procesar PDF: ${error.message}`;
    }
}
*/
// Función para generar nombre único


function generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    let extension = path.extname(originalName).toLowerCase();
    
    // Si no hay extensión o la extensión no incluye el punto, usar .pdf
    if (!extension || !extension.includes('.')) {
        extension = '.pdf';
    }
    
    // Asegurarse de que la extensión sea .pdf si el nombre original contiene "pdf"
    if (originalName.toLowerCase().includes('pdf') && extension !== '.pdf') {
        extension = '.pdf';
    }
    
    return `file_${timestamp}${extension}`;
}

// Función para detectar si la extracción de texto es deficiente
function extraccionDeficiente(texto) {
    if (!texto) {
        console.log('⚠️ Texto nulo o vacío');
        return true;
    }

    console.log(`📊 Longitud del texto: ${texto.length} caracteres`);
    
    if (texto.length < 50) {
        console.log('⚠️ Texto demasiado corto');
        return true;
    }

    // Palabras clave comunes en CVs
    const palabrasClave = [
        'experiencia', 'educacion', 'habilidades', 'objetivo',
        'resumen', 'perfil', 'formacion', 'trabajo',
        'proyectos', 'certificaciones', 'idiomas', 'referencias',
        'gmail', 'linkedin', 'github', 'portfolio',
        'ingeniero', 'ingenieria', 'desarrollo', 'software',
        'analista', 'proyecto', 'gestion', 'administracion',
        'product', 'owner', 'manager', 'analyst',
        'scrum', 'agile', 'lean', 'metodologias',
        'industrial', 'procesos', 'funcional', 'tecnico',
        'email', 'telefono', 'celular', 'contacto',
        'datos', 'personales', 'profesional', 'laboral'
    ];

    // Contar ocurrencias de palabras clave
    const textoLower = texto.toLowerCase();
    const ocurrencias = palabrasClave.filter(palabra => 
        textoLower.includes(palabra)
    ).length;

    console.log(`📊 Palabras clave encontradas: ${ocurrencias}`);
    console.log('📝 Texto limpio (primeros 200 caracteres):');
    console.log(textoLower.substring(0, 200));

    // Si hay menos de 2 palabras clave, considerar deficiente
    if (ocurrencias < 2) {
        console.log('⚠️ Muy pocas palabras clave encontradas');
        return true;
    }

    console.log('✅ Texto parece válido');
    return false;
}

// Función para extraer texto con pdfplumber
async function extractTextWithPdfPlumber(buffer) {
    try {
        console.log('🔍 Intentando extracción con pdfplumber...');
        const pdf = await pdfplumber.load(buffer);
        let text = '';

        for (let i = 0; i < pdf.pages.length; i++) {
            const page = pdf.pages[i];
            const pageText = await page.extractText();
            if (pageText) {
                text += pageText + '\n';
            }
        }

        console.log('✅ Extracción con pdfplumber completada');
        return text;
    } catch (error) {
        console.error('❌ Error en pdfplumber:', error);
        throw error;
    }
}

// Función para extraer texto con OCR
async function extractTextWithOCR(buffer) {
    try {
        console.log('🔍 Iniciando extracción con OCR...');
        
        // Crear un worker de Tesseract con la configuración correcta para v6
        const worker = await Tesseract.createWorker('spa');
        
        // Guardar el buffer temporalmente
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        
        const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
        fs.writeFileSync(tempPdfPath, buffer);
        
        // Convertir PDF a imágenes con mejor calidad
        const { convert } = require('pdf-poppler');
        const opts = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: null,
            scale: 3.0,  // Aumentamos la escala para mejor calidad
            dpi: 300    // Aumentamos el DPI
        };
        
        await convert(tempPdfPath, opts);
        
        // Leer las imágenes generadas
        const files = fs.readdirSync(tempDir)
            .filter(file => file.startsWith('page-') && file.endsWith('.png'))
            .sort();
        
        console.log(`✅ PDF convertido a ${files.length} imágenes`);
        
        let fullText = '';
        
        // Procesar cada imagen con OCR
        for (const file of files) {
            const imagePath = path.join(tempDir, file);
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Realizar OCR en la imagen
            const result = await worker.recognize(imageBuffer);
            fullText += result.data.text + '\n';
            
            // Limpiar archivo temporal
            fs.unlinkSync(imagePath);
        }
        
        // Limpiar archivo PDF temporal
        fs.unlinkSync(tempPdfPath);
        
        // Terminar el worker
        await worker.terminate();
        
        // Limpiar y formatear el texto extraído
        fullText = fullText
            // Normalizar espacios y saltos de línea
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            // Corregir caracteres especiales
            .replace(/[|]/g, 'I')  // Reemplazar | por I
            .replace(/[`´]/g, "'") // Normalizar apóstrofes
            .replace(/[–—]/g, '-') // Normalizar guiones
            // Corregir espacios entre palabras
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // Agregar espacio entre palabras pegadas
            .replace(/([A-Za-z])(\d)/g, '$1 $2')  // Agregar espacio entre letras y números
            .replace(/(\d)([A-Za-z])/g, '$1 $2')  // Agregar espacio entre números y letras
            // Corregir puntuación
            .replace(/\s+([.,;:!?])/g, '$1')  // Eliminar espacios antes de puntuación
            .replace(/([.,;:!?])([A-Za-z])/g, '$1 $2')  // Agregar espacio después de puntuación
            // Corregir casos específicos comunes en CVs
            .replace(/Product\s*Owner/g, 'Product Owner')
            .replace(/Product\s*Manager/g, 'Product Manager')
            .replace(/Product\s*Analyst/g, 'Product Analyst')
            .replace(/Analista\s*de\s*Procesos/g, 'Analista de Procesos')
            .replace(/Ingeniero\s*Industrial/g, 'Ingeniero Industrial')
            .replace(/Scrum\s*Master/g, 'Scrum Master')
            .replace(/Business\s*Analyst/g, 'Business Analyst')
            .replace(/Senior\s*Developer/g, 'Senior Developer')
            .replace(/Full\s*Stack/g, 'Full Stack')
            .replace(/Back\s*End/g, 'Back End')
            .replace(/Front\s*End/g, 'Front End')
            .replace(/DevOps/g, 'DevOps')
            .replace(/QA/g, 'QA')
            .replace(/UI\/UX/g, 'UI/UX')
            // Eliminar caracteres no deseados
            .replace(/[^\w\s.,;:!?¿¡()\-@#$%&*+=<>/\\|_~áéíóúÁÉÍÓÚñÑüÜ]/g, '')
            .trim();
        
        console.log('✅ Extracción con OCR completada');
        console.log(`📊 Longitud del texto extraído: ${fullText.length} caracteres`);
        
        if (fullText.length < 100) {
            throw new Error('El texto extraído es demasiado corto, posiblemente el OCR falló');
        }
        
        return fullText;
    } catch (error) {
        console.error('❌ Error en OCR:', error);
        throw error;
    }
}

// Función para extraer texto de DOCX con mammoth
async function extractTextFromDocx(buffer) {
    try {
        console.log('🔍 Intentando extracción directa de DOCX con mammoth...');
        const result = await mammoth.extractRawText({ buffer });
        console.log('✅ Extracción con mammoth completada');
        return result.value;
    } catch (error) {
        console.error('❌ Error en mammoth:', error);
        throw error;
    }
}

// Configurar el worker de PDF.js
GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

// Función mejorada para extraer texto de PDF
async function extractTextFromPDF(buffer) {
    try {
        console.log('🔍 Iniciando extracción de texto del PDF...');
        
        // 1. Intentar con PDF.js primero
        try {
            console.log('🔄 Intentando con PDF.js...');
            const text = await extractTextWithPDFJS(buffer);
            
            if (!extraccionDeficiente(text)) {
                console.log('✅ Extracción exitosa con PDF.js');
                return text;
            }
            console.log('⚠️ Extracción con PDF.js resultó deficiente');
        } catch (pdfjsError) {
            console.error('❌ Error en PDF.js:', pdfjsError);
        }
        
        // 2. Si PDF.js falla, intentar con pdf2json
        try {
            console.log('🔄 Intentando con pdf2json...');
            const pdfParser = new PDFParser();
            
            const text = await new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataReady", pdfData => {
                    try {
                        let text = decodeURIComponent(pdfData.Pages.map(page => 
                            page.Texts.map(text => text.R.map(r => r.T).join('')).join(' ')
                        ).join('\n'));
                        
                        text = sanitizeCVText(text);
                        console.log('📝 Primeros 200 caracteres extraídos con pdf2json:');
                        console.log(text.substring(0, 200));
                        
                        if (!extraccionDeficiente(text)) {
                            console.log('✅ Extracción exitosa con pdf2json');
                            resolve(text);
                        } else {
                            console.log('⚠️ Extracción con pdf2json resultó deficiente');
                            reject(new Error('Extracción deficiente'));
                        }
                    } catch (error) {
                        console.error('❌ Error procesando el texto extraído:', error);
                        reject(error);
                    }
                });
                
                pdfParser.on("pdfParser_dataError", error => {
                    console.error('❌ Error en pdf2json:', error);
                    reject(error);
                });
                
                pdfParser.parseBuffer(buffer);
            });

            return text;
        } catch (pdf2jsonError) {
            console.error('❌ Error en pdf2json:', pdf2jsonError);
        }
        
        // 3. Si ambos métodos anteriores fallan, intentar con OCR
        try {
            console.log('🔄 Intentando extracción con OCR...');
            const text = await extractTextWithOCR(buffer);
            
            if (!extraccionDeficiente(text)) {
                console.log('✅ Extracción exitosa con OCR');
                return text;
            }
            console.log('⚠️ Extracción con OCR resultó deficiente');
        } catch (ocrError) {
            console.error('❌ Error en OCR:', ocrError);
        }
        
        // 4. Como último recurso, intentar con el nuevo método de extracción como imágenes
        try {
            console.log('🔄 Intentando extracción como imágenes (último recurso)...');
            const text = await extractTextFromPdfAsImages(buffer);
            
            if (!extraccionDeficiente(text)) {
                console.log('✅ Extracción exitosa como imágenes');
                return text;
            }
            console.log('⚠️ Extracción como imágenes resultó deficiente');
        } catch (imageError) {
            console.error('❌ Error en extracción como imágenes:', imageError);
        }
        
        throw new Error('Todos los métodos de extracción fallaron');
    } catch (error) {
        console.error('❌ Error general en la extracción del PDF:', error);
        throw error;
    }
}

// Función para extraer texto con PDF.js
async function extractTextWithPDFJS(buffer) {
    try {
        console.log('🔍 Intentando extracción con PDF.js...');
        
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        let text = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map(item => item.str)
                .join(' ');
            text += pageText + '\n';
        }
        
        text = sanitizeCVText(text);
        console.log('📝 Primeros 200 caracteres extraídos con PDF.js:');
        console.log(text.substring(0, 200));
        
        return text.trim();
    } catch (error) {
        console.error('❌ Error en PDF.js:', error);
        throw error;
    }
}

// Función para procesar archivos adjuntos (PDF y DOCX)
async function processCVFiles(archivosCV) {
    let processedDocs = [];

    for (let archivo of archivosCV) {
        try {
            const uniqueName = generateUniqueFileName(archivo.nombre);
            console.log('\n🔄 Iniciando procesamiento de archivo:');
            console.log('----------------------------------------');
            console.log(`📁 Nombre Original: ${archivo.nombre}`);
            console.log(`🏷️ Nombre Único: ${uniqueName}`);
            
            let response = await axios.get(archivo.url, { 
                responseType: "arraybuffer",
                headers: {
                    'Content-Disposition': `attachment; filename="${uniqueName}"`
                }
            });
            
            console.log('📥 Archivo descargado correctamente');
            let buffer = Buffer.from(response.data);
            console.log(`📊 Tamaño del buffer: ${buffer.length} bytes`);

            let extension = path.extname(uniqueName).toLowerCase();
            console.log(`🔍 Extensión detectada: "${extension}"`);
            let extractedText = "";

            if (extension === ".pdf") {
                // Control adicional: ¿es realmente un PDF?
                const fileTypeResult = await fileTypeFromBuffer(buffer);
                if (fileTypeResult && fileTypeResult.ext === 'docx') {
                    // Es un DOCX con extensión PDF, procesar como DOCX
                    extractedText = await extractTextFromDocx(buffer);
                    extractedText = sanitizeCVText(extractedText);
                } else {
                    // Es un PDF real, procesar normalmente
                    extractedText = await extractTextFromPDF(buffer);
                }
            } else if (extension === ".docx") {
                try {
                    extractedText = await extractTextFromDocx(buffer);
                    extractedText = sanitizeCVText(extractedText);
                } catch (docxError) {
                    console.error('❌ Error procesando DOCX:', docxError);
                    extractedText = `⚠️ Error al procesar DOCX: ${docxError.message}`;
                }
            } else {
                console.error(`❌ Extensión no compatible: "${extension}"`);
                extractedText = `⚠️ Formato no compatible: ${archivo.nombre}`;
            }

            processedDocs.push({
                nombre: archivo.nombre,
                texto: extractedText,
                fecha: archivo.fecha || new Date(),
                tamaño: extractedText.length
            });

        } catch (error) {
            console.error('\n❌ Error en el procesamiento:');
            console.error('----------------------------------------');
            console.error(`Archivo: ${archivo.nombre}`);
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('----------------------------------------\n');
            processedDocs.push({
                nombre: archivo.nombre,
                texto: `⚠️ No se pudo procesar: ${archivo.nombre}`,
                error: true
            });
        }
    }

    return processedDocs;
}

// Nueva función para comparar y filtrar documentos similares
function calculateSimilarity(text1, text2) {
    // Simplificar los textos para comparación
    const simplifyText = (text) => {
        return text.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .trim()
            .split(' ')
            .slice(0, 1000)  // Tomar solo las primeras 1000 palabras para comparación rápida
            .join(' ');
    };

    const simple1 = simplifyText(text1);
    const simple2 = simplifyText(text2);

    // Si son casi idénticos (más del 90% igual), considerarlos duplicados
    const similarity = simple1.length > simple2.length 
        ? simple2.length / simple1.length 
        : simple1.length / simple2.length;

    console.log(`Similitud entre documentos: ${similarity * 100}%`);
    return similarity;
}

function filterSimilarDocuments(docs) {
    console.log('\n🔍 Iniciando comparación de documentos...');
    const uniqueDocs = [];
    const processed = new Set();

    for (let i = 0; i < docs.length; i++) {
        if (processed.has(i)) {
            console.log(`Saltando documento ${i} porque ya fue procesado`);
            continue;
        }
        
        let bestDoc = docs[i];
        processed.add(i);

        for (let j = i + 1; j < docs.length; j++) {
            if (processed.has(j)) continue;

            const similarity = calculateSimilarity(docs[i].texto, docs[j].texto);
            console.log(`Similitud entre doc ${i} y doc ${j}: ${similarity * 100}%`);

            // Si la similitud es mayor a 0.8 (80%)
            if (similarity > 0.8) {
                console.log(`¡Documentos similares encontrados! ${docs[i].nombre} y ${docs[j].nombre}`);
                processed.add(j); // Marcar el documento similar como procesado
                
                // Quedarnos con el más largo
                if (docs[j].texto.length > bestDoc.texto.length) {
                    console.log(`Seleccionando el más largo: ${docs[j].nombre}`);
                    bestDoc = docs[j];
                } else {
                    console.log(`Manteniendo el original: ${bestDoc.nombre}`);
                }
                
                // No agregar el documento similar a uniqueDocs
                continue;
            }
        }

        // Solo agregar el mejor documento encontrado
        console.log(`Agregando documento único: ${bestDoc.nombre}`);
        uniqueDocs.push(bestDoc);
    }

    console.log(`\nResumen final:`);
    console.log(`- Documentos originales: ${docs.length}`);
    console.log(`- Documentos únicos: ${uniqueDocs.length}`);
    console.log(`- Documentos eliminados por similitud: ${docs.length - uniqueDocs.length}`);

    return uniqueDocs;
}

// Función principal para analizar candidato
export const analyzeCandidate = async (jobDescription, candidateInfo) => {
    try {
        // Primero, loguear los datos recibidos
        console.log('\n\n🔍 DATOS RECIBIDOS EN ANALYZE CANDIDATE:');
        console.log('----------------------------------------');
        console.log('Job Description:', jobDescription);
        console.log('Candidate Info:', candidateInfo);
        console.log('----------------------------------------\n');

        // Procesar archivos CV y extraer texto
        const processedDocs = await processCVFiles(candidateInfo.archivosCV || []);
        
        // Filtrar documentos similares
        const uniqueDocs = filterSimilarDocuments(processedDocs);
        
        console.log(`Reducido de ${processedDocs.length} a ${uniqueDocs.length} documentos únicos`);
        
        // Concatenar los documentos únicos
        const CVdetalle = uniqueDocs
            .map(doc => {
                // Verificar y convertir a string si es necesario
                const textoSeguro = typeof doc.texto === 'string' 
                    ? doc.texto 
                    : JSON.stringify(doc.texto);
                    
                return `\n\n📄 [${doc.nombre}]\n${textoSeguro}`;
            })
            .join('');

        // Debug
        console.log('Tipo de CVdetalle:', typeof CVdetalle);
        console.log('Primeros 500 caracteres de CVdetalle:', CVdetalle.substring(0, 500));

        // Simplificar y limpiar los datos del trabajo
        const jobData = {
            // Información básica
            titulo: jobDescription.titulo ?? '',
            area: jobDescription.area ?? '',
            descripcion: jobDescription.descripcion ?? '',
            requisitos: jobDescription.requisitos ?? '',
            
            // Modalidad y tipo
            modalidad: jobDescription.modalidadTrabajo ?? '',
            tipo: jobDescription.tipoTrabajo ?? '',
            tipoDeContratacion: jobDescription.tipoDeContratacion ?? '',
            modalidadDeContratacion: jobDescription.modalidadDeContratacion ?? '',
            
            // Ubicación
            ubicacion: {
                pais: jobDescription.ubicacion?.pais ?? '',
                provincia: jobDescription.ubicacion?.provincia ?? '',
                ciudad: jobDescription.ubicacion?.ciudad ?? ''
            },
            
            // Información de la empresa y área
            descripcionEmpresa: jobDescription.descripcionEmpresa ?? '',
            areaTrabajo: jobDescription.areaTrabajo ?? '',
            descripcionTrabajo: jobDescription.descripcionTrabajo ?? '',
            
            // Requisitos educativos
            estadoNivelEducacion: jobDescription.estadoNivelEducacion ?? '',
            nivelMinimoEducacion: jobDescription.nivelMinimoEducacion ?? '',
            requisitoSecundarioCompleto: jobDescription.requisitoSecundarioCompleto ?? '',
            
            // Requisitos específicos
            requisitoIdioma: jobDescription.requisitoIdioma ?? '',
            idioma: jobDescription.idioma ?? '',
            requisitoReubicacionLaboral: jobDescription.requisitoReubicacionLaboral ?? '',
            requisitoDisponibilidadHoraria: jobDescription.requisitoDisponibilidadHoraria ?? '',
            requisitoGenero: jobDescription.requisitoGenero ?? '',
            
            // Jerarquía y género
            jerarquia: jobDescription.jerarquia ?? '',
            genero: jobDescription.genero ?? ''
        };

        // Simplificar y limpiar los datos del candidato
   // Simplificar y limpiar los datos del candidato
const candidateData = {
    // Datos personales
    datosPersonales: {
        nombre: candidateInfo.datosPersonales?.nombre || '',
        apellido: candidateInfo.datosPersonales?.apellido || '',
        email: candidateInfo.datosPersonales?.email || '',
        telefono: candidateInfo.datosPersonales?.telefonoCelular || candidateInfo.datosPersonales?.telefonoFijo || '',
        fechaNacimiento: candidateInfo.datosPersonales?.fechaNacimiento || '',
        genero: candidateInfo.datosPersonales?.genero || '',
        nacionalidad: candidateInfo.datosPersonales?.nacionalidad || ''
    },

    // Ubicación
    ubicacion: candidateInfo.direccion ? {
        pais: candidateInfo.direccion.pais || '',
        provincia: candidateInfo.direccion.provincia || '',
        ciudad: candidateInfo.direccion.ciudad || '',
        direccion: candidateInfo.direccion.direccion || ''
    } : {},

    // Presentación y perfil profesional
    presentacion: candidateInfo.presentacion || '',
    redesSociales: candidateInfo.redesSociales || {},

    // Experiencia laboral
    experiencia: (candidateInfo.experiencia || []).map(exp => ({
        puesto: exp.puesto || '',
        empresa: exp.empresa || '',
        periodo: exp.periodo || '',
        descripcion: exp.descripcion || '',
        area: exp.area || '',
        subArea: exp.subArea || '',
        industria: exp.industria || '',
        seniority: exp.seniority || '',
        trabajoActual: exp.trabajoActual || false,
        pais: exp.pais || ''
    })),

    // Formación académica
    estudios: (candidateInfo.estudios || []).map(edu => ({
        titulo: edu.titulo || '',
        institucion: edu.institucion || '',
        periodo: edu.periodo || '',
        nivel: edu.nivel || '',
        estado: edu.estado || '',
        area: edu.area || '',
        pais: edu.pais || '',
        descripcion: edu.descripcion || ''
    })),

    // Conocimientos y habilidades
    conocimientos: (candidateInfo.conocimientos || []).map(con => ({
        tipo: con.tipo || '',
        nombre: con.nombre || '',
        nivel: con.nivel || '',
        calificacion: con.calificacion || '',
        descripcion: con.descripcion || ''
    })),

    // Referencias
    referencias: (candidateInfo.referencias || []).map(ref => ({
        nombre: ref.nombre || '',
        apellido: ref.apellido || '',
        relacion: ref.relacion || '',
        telefono: ref.telefono || '',
        email: ref.email || '',
        descripcion: ref.descripcion || ''
    })),

    // Disponibilidad
    disponibilidad: {
        horaria: candidateInfo.disponibilidadHoraria || '',
        relocacion: candidateInfo.disponibilidadRelocacion || ''
    },

    // Estado actual
    etapa: candidateInfo.etapa || '',

    // Documentos
    archivosCV: (candidateInfo.archivosCV || []).map(archivo => ({
        nombre: archivo.nombre || '',
        url: archivo.url || ''
    })),
    CVdetalle: await processCVFiles(candidateInfo.archivosCV || [])
};

        // Loguear datos procesados
        console.log('\n📝 DATOS PROCESADOS:');
        console.log('----------------------------------------');
        console.log('Job Data:', JSON.stringify(jobData, null, 2));
        console.log('Candidate Data:', JSON.stringify(candidateData, null, 2));
        console.log('----------------------------------------\n');
     
        // Construir el prompt usando SOLO los documentos únicos
     const cvTexto = uniqueDocs
     .map(doc => `
         // Documento: ${doc.nombre}
         ${doc.texto}
     `)
     .join('\n\n');
// Función para limpiar y preparar el texto del CV
const prepararCVTexto = (texto) => {
    if (!texto) return '';
    return texto
        .replace(/[\n\r]/g, ' ')         // Reemplaza saltos de línea por espacios
        .replace(/\s+/g, ' ')            // Reemplaza múltiples espacios por uno solo
        .replace(/"/g, "'")              // Reemplaza comillas dobles por simples
        .replace(/\\/g, '/')             // Reemplaza backslashes
        .trim()                          // Elimina espacios al inicio y final
        .substring(0, 1000);             // Limita a 1000 caracteres
};

        const prompt = `
        Necesito un análisis de compatibilidad entre un candidato y un puesto de trabajo con una visión de reclutador de recursos humanos.
        IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.
       


       <<< INSTRUCCIONES CRÍTICAS para Generar la respuesta >>>

                CRITERIOS EXCLUYENTES:
                Un candidato será considerado "NO CUMPLE" si no cumple con al menos uno de los siguientes criterios:

  
                1. Ubicación:

                    - Si el puesto especifica una o varias ubicaciones (ciudades, provincias, países o regiones), el candidato debe residir en al menos una de ellas o en una zona geográfica que pertenezca claramente a esa ubicación.

                    - Considerar válidas las siguientes coincidencias jerárquicas (por pertenencia geográfica):
                    - **Barrios** dentro de una **ciudad**. Ejemplo: "Villa Lugano" debe considerarse parte de "Capital Federal" o "CABA".
                    - **Ciudades o partidos** dentro de una **provincia o región metropolitana**. Ejemplo: "Avellaneda" o "San Martín" deben considerarse parte del "Gran Buenos Aires".
                    - **Provincias o estados** dentro de un **país**. Ejemplo: "Córdoba" ∈ "Argentina".
                    - **Países o provincias** dentro de una **región amplia**. Ejemplo: "Argentina" ∈ "LATAM", "Patagonia" ∈ "Argentina".

                    - Usar una lógica flexible de inclusión geográfica. Por ejemplo:
                    - Si el puesto requiere **"Capital Federal"** o **"CABA"**, también se aceptan los siguientes barrios:
                        Villa Lugano, Villa Riachuelo, Liniers, Recoleta, Palermo, Belgrano, Caballito, entre otros barrios oficiales de la Ciudad Autónoma de Buenos Aires.
                    - Si el puesto requiere **"Gran Buenos Aires"** o **"GBA"**, se aceptan partidos como:
                        Avellaneda, Lanús, Lomas de Zamora, Quilmes, San Isidro, Vicente López, San Martín, La Matanza, Tres de Febrero, entre otros partidos limítrofes con CABA.
                    - Si el puesto requiere **"Buenos Aires"** sin especificar, se deben aceptar tanto CABA como el GBA, salvo que se indique explícitamente lo contrario.
                    - Si el puesto requiere **"LATAM"**, cualquier país de América Latina es válido.

                    - **Importante**: la modalidad del puesto (remoto, híbrido, presencial) **no modifica este criterio excluyente**. Se evalúa únicamente la ubicación actual de residencia del candidato, no su disponibilidad para trasladarse.


                2. Idioma:
                - Si el puesto exige un idioma a un nivel específico, debe cumplirse.
                - Si el idioma está mencionado como "preferentemente" o "deseable", NO es excluyente.

                3. Otros:
                - Solo deben considerarse excluyentes aquellos criterios marcados como tales en la descripción.
                - No asumir que algo es excluyente si no está expresamente indicado.

                Si el candidato no cumple con al menos uno de estos criterios excluyentes, debe devolverse:
                "respuesta": "No" con justificación detallada, indicando:
                - Lista de criterios excluyentes requeridos
                - Cuáles cumple y cuáles no
                - Por qué no cumple

                Si cumple todo, entonces:
                "respuesta": "Sí" con justificación detallada de todos los criterios cumplidos.

                BLOQUES DE RESPUESTA:

                1. "Cumplimiento de requisitos excluyentes":
                - Campo "respuesta": debe ser "Sí" o "No".
                - Campo "justificación": detallar TODOS los criterios que aplican, marcar cuáles se cumplen y cuáles no, con ejemplos claros del CV o la info del candidato, lugar de residencia o idiomas.
                - La justificacion debe ser precisa y contundente.


                2. "Aptitud general para el puesto":
                - Redactar un análisis técnico y cualitativo del ajuste del candidato al perfil.
                - Explicar claramente cómo se llegó al puntaje final
                - Explicar por qué sería (o no) una buena opción.
                - Fundamentar con evidencias del CV y del formulario.
                - Pensar como un reclutador que justifica una recomendación ante un cliente.
                 - Detallar qué aspectos fueron determinantes
                - Mencionar qué podría mejorar el puntaje


 

                3. "Fortalezas identificadas":
                - Listar hasta 7 fortalezas que surjan explícitamente del CV o los datos del candidato.
                - Pueden ser técnicas o de soft skills.
                - No inventar ni inferir.
                - Indicar evidencia para cada fortaleza (ej: "Experiencia en COBOL (5 años en Banco XYZ)").
                - Incluir el peso de cada fortaleza en la evaluación



                4. "Debilidades o áreas de mejora":
                - Listar hasta 7 debilidades si están claramente presentes.
                - No inventar. No inferir. Basarse solo en datos provistos.
                - Indicar el impacto de cada una en la adecuación.
                - Incluir sugerencias específicas de mejora cuando sea posible

                5. "Calificación de adecuación":
                - Campo "calificación": número entero del 1 al 10, sin excepciones. Nunca usar -1 ni -2. Si el candidato no cumple ningún requisito, devolver el mínimo permitido: 1.
                - Campo "justificación": analizar cada requisito, indicar si fue cumplido, parcialmente cumplido o no cumplido. Mencionar roles, herramientas, estudios y argumentos claros que respalden cada punto. Concluir con un razonamiento que fundamente la calificación.
                - La "justificación" DEBE incluir:
                    * Un desglose numérico de cada criterio evaluado
                    * Ejemplo: "Technical (40%): 8/10, Experience (25%): 7/10, Education (15%): 9/10..."
                    * Para cada criterio, explicar por qué se dio ese puntaje
                    * Listar específicamente qué requisitos se cumplieron y cuáles no
                    * Explicar por qué no es un puntaje mayor o menor
                    * Citar evidencia específica del CV para cada evaluación

                6. "contactos":
                - Extraer desde el texto del CV o candidateInfo todos los datos de contacto detectados.
                - Incluir email, teléfonos y redes sociales (sin URLs completas).
                - No repetir datos. Una sola ocurrencia por tipo.
                - Ejemplo: "contactos": { "datos": "email@ejemplo.com 3511234567 linkedin: juanperez123 github: jperez" }

                CÁLCULO DE SCORES INDIVIDUALES (0 a 100):
                - Evaluá cada uno como una "nota escolar". Cuanto mayor el ajuste, mayor el score.
                - Si el perfil no especifica el criterio, asignar 100 por omisión.
                

                1. technical (40%):
                - Coincidencia entre skills técnicos requeridos y habilidades del candidato.

                2. experience (25%):
                - Nivel de experiencia laboral real y demostrada en uso de esas tecnologías.

                3. education (15%):
                - Ajuste entre la formación académica y certificaciones del candidato vs. lo solicitado.

                4. years (10%):
                - Comparar años de experiencia requeridos con los años que muestra el candidato.
                - Si cumple o supera → 100
                - Si no cumple → proporcional. Ej: tiene 2 años y se piden 3 → (2/3) * 100 = 66
                - Redondear al entero más cercano.
                - Si no se menciona cantidad de años → score = 100

                5. location (5%):
                - Si cumple con la ubicación solicitada → 100
                - Si no cumple → 0
                - Si no se especifica ubicación → 100

                6. tags (5%):
                - Por ahora, siempre = 100

                totalScore = (technical * 0.4) + (experience * 0.25) + (education * 0.15) + (years * 0.1) + (location * 0.05) + (tags * 0.05)

                - Redondear el totalScore a número entero.
                

                <<< FIN INSTRUCCIONES >>>
       
       Esta es la información del puesto de trabajo:
       
       
        // Información básica del puesto de trabajo
        - Título: ${jobData.titulo}
        - Área: ${jobData.area}
        - Descripción: ${jobData.descripcion}
        - Requisitos: ${jobData.requisitos}
        
        // Modalidad y tipo
        - Modalidad de Trabajo: ${jobData.modalidad}
        - Tipo de Trabajo: ${jobData.tipo}
        - Tipo de Contratación: ${jobData.tipoDeContratacion}
        - Modalidad de Contratación: ${jobData.modalidadDeContratacion}
        
        // Ubicación
        - Ubicación: 
          * País: ${jobData.ubicacion.pais}
          * Provincia: ${jobData.ubicacion.provincia}
          * Ciudad: ${jobData.ubicacion.ciudad}
        
        // Información de la empresa y área
        - Descripción de la Empresa: ${jobData.descripcionEmpresa}
        - Área de Trabajo: ${jobData.areaTrabajo}
        - Descripción del Trabajo: ${jobData.descripcionTrabajo}
        
        // Requisitos educativos
        - Estado Nivel Educación: ${jobData.estadoNivelEducacion}
        - Nivel Mínimo Educación: ${jobData.nivelMinimoEducacion}
        - Requisito Secundario Completo: ${jobData.requisitoSecundarioCompleto}
        
        // Requisitos específicos
        - Requisito Idioma: ${jobData.requisitoIdioma}
        - Idioma: ${jobData.idioma}
        - Requisito Reubicación Laboral: ${jobData.requisitoReubicacionLaboral}
        - Requisito Disponibilidad Horaria: ${jobData.requisitoDisponibilidadHoraria}
        - Requisito Género: ${jobData.requisitoGenero}
        
        // Jerarquía y género
        - Jerarquía: ${jobData.jerarquia}
        - Género: ${jobData.genero}

        
INFORMACIÓN DEL CANDIDATO:
 Informacion de su Curriculum Vitae
  * Curriculum Vitae pasado a texto: ${prepararCVTexto(cvTexto)}

 Datos de contacto del candidato
  * email: ${candidateInfo.datosPersonales?.email}
  * telefono: ${candidateInfo.datosPersonales?.telefonoCelular}
  *  telefono otro: ${candidateInfo.datosPersonales?.telefonoFijo}

 Datos personales y ubicación
- Ubicación: 
  * País: ${candidateData.ubicacion.pais}
  * Provincia: ${candidateData.ubicacion.provincia}
  * Ciudad: ${candidateData.ubicacion.ciudad}
  * Dirección: ${candidateData.ubicacion.direccion}

 Presentación y perfil profesional
- Presentación: ${candidateData.presentacion}
- Redes Sociales: ${Object.entries(candidateData.redesSociales)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')}

// Experiencia laboral
- Experiencia Laboral:
${candidateData.experiencia.map(e => 
`  * ${e.puesto} en ${e.empresa}
    Período: ${e.periodo}
    Área: ${e.area}
    Sub-área: ${e.subArea}
    Industria: ${e.industria}
    Seniority: ${e.seniority}
    País: ${e.pais}
    Trabajo Actual: ${e.trabajoActual ? 'Sí' : 'No'}
    Descripción: ${e.descripcion}`
).join('\n')}

// Formación académica
- Formación:
${candidateData.estudios.map(e => 
`  * ${e.titulo} - ${e.institucion}
    Período: ${e.periodo}
    Nivel: ${e.nivel}
    Estado: ${e.estado}
    Área: ${e.area}
    País: ${e.pais}
    Descripción: ${e.descripcion}`
).join('\n')}

// Conocimientos y habilidades
- Conocimientos y Habilidades:
${candidateData.conocimientos.map(c => 
`  * ${c.nombre} (${c.tipo})
    Nivel: ${c.nivel}
    Calificación: ${c.calificacion}
    Descripción: ${c.descripcion}`
).join('\n')}

// Disponibilidad
- Disponibilidad:
  * Horaria: ${candidateData.disponibilidad.horaria}
  * Reubicación: ${candidateData.disponibilidad.relocacion}

Además, deberás detectar si la ubicación física del candidato cumple con lo requerido por el puesto. Si el trabajo es presencial o semipresencial (híbrido) y el candidato no reside en la ciudad del puesto ni declara disponibilidad de reubicación, deberás marcarlo como un incumplimiento en los requisitos excluyentes. No consideres la ubicación como excluyente en puestos 100% remotos, salvo que se indique explícitamente una limitación geográfica.

   
Por favor, toma el rol de analista de recursos humanos en proceso de reclutamiento y
analiza la compatibilidad entre el candidato y el puesto de trabajo y responde con 
el siguiente formato (Respete estrictamente el formato de la respuesta en formato JSON tal como se pide a continuacion):
         IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.
{
    "Cumplimiento de requisitos excluyentes": {
        "respuesta": "Sí/No",
        "justificación": "Explicación detallada"
    },
    "Aptitud general para el puesto": "Explicación detallada",
    "Fortalezas identificadas": [
        "Fortaleza 1",
        "Fortaleza 2",
        "Fortaleza 3"
    ],
    "Debilidades o áreas de mejora": [
        "Debilidad 1",
        "Debilidad 2",
        "Debilidad 3"
    ],
    "Calificación de adecuación": {
        "calificación": "Número entero del 1 al 10. Nunca usar valores fuera de este rango, ni negativos, ni 0. Si el ajuste es nulo, devolver el mínimo permitido: 1.",
        "justificación": "Detallar uno por uno los requisitos del puesto y cruzarlos con la información concreta que aparece en el CV del candidato. Para cada requisito, indicar si está cumplido, parcialmente cumplido o ausente, explicando con precisión por qué (citando roles, herramientas, estudios u otros elementos del CV como evidencia). Luego de este análisis, justificar numéricamente la calificación general entre 1 y 10 en función del grado de ajuste observado."
    },
    "cuestionario": {
        "preguntas_psicologicas": [
            {
                "numero": 1,
                "pregunta": "texto de la pregunta",
                "opciones": {
                    "A": "texto opción A",
                    "B": "texto opción B",
                    "C": "texto opción C",
                    "D": "texto opción D"
                },
                "respuesta_correcta": "letra",
                "explicacion": "explicación de la respuesta correcta"
            }
        ],
        "preguntas_tecnicas": [
            {
                "numero": 1,
                "pregunta": "texto de la pregunta",
                "opciones": {
                    "A": "texto opción A",
                    "B": "texto opción B",
                    "C": "texto opción C",
                    "D": "texto opción D"
                },
                "respuesta_correcta": "letra",
                "explicacion": "explicación de la respuesta correcta"
            }
        ]
    },
    "contactos": { "datos": "Incluir aca si en la información del candidato se encuentra email o cualquier telefono uno al lado del otro separado por espacios. Busque en el texto del curriculum Vitae para ver si ahi hay datos de contacto y agreguelos aca."}
}

Si la calificación es 10 o menor, el objeto "cuestionario" debe estar vacío excepto la pregunta numero 1 
de las preguntas psicologicas que debe tener este formato ya que en el campo explicacion de esa pregunta
quiero guardar el CV pasado a texto que mas arriba se informo como 
"Informacion de su Curriculum Vitae -Curriculum Vitae pasado a texto". 
Por favor coloquelo (asegurandose de no superar los 1000 caracteres) en el campo explicacion y asegurese de cerrar bien el JSON con la llave de salida
         IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.   

"cuestionario": {
        "preguntas_psicologicas": [
            {
                "numero": 1,
                "pregunta": "Contenido del CV pasado a texto",
                "opciones": {
                    "A": "texto opción A",
                    "B": "texto opción B",
                    "C": "texto opción C",
                    "D": "texto opción D"
                },
                "respuesta_correcta": "A,B,C o D de acuerdo a si los archivos son 1,2,3 o 4 respectivamente o 4 si tambien son mas de 4",
                "explicacion": "${prepararCVTexto(cvTexto)}"
            }
        ]
    }
`;



        // Loguear el prompt
        console.log('\n📤 PROMPT ENVIADO A OPENAI:');
        console.log('INICIO DEL PROMPT----------------------------------------');
        console.log(prompt);
        console.log('FIN DEL PROMPT----------------------------------------\n');

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            //model: "gpt-4",
            messages: [{ 
                role: "user", 
                content: prompt 
            }],
            temperature: 0.7,
        });

        // ✅ NUEVO BLOQUE para tokens
        const usage = completion.usage || {};
        const model = completion.model || "desconocido";

        // Definir precios por modelo (solo gpt-4o-mini)
        const PRECIOS = {
            "gpt-4o-mini": {
              input:  0.0006,  // USD por 1 000 tokens de entrada
              output: 0.0024   // USD por 1 000 tokens de salida
            }
          };
          
          // Cálculo "exacto" (no redondeos)
          const precios      = PRECIOS["gpt-4o-mini"];
          const tokensInput  = usage.prompt_tokens;       // p. ej. 3273
          const tokensOutput = usage.completion_tokens;   // p. ej. 1072
          
          const costoInput  = (tokensInput  / 1000) * precios.input;
          const costoOutput = (tokensOutput / 1000) * precios.output;
          const costoSystem  = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
          const costoTotal   = costoInput + costoOutput + costoSystem;
 
        const tokenInfo = {
            modelo: model,
            tokens_prompt: usage.prompt_tokens || 0,
            tokens_respuesta: usage.completion_tokens || 0,
            tokens_total: usage.total_tokens || 0,
            costo_input: costoInput.toFixed(4),
            costo_output: costoOutput.toFixed(4),
            costo_total: costoTotal.toFixed(4),
            fecha: new Date(),
            usuario:  "desconocido",
            consulta: "analyzeCandidate"
        };
        await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);



   


        const response = completion.choices[0].message.content;
        
        // Loguear la respuesta
        console.log('\n📥 RESPUESTA VALIDA HOY DE OPENAI:');
        console.log('----------------------------------------');
        console.log(response);
        console.log('----------------------------------------\n');


        try {
           const parsedResponse = JSON.parse(response);
           
            return parsedResponse;
        } catch (error) {
            console.error('Error parseando respuesta de OpenAI:', error);
            return {
                "Cumplimiento de requisitos excluyentes": {
                    "respuesta": "No",
                    "justificación": `${response}`
                },
                "Aptitud general para el puesto": "Información insuficiente para evaluar",
                "Fortalezas identificadas": [],
                "Debilidades o áreas de mejora": [],
                "Calificación de adecuación": {
                    "calificación": -1,
                    "justificación": `${response}`
                },
                "cuestionario": {}
            };
        }
    } catch (error) {
        // Loguear errores
        console.error('\n❌ ERROR EN ANALYZE CANDIDATE:');
        console.error('----------------------------------------');
        console.error('Error completo:', error);
        console.error('----------------------------------------\n');

        // Devolver objeto JSON con calificación -2 (error técnico)
        return {
            "Cumplimiento de requisitos excluyentes": {
                "respuesta": "No",
                "justificación": "Error técnico en la API de OpenAI"
            },
            "Aptitud general para el puesto": "No se pudo evaluar por error técnico",
            "Fortalezas identificadas": [],
            "Debilidades o áreas de mejora": [],
            "Calificación de adecuación": {
                "calificación": -2,
                "justificación": `Error técnico: ${error.message}. Por favor, intente más tarde.`
            },
            "cuestionario": {}
        };
    }
};

// ... existing imports y código ...
const convertGPTResponseToDoc = async (content, type) => {
    try {
        // Usar un template básico para los informes
        const template = fs.readFileSync(path.join(__dirname, '../templates/report_template.docx'), 'binary');
        const zip = new PizZip(template);
        const doc = new Docxtemplater(zip);

        doc.setData({
            content: content,
            date: new Date().toLocaleDateString(),
            type: type
        });

        doc.render();

        return doc.getZip().generate({ type: 'nodebuffer' });
    } catch (error) {
        console.error('Error convirtiendo respuesta a DOCX:', error);
        throw error;
    }
};
const generateCompanyReport = async (postulantInfo) => {
    try {
        const prompt = `
        Genera un informe profesional para la empresa sobre el candidato ${postulantInfo.nombre} ${postulantInfo.apellido}.
        
        Información del candidato:
        ${JSON.stringify(postulantInfo, null, 2)}

        El informe debe incluir:
        1. Evaluación de habilidades
        2. Experiencia relevante
        3. Formación académica
        4. Recomendaciones
        
        Formato: Documento formal tipo informe empresarial.
        Estructura el informe con:
        - Encabezado con fecha y datos del candidato
        - Secciones claramente definidas
        - Conclusiones y recomendaciones al final
        - Firma del equipo de reclutamiento

        Tono: Profesional y objetivo, enfocado en las fortalezas del candidato.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return await convertGPTResponseToDoc(completion.choices[0].message.content, 'company');
    } catch (error) {
        console.error('Error generando informe para empresa:', error);
        throw error;
    }
};

const generateOperationsReport = async (postulantInfo) => {
    try {
        const prompt = `
        Genera un informe interno para el área de operaciones sobre el proceso de selección del candidato ${postulantInfo.nombre} ${postulantInfo.apellido}.
        
        Información del candidato:
        ${JSON.stringify(postulantInfo, null, 2)}

        El informe debe incluir:
        1. Detalle del proceso de selección
           - Canales de reclutamiento utilizados
           - Tiempo del proceso
           - Etapas completadas
        
        2. Evaluación técnica
           - Habilidades validadas
           - Áreas de mejora identificadas
           - Comparación con requisitos del puesto
        
        3. Evaluación de soft skills
           - Comunicación
           - Trabajo en equipo
           - Adaptabilidad
        
        4. Aspectos logísticos
           - Disponibilidad
           - Expectativas salariales
           - Tiempos de incorporación
        
        5. Recomendaciones para el proceso
           - Mejoras identificadas
           - Puntos a considerar en futuros procesos
        
        Formato: Documento formal tipo informe interno.
        Incluir:
        - Fecha y código de proceso
        - Métricas relevantes
        - Observaciones específicas del proceso
        - Firma del equipo de operaciones
        
        Tono: Técnico y detallado, orientado a la mejora de procesos.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return await convertGPTResponseToDoc(completion.choices[0].message.content, 'operations');
    } catch (error) {
        console.error('Error generando informe de operaciones:', error);
        throw error;
    }
};

export const generateCurriculumFichaOS = async (postulantInfo, archivos, analisisPostulante, templatePath) => {
    try {
        console.log('\n🔄 Iniciando generación de ficha OneSelect');
        const processedDocs = await processCVFiles(archivos);
        const cvText = processedDocs.map(doc => doc.texto).join('\n\n');
        const resumenAnalisis = analisisPostulante ? `
 ANÁLISIS DEL CANDIDATO:
 
 Presentación del Postulante:
 ${postulantInfo.presentacionPostulante || 'No especificada'}
 
 
 Aptitud General para el Puesto:
 ${analisisPostulante.aptitudParaPuesto || 'No especificada'}
 
 Fortalezas Identificadas:
 ${analisisPostulante.fortalezas ? 
   analisisPostulante.fortalezas.map(f => `• ${f}`).join('\n') : 
   'No especificadas'}
 
 Áreas de Mejora:
 ${analisisPostulante.debilidades ? 
   analisisPostulante.debilidades.map(d => `• ${d}`).join('\n') : 
   'No especificadas'}
 
 Evaluación de Requisitos:
 ${analisisPostulante.justificacionRequisitos || 'No disponible'}
 ` : 'No hay análisis previo disponible' + (postulantInfo.presentacionPostulante ? `\n\nPresentación del Postulante:\n${postulantInfo.presentacionPostulante}` : '');




        const prompt = `
         Este prompt tiene como objetivo generar una ficha curricular estructurada, completa y profesional del perfil de un/a postulante, basada en su CV original, pensada desde la mirada de una reclutadora para ser presentada a un cliente final.

El resultado debe:
- Reflejar fielmente las competencias, experiencias y formación de la persona.
- Excluir **datos personales sensibles o de contacto** (teléfono, email, dirección, documento, etc.).
- Presentar la información en un formato claro, estandarizado y sin adornos innecesarios.
- Estar redactado en **tercera persona**, con lenguaje profesional y objetivo.
- Ser completamente **parseable como JSON**, manteniendo la estructura exacta requerida.

INFORMACIÓN DEL POSTULANTE:
${JSON.stringify(postulantInfo, null, 2)}

CONTENIDO DEL CV ORIGINAL:
${cvText}

${analisisPostulante ? `
ANÁLISIS PREVIO DEL POSTULANTE:
${JSON.stringify(analisisPostulante, null, 2)}
` : ''}

       TRADUCCIÓN:
            Antes de estructurar la información, traducí TODO el contenido del CV y cualquier parte del análisis que esté en inglés al ESPAÑOL NEUTRO. No debe quedar ninguna frase en inglés. No mantengas títulos de cursos, descripciones de trabajos ni herramientas sin traducir. Usá traducciones naturales y profesionales, no traducciones literales ni palabra por palabra.

            Luego de traducirlo internamente, completá el JSON respetando el resto de las instrucciones.

            ⚠️ Si el resultado incluye texto en inglés será considerado incorrecto. No debe haber frases, descripciones ni títulos sin traducir. Toda la información debe estar redactada en un español correcto, sin errores gramaticales ni de traducción literal.

            INSTRUCCIONES PARA LA ESTRUCTURA:
                     IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.   
            Genera un JSON con EXACTAMENTE esta estructura:
{
  "nombre": "string",
  "apellido": "string",
  "profesion": "string",
  "rol": "string",
  "edad": "string",
  "fechaNacimiento": "string",
  "zonaResidencia": "string",
  "estadoCivil": "string",
  "composicionFamiliar": "string",
  "nacionalidad": "string",
  "movilidadPropia": "string",
  "formacionAcademica": [{
    "institucion": "string",
    "titulo": "string",
    "fechaInicio": "string",
    "fechaFin": "string"
  }],
  "cursos": [{
    "nombreCurso": "string",
    "anioCurso": "string",
    "institucionCurso": "string"
  }],
  "aptitudes": ["string"],
  "habilidades": {
                "lenguajesProgramacion": ["string"],
                "basesDeDatos": ["string"],
                "metodologias": ["string"],
                "otros": ["string"]
            },
  "trayectoria": [{
    "periodo": "string",
    "empresa": "string",
    "puesto": "string",
    "funciones": "string",
    "motivoEgreso": "string"
  }],
  "AniosExperiencia": "string",
  "AreaExperiencia": "string",
  "empresaactual": "string",
  "observaciones": "string (Incluir aquí un resumen del análisis previo si existe)",
  "hobbies": "string",
  "compromisosProximos": "string",
  "otrosProcesos": "string",
  "carnetConducir": "string",
  "antecedentes": "string"
}


REGLAS:
            1. Mantén EXACTAMENTE la misma estructura.
            2. El CONTENIDO DEL CV ORIGINAL contiene información valiosa para completar los campos: utilizala a fondo.
            3. Completá todos los campos posibles con la información disponible. 
                    Si no hay información para un campo, usá "" para strings y [] para arrays.
            4. Clasificá correctamente las habilidades en sus categorías.
                Categorizar todas las tecnologías mencionadas aunque aparezcan una sola vez:

                - lenguajesProgramacion: lenguajes, frameworks, scripts (ej: Python, Vue.js)
                - basesDeDatos: motores, ERPs, sistemas de almacenamiento
                - metodologias: formas de trabajo y marcos (Scrum, Agile)
                - otros: sistemas operativos, herramientas, plataformas (Windows, Jira, Slack, Figma)

                **Reglas adicionales:**
                - Traducir con precisión técnica, sin alterar nombres propios.
                - Incluir versiones si están disponibles.

            5. En el campo "observaciones", incluí un resumen estructurado del análisis previo si existe.
            6. Usá la metadata para enriquecer el rol y otros campos relevantes.
            7. Toda la información debe estar en español, incluso si originalmente estaba en inglés. No debe haber texto sin traducir.
            8. Si hay un campo que no tiene sentido en el contexto, usá "".
            9. No incluyas ningún texto fuera del JSON. Tu respuesta debe ser SOLO el JSON parseable.    
            10. Las aptitudes son características personales, sociales o cognitivas que determinan cómo una persona se desempeña en su entorno laboral y cómo se relaciona con otros
                - Extraer de presentación personal, descripciones de logros, funciones o cualidades.
                - Incluye solo habilidades blandas (resolución de problemas, liderazgo, autonomía, etc.)
            
            
            11. En cursos coloque el nombre del curso, el año y la institución. Un curso puede ser una certificación, un diplomado, un curso de capacitación, etc.
                - Incluir **TODOS** los cursos, certificaciones, diplomados, talleres.
                - Buscar en: "Cursos", "Capacitaciones", "Educación adicional".
                - Por cada entrada:
                - nombreCurso, anio, institucionCurso (usar "No especificada" si no se puede deducir).
                - Traducir títulos al español neutro. No traducir instituciones.
            12. FORMACIÓN ACADÉMICA (formacionAcademica)
                - Incluir toda la educación formal.
                - Buscar en secciones como: "Educación", "Formación académica", "Estudios".
                - Por cada entrada:
                - institucion: nombre completo (si dice "UBA", deducir "Universidad de Buenos Aires"; si no es deducible, usar "No especificada").
                - titulo: nombre completo del estudio; incluir "(en curso)" o "(con honores)" si corresponde.
                - fechaInicio, fechaFin: año o "" si no puede inferirse.
                - Traducir títulos al español neutro, no el nombre de la institución.
             13. EXPERIENCIA LABORAL (trayectoria)
                - Incluir todas las experiencias mencionadas.
                - Por cada entrada:
                - empresa, puesto, periodo
                - funciones: redactar en **tercera persona, con viñetas**
                - motivoEgreso: si está, incluirlo; si no, usar ""
                - Preservar el mayor nivel de detalle. No resumir. NO acotar la cantidad de experiencias. Mantener orden cronológico inverso 
             14. DETERMINACIÓN DEL ROL (rol)
                    Priorizar en este orden:
                    1. Rol esperado o solicitado.
                    2. Rol actual o autodefinido.
                    3. Rol más reciente.               
            15. REGLAS GENERALES
            - No inventar datos.
            - No dejar campos con null, guiones o N/A. Usar "".
            - Mantener texto en español.
            - Preservar fechas, nombres, versiones y cifras.
            - No incluir texto fuera del JSON.
            - El archivo final debe ser 100% parseable como JSON.              
              
              
                `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });



         // ✅ NUEVO BLOQUE para tokens
         const usage = completion.usage || {};
         const model = completion.model || "desconocido";
 
          // Definir precios por modelo (solo gpt-4o-mini)
          const PRECIOS = {
            "gpt-4o-mini": {
              input:  0.0006,  // USD por 1 000 tokens de entrada
              output: 0.0024   // USD por 1 000 tokens de salida
            }
          };
          
          // Cálculo "exacto" (no redondeos)
          const precios      = PRECIOS["gpt-4o-mini"];
          const tokensInput  = usage.prompt_tokens;       // p. ej. 3273
          const tokensOutput = usage.completion_tokens;   // p. ej. 1072
          
          const costoInput  = (tokensInput  / 1000) * precios.input;
          const costoOutput = (tokensOutput / 1000) * precios.output;
          const costoSystem  = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
          const costoTotal   = costoInput + costoOutput + costoSystem;


         const tokenInfo = {
             modelo: model,
             tokens_prompt: usage.prompt_tokens || 0,
             tokens_respuesta: usage.completion_tokens || 0,
             tokens_total: usage.total_tokens || 0,
             costo_input: costoInput.toFixed(4),
             costo_output: costoOutput.toFixed(4),
             costo_total: costoTotal.toFixed(4),
             fecha: new Date(),
             usuario:  "desconocido",
             consulta: "Generar ficha OneSelect"
         };
         await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);
 
        const response = completion.choices[0].message.content;

        let parsedData;
       try {
           parsedData = JSON.parse(response.trim());
           parsedData.observaciones = resumenAnalisis;
           console.log('Datos procesados correctamente:', parsedData);
           
       } catch (error) {
           console.error('Error al parsear JSON:', error);
           // Intento de recuperación: convertir el texto a formato JSON
           parsedData = convertTextToJSON(response);
       }
            
            console.log('Datos procesados:', parsedData);

        // Aplanar los datos personales para el template
        const templateData = {
            ...parsedData,
            nombre: parsedData.nombre,
            apellido: parsedData.apellido,
            profesion: parsedData.profesion,
            rol: parsedData.rol,
            edad: parsedData.edad,
            fechaNacimiento: parsedData.fechaNacimiento,
            zonaResidencia: parsedData.zonaResidencia,
            estadoCivil: parsedData.estadoCivil,
            composicionFamiliar: parsedData.composicionFamiliar,
            nacionalidad: parsedData.nacionalidad,
            movilidadPropia: parsedData.movilidadPropia,
            instituciones: parsedData.formacionAcademica.map(institucion => ({
                institucion: institucion.institucion,
                titulo: institucion.titulo,
                fechaInicio: institucion.fechaInicio,
                fechaFin: institucion.fechaFin
            })),
            cursos: parsedData.cursos.map(curso => ({
                nombreCurso: curso.nombreCurso,
                anioCurso: curso.anioCurso,
                institucionCurso: curso.institucionCurso
            })),
            aptitudes: parsedData.aptitudes,
            lenguajesProgramacion: parsedData.habilidades.lenguajesProgramacion,
            basesDeDatos: parsedData.habilidades.basesDeDatos,
            metodologias: parsedData.habilidades.metodologias,
            otros: parsedData.habilidades.otros,
            trayectoria: parsedData.trayectoria.map(trayectoria => ({
                periodo: trayectoria.periodo,
                empresa: trayectoria.empresa,
                puesto: trayectoria.puesto,
                funciones: trayectoria.funciones,
                motivoEgreso: trayectoria.motivoEgreso
            })),
            aniosExperiencia: parsedData.AniosExperiencia,
            areaExperiencia: parsedData.AreaExperiencia,
            empresaactual: parsedData.empresaactual,
            observaciones: resumenAnalisis,
            hobbies: parsedData.hobbies,
            compromisosProximos: parsedData.compromisosProximos,
            otrosProcesos: parsedData.otrosProcesos,
            carnetConducir: parsedData.carnetConducir,
            antecedentes: parsedData.antecedentes
        };



        // Cargar y renderizar el template con Docxtemplater
        const template = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(template);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
        });

        doc.render(templateData);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE'
        });

        return buf;

    } catch (error) {
        console.error('Error en generateCurriculumFichaOneSelect:', error);
        throw error;
    }
};


export const generateCurriculumFicha = async (postulantInfo, archivos, analisisPostulante, templatePath) => {
    try {
        console.log('\n🔄 Iniciando generación de ficha curricular');
        
        // 1. Procesar los archivos CV para extraer el texto
        const processedDocs = await processCVFiles(archivos);
        let cvText = processedDocs.map(doc => doc.texto).join('\n\n');
        
        // 2. Aplicar postprocesamiento inteligente al texto del CV
        console.log('🔄 Aplicando postprocesamiento inteligente al texto del CV...');
        cvText = await postProcessText(cvText);
        console.log('✅ Postprocesamiento completado');
        console.log('📝 Muestra del texto procesado:', cvText.substring(0, 500));
        
        const cvVacio = !cvText || cvText.trim() === '' || cvText.includes('Error al procesar PDF');    
        console.log('cvVacio:', cvVacio);
    
        
// Procesar la foto si existe
 let imageModule = null;
 let imageData = null;
 

 const resumenAnalisis = analisisPostulante ? `
 ANÁLISIS DEL CANDIDATO:
 
 Presentación del Postulante:
 ${postulantInfo.presentacionPostulante || 'No especificada'}
 
 
 Aptitud General para el Puesto:
 ${analisisPostulante.aptitudParaPuesto || 'No especificada'}
 
 Fortalezas Identificadas:
 ${analisisPostulante.fortalezas ? 
   analisisPostulante.fortalezas.map(f => `• ${f}`).join('\n') : 
   'No especificadas'}
 
 Áreas de Mejora:
 ${analisisPostulante.debilidades ? 
   analisisPostulante.debilidades.map(d => `• ${d}`).join('\n') : 
   'No especificadas'}
 
 Evaluación de Requisitos:
 ${analisisPostulante.justificacionRequisitos || 'No disponible'}
 ` : 'No hay análisis previo disponible' + (postulantInfo.presentacionPostulante ? `\n\nPresentación del Postulante:\n${postulantInfo.presentacionPostulante}` : '');

        // 2. Crear el prompt para OpenAI
        const prompt = `
        Este prompt tiene como objetivo generar una ficha curricular estructurada, completa y profesional del perfil de un/a postulante, basada en su CV original, pensada desde la mirada de una reclutadora para ser presentada a un cliente final.
        El resultado debe:
        - Reflejar fielmente las competencias, experiencias y formación de la persona.
        - Excluir **datos personales sensibles o de contacto** (teléfono, email, dirección, documento, etc.).
        - Presentar la información en un formato claro, estandarizado y sin adornos innecesarios.
        - Estar redactado en **tercera persona**, con lenguaje profesional y objetivo.
        - Ser completamente **parseable como JSON**, manteniendo la estructura exacta requerida.
        


          INFORMACIÓN DEL POSTULANTE:
        ${JSON.stringify(postulantInfo, null, 2)}

        CONTENIDO DEL CV ORIGINAL:
        ${cvText}

        ${analisisPostulante ? `
            ANÁLISIS PREVIO DEL POSTULANTE:
            ${JSON.stringify(analisisPostulante, null, 2)}
            ` : ''}
    

        TRADUCCIÓN:
            Antes de estructurar la información, traducí TODO el contenido del CV y cualquier parte del análisis que esté en inglés al ESPAÑOL NEUTRO. No debe quedar ninguna frase en inglés. No mantengas títulos de cursos, descripciones de trabajos ni herramientas sin traducir. Usá traducciones naturales y profesionales, no traducciones literales ni palabra por palabra.

            Luego de traducirlo internamente, completá el JSON respetando el resto de las instrucciones.

            ⚠️ Si el resultado incluye texto en inglés será considerado incorrecto. No debe haber frases, descripciones ni títulos sin traducir. Toda la información debe estar redactada en un español correcto, sin errores gramaticales ni de traducción literal.

            INSTRUCCIONES PARA LA ESTRUCTURA:
            IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.   
            Genera un JSON con EXACTAMENTE esta estructura:
        {
            "datosPersonales": {
                "nombre": "string",
                "apellido": "string",
                "rol": "string",
                "edad": "string",
                "zonaResidencia": "string",
                "estadoCivil": "string",
                "fechaNacimiento": "string",
                "radicacion": "string",
                "grupoFamiliar": "string",
                "nacionalidad": "string"
            },
            "educacion": [{
                "institucion": "string",
                "titulo": "string",
                "fechaInicio": "string",
                "fechaFin": "string"
            }],
            "cursosCertificaciones": [{
                "nombreCurso": "string",
                "anio": "string",
                "institucion": "string"
            }],
            "habilidades": {
                "lenguajesProgramacion": ["string"],
                "basesDeDatos": ["string"],
                "metodologias": ["string"],
                "otros": ["string"]
            },
            "trayectoriaProfesional": [{
                "empresa": "string",
                "puesto": "string",
                "fechaInicio": "string",
                "fechaFin": "string",
                "descripcion": "string"
            }],
            "aptitudes": ["string"],
            "AniosExperiencia": "string",
            "AreaExperiencia": "string",
            "observaciones": "string (Incluir aquí un resumen del análisis previo si existe)",
            "idiomas": [{
                "idioma": "string",
                "nivel": "string"
            }]
        }
  
           
       REGLAS ESTRICTAS PARA LA ESTRUCTURACIÓN:

   1. FORMACIÓN ACADÉMICA (campo: "educacion"):
        - OBLIGATORIO: Incluir toda la educación formal del postulante.
        - Buscar en secciones como "Educación", "Formación académica", "Estudios", o cualquier parte del texto donde se describa formación.
        - Cada entrada debe tener:
        • institucion: nombre completo de la institución (si está abreviado como "UTN", "UBA", inferir su forma completa; si no se puede deducir, usar "No especificada")
        • titulo: nombre completo del estudio o carrera
        • fechaInicio: año de inicio del estudio (usar "" si no está claro y no se puede inferir)
        • fechaFin: año de finalización (usar "" si no está claro y no se puede inferir)
        - Si hay una mención como "en curso", incluirlo entre paréntesis en el título.
        - Si hay descripciones adicionales relevantes (como especialización, honores, tesis), incluirlas dentro del campo "titulo" entre paréntesis.
        - No omitir ningún título aunque parezca repetido, incompleto o poco claro.
        - Traducir al español neutro los títulos si están en inglés.
        - NO traducir el nombre de la institución.
        - Mantener fechas lo más exactas posibles. Si no hay fechas explícitas, se puede inferir por contexto si es razonable hacerlo.

    2. CURSOS Y CERTIFICACIONES (campo: "cursosCertificaciones"):
        - OBLIGATORIO: Incluir TODOS los cursos, certificaciones, talleres, diplomados o capacitaciones mencionadas por el postulante.
        - Buscar en secciones como: "Educación complementaria", "Certificaciones", "Cursos", "Formación adicional", o descripciones donde se detallen estudios no universitarios.
        - Cada entrada debe tener:
        • nombreCurso: nombre completo del curso o certificación
        • anio: año en que fue realizado (usar "" si no está claro)
        • institucion: nombre de la institución que lo dictó (si no está explícita y no puede deducirse por el contexto, usar "No especificada")
        - Traducir al español neutro los títulos de los cursos si están en inglés.
        - No traducir el nombre de la institución.
        - No omitir ningún curso aunque parezca redundante, incompleto o informal.
        - Si la institución aparece como sigla o forma abreviada (ej: "MIT", "UBA"), dejarla tal cual si es reconocida o completarla si se deduce por el contexto.


     3. EXPERIENCIA LABORAL (campo: "trayectoria"):

        - OBLIGATORIO: Incluir TODAS las experiencias laborales mencionadas, sin importar la duración, antigüedad o repetición.
        - Buscar en secciones como "Experiencia", "Trayectoria", "Historial laboral", "Antecedentes", o similares.

        Cada entrada debe incluir:
        • empresa: nombre exacto de la empresa u organización
        • puesto: título del cargo desempeñado
        • fechaInicio: año y mes de inicio, si están disponibles (formato: "YYYY-MM")
        • fechaFin: año y mes de finalización o "Actualidad" si continúa vigente
        • descripcion: funciones y logros principales, redactadas en tercera persona y expresadas en viñetas o puntos claros
        • motivoEgreso: si está mencionado, incluirlo; si no está, dejar el campo como ""

        Reglas adicionales:
        - NO omitir ninguna experiencia mencionada, incluso si parece redundante o breve.
        - Mantener el mayor nivel de detalle posible: incluir tareas, herramientas utilizadas, impacto o métricas si están disponibles.
        - No resumir las responsabilidades; describirlas de forma completa y profesional.
        - Si hay inconsistencias en las fechas, usar la más precisa o justificada por contexto.
        - Preservar el orden cronológico en la estructura del JSON (de más reciente a más antigua, si se puede deducir).


        4. HABILIDADES TÉCNICAS (campo: "habilidades"):

                a) Fuentes de información:
                - Buscar habilidades en:
                • Presentación del postulante
                • Descripciones de experiencias laborales
                • Formación académica
                • Cursos y certificaciones
                • Secciones explícitas de "skills" o "herramientas"
                • Cualquier mención técnica dispersa

                b) Clasificación en categorías:
                - lenguajesProgramacion: incluir lenguajes de programación, frameworks, librerías, scripts (ej: JavaScript, Python, Vue.js)
                - basesDeDatos: motores de bases de datos, sistemas de almacenamiento, sistemas ERP o gestión empresarial (ej: MySQL, SQL server, SAP, Oracle)
                - metodologias: metodologías de trabajo y marcos de gestión (ej: Scrum, Agile, Design Thinking)
                - otros: herramientas, plataformas, software, sistemas operativos (Windows, Linux), tecnologías de monitoreo, colaboración o diseño (ej: Zoom, Slack, Excel, Jira, Trello, Notion, Figma, Hotjar)

                c) Reglas estrictas:
                - Incluir TODA tecnología, herramienta o sistema mencionado, aunque aparezca una sola vez o de forma indirecta en alguna parte del input.
                - No omitir tecnologías que estén dentro de las funciones laborales, descripción personal o certificaciones.
                - Traducir al español neutro manteniendo precisión técnica (ej: "Google Analytics" → "Google Analytics", no traducir nombres propios).
                - Incluir versiones si están especificadas (ej: "React 18").
                - Incluir herramientas mencionadas solo una vez, como Zoom, Slack, Excel, Trello, Jira, Miro, etc.
                - Incluir sistemas operativos como Windows o Linux si se mencionan
                - No dejar ninguna categoría vacía si hay elementos para incluir.

                d) Inferencias permitidas:
                - Si se menciona un rol técnico (ej: "QA Tester") y no se detallan herramientas, se pueden inferir herramientas típicas asociadas solo si hay contexto suficiente.

            

        5. APTITUDES (aptitudes):Las aptitudes son características personales, sociales o cognitivas que determinan cómo una persona se desempeña en su entorno laboral y cómo se relaciona con otros
           - Extraer de la presentación personal
           - Incluir habilidades blandas mencionadas
           - Considerar logros y responsabilidades
           - Incluir características personales destacadas
           - Incluye solo **habilidades blandas** (resolución de problemas, liderazgo, autonomía, etc.)
           - Son características personales, sociales o cognitivas que determinan el desempeño laboral

        6. DATOS PERSONALES:
           - Mantener nombres exactos
           - Incluir datos de ubicación si están disponibles
           - Incluir fecha de nacimiento si está disponible y obtener la edad
           - Incluir estado civil si está disponible
           - Incluir grupo familiar si está disponible
           - Incluir radicación si está disponible
           - Incluir nacionalidad si está disponible
           - **Excluir completamente**: teléfono, email, dirección, documento, redes sociales, CUIT/CUIL.

          

        7. OBSERVACIONES:
           - Incluir resumen del análisis previo si existe
           - Mantener información relevante no categorizada
           - Preservar detalles importantes

        8. DETERMINACIÓN DEL ROL:
           Prioridad para determinar el campo "rol":
           a) Usar el rol esperado/solicitado para la posición si está disponible
           b) Si no hay rol esperado/solicitado, usar el rol actual o autodefinido
           c) Si ninguno de los anteriores está disponible, usar el rol más reciente

        9. REGLAS GENERALES:
           - NO omitir información disponible
           - NO inventar datos
           - Mantener el texto en español
           - Preservar fechas y números exactos
           - No inventar información faltante
           - Para cualquier campo sin información disponible o cuyo valor explícito sea "No especificada", usar el string vacío "".
                - No utilizar "null", "undefined", guiones, espacios en blanco ni expresiones como "N/A" o "No aplica".
                - Esta regla aplica a todos los campos, incluyendo datos personales, formación, certificaciones, fechas, idiomas, tecnologías, etc.
           - Usar [] para arrays vacíos
           - No incluir texto fuera del JSON
           - Priorizar la información del CV sobre la metadata
           - Si hay conflicto, usar la información más detallada

        IMPORTANTE: 
        - Revisar TODAS las secciones del CV. El CONTENIDO DEL CV ORIGINAL contiene información valiosa para completar los campos: utilizala a fondo.
        - No omitir información por parecer redundante
        - Mantener la estructura exacta del JSON
        - Preservar TODA la información original
        - No resumir ni truncar descripciones
        
            `;
         
       console.log('Prompt GENERADO PARA FICHA CURRICULAR:', prompt);
       // Llamada a OpenAI
       const completion = await openai.chat.completions.create({
           model: "gpt-4o-mini",
           messages: [{ role: "user", content: prompt }],
           temperature: 0.7,
       });


        // ✅ NUEVO BLOQUE para tokens
        const usage = completion.usage || {};
        const model = completion.model || "desconocido";

        
         // Definir precios por modelo (solo gpt-4o-mini)
         const PRECIOS = {
            "gpt-4o-mini": {
              input:  0.0006,  // USD por 1 000 tokens de entrada
              output: 0.0024   // USD por 1 000 tokens de salida
            }
          };
          
          // Cálculo "exacto" (no redondeos)
          const precios      = PRECIOS["gpt-4o-mini"];
          const tokensInput  = usage.prompt_tokens;       // p. ej. 3273
          const tokensOutput = usage.completion_tokens;   // p. ej. 1072
          
          const costoInput  = (tokensInput  / 1000) * precios.input;
          const costoOutput = (tokensOutput / 1000) * precios.output;
          const costoSystem  = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
          const costoTotal   = costoInput + costoOutput + costoSystem;

        const tokenInfo = {
            modelo: model,
            tokens_prompt: usage.prompt_tokens || 0,
            tokens_respuesta: usage.completion_tokens || 0,
            tokens_total: usage.total_tokens || 0,
            costo_input: costoInput.toFixed(4),
            costo_output: costoOutput.toFixed(4),
            costo_total: costoTotal.toFixed(4),
            fecha: new Date(),
            //usuario: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.connection?.remoteAddress || 'desconocido',
            usuario:  "desconocido",
            consulta: "Generar Ficha de Soft"
        };
        await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);

       // Procesar la respuesta
       const response = completion.choices[0].message.content;
       console.log('Respuesta de OpenAI:', response);
        
       let parsedData;
       try {
           // Intentar parsear el JSON
           parsedData = JSON.parse(response.trim());
           
           // Validar estructura básica
           if (!parsedData.datosPersonales) {
               throw new Error('Formato de respuesta inválido: falta sección datosPersonales');
           }
           // Y después de parsear la respuesta de OpenAI, asegurarnos que tenga el campo observaciones
            if (parsedData) {
                // Forzar el campo observaciones con el resumen del análisis
                parsedData.observaciones = resumenAnalisis;
            }

           console.log('Datos procesados correctamente:', parsedData);
           
       } catch (error) {
           console.error('Error al parsear JSON:', error);
           // Intento de recuperación: convertir el texto a formato JSON
           parsedData = convertTextToJSON(response);
       }
            

       if (cvVacio) {
        parsedData.datosPersonales.edad = "No se pudo extraer información del CV (texto de entrada vacío/inválido)";
           }
           
            console.log('Datos procesados:', parsedData);
            
     
        // Aplanar los datos personales para el template
        const templateData = {
            ...parsedData,
            nombre: parsedData.datosPersonales.nombre,
            apellido: parsedData.datosPersonales.apellido,
            rol: parsedData.datosPersonales.rol,
            edad: cvVacio ? "¡¡¡ Atención.!!! El proceso no pudo extraer información del CV adjunto " : parsedData.datosPersonales.edad,
            aptitudes: parsedData.aptitudes,
            aniosExperiencia: parsedData.AniosExperiencia,
            areaExperiencia: parsedData.AreaExperiencia,
            zonaResidencia: parsedData.datosPersonales.zonaResidencia,
            estadoCivil: parsedData.datosPersonales.estadoCivil,
            fechaNacimiento: parsedData.datosPersonales.fechaNacimiento,
            radicacion: parsedData.datosPersonales.radicacion,
            grupoFamiliar: parsedData.datosPersonales.grupoFamiliar,
            nacionalidad: parsedData.datosPersonales.nacionalidad,
            lenguajesProgramacion: parsedData.habilidades.lenguajesProgramacion,
            basesDeDatos: parsedData.habilidades.basesDeDatos,
            metodologias: parsedData.habilidades.metodologias,
            otros: parsedData.habilidades.otros,
            observaciones: resumenAnalisis,
            ///...(imageData ? { foto: imageData } : {})  // Solo incluir foto si existe imageData
        };

   

        // Crear el documento
        const template = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(template);
        /*const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
        });*/

        // Crear el documento con o sin el módulo de imagen
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
            // Solo incluir el módulo de imágenes si hay foto
           // modules: imageData ? [imageModule] : []
        });
               
        // Usar los datos aplanados
        doc.render(templateData);
        
        // 7. Generar el archivo final
          // Generar el archivo DOCX directamente
          const buf = doc.getZip().generate({
            type: 'nodebuffer',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE'
        });

        
        return buf;

    } catch (error) {
        console.error('Error en generateCurriculumFicha:', error);
        console.error('Stack:', error.stack);
        throw error;
    }
};


function convertTextToJSON(text) {
    const lines = text.split('\n');
    const result = {
        datosPersonales: {},
        formacionAcademica: [],
        experienciaProfesional: [],
        habilidades: [],
        idiomas: [],
        referencias: [],
        otrosDatos: {}
    };

    let currentSection = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('DATOS PERSONALES:')) {
            currentSection = 'datosPersonales';
        } else if (trimmedLine.startsWith('FORMACIÓN ACADÉMICA:')) {
            currentSection = 'formacionAcademica';
        } // ... etc para otras secciones

        if (trimmedLine.startsWith('- ')) {
            const [key, value] = trimmedLine.substring(2).split(': ');
            if (currentSection === 'datosPersonales') {
                result.datosPersonales[key.toLowerCase()] = value || null;
            }
            // ... procesar otras secciones
        }
    }

    return result;
}
// Función para analizar el template
async function analyzeTemplate(templatePath) {
    try {
        console.log('\n🔍 Analizando template en:', templatePath);
        
        // 1. Leer el archivo
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);
        
        // 2. Obtener el contenido en texto plano
        const text = doc.getFullText();
        
        console.log('\n📄 Contenido del template:');
        console.log('----------------------------------------');
        console.log(text);
        console.log('----------------------------------------');
        
        // 3. Buscar marcadores/variables en el template
        const regex = /\{([^}]+)\}/g;
        const markers = text.match(regex) || [];
        
        console.log('\n🏷️ Marcadores encontrados:');
        console.log('----------------------------------------');
        markers.forEach(marker => console.log(marker));
        console.log('----------------------------------------');
        
        return {
            text,
            markers
        };
    } catch (error) {
        console.error('Error analizando template:', error);
        throw error;
    }
}

// Exportar la función para poder usarla
export const analyzeTemplateCV = async (templatePath) => {
    return await analyzeTemplate(templatePath);
};
export const analizarPerfil = async (descripcion) => {
    try {
        console.log('\n🔍 ANALIZANDO PERFIL:');
        console.log('----------------------------------------');
        console.log('Descripción:', descripcion);
        console.log('----------------------------------------\n');

        const prompt = `
        Eres un experto en análisis de descripciones de puestos laborales. 
        Vas a procesar una descripción textual y devolver un objeto JSON con toda la información técnica y contextual 
        del puesto.
        El objetivo es extraer toda la información relevante del puesto, 
        manteniendo la riqueza técnica, la precisión semántica y la estructuración clara para uso posterior. 
        El resultado será usado para evaluar candidatos en forma proactiva.


⚠️ REGLAS GENERALES (derivadas del prompt proactivo):
- No inventes ni infieras datos que no estén explícitamente presentes.
- Si no podés determinar un campo con certeza, devolvé "No especificado".
- Toda información debe surgir del texto de la descripción.
- Toda la información técnica debe estar representada en al menos uno de los campos del JSON.
- Evitá duplicaciones, errores de formato, o agrupaciones ambiguas.
- Si una sección es reconocible aunque con otra redacción (ej: beneficios, conocimientos deseables), debe ser procesada.

📦 FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE el objeto JSON. No incluyas texto adicional, ni \`\`\`, ni etiquetas.

📌 CAMPOS Y REGLAS DE EXTRACCIÓN:

1. **titulo**:
   - Copiar exactamente el título tal como aparece en la descripción.

2. **area**:
  - Inferir SOLO si es obvio por el contenido ("Tecnología", "Finanzas", etc.).
   - Si contiene términos como desarrollador, backend, software, QA, etc., usar "Tecnología".
   - Si no se puede determinar, usar: "No especificado".

3. **descripcion**:
      - Redactar una **descripción profesional y completa** del puesto.
   - Debe incluir:
     - El rol general
     - Modalidad de trabajo y residencia si están presentes
     - Habilidades técnicas con contexto: versiones, experiencia deseada, herramientas
     - Tecnologías deseables (si se indican)
     - Habilidades blandas mencionadas
   - NO omitir nada del contenido técnico del input. NI la información relevante del puesto. 
    -Cuanto mas detallado mejor.
   - Ejemplo: 
     "Se busca un Desarrollador Backend NET con al menos 5 años de experiencia en desarrollo con .Net Core (versión 8+), construcción de APIs, pruebas automatizadas (unit testing), uso de GIT y trabajo en entornos SCRUM. Se espera experiencia con microservicios, bases de datos SQL y NoSQL (PostgreSQL, MongoDB), herramientas de monitoreo como Datadog y Prometheus, y orquestación con Kubernetes. El puesto requiere habilidades blandas como trabajo en equipo, pensamiento analítico, y orientación a resultados. Modalidad 100% remota. Residencia en Argentina."


4. requisitos:
   - Este campo es **CRÍTICO**.
    - Este campo debe ser una lista **plana y limpia** de tecnologías, herramientas, lenguajes y metodologías mencionadas.
    - Separar cada tecnología como un ítem único.
    - Si se mencionan alternativas, listarlas **por separado** (ej: "ElasticSearch o MongoDB" → "ElasticSearch, MongoDB").
    - No usar barras ("/"), guiones ni "o".
    - Si una herramienta tiene versión, **dejar solo la tecnología**:
        - ".Net core versión 8+" → ".Net" y "net"
        - Agrupar solo si es explícito en el texto, **pero en ítems separados**.
    - Ejemplo de salida correcta:
        - ".Net, APIs, Unit testing, GIT, SCRUM, Microservicios, PostgresSql, SQL, NoSQL, ElasticSearch, MongoDB, RabbitMQ, Kafka, Datadog, Kubernetes, Prometheus, Kibana, Opensearch, Golang"


5. **descripcionTrabajo**:
  - Extraer todas las tareas o responsabilidades si se mencionan.
   - Separar por coma o en bloque textual.
    - Extraer las tareas si se mencionan.
   - Si están en listas o secciones de "desafíos", procesarlas en bloque textual.
   - Si no hay nada claro, devolver: "No especificado".


6. **ubicacion** (objeto con país, provincia y ciudad):
   Aplicar esta lógica exacta:

   - **Normalización básica**:
     - "Capital Federal" → ciudad: "Ciudad Autónoma de Buenos Aires", provincia: "Buenos Aires"
     - "Santiago de Chile" → ciudad: "Santiago"
     - Si se menciona una ciudad argentina conocida, inferir su provincia y país (Argentina).

   - **Regiones nacionales de Argentina**:
     - Ej: "Mesopotamia"
       {
         "pais": "Argentina",
         "provincia": "Región: Mesopotamia",
         "ciudad": "No especificado"
       }

   - **Regiones internacionales**:
     - Ej: "LATAM"
       {
         "pais": "Región: LATAM",
         "provincia": "No especificado",
         "ciudad": "No especificado"
       }

   - **Múltiples ubicaciones**:
     - Si se listan varias ubicaciones, agregarlas separadas por coma en cada nivel.
       Ejemplo:
       {
         "pais": "Argentina, Chile, Uruguay",
         "provincia": "Buenos Aires, Córdoba, Santa Fe",
         "ciudad": "Buenos Aires, La Plata, Mar del Plata"
       }

   - **Orden de prioridad de detección**:
     1. Región internacional (ej: LATAM, MERCOSUR)
     2. Región nacional (ej: Patagonia)
     3. Múltiples ubicaciones
     4. Normalización básica

7. **modalidadTrabajo, tipoTrabajo**:
- Extraer explícitamente si se menciona con claridad. Ejemplos válidos:
     - "100% Remoto" → "Remoto"
     - "Presencial en oficinas de Buenos Aires" → "Presencial"
     - "Híbrido, 3 veces por semana" → "Híbrido"
   - También aceptar variantes comunes y expresiones típicas como:
     - "trabajo remoto", "full remote", "home office" → "Remoto"
     - "trabajo presencial", "en oficina", "on-site" → "Presencial"
     - "híbrido", "semi-presencial", "parte presencial" → "Híbrido"
   - Si se menciona más de una (ej: "remoto al principio, híbrido luego"), elegir la **modalidad principal** o devolver: "Mixto"
   - Si **no se menciona ninguna modalidad reconocible**, devolver: "No especificado"

8. **tipoTrabajo**
   - Ej: "Full time", "Part time", "No especificado"   

9. Campos adicionales (beneficios, condiciones, nivel educativo, idioma, género, jerarquía, etc.):
   - NO se deben inventar datos si no están presentes.
   - Sin embargo, sí se puede completar el campo si:
     - Hay una mención directa (aunque breve) en el texto.
     - Hay palabras clave o frases típicas reconocibles (ej: "inglés intermedio", "título universitario", "experiencia liderando equipos", "acceso a beneficios corporativos").
   - Usar expresiones generales si están en el input (ej: "beneficios corporativos", "flexibilidad horaria").
   - Ejemplos aceptables:
     - "idioma": "Inglés intermedio"
     - "nivelMinimoEducacion": "Título universitario"
     - "jerarquia": "Senior"
     - "beneficios": "Home office, flexibilidad horaria, prepaga"
   - Si no hay absolutamente ninguna mención, devolver "No especificado"

   10. CAMPOS COMPLEMENTARIOS — Definiciones detalladas por campo:

- **descripcionEmpresa**:
  - Extraer cualquier referencia a la empresa contratante o su sector (ej: "empresa del rubro financiero", "startup tecnológica", "empresa multinacional").
  - Si no se especifica absolutamente nada sobre la empresa, devolver: "No especificado".

- **areaTrabajo**:
  - Si el puesto menciona explícitamente un área organizacional (ej: "trabajará con el área de Producto, Marketing, Finanzas, etc."), devolver ese valor.
  - Si no se menciona ninguna, devolver: "No especificado".

- **descripcionTrabajo**:
  - Extraer TODAS las responsabilidades, desafíos o tareas del puesto.
  - Si están enumeradas en viñetas, procesarlas en bloque.
  - Si no hay nada claro, devolver: "No especificado".

- **estadoNivelEducacion**:
  - Si se exige un título finalizado o en curso, devolver "Completo" o "En curso".
  - Si no se menciona el estado del nivel educativo, devolver: "No especificado".

- **nivelMinimoEducacion**:
  - Extraer el nivel mínimo requerido, como: "Secundario completo", "Título universitario", "Carrera afín", "Maestría".
  - Si no se menciona formación académica, devolver: "No especificado".

- **requisitoSecundarioCompleto**:
  - Si se exige explícitamente tener secundaria terminada, devolver: "Sí".
  - Si no se menciona nada al respecto, devolver: "No especificado".

- **requisitoIdioma**:
  - Extraer el nivel requerido si se menciona (ej: "Inglés intermedio", "Portugués avanzado").
  - Si no se menciona ningún nivel, devolver: "No especificado".

- **idioma**:
  - Indicar el idioma específico solicitado si está mencionado (ej: "Inglés", "Portugués").
  - Si no se menciona ninguno, devolver: "No especificado".

- **requisitoReubicacionLaboral**:
  - Si se menciona que el candidato debe mudarse o estar dispuesto a reubicarse, devolver: "Sí".
  - Si se aclara que no es necesario o no hay mención, devolver: "No especificado".

- **requisitoDisponibilidadHoraria**:
  - Si el puesto requiere horarios especiales (guardias, turnos, disponibilidad nocturna o fines de semana), extraerlo como texto.
  - Si no se menciona, devolver: "No especificado".

- **requisitoGenero**:
  - Si el anuncio solicita un género específico (ej: "preferentemente mujer"), devolver ese valor.
  - Si no se menciona nada, devolver: "No especificado".

- **jerarquia**:
  - Si el título o el texto menciona "Junior", "Semi Senior", "Senior", "Líder", "Manager", extraer ese valor.
  - Si se habla de años de experiencia (ej: "mínimo 5 años"), se puede deducir:
    - ≥5 años → "Senior"
    - ≥2 años → "Semi Senior"
    - <2 años → "Junior"
  - Si no hay pistas suficientes, devolver: "No especificado".

- **genero**:
  - Si el texto menciona explícitamente un género como requisito o preferencia, devolver: "Masculino", "Femenino", "Indistinto", etc.
  - Si no hay mención, devolver: "No especificado".

- **beneficios**:
  - Extraer cualquier beneficio ofrecido (ej: "prepaga", "home office", "días libres", "capacitaciones", "bonos", "stock options", etc.).
  - Si se menciona "trabajo remoto" como beneficio, incluirlo aquí también.
  - Si no hay nada, devolver: "No especificado".

- **condiciones**:
  - Extraer condiciones contractuales, salariales o de carga horaria si se mencionan (ej: "contrato a plazo fijo", "sueldo competitivo", "jornada de 9 a 18hs").
  - Si no se menciona nada, devolver: "No especificado".

📌 ESTRUCTURA DEL JSON:

{
  "titulo": "string",
  "area": "string",
  "descripcion": "string",
  "requisitos": "string",
  "modalidadTrabajo": "string",
  "tipoTrabajo": "string",
  "tipoDeContratacion": "No especificado",
  "modalidadDeContratacion": "No especificado",
  "ubicacion": {
    "pais": "string",
    "provincia": "string",
    "ciudad": "string"
  },
  "descripcionEmpresa": "No especificado",
  "areaTrabajo": "No especificado",
  "descripcionTrabajo": "string o 'No especificado'",
  "estadoNivelEducacion": "No especificado",
  "nivelMinimoEducacion": "No especificado",
  "requisitoSecundarioCompleto": "No especificado",
  "requisitoIdioma": "No especificado",
  "idioma": "No especificado",
  "requisitoReubicacionLaboral": "No especificado",
  "requisitoDisponibilidadHoraria": "No especificado",
  "requisitoGenero": "No especificado",
  "jerarquia": "No especificado",
  "genero": "No especificado",
  "beneficios": "No especificado",
  "condiciones": "No especificado"
}

DESCRIPCIÓN DEL PUESTO:
${descripcion}
        `

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ 
                role: "user", 
                content: prompt 
            }],
            temperature: 0.3,
            max_tokens: 2000
        });

         // ✅ NUEVO BLOQUE para tokens
         const usage = completion.usage || {};
         const model = completion.model || "desconocido";
 
         // Definir precios por modelo
          // Definir precios por modelo (solo gpt-4o-mini)
          const PRECIOS = {
            "gpt-4o": {
              input:  0.005,  // USD por 1 000 tokens de entrada
              output: 0.015   // USD por 1 000 tokens de salida
            }
          };
          
          // Cálculo "exacto" (no redondeos)
          const precios      = PRECIOS["gpt-4o"];
          const tokensInput  = usage.prompt_tokens;       // p. ej. 3273
          const tokensOutput = usage.completion_tokens;   // p. ej. 1072
          
          const costoInput  = (tokensInput  / 1000) * precios.input;
          const costoOutput = (tokensOutput / 1000) * precios.output;
          const costoSystem  = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
          const costoTotal   = costoInput + costoOutput + costoSystem;
 
         const tokenInfo = {
             modelo: model,
             tokens_prompt: usage.prompt_tokens || 0,
             tokens_respuesta: usage.completion_tokens || 0,
             tokens_total: usage.total_tokens || 0,
             costo_input: costoInput.toFixed(4),
             costo_output: costoOutput.toFixed(4),
             costo_total: costoTotal.toFixed(4),
             fecha: new Date(),
             usuario:  "desconocido",
             //usuario: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.connection?.remoteAddress || 'desconocido',
             consulta: "Analizar Perfil de Busqueda Proactiva"
         };
         console.log("tokenInfo");
         await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);
 
        const response = completion.choices[0].message.content;
        
        console.log('\n📥 RESPUESTA DE OPENAI:');
        console.log('----------------------------------------');
        console.log(response);
        console.log('----------------------------------------\n');

        // Intentar parsear la respuesta
        try {
            const parsedResponse = JSON.parse(response);
            return parsedResponse;
        } catch (error) {
            console.error('Error parseando respuesta de OpenAI:', error);
            return {
                categorias: {},
                requisitos_principales: ["Error al procesar los requisitos"],
                años_experiencia: "No especificado",
                modalidad: "No especificado",
                ubicacion: "No especificado"
            };
        }

    } catch (error) {
        console.error('\n❌ ERROR EN ANALIZAR PERFIL:');
        console.error('----------------------------------------');
        console.error('Error completo:', error);
        console.error('----------------------------------------\n');

        return {
            error: `Error técnico: ${error.message}. Por favor, intente más tarde.`,
            categorias: {},
            requisitos_principales: [],
            años_experiencia: "Error",
            modalidad: "Error",
            ubicacion: "Error"
        };
    }
};

export const generateInterview = async (jobDescription) => {
    try {
        // Primero, loguear los datos recibidos
        console.log('\n\n🔍 DATOS RECIBIDOS EN GENERATE INTERVIEW:');
        console.log('----------------------------------------');
        console.log('Job Description:', jobDescription);
        console.log('----------------------------------------\n');

        // Simplificar y limpiar los datos del trabajo
        const jobData = {
            titulo: jobDescription.titulo || '',
            area: jobDescription.area || '',
            descripcion: jobDescription.descripcion || '',
            requisitos: jobDescription.requisitos || '',
            modalidad: jobDescription.modalidadTrabajo || '',
            tipo: jobDescription.tipoTrabajo || ''
        };

        // Loguear datos procesados
        console.log('\n📝 DATOS PROCESADOS:');
        console.log('----------------------------------------');
        console.log('Job Data:', JSON.stringify(jobData, null, 2));
        console.log('----------------------------------------\n');

        const prompt = `
Eres un experto reclutador de recursos humanos. Necesito que generes una entrevista completa para el siguiente puesto:

PUESTO DE TRABAJO:
- Título: ${jobData.titulo}
- Área: ${jobData.area}
- Descripción: ${jobData.descripcion}
- Requisitos: ${jobData.requisitos}
- Modalidad: ${jobData.modalidad}
- Tipo: ${jobData.tipo}

IMPORTANTE: Analiza cuidadosamente:
1. Nivel de seniority del puesto basándote en:
   - Años de experiencia requeridos
   - Responsabilidades mencionadas
   - Nivel de autonomía esperado
   - Requisitos técnicos específicos
   - Rol en el equipo

2. Requisitos de idioma inglés:
   - Busca frases como:
     * "Excelente comunicación en inglés"
     * "Fluido en inglés"
     * "Inglés avanzado"
     * "Bilingue" o similar
     * "Comunicación escrita y verbal en inglés"
   - Ignora el formato del texto (HTML, espacios, etc.) 
   - Evalúa el nivel requerido:
     * Básico: Solo lectura de documentación
     * Intermedio: Comunicación técnica
     * Avanzado: Comunicación fluida y presentaciones
     * Experto: Liderazgo y negociación


Genera un cuestionario completo siguiendo EXACTAMENTE este formato JSON:
IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.   
{
    "cuestionario": {
        "nombre_puesto": "${jobData.titulo}",
        "preguntas_psicologicas": [
            {
                "numero": 1,
                "pregunta": "texto de la pregunta",
                "opciones": {
                    "A": "texto opción A",
                    "B": "texto opción B",
                    "C": "texto opción C",
                    "D": "texto opción D"
                },
                "respuesta_correcta": "letra",
                "explicacion": "explicación detallada de por qué esta es la mejor respuesta"
            }
        ],
        "preguntas_tecnicas": [
            {
                "numero": 1,
                "pregunta": "texto de la pregunta",
                "opciones": {
                    "A": "texto opción A",
                    "B": "texto opción B",
                    "C": "texto opción C",
                    "D": "texto opción D"
                },
                "respuesta_correcta": "letra",
                "explicacion": "explicación detallada de por qué esta es la respuesta correcta"
            }
        ]
    }
}

REQUISITOS OBLIGATORIOS:
0. Consideraciones generales para TODAS las preguntas:
   - Idioma de las preguntas:
     * Todas las preguntas DEBEN estar en español EXCEPTO:
       - Las preguntas 4 y 5 de psicológicas si el puesto requiere inglés
       - Las preguntas técnicas que incluyan terminología en inglés
     * Las explicaciones DEBEN estar en español
     * Las opciones DEBEN estar en el mismo idioma que la pregunta
    - Las opciones de respuesta deben ser:
     * Todas plausibles, profesionales Y tecnicamente defendibles
     * Ninguna debe ser absurda o evidentemente incorrecta
     * Pueden repreesentar incluso diferentes formas de resolver el problema segun experiencia o perspectiva
     * Diferenciadas por matices en el enfoque o la estrategia
     * Basadas en diferentes prioridades o perspectivas válidas
     * Reflejando diferentes niveles de experiencia o enfoques
     * Ejemplo de opciones bien estructuradas:
       "¿Cómo manejarías una falla crítica en el pipeline de datos?"
       A: "Implementar inmediatamente un hotfix y luego documentar el incidente"
       B: "Analizar primero la causa raíz, luego implementar una solución con pruebas adecuadas"
       C: "Volver a la última versión estable y programar un post-mortem"
       D: "Notificar a los stakeholders y crear un plan de recuperación detallado antes de actuar"
   - La explicación debe detallar:
     * Por qué la respuesta es la más adecuada para el contexto
     * Ventajas y desventajas de cada enfoque
     * Consideraciones técnicas y de negocio
     * Mejores prácticas aplicadas


1. Para preguntas_psicologicas:
   Si el puesto requiere inglés:
   - EXACTAMENTE 3 preguntas psicológicas que evalúen:
     * Toma de decisiones acorde al nivel de seniority
     * Resolución de conflictos según el rol en el equipo
     * Ética profesional y responsabilidades del nivel
   - EXACTAMENTE 2 preguntas de inglés que evalúen:
     * Pregunta 4: Comprensión de documentación técnica y comunicación escrita
       - La pregunta DEBE estar en inglés
       - Incluir un email o documentación técnica en inglés
       - Evaluar comprensión y capacidad de respuesta
       - Las opciones DEBEN estar en inglés
     * Pregunta 5: Comunicación verbal y presentación
       - La pregunta DEBE estar en inglés
       - Incluir un escenario de presentación o reunión en inglés
       - Evaluar capacidad de expresión y claridad
       - Las opciones DEBEN estar en inglés

   Si el puesto NO requiere inglés:
   - EXACTAMENTE 5 preguntas psicológicas que evalúen:
     * Toma de decisiones acorde al nivel de seniority
     * Resolución de conflictos según el rol en el equipo
     * Ética profesional y responsabilidades del nivel
     * Manejo del estrés y presión según el cargo
     * Habilidades de liderazgo/colaboración según el nivel

 
   Formato específico para preguntas de inglés (cuando aplique):
   - La pregunta completa DEBE estar en inglés
   - Las opciones DEBEN estar en inglés
   - El contexto DEBE ser en inglés
   - La explicación puede estar en español
   - Deben incluir:
     * Contexto profesional real (emails, documentación, reuniones)
     * Vocabulario técnico específico del área
     * Situaciones de comunicación real con stakeholders
     
2. Para preguntas_tecnicas:
   DEBEN SER EXACTAMENTE 8 PREGUNTAS DIVIDIDAS EN DOS TIPOS:

   A. PRIMERAS 6 PREGUNTAS (TÉCNICAS TRADICIONALES):
   - Deben evaluar conocimientos técnicos específicos del puesto
   - Deben estar alineadas con el nivel de seniority del puesto
   - Deben incluir:
     * Preguntas 1-2: Conceptos fundamentales del área
     * Preguntas 3-4: Herramientas y tecnologías específicas
     * Preguntas 5-6: Mejores prácticas y patrones de diseño

   B. ÚLTIMAS 2 PREGUNTAS (EJERCICIOS PRÁCTICOS):
   - Deben ser escenarios reales y complejos que:
     * Presenten un problema del día a día
     * Incluyan contexto detallado
     * Muestren diferentes enfoques de solución
     * Evalúen capacidad de análisis y resolución
     * Sean acordes al nivel de seniority

    Formato específico para ejercicios prácticos:
   - Deben incluir:
     * Contexto del problema
     * Información relevante
     * Restricciones o limitaciones
     * Objetivos a alcanzar
   - Las opciones deben ser:
     * Todas soluciones válidas pero con diferentes enfoques
     * Diferenciadas por prioridades técnicas o de negocio
     * Basadas en diferentes consideraciones de arquitectura
     * Ejemplos de enfoques válidos:
       - Opción A: Enfoque en estabilidad y mantenibilidad
       - Opción B: Enfoque en rendimiento y escalabilidad
       - Opción C: Enfoque en flexibilidad y adaptabilidad
       - Opción D: Enfoque en seguridad y robustez
   - La explicación debe detallar:
     * Por qué la solución es la más adecuada para el contexto
     * Ventajas y desventajas de cada enfoque
     * Consideraciones técnicas y de negocio
     * Mejores prácticas aplicadas

3. Ajustes por nivel de seniority:
   - Junior: 
     * Técnicas: Conceptos básicos y herramientas fundamentales
     * Prácticos: Problemas de implementación y buenas prácticas
   - Mid-level:
     * Técnicas: Arquitectura básica y patrones de diseño
     * Prácticos: Problemas de arquitectura simple y escalabilidad
   - Senior:
     * Técnicas: Arquitectura avanzada y optimización
     * Prácticos: Problemas de arquitectura compleja y rendimiento
   - Lead:
     * Técnicas: Arquitectura empresarial y estrategia técnica
     * Prácticos: Problemas de arquitectura empresarial y gestión

4. Formato:
   - Respeta EXACTAMENTE la estructura JSON mostrada
   - Numera las preguntas secuencialmente
   - Incluye SIEMPRE 4 opciones (A, B, C, D)

   - Proporciona explicaciones detalladas considerando el nivel
`;

        // Loguear el prompt
        console.log('\n📤 PROMPT ENVIADO A OPENAI:');
        console.log('----------------------------------------');
        console.log(prompt);
        console.log('----------------------------------------\n');

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ 
                role: "user", 
                content: prompt 
            }],
            temperature: 0.7,
            max_tokens: 4000  // Agregamos el límite máximo para GPT-4
        });


         // ✅ NUEVO BLOQUE para tokens
         const usage = completion.usage || {};
         const model = completion.model || "desconocido";
 
         // Definir precios por modelo
         // Definir precios por modelo (solo gpt-4o-mini)
         const PRECIOS = {
            "gpt-4o-mini": {
              input:  0.0006,  // USD por 1 000 tokens de entrada
              output: 0.0024   // USD por 1 000 tokens de salida
            }
          };
          
          // Cálculo "exacto" (no redondeos)
          const precios      = PRECIOS["gpt-4o-mini"];
          const tokensInput  = usage.prompt_tokens;       // p. ej. 3273
          const tokensOutput = usage.completion_tokens;   // p. ej. 1072
          
          const costoInput  = (tokensInput  / 1000) * precios.input;
          const costoOutput = (tokensOutput / 1000) * precios.output;
          const costoSystem  = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
          const costoTotal   = costoInput + costoOutput + costoSystem;
 
         const tokenInfo = {
             modelo: model,
             tokens_prompt: usage.prompt_tokens || 0,
             tokens_respuesta: usage.completion_tokens || 0,
             tokens_total: usage.total_tokens || 0,
             costo_input: costoInput.toFixed(4),
             costo_output: costoOutput.toFixed(4),
             costo_total: costoTotal.toFixed(4),
             fecha: new Date(),
             usuario: "desconocido",
             consulta: "Generar Cuestionario"
         };
         await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);
 
        const response = completion.choices[0].message.content;
        
        // Loguear la respuesta
        console.log('\n📥 RESPUESTA DE OPENAI:');
        console.log('----------------------------------------');
        console.log(response);
        console.log('----------------------------------------\n');

        // Intentar parsear la respuesta
        try {
            const parsedResponse = JSON.parse(response);
            return parsedResponse;
        } catch (error) {
            console.error('Error parseando respuesta de OpenAI:', error);
            return {
                "cuestionario": {
                    "nombre_puesto": jobData.titulo,
                    "preguntas_psicologicas": [{
                        "numero": 1,
                        "pregunta": "Error al generar preguntas",
                        "opciones": {
                            "A": "Error",
                            "B": "Error",
                            "C": "Error",
                            "D": "Error"
                        },
                        "respuesta_correcta": "A",
                        "explicacion": "Error al procesar la respuesta de la IA"
                    }],
                    "preguntas_tecnicas": [{
                        "numero": 1,
                        "pregunta": "Error al generar preguntas",
                        "opciones": {
                            "A": "Error",
                            "B": "Error",
                            "C": "Error",
                            "D": "Error"
                        },
                        "respuesta_correcta": "A",
                        "explicacion": "Error al procesar la respuesta de la IA"
                    }]
                }
            };
        }
    } catch (error) {
        // Loguear errores
        console.error('\n❌ ERROR EN GENERATE INTERVIEW:');
        console.error('----------------------------------------');
        console.error('Error completo:', error);
        console.error('----------------------------------------\n');

        // Devolver objeto con error
        return {
            "cuestionario": {
                "nombre_puesto": "Error",
                "preguntas_psicologicas": [],
                "preguntas_tecnicas": [],
                "error": `Error técnico: ${error.message}. Por favor, intente más tarde.`
            }
        };
    }
};

export const detectPostulantesByProactivePerfil = async (jobDescription, candidateInfo, archivos) => {
    try {

        const processedDocs = archivos ? await processCVFiles(archivos) : null;
        let cvText = processedDocs ? processedDocs.map(doc => doc.texto).join('\n\n') : null;

        const prompt = `
        Eres un experto reclutador de IT. Analiza la siguiente descripción de puesto y el perfil del candidato, junto con el contenido completo de su CV.
        
        OBJETIVO:
        Comparar y evaluar el ajuste del candidato al perfil buscado, utilizando únicamente la información explícita presente en:
        - La descripción del puesto (jobDescription)
        - El formulario de postulación (candidateInfo)
        - El texto del CV procesado (cvText)
        
        INSTRUCCIONES GENERALES:
        - NO infieras ni inventes información bajo ningún concepto.
        - Solo podés utilizar lo que esté de forma explícita en candidateInfo o en el cvText.
        - Si un dato no está presente, asumí que no puede evaluarse y tratá ese campo como vacío o insuficiente.
        - Si un campo del puesto viene vacío, debe ignorar ese criterio (por ejemplo, si no hay ubicación, no penalices por eso).
        
        CRITERIOS EXCLUYENTES:
        Un candidato será considerado "NO CUMPLE" si no cumple con al menos uno de los siguientes criterios:
        
        1. Ubicación:
           - Si el puesto especifica una o varias ubicaciones, el candidato debe residir en al menos una de ellas.
           - Considerar regiones (LATAM, Patagonia, etc.) como válidas si el país/provincia del candidato pertenece a esa región.
           - La modalidad (remoto/presencial) NO afecta este criterio.
        
        2. Idioma:
           - Si el puesto exige un idioma a un nivel específico, debe cumplirse.
           - Si el idioma está mencionado como "preferentemente" o "deseable", NO es excluyente.
        
        3. Otros:
           - Solo deben considerarse excluyentes aquellos criterios marcados como tales en la descripción.
           - No asumir que algo es excluyente si no está expresamente indicado.
        
        Si el candidato no cumple con al menos uno de estos criterios excluyentes, debe devolverse:
        "respuesta": "No" con justificación detallada, indicando:
        - Lista de criterios excluyentes requeridos
        - Cuáles cumple y cuáles no
        - Por qué no cumple
        
        Si cumple todo, entonces:
        "respuesta": "Sí" con justificación detallada de todos los criterios cumplidos.
        
        BLOQUES DE RESPUESTA:
        
        1. "Aptitud general para el puesto":
           - Redactar un análisis técnico y cualitativo del ajuste del candidato al perfil.
           - Explicar por qué sería (o no) una buena opción.
           - Fundamentar con evidencias del CV y del formulario.
           - Pensar como un reclutador que justifica una recomendación ante un cliente.
        
        2. "Fortalezas" y "Debilidades":
           - Solo listar fortalezas o debilidades que estén explícitamente mencionadas en el input.
           - Pueden ser técnicas o de soft skills.
           - No inventar.
           - Listar hasta 7 por categoría. Si hay menos, mostrar solo las disponibles.
        
        3. "Calificación de adecuación" (1 a 10):
           - Pensar como un reclutador experimentado.
           - Evaluar con criterio profesional si el candidato encaja en el puesto.
           - Puntuar de 1 (muy bajo) a 10 (perfecto).
           - Justificar con argumentos sólidos, demostrables con los datos disponibles.
           - Si hay error técnico → calificación = -2  
             Si hay información insuficiente → calificación = -1
        
        4. "contactos":
           - Extraer correo, teléfono o usuarios sociales desde el cvText.
           - Si ya están en candidateInfo, no repetir.
           - No incluir URLs. Ejemplo: linkedin: juanperez123, github: jperez
           - Solo una ocurrencia por tipo de dato.
        
        CÁLCULO DE SCORES INDIVIDUALES (0 a 100):
        
        - Evaluá cada uno como una "nota escolar". Cuanto mayor el ajuste, mayor el score.
        - Si el perfil no especifica el criterio, asignar 100 por omisión.
        - Si no hay datos suficientes del candidato, poner -1.
        
        1. technical (40%):
           - Coincidencia entre skills técnicos requeridos y habilidades del candidato.
        
        2. experience (25%):
           - Nivel de experiencia laboral real y demostrada en uso de esas tecnologías.
        
        3. education (15%):
           - Ajuste entre la formación académica y certificaciones del candidato vs. lo solicitado.
        
        4. years (10%):
           - Comparar años de experiencia requeridos con los años que muestra el candidato.
           - Si cumple o supera → 100
           - Si no cumple → proporcional. Ej: tiene 2 años y se piden 3 → (2/3) * 100 = 66
           - Redondear al entero más cercano.
           - Si no se menciona cantidad de años → score = 100
        
        5. location (5%):
           - Si cumple con la ubicación solicitada → 100
           - Si no cumple → 0
           - Si no se especifica ubicación → 100
        
        6. tags (5%):
           - Por ahora, siempre = 100
        
        totalScore = (technical * 0.4) + (experience * 0.25) + (education * 0.15) + (years * 0.1) + (location * 0.05) + (tags * 0.05)
        
        - Redondear el totalScore a número entero.
        - Si no se puede calcular → dejar vacío o usar -2 en caso de error técnico.
        
        CONTEXTO DISPONIBLE:
        
        DESCRIPCIÓN DEL PUESTO:
        Título: ${jobDescription.titulo}
        Área: ${jobDescription.area || jobDescription.areaTrabajo}
        Descripción General: ${jobDescription.descripcion}
        Requisitos Técnicos: ${jobDescription.requisitos}
        Descripción del Trabajo: ${jobDescription.descripcionTrabajo}
        Modalidad: ${jobDescription.modalidadTrabajo}
        Tipo de Trabajo: ${jobDescription.tipoTrabajo}
        Ubicación: ${JSON.stringify(jobDescription.ubicacion)}
        Nivel Educativo Requerido: ${jobDescription.nivelMinimoEducacion}
        Idiomas Requeridos: ${jobDescription.requisitoIdioma} - ${jobDescription.idioma}
        Disponibilidad: ${jobDescription.requisitoDisponibilidadHoraria}
        Beneficios: ${jobDescription.beneficios}
        Condiciones: ${jobDescription.condiciones}
        
        INFORMACIÓN DEL CANDIDATO:
        ${JSON.stringify(candidateInfo, null, 2)}
        
        INFORMACIÓN DEL CV:
        ${cvText}
        
        FORMATO DE RESPUESTA (DEVOLVÉ SOLO ESTE OBJETO JSON, SIN TEXTO EXTRA, SIN MARCADORES DE CÓDIGO):
        

Responde ÚNICAMENTE con un objeto JSON con EXACTAMENTE el siguiente formato, sin texto adicional ni explicaciones:
IMPORTANTE: Devuelve ÚNICAMENTE el JSON sin ningún formato adicional, sin marcadores de código, sin \`\`\`json, sin \`\`\`, sin texto adicional.   
{
    "Cumplimiento de requisitos excluyentes": {
        "respuesta": "Si/No",
        "justificación": "explicación detallada"
    },
    "Aptitud general para el puesto": "descripción detallada",
    "Fortalezas identificadas": ["lista", "de", "fortalezas"],
    "Debilidades o áreas de mejora": ["lista", "de", "debilidades"],
    "Calificación de adecuación": {
        "calificación": número del 1 al 10,
        "justificación": "explicación detallada"
    },
    "scores": {
        "technical": número del 0 al 100,
        "experience": número del 0 al 100,
        "education": número del 0 al 100,
        "years": número del 0 al 100,
        "location": número del 0 al 100,
        "tags": número del 0 al 100
    },
    "totalScore": número del 0 al 100,
    "contactos": {
        "datos": "datos de contacto encontrados"
    }
}
`;

        // Loguear el prompt
        console.log('\n📤 PROMPT ENVIADO A OPENAI:');
        console.log('----------------------------------------');
        console.log(prompt);
        console.log('----------------------------------------\n');

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ 
                role: "user", 
                content: prompt 
            }],
            temperature: 0.7,
        });
 // ✅ NUEVO BLOQUE para tokens
 const usage = completion.usage || {};
 const model = completion.model || "desconocido";

 // Definir precios por modelo
 // Definir precios por modelo (solo gpt-4o-mini)
 const PRECIOS = {
    "gpt-4o-mini": {
      input:  0.0006,  // USD por 1 000 tokens de entrada
      output: 0.0024   // USD por 1 000 tokens de salida
    }
  };
  
  // Cálculo "exacto" (no redondeos)
  const precios      = PRECIOS["gpt-4o-mini"];
  const tokensInput  = usage.prompt_tokens;       // p. ej. 3273
  const tokensOutput = usage.completion_tokens;   // p. ej. 1072
  
  const costoInput  = (tokensInput  / 1000) * precios.input;
  const costoOutput = (tokensOutput / 1000) * precios.output;
  const costoSystem  = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
          const costoTotal   = costoInput + costoOutput + costoSystem;

 const tokenInfo = {
     modelo: model,
     tokens_prompt: usage.prompt_tokens || 0,
     tokens_respuesta: usage.completion_tokens || 0,
     tokens_total: usage.total_tokens || 0,
     costo_input: costoInput.toFixed(4),
     costo_output: costoOutput.toFixed(4),
     costo_total: costoTotal.toFixed(4),
     fecha: new Date(),
     usuario:  "desconocido",
     consulta: "Busqueda Proactiva"
 };
 await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);

        const response = completion.choices[0].message.content;
        
        // Loguear la respuesta
        console.log('\n📥 RESPUESTA DE OPENAI:');
        console.log('----------------------------------------');
        console.log(response);
        console.log('----------------------------------------\n');

        return JSON.parse(response);

    } catch (error) {
        console.error('Error en detectPostulantesByProactivePerfil:', error);
        throw error;
    }
}; 

async function convertDOCXtoPDF(docxBuffer) {
    try {
        console.log('Iniciando conversión de DOCX a PDF con LibreOffice...');
        
        // Crear una versión promisificada de la función convert
        const convertToPromise = (buffer, outputFormat) => {
            return new Promise((resolve, reject) => {
                libre.convert(buffer, outputFormat, undefined, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        // Convertir el documento
        const pdfBuffer = await convertToPromise(docxBuffer, '.pdf');
        console.log('✅ Conversión a PDF completada');
        
        return pdfBuffer;

    } catch (error) {
        console.error('Error en la conversión con LibreOffice:', error);
        throw error;
    }
}

// Función para extraer texto con pdf-parse
async function extractTextWithPdfParse(buffer) {
    try {
        console.log('🔍 Intentando extracción con pdf-parse...');
        const data = await pdfParse(buffer);
        console.log('✅ Extracción con pdf-parse completada');
        return data.text;
    } catch (error) {
        console.error('❌ Error en pdf-parse:', error);
        throw error;
    }
}

// Función para extraer texto de PDF como imágenes
async function extractTextFromPdfAsImages(buffer) {
    let tempDir = null;
    let tempPdfPath = null;
    
    try {
        console.log('🔍 Iniciando extracción de PDF como imágenes...');
        
        // Crear directorio temporal con nombre único
        tempDir = path.join(__dirname, '../temp', `pdf_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Guardar el PDF temporalmente
        tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
        await fs.promises.writeFile(tempPdfPath, buffer);
        
        // Configurar opciones de conversión con pdf-poppler
        const options = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: null,
            resolution: 600  // Aumentamos la resolución para mejor calidad
        };
        
        console.log('🔄 Convirtiendo PDF a imágenes con pdf-poppler...');
        const { convert } = require('pdf-poppler');
        
        try {
            await convert(tempPdfPath, options);
        } catch (convertError) {
            console.error('❌ Error en la conversión del PDF:', convertError);
            throw new Error(`Error al convertir PDF a imágenes: ${convertError.message}`);
        }
        
        // Leer las imágenes generadas
        const files = fs.readdirSync(tempDir)
            .filter(file => file.startsWith('page-') && file.endsWith('.png'))
            .sort();
        
        console.log(`✅ PDF convertido a ${files.length} imágenes`);
        
        if (files.length === 0) {
            throw new Error('No se generaron imágenes del PDF');
        }
        
        let fullText = '';
        
        // Procesar cada imagen
        for (const file of files) {
            const imagePath = path.join(tempDir, file);
            console.log(`🔄 Procesando imagen: ${file}`);
            
            try {
                // Leer la imagen
                const imageBuffer = await fs.promises.readFile(imagePath);
                console.log(`📊 Tamaño de la imagen: ${imageBuffer.length} bytes`);
                
                // Mejorar calidad de imagen con sharp
                const enhancedImage = await sharp(imageBuffer)
                    .resize(2480 * 2, 3508 * 2, {
                        fit: 'inside',
                        withoutEnlargement: true,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    })
                    .grayscale()
                    .normalize()
                    .sharpen() // sin parámetros: aplica mejora segura
                    .toBuffer();
                                    
                console.log('🔄 Realizando OCR...');
                
                // Realizar OCR usando Tesseract.recognize directamente
                const result = await Tesseract.recognize(
                    enhancedImage,
                    'spa',
                    {
                        langPath: path.resolve(__dirname, '../tessdata'),
                        tessedit_pageseg_mode: '6',
                        preserve_interword_spaces: '1',
                        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:¿?¡!()[]{}@#$%&*-+=<>/\\|_~áéíóúÁÉÍÓÚñÑüÜ'
                    }
                ).catch(error => {
                    console.error('Error en OCR:', error);
                    return { data: { text: '' } };
                });
                
                if (result.data.text && result.data.text.trim().length > 0) {
                    fullText += result.data.text + '\n';
                    console.log(`✅ Texto extraído: ${result.data.text.length} caracteres`);
                    console.log('📝 Muestra del texto extraído:', result.data.text.substring(0, 200));
                } else {
                    console.warn(`⚠️ No se extrajo texto de ${file}`);
                }
            
                // 🧠 NUEVO: guardar imagen si OCR resultó muy pobre
                if (!result.data.text || result.data.text.trim().length < 200) {
                    const debugDir = path.join(__dirname, '../debug/ocr');
                    if (!fs.existsSync(debugDir)) {
                        fs.mkdirSync(debugDir, { recursive: true });
                    }
                    const debugImagePath = path.join(debugDir, `${file}`);
                    await fs.promises.copyFile(imagePath, debugImagePath);
                    console.log(`🧠 Imagen guardada para revisión manual: ${debugImagePath}`);
                }
            
                
                // Limpiar archivo temporal
                await fs.promises.unlink(imagePath);
            } catch (error) {
                console.error(`❌ Error procesando ${file}:`, error);
                continue;
            }
        }
        
        // Limpiar y formatear el texto
        fullText = fullText
            // Normalizar espacios y saltos de línea
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            // Corregir caracteres especiales
            .replace(/[|]/g, 'I')  // Reemplazar | por I
            .replace(/[`´]/g, "'") // Normalizar apóstrofes
            .replace(/[–—]/g, '-') // Normalizar guiones
            // Corregir espacios entre palabras
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // Agregar espacio entre palabras pegadas
            .replace(/([A-Za-z])(\d)/g, '$1 $2')  // Agregar espacio entre letras y números
            .replace(/(\d)([A-Za-z])/g, '$1 $2')  // Agregar espacio entre números y letras
            // Corregir puntuación
            .replace(/\s+([.,;:!?])/g, '$1')  // Eliminar espacios antes de puntuación
            .replace(/([.,;:!?])([A-Za-z])/g, '$1 $2')  // Agregar espacio después de puntuación
            // Corregir casos específicos comunes en CVs
            .replace(/Product\s*Owner/g, 'Product Owner')
            .replace(/Product\s*Manager/g, 'Product Manager')
            .replace(/Product\s*Analyst/g, 'Product Analyst')
            .replace(/Analista\s*de\s*Procesos/g, 'Analista de Procesos')
            .replace(/Ingeniero\s*Industrial/g, 'Ingeniero Industrial')
            .replace(/Scrum\s*Master/g, 'Scrum Master')
            .replace(/Business\s*Analyst/g, 'Business Analyst')
            .replace(/Senior\s*Developer/g, 'Senior Developer')
            .replace(/Full\s*Stack/g, 'Full Stack')
            .replace(/Back\s*End/g, 'Back End')
            .replace(/Front\s*End/g, 'Front End')
            .replace(/DevOps/g, 'DevOps')
            .replace(/QA/g, 'QA')
            .replace(/UI\/UX/g, 'UI/UX')
            // Eliminar caracteres no deseados
            .replace(/[^\w\s.,;:!?¿¡()\-@#$%&*+=<>/\\|_~áéíóúÁÉÍÓÚñÑüÜ]/g, '')
            .trim();
        
        console.log('🔄 Aplicando postprocesamiento inteligente...');
        fullText = await postProcessText(fullText);
        
        console.log('✅ Extracción como imágenes completada');
        console.log(`📊 Longitud del texto extraído: ${fullText.length} caracteres`);
        
        if (fullText.length < 100) {
            console.error('❌ El texto extraído es demasiado corto');
            console.log('📝 Contenido del texto:', fullText);
            throw new Error('El texto extraído es demasiado corto, posiblemente el OCR falló');
        }
        
        return fullText;
    } catch (error) {
        console.error('❌ Error en extracción como imágenes:', error);
        throw error;
    } finally {
        // Limpiar recursos
        try {
            if (tempPdfPath && fs.existsSync(tempPdfPath)) {
                await fs.promises.unlink(tempPdfPath);
            }
            if (tempDir && fs.existsSync(tempDir)) {
                await fs.promises.rm(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.warn('⚠️ Error limpiando recursos temporales:', cleanupError);
        }
    }
}

// 👉 FUNCIÓN AUXILIAR para extraer una sección entre dos títulos
function extractSection(text, start, end) {
    const regex = new RegExp(`${start}([\\s\\S]*?)${end ? end : '$'}`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}
async function postProcessText(text) {
    try {
        console.log('🔄 Iniciando postprocesamiento inteligente del texto...');
        
        // Limpieza básica inicial más conservadora
        let cleanedText = text
            .replace(/\s+/g, ' ')                    // Eliminar espacios múltiples
            .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2') // Unir palabras con guiones
            .replace(/\n+/g, ' ')                    // Reemplazar múltiples saltos de línea
            .replace(/\s+/g, ' ')                    // Limpiar espacios nuevamente
            .trim();

        // Reconstrucción con IA con prompt más específico
        // Separar el texto OCR en secciones por heurística
const secciones = {
    perfil: extractSection(text, 'Mentalidad estratégica', 'Experiencia'),
    experiencia: extractSection(text, 'Experiencia', 'Educación'),
    educacion: extractSection(text, 'Educación Principal', 'Educación Complementaria'),
    complementaria: extractSection(text, 'Educación Complementaria', 'Skills'),
    skills: extractSection(text, 'Skills', 'Certificaciones'),
    certificaciones: extractSection(text, 'Certificaciones', 'Contacto'),
    contacto: extractSection(text, 'Contacto', null)
};

let reconstruido = '';

for (const [nombre, contenido] of Object.entries(secciones)) {
    if (!contenido || contenido.trim().length < 10) continue;

    const promptSeccion = `
Reconstruí con precisión la sección "${nombre}" de un CV dañado por OCR.
Corregí errores de palabras, puntuación y unión de términos. 
NO elimines contenido. No inventes. No cambies fechas ni nombres.

Texto original de la sección "${nombre}":
${contenido}
    `.trim();

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptSeccion }],
        temperature: 0.1,
        max_tokens: 1500
    });

     // ✅ NUEVO BLOQUE para tokens
     const usage = completion.usage || {};
     const model = completion.model || "desconocido";
     
     // Definir precios por modelo (solo gpt-4o-mini)
     const PRECIOS = {
         "gpt-4o-mini": {
             input:  0.0006,  // USD por 1 000 tokens de entrada
             output: 0.0024   // USD por 1 000 tokens de salida
         }
     };
     
     // Cálculo "exacto" (no redondeos)
     const precios = PRECIOS["gpt-4o-mini"];
     const tokensInput = usage.prompt_tokens;
     const tokensOutput = usage.completion_tokens;
     
     const costoInput = (tokensInput / 1000) * precios.input;
     const costoOutput = (tokensOutput / 1000) * precios.output;
     const costoSystem = (usage.total_tokens - usage.prompt_tokens - usage.completion_tokens) * precios.input;
     const costoTotal = costoInput + costoOutput + costoSystem;

     const tokenInfo = {
         modelo: model,
         tokens_prompt: usage.prompt_tokens || 0,
         tokens_respuesta: usage.completion_tokens || 0,
         tokens_total: usage.total_tokens || 0,
         costo_input: costoInput.toFixed(4),
         costo_output: costoOutput.toFixed(4),
         costo_total: costoTotal.toFixed(4),
         fecha: new Date(),
         usuario: "desconocido",
         consulta: "Ocr"
     };
     await axios.post(`${API_URL}/api/tokens/guardar`, tokenInfo);
    const seccionReconstruida = completion.choices[0].message.content.trim();
    reconstruido += `\n\n===== ${nombre.toUpperCase()} =====\n${seccionReconstruida}`;
}

       

        let reconstructedText = completion.choices[0].message.content.trim();

        // Limpieza final específica para CVs
        reconstructedText = reconstructedText
            // Corregir casos específicos comunes en CVs
            .replace(/Product\s*Owner/g, 'Product Owner')
            .replace(/Product\s*Manager/g, 'Product Manager')
            .replace(/Product\s*Analyst/g, 'Product Analyst')
            .replace(/Analista\s*de\s*Procesos/g, 'Analista de Procesos')
            .replace(/Ingeniero\s*Industrial/g, 'Ingeniero Industrial')
            .replace(/Scrum\s*Master/g, 'Scrum Master')
            .replace(/Business\s*Analyst/g, 'Business Analyst')
            .replace(/Senior\s*Developer/g, 'Senior Developer')
            .replace(/Full\s*Stack/g, 'Full Stack')
            .replace(/Back\s*End/g, 'Back End')
            .replace(/Front\s*End/g, 'Front End')
            .replace(/DevOps/g, 'DevOps')
            .replace(/QA/g, 'QA')
            .replace(/UI\/UX/g, 'UI/UX')
            // Corregir emails
            .replace(/([a-zA-Z0-9])\s+(@)/g, '$1$2')
            .replace(/(@)\s+([a-zA-Z0-9])/g, '$1$2')
            .replace(/([a-zA-Z0-9])\s+(\.)\s+([a-zA-Z0-9])/g, '$1$2$3')
            // Corregir números de teléfono
            .replace(/(\d)\s+(-)\s+(\d)/g, '$1$2$3')
            // Corregir URLs
            .replace(/(https?:\/\/)\s+([^\s]+)/g, '$1$2')
            // Eliminar caracteres no deseados finales
            .replace(/[^\w\s.,;:!?¿¡()\-@#$%&*+=<>/\\|_~áéíóúÁÉÍÓÚñÑüÜ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        console.log('✅ Postprocesamiento completado');
        console.log(`📊 Longitud del texto procesado: ${reconstructedText.length} caracteres`);
        console.log('📝 Muestra del texto procesado:', reconstructedText.substring(0, 500));

        return reconstruido.trim();
    } catch (error) {
        console.error('❌ Error en el postprocesamiento:', error);
        return text; // Devolver el texto original en caso de error
    }
}
