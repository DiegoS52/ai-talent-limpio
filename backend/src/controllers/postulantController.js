import Postulant from '../models/Postulant.js';
import tempMemory from '../utils/tempMemory.js';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'tempPostulants'); // o 'src/tempPostulants' si preferís
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Agregar esta función de transformación al inicio del archivo, después de las importaciones
function transformPostulantData(hrPostulant) {
    // Función auxiliar para convertir 0 a null o string vacío
    const convertZero = (value) => value === 0 ? '' : value?.toString() || '';

    // Transformar estudios
    const estudios = hrPostulant.estudios?.map(estudio => ({
        ...estudio,
        institucion: convertZero(estudio.institucion),
        pais: convertZero(estudio.pais),
        area: convertZero(estudio.area),
        nivel: convertZero(estudio.nivel),
        mesDesde: estudio.mesDesde || null,
        añoDesde: estudio.añoDesde || null,
        mesHasta: estudio.mesHasta || null,
        añoHasta: estudio.añoHasta || null
    })) || [];

    // Transformar experiencias laborales
    const experienciasLaborales = hrPostulant.experienciasLaborales?.map(exp => ({
        ...exp,
        pais: convertZero(exp.pais),
        area: convertZero(exp.area),
        subArea: convertZero(exp.subArea),
        industria: convertZero(exp.industria),
        seniority: convertZero(exp.seniority),
        mesDesde: exp.mesDesde || null,
        añoDesde: exp.añoDesde || null,
        mesHasta: exp.mesHasta || null,
        añoHasta: exp.añoHasta || null
    })) || [];

    // Transformar dirección (de array a objeto único)
    const direccion = hrPostulant.direccion ? {
        pais: convertZero(hrPostulant.direccion.pais),
        provincia: convertZero(hrPostulant.direccion.provincia),
        ciudad: convertZero(hrPostulant.direccion.ciudad),
        direccion: convertZero(hrPostulant.direccion.direccion),
        paisId: hrPostulant.direccion.paisId || null,
        provinciaId: hrPostulant.direccion.provinciaId || null,
        ciudadId: hrPostulant.direccion.ciudadId || null
    } : {};

    let rechazado;
    if (hrPostulant.rechazado === "no" || !hrPostulant.rechazado) {
        rechazado = [{
            vacanteId: null,
            razon: 'no',
            fechaRechazo: null
        }];
    } else if (Array.isArray(hrPostulant.rechazado)) {
        rechazado = hrPostulant.rechazado; // Mantener el array como está
    } else {
        // Para cualquier otro caso, usar el formato estándar
        rechazado = [{
            vacanteId: null,
            razon: 'no',
            fechaRechazo: null
        }];
    }

    // Retornar el objeto transformado
    return {
        ...hrPostulant,
        estudios,
        experienciasLaborales,
        direccion,
        rechazado,
        hiringRoomId: hrPostulant.id?.toString(),
        isActive: true
    };
}
/* export const syncPostulants = async (req, res) => {
    try {
        console.log('Iniciando sincronización de postulantes');
        const hiringRoomPostulants = req.body.postulants;
        const today = new Date();
        const updatedIds = [];
        
        for (const hrPostulant of hiringRoomPostulants) {
            const postulant = await Postulant.findOneAndUpdate(
                { hiringRoomId: hrPostulant.id },
                {
                    $set: {
                        ...hrPostulant,
                        hiringRoomId: hrPostulant.id,
                        lastUpdate: today,
                        isActive: true
                    }
                },
                { upsert: true, new: true }
            );
            updatedIds.push(postulant._id);
        }

        // Marcar como inactivos los que no se actualizaron hoy
        await Postulant.updateMany(
            { 
                lastUpdate: { $lt: today }, 
                isActive: true 
            },
            { 
                $set: { isActive: false }
            }
        );

        res.json({ 
            message: 'Sincronización completada',
            updated: hiringRoomPostulants.length
        });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: error.message });
    }
}; */

/* export const syncPostulants = async (req, res) => {
    try {
        const hiringRoomPostulants = req.body.postulants;
        const today = new Date();
        const updatedIds = [];
        
        for (const hrPostulant of hiringRoomPostulants) {
            // Buscar postulante existente para preservar campos propios
            const existingPostulant = await Postulant.findOne({ 
                hiringRoomId: hrPostulant.id 
            });
            
            const postulantData = {
                ...hrPostulant,
                hiringRoomId: hrPostulant.id,
                lastUpdate: today,
                isActive: true,
                // Preservar campos propios si existen
                analisisRealizados: existingPostulant?.analisisRealizados || [],
                notasInternas: existingPostulant?.notasInternas || []
            };

            const postulant = await Postulant.findOneAndUpdate(
                { hiringRoomId: hrPostulant.id },
                { $set: postulantData },
                { upsert: true, new: true }
            );
            
            updatedIds.push(postulant._id);
        }

        // Marcar como inactivos los no actualizados
        await Postulant.updateMany(
            { 
                lastUpdate: { $lt: today }, 
                isActive: true 
            },
            { 
                $set: { isActive: false }
            }
        );

        res.json({ 
            message: 'Sincronización completada',
            updated: hiringRoomPostulants.length
        });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: error.message });
    }
}; */

export const syncPostulants = async (req, res) => {
    try {
        const hiringRoomPostulants = req.body.postulants;
        const today = new Date();
        const updatedIds = [];
        
        for (const hrPostulant of hiringRoomPostulants) {
            // Buscar postulante existente para preservar campos propios
            const existingPostulant = await Postulant.findOne({ 
                hiringRoomId: hrPostulant.id 
            });
            
            // Transformar los datos antes de guardar
            const transformedData = transformPostulantData(hrPostulant);
            
            const postulantData = {
                ...transformedData,
                hiringRoomId: hrPostulant.id,
                lastUpdate: today,
                isActive: true,
                // Preservar campos propios si existen
                analisisRealizados: existingPostulant?.analisisRealizados || [],
                notasInternas: existingPostulant?.notasInternas || []
            };

            const postulant = await Postulant.findOneAndUpdate(
                { hiringRoomId: hrPostulant.id },
                { $set: postulantData },
                { upsert: true, new: true }
            );
            
            updatedIds.push(postulant._id);
        }

        // Marcar como inactivos los no actualizados
        await Postulant.updateMany(
            { 
                lastUpdate: { $lt: today }, 
                isActive: true 
            },
            { 
                $set: { isActive: false }
            }
        );

        res.json({ 
            message: 'Sincronización completada',
            updated: hiringRoomPostulants.length
        });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: error.message });
    }
};
export const getActivePostulants = async (req, res) => {
    try {
        const postulants = await Postulant.find({ isActive: true });
        res.json(postulants);
    } catch (error) {
        console.error('Error obteniendo postulantes activos:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPostulantById = async (req, res) => {
    try {
        let postulant = await Postulant.findOne({ hiringRoomId: req.params.id });
        if (!postulant && /^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            postulant = await Postulant.findById(req.params.id);
        }
       
        if (!postulant) {
            return res.status(404).json({ message: 'Postulante no encontrado' });
        }
        console.log('Postulante encontrado:', postulant);
        res.json(postulant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}; 

// Nuevo endpoint para obtener postulantes por estado
export const getPostulantsByStatus = async (req, res) => {
    try {
        const { status } = req.query; // 'active' o 'inactive'
        const isActive = status === 'active';
        
        const postulants = await Postulant.find({ isActive });
        
        res.json({
            total: postulants.length,
            postulants
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const syncBatchPostulants = async (req, res) => {
    try {
        const { postulants } = req.body;
        const today = new Date();
        const batchResults = [];

        console.log(`Procesando lote de ${postulants.length} postulantes`);

        for (const hrPostulant of postulants) {
            // Buscar postulante existente
            const existingPostulant = await Postulant.findOne({ 
                hiringRoomId: hrPostulant.id 
            });
            
            const postulantData = {
                ...hrPostulant,
                hiringRoomId: hrPostulant.id,
                lastUpdate: today,
                isActive: true,
                // Preservar campos propios si existen
                analisisRealizados: existingPostulant?.analisisRealizados || [],
                notasInternas: existingPostulant?.notasInternas || []
            };

            const updatedPostulant = await Postulant.findOneAndUpdate(
                { hiringRoomId: hrPostulant.id },
                { $set: postulantData },
                { upsert: true, new: true }
            );

            batchResults.push(updatedPostulant._id);
        }

        // No marcamos inactivos aquí, lo haremos en una llamada separada
        
        res.json({ 
            message: 'Lote sincronizado correctamente',
            updated: batchResults.length,
            ids: batchResults
        });

    } catch (error) {
        console.error('Error en sincronización de lote:', error);
        res.status(500).json({ error: error.message });
    }
};

// Nuevo método para marcar inactivos al final
export const markInactivePostulants = async (req, res) => {
    try {
        const today = new Date();
        const result = await Postulant.updateMany(
            { 
                lastUpdate: { $lt: today },
                isActive: true 
            },
            { 
                $set: { isActive: false }
            }
        );

        res.json({
            message: 'Postulantes inactivos marcados correctamente',
            modified: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marcando postulantes inactivos:', error);
        res.status(500).json({ error: error.message });
    }
};
export const getSyncStatus = async (req, res) => {
    try {
        // Obtener el postulante más reciente para ver la última sincronización
        const lastUpdated = await Postulant.findOne()
            .sort({ updatedAt: -1 })
            .select('updatedAt');
            
        // Obtener el conteo total de postulantes activos
        const count = await Postulant.countDocuments({ isActive: true });

        res.json({
            lastSync: lastUpdated ? lastUpdated.updatedAt : null,
            count: count
        });
    } catch (error) {
        console.error('Error al obtener estado de sincronización:', error);
        res.status(500).json({ 
            error: error.message,
            lastSync: null,
            count: 0
        });
    }
};

export const getAllPostulants = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            query = '{}',
            sort = 'nombre',
            order = 'asc'
        } = req.query;

        // Parsear el query
        const baseQuery = JSON.parse(query);

        // Filtro para solo traer postulantes con nombre y apellido válidos
        baseQuery.nombre = { $nin: [null, '', '-', 'null', 'undefined'] };
        baseQuery.apellido = { $nin: [null, '', '-', 'null', 'undefined'] };

        // Usar el método paginatedSearch del modelo
        const result = await Postulant.paginatedSearch({
            page,
            limit,
            query: baseQuery,
            sort,
            order
        });

        res.json(result);
    } catch (error) {
        console.error('Error al obtener postulantes:', error);
        res.status(500).json({ 
            error: error.message,
            message: 'Error al obtener los postulantes'
        });
    }
};

/* export const storeTempPostulants = async (req, res) => {
    const key = req.body.key;
    if (!key) return res.status(400).json({ error: 'Falta la clave temporal' });

    try {
        //const postulants = await Postulant.find({ isActive: true }).lean();
        const postulants = await Postulant.find().lean(); // ← CAMBIA ACÁ
        console.log('🧪 En store-temp: encontré', postulants.length, 'postulantes en Mongo');
        tempMemory[key] = postulants;
        return res.json({ success: true });
    } catch (error) {
        console.error('Error al guardar temporalmente los postulantes:', error);
        return res.status(500).json({ error: 'Error al guardar temporalmente los postulantes' });
    }
};

export const retrieveTempPostulants = (req, res) => {
    const key = req.query.key;
    const data = tempMemory[key];
    console.log('🔑 Todas las keys disponibles en memoria:', Object.keys(tempMemory));
    console.log('🧠 [RETRIEVE] Buscando key:', key);
    console.log('🧠 [RETRIEVE] Keys disponibles:', Object.keys(tempMemory));
    if (!key || !data) {
        return res.status(404).json({ error: 'Datos no encontrados para la clave dada' });
    }

    return res.json(data);
};
 */

export const storeTempPostulants = async (req, res) => {
    const key = req.body.key;
    if (!key) return res.status(400).json({ error: 'Falta la clave temporal' });

    try {
        const postulants = await Postulant.find().lean();
        const filePath = path.join(TEMP_DIR, `${key}.json`);
        fs.writeFileSync(filePath, JSON.stringify(postulants, null, 2));
        console.log(`✅ Postulantes guardados en archivo temporal: ${filePath}`);
        return res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al guardar postulantes en archivo temporal:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
};

export const retrieveTempPostulants = (req, res) => {
    const key = req.query.key;
    const filePath = path.join(TEMP_DIR, `${key}.json`);

    console.log('🔍 Buscando archivo de clave:', filePath);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Datos no encontrados para la clave dada' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
 // Borrar el archivo después de leerlo
        fs.unlinkSync(filePath);
        console.log('🗑️ Archivo temporal eliminado:', filePath);
        return res.json(data);
    } catch (error) {
        console.error('❌ Error al leer archivo temporal:', error);
        return res.status(500).json({ error: 'Error al leer archivo temporal' });
    }
};
export const countPostulants = async (req, res) => {
    try {
        const total = await Postulant.countDocuments({ isActive: true });
        return res.json({ total });
    } catch (error) {
        console.error('Error al contar postulantes activos:', error);
        return res.status(500).json({ error: 'Error interno al contar postulantes' });
    }
};

export const getEtapasUnicas = async (req, res) => {
  try {
    const etapas = await Postulant.distinct('etapa');
    res.json({ etapas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};