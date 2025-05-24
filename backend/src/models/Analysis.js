import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  jobInfo: {
    titulo: String,
    area: String,
    descripcion: String,
    requisitos: String,
    modalidadTrabajo: String,
    tipoTrabajo: String,
    tipoDeContratacion: String,
    modalidadDeContratacion: String,
    ubicacion: {
      pais: String,
      provincia: String,
      ciudad: String
    },
    descripcionEmpresa: String,
    areaTrabajo: String,
    descripcionTrabajo: String,
    estadoNivelEducacion: String,
    nivelMinimoEducacion: String,
    requisitoSecundarioCompleto: String,
    requisitoIdioma: String,
    idioma: String,
    requisitoReubicacionLaboral: String,
    requisitoDisponibilidadHoraria: String,
    requisitoGenero: String,
    jerarquia: String,
    genero: String,
    beneficios: String,
    condiciones: String
  },
  candidateInfo: {
    datosPersonales: {
      dni: String,
      nombre: String,
      apellido: String,
      fechaNacimiento: String,
      telefonoFijo: String,
      telefonoCelular: String,
      email: String,
      genero: String,
      fotoPerfil: String,
      nacionalidad: String
    },
    direccion: {
      pais: String,
      provincia: String,
      ciudad: String,
      direccion: String
    },
    redesSociales: {
      linkedin: String,
      facebook: String,
      twitter: String,
      googlePlus: String,
      skype: String,
      website: String
    },
    conocimientos: [mongoose.Schema.Types.Mixed],
    experiencia: [mongoose.Schema.Types.Mixed],
    estudios: [mongoose.Schema.Types.Mixed],
    referencias: [mongoose.Schema.Types.Mixed],
    disponibilidadHoraria: String,
    disponibilidadRelocacion: String,
    presentacion: String,
    etapa: String,
    archivosCV: [{
      nombre: String,
      url: String
    }]
  },
  result: {
    analysis: {
      'Cumplimiento de requisitos excluyentes': {
        respuesta: String,
        justificación: String
      },
      'Aptitud general para el puesto': String,
      'Fortalezas identificadas': [String],
      'Debilidades o áreas de mejora': [String],
      'Calificación de adecuación': {
        calificación: String,
        justificación: String
      },
      cuestionario: {
        preguntas_psicologicas: [{
          numero: Number,
          pregunta: String,
          opciones: {
            A: String,
            B: String,
            C: String,
            D: String
          },
          respuesta_correcta: String,
          explicacion: String
        }]
      },
      contactos: {
        datos: String
      }
    },
    score: Number
  },
  // Campos adicionales para tracking
  vacancyId: { type: String, required: true },
  postulantId: { type: String, required: true },
  userEmail: { type: String, required: true },
  validationStatus: { type: String, required: true }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
AnalysisSchema.index({ vacancyId: 1, postulantId: 1 });
AnalysisSchema.index({ userEmail: 1 });
AnalysisSchema.index({ timestamp: -1 });

export default mongoose.model('Analysis', AnalysisSchema); 