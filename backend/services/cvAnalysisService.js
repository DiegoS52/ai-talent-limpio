import OpenAI from 'openai';
import mongoose from 'mongoose';
import Postulant from '../src/models/Postulant.js';
import { writeFile } from 'fs/promises';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { LRUCache } from 'lru-cache';
import TokenManager from './tokenManager.js';
import { extractTextFromCV } from './extractTextFromCV.js';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'
);

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configurar caches
const postulantCache = new LRUCache({
    max: 50, // Reducido de 100 a 50
    ttl: 1000 * 60 * 15 // 15 minutos en lugar de 30
});

const cvCache = new LRUCache({
    max: 25, // Reducido de 50 a 25
    ttl: 1000 * 60 * 30 // 30 minutos en lugar de 1 hora
});

const axiosInstance = axios.create({
    headers: {
        'Accept-Encoding': 'gzip, deflate',
        // 'Keep-Alive': 'timeout=5, max=1000' // Keep-Alive es manejado por defecto
    },
    timeout: 30000, // 30 segundos
    maxBodyLength: 50 * 1024 * 1024, // 50MB
    maxContentLength: 50 * 1024 * 1024 // 50MB
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está definida en las variables de entorno');
}

class CVAnalysisService {
    constructor() {
        this.tempDir = path.join(__dirname, '../tempPostulants');
        this.baseURL = 'https://api.hiringroom.com/v0';
        this.tokenManager = new TokenManager();
        this.axiosInstance = axiosInstance;
        
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async getHiringRoomCV(hiringRoomId) {
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        const cachedCV = cvCache.get(hiringRoomId);
        if (cachedCV) {
            return cachedCV;
        }
    
        try {
            const postulant = await this.getHiringRoomPostulant(hiringRoomId);
            if (!postulant || !postulant.adjuntos) {
                console.log(`[ERROR] Postulante ${hiringRoomId}: No se encontraron adjuntos.`);
                return null;
            }
    
            // Función para sanitizar las claves
            const sanitizeKey = (key) => {
                return key.replace(/[.]/g, '_') // Reemplazar puntos por guiones bajos
                         .replace(/[^a-zA-Z0-9_-]/g, '_'); // Reemplazar otros caracteres especiales
            };
    
            // Crear un nuevo objeto de adjuntos con claves sanitizadas
            const sanitizedAdjuntos = {};
            Object.entries(postulant.adjuntos).forEach(([key, url], index) => {
                const sanitizedKey = sanitizeKey(key);
                sanitizedAdjuntos[sanitizedKey] = url;
            });
    
            // Prioriza claves que suelen ser el CV principal
            const prioridad = ['CV', 'curriculum', 'curriculum_vitae', 'cv', 'ficha_curricular'];
            let cvUrl = null;
            for (const key of prioridad) {
                if (sanitizedAdjuntos[key]) {
                    cvUrl = sanitizedAdjuntos[key];
                    break;
                }
            }
            if (!cvUrl) {
                cvUrl = Object.values(sanitizedAdjuntos)[0];
            }
            if (!cvUrl) {
                return null;
            }
    
            // Extraer la extensión real del archivo de la URL
            const urlPath = new URL(cvUrl).pathname;
            const fileExtension = path.extname(urlPath).toLowerCase() || '.pdf';
            const tempPath = path.join(this.tempDir, `${hiringRoomId}${fileExtension}`);
            
            if (fs.existsSync(tempPath)) {
                const stats = fs.statSync(tempPath);
                const fileAge = Date.now() - stats.mtimeMs;
                if (fileAge < 24 * 60 * 60 * 1000) { // 24 horas
                    let extractedText;
                    if (fileExtension === '.docx') {
                        extractedText = await extractFromDocx(tempPath);
                    } else {
                        extractedText = await this.extractTextFromPDF(tempPath);
                    }
                    if (extractedText) {
                        cvCache.set(hiringRoomId, extractedText);
                        return extractedText;
                    }
                }
            }
    
            // Descargar el CV
            const cvBuffer = await this.downloadCVFromUrl(cvUrl);
            if (!cvBuffer) {
                return null;
            }
    
            // Verificar tamaño del archivo
            if (cvBuffer.length > MAX_FILE_SIZE) {
                console.log(`[WARN] CV demasiado grande (${(cvBuffer.length / 1024 / 1024).toFixed(2)}MB) para ${hiringRoomId}`);
                return null;
            }
    
            await writeFile(tempPath, cvBuffer);
            
            let extractedText;
            if (fileExtension === '.docx') {
                extractedText = await extractFromDocx(tempPath);
            } else {
                extractedText = await this.extractTextFromPDF(tempPath);
            }
    
            if (extractedText) {
                // Limitar el tamaño del texto extraído
                if (extractedText.length > 50000) { // 50KB de texto
                    extractedText = extractedText.substring(0, 50000);
                }
                cvCache.set(hiringRoomId, extractedText);
            }
    
            return extractedText;
        } catch (error) {
            console.error(`[CV_ERROR] Error obteniendo CV de HiringRoom para ${hiringRoomId}:`, error.message);
            return null;
        }
    }
    
    // async downloadCVWithStreaming(url, destPath) { ... } // Si decides no usarla, puedes eliminarla junto con la importación de pipeline

    async downloadCVFromUrl(url) {
        try {
            const token = await this.tokenManager.getToken();
            const response = await this.axiosInstance.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                },
                timeout: 30000, // 30 segundos
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 300; // Solo aceptar códigos 2xx
                }
            });
    
            if (!response.data || response.data.length === 0) {
                console.error(`[ERROR] Respuesta vacía de HiringRoom para URL: ${url}`);
                return null;
            }
    
            return response.data;
        } catch (error) {
            console.error(`[API_ERROR] Error descargando CV: ${error.message}`);
            return null;
        }
    }

    async getHiringRoomPostulant(hiringRoomId) {
        const cachedPostulant = postulantCache.get(hiringRoomId);
        if (cachedPostulant) {
            return cachedPostulant;
        }
    
        try {
            const token = await this.tokenManager.getToken(); // Obtener token actualizado
            const response = await this.axiosInstance.get(
                `${this.baseURL}/postulants/${hiringRoomId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}` // Usar el token obtenido
                    }
                }
            );
            
            const postulant = response.data.postulant;
            if (postulant) {
                postulantCache.set(hiringRoomId, postulant);
            }
            return postulant;
        } catch (error) {
            console.error(`[API_ERROR] Error obteniendo info de HiringRoom para ${hiringRoomId}:`, error.message);
            return null;
        }
    }

    async extractTextFromPDF(pdfPath) {
        try {
            if (!fs.existsSync(pdfPath)) {
                throw new Error(`El archivo ${pdfPath} no existe`);
            }
            const extractedText = await extractTextFromCV(pdfPath);
            if (!extractedText) {
                console.log(`[WARN] No se pudo extraer texto del PDF: ${pdfPath}`);
                return '';
            }
            return extractedText;
        } catch (error) {
            // Mejorar el manejo de errores específicos
            if (error.message.includes('memory') || error.message.includes('out of memory')) {
                console.error(`[MEMORY_ERROR] Error de memoria al procesar PDF ${pdfPath}:`, error.message);
            } else if (error.message.includes('PDF')) {
                console.error(`[PDF_ERROR] Error en el procesamiento del PDF ${pdfPath}:`, error.message);
            } else {
                console.error(`[ERROR] Error general al procesar PDF ${pdfPath}:`, error.message);
            }
            return '';
        }
    }
    
   // async extractTextOptimized(pdfPath) {
     //   try {
      //      const dataBuffer = await readFile(pdfPath);
       //     const data = new Uint8Array(dataBuffer);
            
            //const loadingTask = pdfjsLib.getDocument({
            //    data,
            //    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
            //    cMapUrl: path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/'),
            //    cMapPacked: true,
            //    useSystemFonts: true, // Puede ayudar con algunas fuentes raras
            //    disableFontFace: true, // Puede mejorar rendimiento si no se necesitan fuentes embebidas específicas
            //    ignoreErrors: true,
            //    disableRange: true,
            //    disableAutoFetch: true,
            //    disableStream: true
            //});
            
            //const pdfDocument = await loadingTask.promise;
            //const maxPages = Math.min(pdfDocument.numPages, 20); // Limitar páginas
            
            //const pagePromises = [];
          //  for (let i = 1; i <= maxPages; i++) {
          //      pagePromises.push(this.extractPageText(pdfDocument, i));
          //  }
            
            //const pageTexts = await Promise.all(pagePromises);
            //const fullText = pageTexts.join('\n').trim();
            
            //if (fullText) {
            //    return fullText;
            //}
            //throw new Error("PDFJS (Optimized): No se pudo extraer texto o el texto estaba vacío.");
        //} catch (error) {
            // console.warn(`[PDF_WARN_OPTIMIZED] Error en extractTextOptimized para ${pdfPath}: ${error.message}`);
            //throw error; // Propaga el error para que extractTextFromPDF lo maneje
        //}
    //}
    
    // async extractPageText(pdfDocument, pageNumber) {
    //    try {
    //        const page = await pdfDocument.getPage(pageNumber);
    //        const content = await page.getTextContent({
    //            normalizeWhitespace: true,
     //           disableCombineTextItems: false
    //        });
    //        page.cleanup(); // Liberar recursos de la página
    //        return content.items.map(item => item.str).join(' ');
    //    } catch (pageError) {
    //        // console.warn(`[PDF_WARN_PAGE] No se pudo extraer texto de la página ${pageNumber}:`, pageError.message);
    //        return ''; // Devuelve string vacío en caso de error en una página
    //    }
    //}
    
    //async extractTextAlternative(pdfPath) {
        // console.log(`[PDF_ALT] Intentando método alternativo para ${pdfPath}...`);
        //try {
        //    const buffer = await readFile(pdfPath);
        //    const limitedBuffer = buffer.slice(0, 500 * 1024); // Primeros 500KB
        //    const text = limitedBuffer.toString('utf-8').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        //    const textMatch = text.match(/[a-zA-Z0-9\s.,;:'"(){}\[\]@-]{100,}/g);
        //    if (textMatch && textMatch.length > 0) {
                // console.log(`[PDF_ALT_SUCCESS] Texto extraído con método simple para ${pdfPath}`);
        //        return textMatch.join('\n');
        //    }
        //} catch (err) {
            // console.warn("[PDF_ALT_FAIL] Método de extracción simple falló:", err.message);
        //}
        
        // No se reintenta con PDFJS aquí para evitar bucles si el error original fue de PDFJS.
        // console.warn(`[PDF_ALT_FAIL_ALL] Todos los métodos de extracción alternativos fallaron para ${pdfPath}`);
        //return `[No se pudo extraer texto del PDF. Considere revisar manualmente: ${path.basename(pdfPath)}]`;
    //}

    optimizeTextForAnalysis(cvText) {
        if (!cvText || typeof cvText !== 'string') return "";
        
        // Usar la función de limpieza del nuevo servicio
        let cleanedText = cvText
            .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            .replace(/\n\s*\n/g, '\n')
            .replace(/\s{2,}/g, ' ')
            .trim();
        
        // Limitar a 5000 caracteres después de la limpieza
        return cleanedText.slice(0, 5000);
    }

    async analyzeCV(cvText) {
        if (!cvText || typeof cvText !== 'string' || !cvText.trim()) {
            console.warn("[OPENAI_SKIP] El texto del CV está vacío o no es válido.");
            return {
                contacto: { email: "", telefono: "", linkedin: "", github: "", portfolio: "" },
                tecnologias: { lenguajes: [], frameworks: [], herramientas: [], basesDeDatos: [], cloud: [] },
                presentacion: "No se pudo extraer información del CV (texto de entrada vacío/inválido)."
            };
        }
        
        const textToAnalyze = this.optimizeTextForAnalysis(cvText);
        
        const prompt = `
        Eres un asistente especializado en analizar CVs de profesionales de tecnología. Tu tarea es extraer información clave del siguiente CV y organizarla en formato JSON.
        
        INSTRUCCIONES PRECISAS:
        1. El CV puede estar en español, inglés o portugués
        2. NO inventes información que no esté explícitamente en el CV
        3. Si no encuentras información para algún campo, déjalo como cadena vacía ("") o array vacío ([]) según corresponda
        4. Identifica correctamente las tecnologías según su categoría
        5. Si una tecnología podría pertenecer a varias categorías, colócala en la más específica
        6. Busca patrones comunes de contacto (emails, números de teléfono, enlaces a redes sociales)
        7. Sé exhaustivo en la identificación de tecnologías técnicas
        
        PARA ENLACES Y REDES SOCIALES:
        - Reconoce perfiles de LinkedIn en cualquier formato: URLs completas (con o sin https://), solo el nombre de usuario, o formatos como "linkedin.com/in/username" o "in/username"
        - Para GitHub, acepta formatos como "github.com/username", solo el nombre de usuario precedido por @ o identificado como perfil de GitHub
        - Para portfolios, identifica menciones de sitios web personales, portfolios en línea o páginas profesionales
        - Si encuentras perfiles en formato no URL completa, devuelve la información sin añadir prefijos
        
        FORMATO DE SALIDA (JSON):
        {
            "contacto": {
                "email": "correo electrónico identificado en el CV",
                "telefono": "número de teléfono (en cualquier formato encontrado)",
                "linkedin": "perfil de LinkedIn (tal como aparece en el CV)",
                "github": "perfil de GitHub (tal como aparece en el CV)",
                "portfolio": "sitio web personal o portfolio (tal como aparece en el CV)"
            },
            "tecnologias": {
                "lenguajes": ["Java", "Python", "etc"] - lenguajes de programación identificados,
                "frameworks": ["React", "Spring", "etc"] - frameworks y bibliotecas identificados,
                "herramientas": ["Docker", "Jenkins", "etc"] - herramientas de desarrollo, DevOps, testing, etc.,
                "basesDeDatos": ["MongoDB", "PostgreSQL", "etc"] - tecnologías de almacenamiento de datos,
                "cloud": ["AWS", "Azure", "GCP", "etc"] - servicios y plataformas cloud
            },
            "presentacion": "Resumen conciso de las habilidades principales y experiencia del candidato (máximo 3 frases)"
        }
        
        LISTA REFERENCIA DE TECNOLOGÍAS COMUNES POR CATEGORÍA:
        - Lenguajes: Java, JavaScript, TypeScript, Python, C#, C++, Go, Ruby, PHP, Swift, Kotlin, Scala, Rust, HTML, CSS, SQL, R, Bash, PowerShell, Perl, VBA, COBOL, etc.
        - Frameworks: React, Angular, Vue.js, Spring, .NET, Django, Flask, Express, Next.js, NestJS, Laravel, Ruby on Rails, ASP.NET, Bootstrap, Tailwind, jQuery, Symfony, etc.
        - Herramientas: Git, Docker, Kubernetes, Jenkins, GitHub Actions, GitLab CI, JIRA, Confluence, IntelliJ, VSCode, Eclipse, Postman, SonarQube, Webpack, Babel, npm, yarn, Maven, Gradle, etc.
        - BasesDeDatos: MySQL, PostgreSQL, MongoDB, Oracle, SQL Server, Redis, Cassandra, DynamoDB, Elasticsearch, SQLite, MariaDB, Neo4j, CouchDB, Firebase Realtime Database, etc.
        - Cloud: AWS, Azure, Google Cloud, Heroku, Firebase, Netlify, Vercel, DigitalOcean, OVH, IBM Cloud, Oracle Cloud, Linode, Cloudflare, etc.
        
        CV A ANALIZAR:
        ${textToAnalyze}
        `;
    
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-0125",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 800,
                temperature: 0.2 
            });
            return JSON.parse(completion.choices[0].message.content);
        } catch (error) {
            console.error("[OPENAI_ERROR] Error analizando CV con GPT-3.5:", error.message);
            return {
                contacto: { email: "", telefono: "", linkedin: "", github: "", portfolio: "" },
                tecnologias: { lenguajes: [], frameworks: [], herramientas: [], basesDeDatos: [], cloud: [] },
                presentacion: "Error en el análisis automático del CV con OpenAI."
            };
        }
    }

    async processPostulante(postulante) {
        const postulanteIdHiring = postulante.hiringRoomId || "N/A";
        const startTime = Date.now();
        
        console.log(`\n🔄 Procesando postulante: ${postulante.nombre} ${postulante.apellido}`);
        console.log(`   📝 ID: ${postulante._id}`);
        console.log(`   🔗 HiringRoom ID: ${postulanteIdHiring}`);
    
        try {
            if (!postulante.hiringRoomId) {
              //  console.log(`   ❌ Error: No hay ID de HiringRoom asociado`);
                await this.updatePostulanteStatus(postulante._id, false, { error: "No hay ID de HiringRoom asociado" });
                return { success: false, error: "No hay ID de HiringRoom asociado", id: postulante._id, nombre: postulante.nombre, apellido: postulante.apellido, hiringRoomId: postulante.hiringRoomId };
            }
    
            let analysis = null;
            let cvText = null;
            let adjuntos = new Map();
    
            // 1. Obtener datos de HiringRoom
           // console.log(`   📝 Obteniendo datos completos de HiringRoom...`);
            const postulant = await this.getHiringRoomPostulant(postulante.hiringRoomId);
            
            if (postulant) {
                // Guardar adjuntos
                if (postulant.adjuntos) {
                    console.log(`   📎 Procesando adjuntos...`);
                    for (const [key, url] of Object.entries(postulant.adjuntos)) {
                        adjuntos.set(key, url);
                    }
                    console.log(`   ✅ Adjuntos procesados: ${adjuntos.size}`);
                }
            
                // Intentar obtener CV
                console.log(`   📥 Obteniendo CV de HiringRoom...`);
                cvText = await this.getHiringRoomCV(postulante.hiringRoomId);
                
                if (cvText) {
                    console.log(`   ✅ CV obtenido (${cvText.length} caracteres)`);
                    console.log(`   🤖 Analizando CV con OpenAI...`);
                    try {
                        analysis = await this.analyzeCV(cvText);
                        if (!this.isValidAnalysis(analysis)) {
                            console.log(`   ⚠️ Análisis del CV incompleto, intentando con datos de HiringRoom...`);
                            throw new Error('Análisis incompleto');
                        }
                    } catch (error) {
                        console.log(`   ⚠️ Error en análisis del CV: ${error.message}`);
                        analysis = null;
                    }
                }
    
                // Si no hay CV o el análisis falló, usar datos de HiringRoom
                if (!analysis || !this.isValidAnalysis(analysis)) {
                    // Construir un texto completo con toda la información disponible
                    const fullText = [
                        // Información básica
                        `Nombre: ${postulant.nombre} ${postulant.apellido}`,
                        `Email: ${postulant.email}`,
                        `Teléfono: ${postulant.telefono}`,
                        
                        // Presentación
                        `Presentación: ${postulant.presentacion || ''}`,
                        
                        // Experiencia laboral
                        'Experiencia Laboral:',
                        ...(postulant.experienciasLaborales || []).map(exp => 
                            `${exp.empresa} - ${exp.puesto} (${exp.mesDesde}/${exp.añoDesde} - ${exp.mesHasta}/${exp.añoHasta})\n${exp.descripcion || ''}`
                        ),
                        
                        // Estudios
                        'Estudios:',
                        ...(postulant.estudios || []).map(est => 
                            `${est.titulo} en ${est.institucion} (${est.mesDesde}/${est.añoDesde} - ${est.mesHasta}/${est.añoHasta})`
                        ),
                        
                        // Conocimientos y habilidades
                        'Conocimientos:',
                        ...(postulant.conocimientos || []),
                        
                        // Descripción adicional
                        postulant.descripcion || '',
                        
                        // Presentación del postulante
                        postulant.presentacionPostulante || ''
                    ].filter(Boolean).join('\n\n');
    
                    if (fullText) {
                       // console.log(`   🤖 Analizando datos de HiringRoom con OpenAI...`);
                        analysis = await this.analyzeCV(fullText);
                    }
                }
            }
    
            if (!analysis) {
                console.log(`   ❌ Error: No se pudo analizar la información`);
                await this.updatePostulanteStatus(postulante._id, false, { error: "No se pudo analizar la información" });
                return { success: false, error: "No se pudo analizar la información", id: postulante._id, nombre: postulante.nombre, apellido: postulante.apellido, hiringRoomId: postulante.hiringRoomId };
            }
    
            console.log(`   ✅ Análisis completado`);
    
            // --- Armado de tags ---
            const techArrays = [
                analysis.tecnologias?.lenguajes,
                analysis.tecnologias?.frameworks,
                analysis.tecnologias?.herramientas,
                analysis.tecnologias?.basesDeDatos,
                analysis.tecnologias?.cloud
            ];
            const allTechnologies = techArrays
                .filter(arr => Array.isArray(arr))
                .flat()
                .map(tag => String(tag || '').trim().toLowerCase())
                .filter(Boolean);
            const uniqueTagsForUpdate = [...new Set(allTechnologies)];
    
          //  console.log(`   🏷️ Tecnologías identificadas:`);
         //   console.log(`      - Lenguajes: ${analysis.tecnologias?.lenguajes?.length || 0}`);
          //  console.log(`      - Frameworks: ${analysis.tecnologias?.frameworks?.length || 0}`);
          //  console.log(`      - Herramientas: ${analysis.tecnologias?.herramientas?.length || 0}`);
          //  console.log(`      - Bases de datos: ${analysis.tecnologias?.basesDeDatos?.length || 0}`);
          //  console.log(`      - Cloud: ${analysis.tecnologias?.cloud?.length || 0}`);
    
            // --- Notas internas - SOLO LA ÚLTIMA ---
            const nuevaNota = {
                tipo: 'ANALISIS_CV',
                texto: `Análisis CV - Estado: ${this.isComplete(analysis) ? 'COMPLETO' : 'INCOMPLETO'}`,
                fecha: new Date(),
                detalles: {
                    tecnologias: analysis?.tecnologias || {},
                    contacto: analysis?.contacto || {},
                    fuente: cvText ? 'CV' : 'HiringRoom'
                }
            };
    
            // --- Redes sociales - CORREGIDO ---
            const nuevasRedes = [];
    
            // Para LinkedIn
            if (analysis.contacto.linkedin) {
                let linkedinUrl = analysis.contacto.linkedin;
                if (!linkedinUrl.startsWith('http')) {
                    if (linkedinUrl.includes('linkedin.com/in/')) {
                        linkedinUrl = `https://${linkedinUrl}`;
                    } else {
                        linkedinUrl = `https://linkedin.com/in/${linkedinUrl.replace(/^in\//, '')}`;
                    }
                }
                nuevasRedes.push({ 
                    tipo: 'linkedin', 
                    url: linkedinUrl,
                    fechaCreacion: new Date(),
                    creadoPor: 'SISTEMA'
                });
            }
    
            // Para GitHub
            if (analysis.contacto.github) {
                let githubUrl = analysis.contacto.github;
                if (!githubUrl.startsWith('http')) {
                    if (githubUrl.includes('github.com/')) {
                        githubUrl = `https://${githubUrl}`;
                    } else {
                        githubUrl = `https://github.com/${githubUrl.replace(/^@/, '')}`;
                    }
                }
                nuevasRedes.push({ 
                    tipo: 'github', 
                    url: githubUrl,
                    fechaCreacion: new Date(),
                    creadoPor: 'SISTEMA'
                });
            }
    
            // Para Portfolio
            if (analysis.contacto.portfolio) {
                let portfolioUrl = analysis.contacto.portfolio;
                if (!portfolioUrl.startsWith('http')) {
                    if (portfolioUrl.includes('.')) {
                        portfolioUrl = `https://${portfolioUrl}`;
                    } else {
                        portfolioUrl = `https://${portfolioUrl}.com`;
                    }
                }
                nuevasRedes.push({ 
                    tipo: 'portfolio', 
                    url: portfolioUrl,
                    fechaCreacion: new Date(),
                    creadoPor: 'SISTEMA'
                });
            }
    
            const email = Array.isArray(analysis?.contacto?.email) 
                ? analysis.contacto.email[0]
                : (analysis?.contacto?.email || postulante.email);
    
            // --- Armado de updateData ---
            const sanitizedAdjuntos = {};
            Object.entries(adjuntos).forEach(([key, url], index) => {
                const sanitizedKey = key.replace(/[.]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
                sanitizedAdjuntos[sanitizedKey] = url;
            });
            
            const updateData = {
                $set: {
                    email: email,
                    telefonoCelular: analysis?.contacto?.telefono || postulante.telefonoCelular,
                    presentacionPostulante: analysis?.presentacion || postulante.presentacionPostulante,
                    tags: uniqueTagsForUpdate.map(tag => ({
                        nombre: tag,
                        creadoPor: 'SISTEMA',
                        fechaCreacion: new Date()
                    })),
                    notasInternas: [
                        ...(postulante.notasInternas || []).filter(nota => nota && nota.tipo && nota.tipo !== 'ANALISIS_CV'),
                        nuevaNota
                    ],
                    redesSociales: nuevasRedes,
                    adjuntos: sanitizedAdjuntos // Usamos el objeto sanitizado aquí
                }
            };
    
            // --- Comparar campos para saber qué cambió ---
            const camposActualizados = [];
            if ((analysis?.contacto?.email || postulante.email) !== postulante.email) camposActualizados.push('email');
            if ((analysis?.contacto?.telefono || postulante.telefonoCelular) !== postulante.telefonoCelular) camposActualizados.push('telefonoCelular');
            if (JSON.stringify(nuevasRedes) !== JSON.stringify(postulante.redesSociales || [])) camposActualizados.push('redesSociales');
            if ((analysis?.presentacion || postulante.presentacionPostulante) !== postulante.presentacionPostulante) camposActualizados.push('presentacionPostulante');
            if (JSON.stringify(uniqueTagsForUpdate) !== JSON.stringify((postulante.tags || []).map(t => t.nombre))) camposActualizados.push('tags');
            if (adjuntos.size > 0) camposActualizados.push('adjuntos');
    
            console.log(`   📝 Campos a actualizar: ${camposActualizados.length > 0 ? camposActualizados.join(', ') : 'ninguno'}`);
    
            // --- Actualiza en BD ---
            console.log(`   💾 Guardando cambios en la base de datos...`);
            await Postulant.findByIdAndUpdate(postulante._id, updateData, { new: true, runValidators: true });
            console.log(`   ✅ Cambios guardados exitosamente`);
    
            const endTime = Date.now();
            const processingTime = (endTime - startTime) / 1000;
          //  console.log(`   ⏱️ Tiempo de procesamiento: ${processingTime.toFixed(2)}s`);
    
            return {
                success: true,
                id: postulante._id,
                nombre: postulante.nombre,
                apellido: postulante.apellido,
                hiringRoomId: postulante.hiringRoomId,
                estado: this.isComplete(analysis) ? 'COMPLETO' : 'INCOMPLETO',
                camposActualizados,
                error: null
            };
    
        } catch (error) {
           // console.log(`   ❌ Error en el procesamiento: ${error.message}`);
            await this.updatePostulanteStatus(postulante._id, false, { error: `Error en procesarPostulante: ${error.message}` });
            return {
                success: false,
                id: postulante._id,
                nombre: postulante.nombre,
                apellido: postulante.apellido,
                hiringRoomId: postulante.hiringRoomId,
                error: error.message
            };
        }
    }

    async getPostulanteAdjuntos(postulanteId) {
        try {
            const postulante = await Postulant.findById(postulanteId);
            if (!postulante || !postulante.adjuntos) {
                return null;
            }
            return Object.fromEntries(postulante.adjuntos);
        } catch (error) {
            console.error(`[ERROR] Error obteniendo adjuntos del postulante ${postulanteId}:`, error.message);
            return null;
        }
    }

    isValidAnalysis(analysis) {
        if (!analysis) return false;
        
        // Verificar que el análisis tiene la estructura básica esperada
        if (!analysis.tecnologias || !analysis.contacto) return false;
        
        // Verificar que hay al menos algunas tecnologías identificadas
        const hasTechnologies = Object.values(analysis.tecnologias || {})
            .some(arr => Array.isArray(arr) && arr.length > 0);
        
        // Verificar que hay información de contacto básica
        const hasContactInfo = analysis.contacto && (
            analysis.contacto.email || 
            analysis.contacto.telefono || 
            analysis.contacto.linkedin
        );
        
        // Verificar que hay una presentación
        const hasPresentation = analysis.presentacion && 
            analysis.presentacion.length > 0;
        
        return hasTechnologies && (hasContactInfo || hasPresentation);
    }

    async updatePostulanteStatus(postulanteId, isComplete, detalles = {}) {
        try {
            await Postulant.findByIdAndUpdate(postulanteId, {
                $push: {
                    notasInternas: {
                        tipo: 'ANALISIS_CV',
                        fecha: new Date(),
                        estado: isComplete ? 'COMPLETO' : 'INCOMPLETO',
                        detalles
                    }
                }
            });
        } catch (error) {
            console.error(`[DB_ERROR_STATUS] Error actualizando estado del postulante ${postulanteId} en BD:`, error.message);
        }
    }

    isComplete(analysis) {
        if (!analysis || !analysis.contacto || !analysis.tecnologias) return false;
        const hasEmail = !!(analysis.contacto.email && analysis.contacto.email.includes('@'));
        const hasPhone = !!(analysis.contacto.telefono && analysis.contacto.telefono.length >= 6);
        const hasSocial = !!(
            (analysis.contacto.linkedin && analysis.contacto.linkedin.startsWith('http')) ||
            (analysis.contacto.github && analysis.contacto.github.startsWith('http')) ||
            (analysis.contacto.portfolio && analysis.contacto.portfolio.startsWith('http'))
        );
        const hasTech = Object.values(analysis.tecnologias).some(arr => Array.isArray(arr) && arr.length > 0);
        return hasEmail && hasPhone && hasSocial && hasTech;
    }

    async processAllPostulantes() {
        const batchSize = 20; // Aumentamos a 20 postulantes por lote
        const concurrentBatches = 2; // Mantenemos 2 lotes concurrentes (40 postulantes por ronda)
        let processedCount = 0;
        const totalPostulantes = await Postulant.countDocuments();
        let totalUpdated = 0;
        let totalErrors = 0;
        const detallesActualizacion = [];
    
        const startTime = Date.now();
        console.log(`\n=== INICIO DEL PROCESO DE ANÁLISIS DE CVs ===`);
        console.log(`📊 Total de postulantes a procesar: ${totalPostulantes}`);
        console.log(`📦 Tamaño de lote: ${batchSize}`);
        console.log(`🔄 Lotes concurrentes: ${concurrentBatches}`);
        console.log(`⏰ Inicio: ${new Date().toLocaleString()}\n`);
    
        while (processedCount < totalPostulantes) {
            // Limpiar caches cada 5 lotes (aumentamos el intervalo para lotes más grandes)
            if (processedCount > 0 && processedCount % (batchSize * 5) === 0) {
                await this.cleanupCaches();
                console.log('🧹 Caches limpiados');
                
                if (global.gc) {
                    global.gc();
                    console.log('�� Garbage collection ejecutado');
                }
            }
    
            // Obtener múltiples lotes para procesamiento concurrente
            const batchPromises = [];
            for (let i = 0; i < concurrentBatches && processedCount + (i * batchSize) < totalPostulantes; i++) {
                const skip = processedCount + (i * batchSize);
                const batchPromise = Postulant.find()
                    .select('_id hiringRoomId email telefonoCelular redesSociales presentacionPostulante notasInternas nombre apellido tags')
                    .skip(skip)
                    .limit(batchSize)
                    .lean();
    
                batchPromises.push(batchPromise);
            }
    
            const batches = await Promise.all(batchPromises);
            const currentBatchSize = batches.reduce((acc, batch) => acc + batch.length, 0);
    
            if (currentBatchSize === 0) {
                console.log("⚠️ No se encontraron más postulantes para procesar.");
                break;
            }
    
            console.log(`\n📥 Procesando ${concurrentBatches} lotes simultáneos`);
            console.log(`📋 Total de postulantes en esta ronda: ${currentBatchSize}`);
    
            // Procesar todos los postulantes de los lotes actuales
            const allPostulantes = batches.flat();
            
            // Procesar en sub-lotes más pequeños para control de memoria
            const subBatchSize = 5; // Aumentamos a 5 postulantes por sub-lote
            for (let i = 0; i < allPostulantes.length; i += subBatchSize) {
                const subBatch = allPostulantes.slice(i, i + subBatchSize);
                const processingPromises = subBatch.map(postulante =>
                    this.processPostulante(postulante)
                        .catch(err => ({
                            success: false,
                            id: postulante._id,
                            nombre: postulante.nombre,
                            apellido: postulante.apellido,
                            hiringRoomId: postulante.hiringRoomId,
                            error: err.message || 'Error desconocido'
                        }))
                );
    
                const results = await Promise.all(processingPromises);
                detallesActualizacion.push(...results);
    
                // Mostrar resultados del sub-lote de forma concisa
                for (const result of results) {
                    if (result.success) {
                        console.log(`✅ ${result.nombre} ${result.apellido} - ${result.estado}`);
                    } else {
                        console.log(`❌ ${result.nombre} ${result.apellido} - ${result.error}`);
                    }
                }
    
                // Pausa más corta entre sub-lotes
                if (i + subBatchSize < allPostulantes.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
    
            // Actualizar contadores
            const batchResults = detallesActualizacion.slice(-currentBatchSize);
            const batchUpdated = batchResults.filter(r => r.success).length;
            const batchErrors = batchResults.filter(r => !r.success).length;
            
            totalUpdated += batchUpdated;
            totalErrors += batchErrors;
            processedCount += currentBatchSize;
    
            // Mostrar progreso
            const elapsedTime = (Date.now() - startTime) / 1000;
            const processingRate = processedCount / elapsedTime;
            const estimatedTimeLeft = (totalPostulantes - processedCount) / processingRate;
    
            console.log(`\n📊 RESUMEN DE LA RONDA`);
            console.log(`   ✅ Actualizados: ${batchUpdated}`);
            console.log(`   ❌ Errores: ${batchErrors}`);
            console.log(`   📈 Progreso: ${processedCount}/${totalPostulantes} (${Math.round(processedCount/totalPostulantes*100)}%)`);
            console.log(`   ⚡ Velocidad: ${processingRate.toFixed(2)} postulantes/segundo`);
            console.log(`   ⏳ Tiempo restante estimado: ${Math.floor(estimatedTimeLeft/60)}m ${Math.floor(estimatedTimeLeft%60)}s`);
    
            // Pausa entre rondas principales
            if (processedCount < totalPostulantes) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
    
        // Informe final conciso
        const totalTime = (Date.now() - startTime) / 1000;
        console.log('\n=== INFORME FINAL ===');
        console.log(`📊 ESTADÍSTICAS:`);
        console.log(`   Total procesados: ${processedCount}`);
        console.log(`   Actualizados: ${totalUpdated}`);
        console.log(`   Errores: ${totalErrors}`);
        console.log(`   Tasa de éxito: ${((totalUpdated/processedCount)*100).toFixed(2)}%`);
        console.log(`   Tiempo total: ${Math.floor(totalTime/60)}m ${Math.floor(totalTime%60)}s`);
        console.log(`   Velocidad promedio: ${(processedCount/totalTime).toFixed(2)} postulantes/segundo`);
    }

    async cleanupCaches() {
        try {
            postulantCache.clear();
            cvCache.clear();
            console.log('🧹 Caches limpiados');
        } catch (error) {
            console.error('Error limpiando caches:', error);
        }
    }
    
    // sleep(ms) { // Ya lo tenías, solo asegúrate que esté en la clase si lo usas
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
}

export default new CVAnalysisService();