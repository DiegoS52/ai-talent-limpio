import SearchHistory from '../models/searchHistory.js';

export const saveSearch = async (req, res) => {
    try {
        console.log('Recibiendo datos en el backend:', req.body);
        const searchData = req.body;

          
        // Usar los datos que vienen en el body en lugar de req.user
        const userId = searchData.userId;
        const userEmail = searchData.userEmail;
        
        console.log('userId:', userId);   
        console.log('userEmail:', userEmail); 
        
        console.log('Creando nuevo documento SearchHistory');
        const newSearch = new SearchHistory({
            ...searchData,
            userId,
            userEmail,
            fecha: new Date()
        });

        //await newSearch.save();
        console.log('Guardando en MongoDB...',userId,userEmail);
        const savedSearch = await newSearch.save();  // Primero guardamos

        console.log('Documento guardado exitosamente:', savedSearch);
        res.status(201).json(savedSearch);
    } catch (error) {
        console.error('Error al guardar en MongoDB:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Error al guardar la búsqueda', 
            error: error.message 
        });
    }
};

export const getSearchHistory = async (req, res) => {
    try {
        // Obtener todas las búsquedas ordenadas por fecha descendente
        const searches = await SearchHistory
            .find()
            .sort({ fecha: -1 })
            .limit(100); // Opcional: limitar la cantidad de resultados

        res.status(200).json(searches);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ 
            message: 'Error al obtener historial de búsquedas', 
            error: error.message 
        });
    }
};

export const getSearchById = async (req, res) => {
    try {
        const search = await SearchHistory.findById(req.params.id);
        if (!search) {
            return res.status(404).json({ message: 'Búsqueda no encontrada' });
        }
        res.json(search);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la búsqueda', error: error.message });
    }
}; 