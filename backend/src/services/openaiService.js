const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000 
});

const analyzeCandidate = async (jobDescription, candidateInfo) => {
    try {
        const prompt = `
        Analiza la adecuación entre un candidato y un puesto de trabajo.

        PUESTO BUSCADO:
        ${jobDescription}

        INFO DEL POSTULANTE:
        ${candidateInfo}

        Por favor, proporciona un análisis detallado que incluya:
        1. Cumplimiento de requisitos excluyentes (Sí/No, y justificación)
        2. Aptitud general para el puesto
        3. Fortalezas identificadas
        4. Debilidades o áreas de mejora
        5. Calificación de adecuación (1-10) con justificación

        Estructura tu respuesta en formato JSON.`;

        const completion = await openai.chat.completions.create({
            // model: "gpt-4",
            model: "gpt-3.5-turbo", 
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error en el análisis del candidato:', error);
        throw error;
    }
};

module.exports = {
    analyzeCandidate
}; 