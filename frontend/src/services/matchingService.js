// Constantes de puntuación
const SCORE_WEIGHTS = {
  TECHNICAL: 40,
  EXPERIENCE: 25,
  EDUCATION: 15,
  YEARS: 10,
  LOCATION: 5,
  TAGS: 5
};

export const matchingService = {
  // Método principal de matching
  calculateMatchScore(postulant, requirements) {
    try {
      // Función helper para comparar textos con un porcentaje de similitud
      const similarityMatch = (text1, text2, threshold) => {
        if (!text1 || !text2) return false;
        // Implementar algoritmo de similitud (Levenshtein, etc)
        // Por ahora usamos una comparación simple
        return text1.toLowerCase().includes(text2.toLowerCase());
      };

      // Validar conocimientos técnicos en múltiples fuentes
      const tiene_conocimientos = this.validateTechnicalKnowledge(
        postulant,
        requirements,
        0.7 // threshold 70%
      );

      // Validar ubicación comparando cada componente
      const tiene_ubicacion = this.validateLocation(
        postulant,
        requirements,
        0.8 // threshold 80%
      );

      // Validar experiencia con tiempo y keywords
      const tiene_experiencia = this.validateExperience(
        postulant,
        requirements,
        0.7 // threshold 70%
      );

      // Validar disponibilidad
      const tiene_disponibilidad = this.validateAvailability(
        postulant,
        requirements
      );

      console.log('Datos del postulante:', {
        id: postulant.id,
        nombre: postulant.nombre,
        tiene_conocimientos,
        tiene_experiencia,
        tiene_ubicacion,
        tiene_disponibilidad,
        conocimientos: {
          skills: postulant.conocimientos,
          presentacion: postulant.presentacionPostulante,
          estudios: postulant.educacion
        },
        experiencia: postulant.experienciasLaborales,
        ubicacion: postulant.direccion,
        disponibilidad: {
          horaria: postulant.disponibilidadHoraria,
          relocacion: postulant.disponibilidadRelocacion
        }
      });

      const scores = {
        technical: this.calculateTechnicalScore(postulant, requirements),
        experience: this.calculateExperienceScore(postulant, requirements),
        education: this.calculateEducationScore(postulant, requirements),
        years: this.calculateYearsScore(postulant, requirements),
        location: this.calculateLocationScore(postulant, requirements),
        tags: this.calculateTagsScore(postulant, requirements)
      };

      console.log('Scores calculados para postulante:', postulant.id, scores);

      // Calcular score total ponderado
      const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
        return total + (score * SCORE_WEIGHTS[key.toUpperCase()] / 100);
      }, 0);

      console.log('Score total calculado:', totalScore);

      return {
        totalScore,
        detailedScores: scores,
        postulantInfo: {
          id: postulant.id,
          nombre: postulant.nombre,
          apellido: postulant.apellido,
          email: postulant.email,
          // Agregar más información relevante
          conocimientos: postulant.conocimientos,
          experiencia: postulant.experienciasLaborales,
          ubicacion: postulant.direccion
        }
      };
    } catch (error) {
      console.error('Error calculando match score:', error);
      console.error('Datos del postulante que causaron error:', postulant);
      return null;
    }
  },

  // Cálculo de score técnico
  calculateTechnicalScore(postulant, requirements) {
    const technicalReqs = requirements.categorias?.tecnicos?.requisitos || [];
    const postulantSkills = postulant.conocimientos || [];
    
    console.log('Matcheo técnico:', {
      requisitos_buscados: technicalReqs,
      skills_postulante: postulantSkills
    });
    
    let matchCount = 0;
    let matches = [];
    technicalReqs.forEach(req => {
      const found = postulantSkills.some(skill => 
        skill.nombre?.toLowerCase().includes(req.toLowerCase())
      );
      if (found) {
        matchCount++;
        matches.push(req);
      }
    });

    const score = technicalReqs.length ? (matchCount / technicalReqs.length) * 100 : 0;
    console.log('Resultado técnico:', {
      matches_encontrados: matches,
      score_tecnico: score
    });

    return score;
  },

  // Cálculo de score de experiencia
  calculateExperienceScore(postulant, requirements) {
    console.log('Matcheo experiencia:', {
      años_requeridos: requirements.años_experiencia,
      experiencias_postulante: postulant.experienciasLaborales
    });

    const expYears = this.calculateTotalExperienceYears(postulant);
    const requiredYears = parseInt(requirements.años_experiencia) || 0;
    
    let score;
    if (requiredYears === 0) score = 100;
    else if (expYears >= requiredYears) score = 100;
    else score = (expYears / requiredYears) * 100;

    console.log('Resultado experiencia:', {
      años_calculados: expYears,
      score_experiencia: score
    });
    
    return score;
  },

  // Métodos auxiliares
  calculateTotalExperienceYears(postulant) {
    const experiences = postulant.experienciasLaborales || [];
    let totalYears = 0;

    experiences.forEach(exp => {
      const startYear = exp.añoDesde;
      const endYear = exp.trabajoActual ? new Date().getFullYear() : exp.añoHasta;
      if (startYear && endYear) {
        const years = endYear - startYear;
        totalYears += years;
      }
    });

    return totalYears;
  },

  calculateEducationScore(postulant, requirements) {
    console.log('Educación del postulante:', postulant.educacion);
    return 0; // TODO: Implementar
  },

  calculateYearsScore(postulant, requirements) {
    return this.calculateExperienceScore(postulant, requirements);
  },

  calculateLocationScore(postulant, requirements) {
    console.log('Matcheo ubicación:', {
      ubicacion_requerida: requirements.ubicacion,
      ubicacion_postulante: postulant.direccion
    });
    return 0; // TODO: Implementar
  },

  calculateTagsScore(postulant, requirements) {
    console.log('Tags del postulante:', postulant.tags);
    return 0; // TODO: Implementar
  },

  // Nuevos métodos de validación
  validateTechnicalKnowledge(postulant, requirements, threshold) {
    const technicalReqs = requirements.categorias?.tecnicos?.requisitos || [];
    const sources = [
      postulant.conocimientos || [],
      postulant.presentacionPostulante || '',
      postulant.educacion || []
    ];

    return technicalReqs.some(req => 
      sources.some(source => {
        if (Array.isArray(source)) {
          return source.some(item => 
            this.calculateSimilarity(item.nombre || item.titulo || '', req) >= threshold
          );
        }
        return this.calculateSimilarity(source, req) >= threshold;
      })
    );
  },

  validateLocation(postulant, requirements, threshold) {
    const reqLocation = requirements.ubicacion;
    const postLocation = postulant.direccion;

    if (!reqLocation || !postLocation) return false;

    const locationComponents = ['pais', 'provincia', 'ciudad', 'direccion'];
    
    return locationComponents.some(component => 
      this.calculateSimilarity(
        postLocation[component] || '',
        reqLocation[component] || ''
      ) >= threshold
    );
  },

  validateExperience(postulant, requirements, threshold) {
    const experiences = postulant.experienciasLaborales || [];
    const reqYears = requirements.años_experiencia;
    const reqKeywords = requirements.categorias?.tecnicos?.requisitos || [];

    // Validar años totales
    const totalYears = this.calculateTotalExperienceYears(postulant);
    if (totalYears < reqYears) return false;

    // Validar keywords en experiencia
    return experiences.some(exp => 
      reqKeywords.some(keyword =>
        this.calculateSimilarity(exp.puesto || '', keyword) >= threshold ||
        this.calculateSimilarity(exp.descripcion || '', keyword) >= threshold
      )
    );
  },

  validateAvailability(postulant, requirements) {
    const disponibilidad = {
      horaria: postulant.disponibilidadHoraria || {},
      relocacion: postulant.disponibilidadRelocacion || false,
      modalidad: postulant.modalidadTrabajo || []
    };

    // Comparar con requisitos de disponibilidad
    // TODO: Implementar lógica específica según requisitos
    return true;
  },

  calculateSimilarity(text1, text2) {
    // TODO: Implementar algoritmo de similitud más sofisticado
    // Por ahora usamos una comparación simple
    if (!text1 || !text2) return 0;
    text1 = text1.toLowerCase();
    text2 = text2.toLowerCase();
    return text1.includes(text2) || text2.includes(text1) ? 1 : 0;
  }
}; 