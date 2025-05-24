import mongoose from 'mongoose';

const ConocimientoSchema = new mongoose.Schema({
    tipo: String,
    nombre: String,
    nivel: String,
    calificacion: String,
    descripcion: String
});

const RedSocialSchema = new mongoose.Schema({
    tipo: { type: String, required: true },
    url: { type: String, required: true },
    fechaCreacion: { type: Date, default: Date.now },
    creadoPor: { type: String, default: 'SISTEMA' }
  });

const DireccionSchema = new mongoose.Schema({
    pais: String,
    provincia: String,
    ciudad: String,
    direccion: String,
    paisId: Number,
    provinciaId: Number,
    ciudadId: Number
});

const ExperienciaLaboralSchema = new mongoose.Schema({
    empresa: String,
    puesto: String,
    mesDesde: Number,
    añoDesde: Number,
    mesHasta: Number,
    añoHasta: Number,
    trabajoActual: Boolean,
    pais: String,
    area: String,
    subArea: String,
    industria: String,
    seniority: String,
    descripcion: String
});

const EstudioSchema = new mongoose.Schema({
    institucion: String,
    titulo: String,
    mesDesde: {
        type: Number,
        default: null
    },
    añoDesde: {
        type: Number,
        default: null
    },
    mesHasta: {
        type: Number,
        default: null
    },
    añoHasta: {
        type: Number,
        default: null
    },
    estudioActual: Boolean,
    pais: {
        type: String,
        default: null
    },
    area: String,
    nivel: String,
    estado: String,
    descripcion: String
});


const ReferenciaSchema = new mongoose.Schema({
    apellido: String,
    nombre: String,
    relacion: String,
    telefono: String,
    email: String,
    descripcion: String
});

const TagSchema = new mongoose.Schema({
    nombre: String,
    creadoPor: String,
    fechaCreacion: String
});

const ComentarioSchema = new mongoose.Schema({
    vacante: String,
    usuario: String,
    comentario: String,
    fecha: String
});

const ReporteSchema = new mongoose.Schema({
    vacante: String,
    fechaCreacion: String,
    descripcion: String,
    ultimaModificacionPor: String,
    creadoPor: String,
    fechaUltimaModificacion: String
});

const RechazoSchema = new mongoose.Schema({
    vacanteId: String,
    razon: String,
    fechaRechazo: String
}, { _id: false });

const PostulantSchema = new mongoose.Schema({
    // Campo para tracking interno
    hiringRoomId: { type: String, required: true, unique: true },
    
    // Campos básicos del postulante
    email: String,
    dni: String,
    nombre: String,
    apellido: String,
    fechaNacimiento: String,
    telefonoFijo: String,
    telefonoCelular: String,
    cuil: String,
    genero: String,
    fotoPerfil: String,
    presentacionPostulante: String,
    nacionalidad: String,
    
    // Arrays y objetos complejos
    conocimientos: [ConocimientoSchema],
    redesSociales: [RedSocialSchema],
    direccion: DireccionSchema,
    experienciasLaborales: [ExperienciaLaboralSchema],
    estudios: [EstudioSchema],
    referencias: [ReferenciaSchema],
    tags: [TagSchema],
    
    // Campos relacionados con la postulación
    etapa: String,
    fechaPostulacion: String,
    fechaAplicacion: String,
    fuente: String,
    legajo: String,
    salarioPretendido: String,
    vacanteId: String,
    vacanteNombre: String,
    calificacion: Number,
    disponibilidadHoraria: String,
    disponibilidadRelocacion: String,
    rechazado: {
        type: [RechazoSchema],
        default: () => [{
            vacanteId: null,
            razon: 'no',
            fechaRechazo: null
        }],
        set: function(v) {
            if (v === 'no') {
                return [{
                    vacanteId: null,
                    razon: 'no',
                    fechaRechazo: null
                }];
            }
            return v;
        }
    },
    
    // Arrays de seguimiento
    comentarios: [ComentarioSchema],
    reportes: [ReporteSchema],
    
    // Archivos adjuntos
    adjuntos: {
        type: Map,
        of: String,
        default: new Map()
    },
    
    // Campos de control propios
    lastUpdate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    
    // Campos adicionales propios
    analisisRealizados: [{
        tipo: String,
        fecha: Date,
        resultado: mongoose.Schema.Types.Mixed,
        usuario: String
    }],
    
    notasInternas: [{
        texto: String,
        fecha: { type: Date, default: Date.now },
        usuario: String
    }]
}, {
    timestamps: true
});

// Agregar índices para optimizar búsquedas
PostulantSchema.index({ isActive: 1 });
PostulantSchema.index({ nombre: 1 });
PostulantSchema.index({ apellido: 1 });
PostulantSchema.index({ email: 1 });
PostulantSchema.index({ nacionalidad: 1 });
PostulantSchema.index({ etapa: 1 });
PostulantSchema.index({ fuente: 1 });
PostulantSchema.index({ lastUpdate: -1 });
PostulantSchema.index({ 'direccion.pais': 1 });
PostulantSchema.index({ 'direccion.provincia': 1 });
PostulantSchema.index({ 'direccion.ciudad': 1 });

// Índices compuestos para búsquedas frecuentes
PostulantSchema.index({ isActive: 1, lastUpdate: -1 });
PostulantSchema.index({ isActive: 1, etapa: 1 });

// Índice de texto para búsqueda full-text
PostulantSchema.index({
    nombre: 'text',
    apellido: 'text',
    email: 'text',
    nacionalidad: 'text',
    presentacionPostulante: 'text',
    'direccion.pais': 'text',
    'direccion.provincia': 'text',
    'direccion.ciudad': 'text'
}, {
    weights: {
        nombre: 10,
        apellido: 10,
        email: 5,
        nacionalidad: 3,
        'direccion.pais': 2,
        'direccion.provincia': 2,
        'direccion.ciudad': 2,
        presentacionPostulante: 1
    },
    name: "PostulantTextSearch"
});

// Método estático para búsqueda paginada
PostulantSchema.statics.paginatedSearch = async function(query) {
    const {
      page = 1,
      limit = 10,
      query: baseQuery = {},
      sort = 'nombre',
      order = 'asc'
    } = query;
  
    try {
      // Calcular skip para paginación
      const skip = (page - 1) * limit;
  
      // Ejecutar la búsqueda con los filtros
      const [postulantes, total] = await Promise.all([
        this.find(baseQuery)
          .sort({ [sort]: order === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit),
        this.countDocuments(baseQuery)
      ]);
  
      return {
        postulantes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error en paginatedSearch:', error);
      throw error;
    }
};

// Middleware para actualizar lastUpdate
PostulantSchema.pre('save', function(next) {
    this.lastUpdate = new Date();
    next();
});

PostulantSchema.pre('findOneAndUpdate', function(next) {
    this._update.$set = this._update.$set || {};
    this._update.$set.lastUpdate = new Date();
    next();
});

const Postulant = mongoose.model('Postulant', PostulantSchema, 'postulants');

// Crear índices en la base de datos
Postulant.createIndexes().catch(error => {
    console.error('Error al crear índices:', error);
});

export default Postulant;