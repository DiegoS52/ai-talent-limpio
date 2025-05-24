import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
    id: String,
    fecha: Date,
    userId: String,
    userEmail: String,
    perfil_buscado: String,
    requisitos_extraidos: {
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
    resultados: {
        total_postulantes: Number,
        matches_encontrados: Number,
        score_promedio: Number,
        matches: [{
            postulantInfo: mongoose.Schema.Types.Mixed,
            analysis: mongoose.Schema.Types.Mixed
        }]
    }
}, {
    timestamps: true
});

// Índices
searchHistorySchema.index({ userId: 1 });
searchHistorySchema.index({ userEmail: 1 });
searchHistorySchema.index({ fecha: -1 });
searchHistorySchema.index({ perfil_buscado: 1 });
searchHistorySchema.index({ 'resultados.total_postulantes': 1 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
export default SearchHistory;