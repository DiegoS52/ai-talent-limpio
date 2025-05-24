//const STORAGE_KEY_PREFIX = 'search_history_';

import axios from 'axios';
import { jwtDecode } from "jwt-decode"; 

const API_URL = 'http://localhost:3005/api';

export const searchHistoryService = {
  // Guardar una nueva búsqueda
  saveSearch: async (searchData) => {
    try {

      // Obtener token del localStorage
      const token = localStorage.getItem('hr_token');
      console.log('Token encontrado:', token); // Verificar si hay token
      let userInfo = {
        userId: null,
        userEmail: null
      };
      
      if (token) {
        try {
          const decoded = jwtDecode(token);
          console.log('Token decodificado:', decoded); // Para debug
          
     // Verificar todas las posibles propiedades
     console.log('Posibles IDs:', {
      uid: decoded.uid,
      id: decoded.id,
      userId: decoded.userId,
      sub: decoded.sub
    });
    
    console.log('Posibles Emails:', {
      uem: decoded.uem,
      email: decoded.email,
      userEmail: decoded.userEmail
    });

          userInfo = {
            userId: decoded.uid || decoded.id || decoded.userId, // Múltiples posibles nombres
            userEmail: decoded.uem || decoded.email || decoded.userEmail
          };
        } catch (tokenError) {
          console.error('Error al decodificar el token:', tokenError);
        }
      } else {
        console.warn('No se encontró token en localStorage');
      }


      const dataToSave = {
          ...searchData,
          userId: userInfo.userId,
          userEmail: userInfo.userEmail,
          fecha: new Date().toISOString()
      };

      console.log('Datos a guardar:', dataToSave); // Para debug
        
        const response = await axios.post(`${API_URL}/search-history`, dataToSave);
        console.log('Respuesta del servidor:', response.data); // Log de respuesta
        return response.data;
    } catch (error) {
        console.error('Error detallado al guardar:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw error;
    }
},

  // Obtener el historial de búsquedas
  getSearchHistory: async () => {
    try {
      const token = localStorage.getItem('hr_token');
      const response = await axios.get(`${API_URL}/search-history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  },

  // Obtener una búsqueda específica por ID
  getSearchById: async (id) => {
      try {
          const response = await axios.get(`${API_URL}/search-history/${id}`);
          return response.data;
      } catch (error) {
          console.error('Error al obtener la búsqueda:', error);
          throw error;
      }
  }
};

/*export const searchHistoryService = {
  generateSearchId() {
    return `search_${new Date().toISOString().replace(/[^0-9]/g, '_')}`;
  },

  getSearches() {
    try {
      // Obtener todas las keys que empiezan con el prefix
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(STORAGE_KEY_PREFIX)
      );
      
      // Obtener y ordenar las búsquedas por fecha
      const searches = keys
        .map(key => JSON.parse(localStorage.getItem(key)))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      return searches;
    } catch (error) {
      return [];
    }
  },

  saveSearch(searchData) {
    try {
      const searchId = this.generateSearchId();
      const search = {
        id: searchId,
        fecha: new Date().toISOString(),
        ...searchData
      };

      // Guardar búsqueda individual
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${searchId}`, 
        JSON.stringify(search)
      );

      // Mantener control de cantidad de búsquedas
      this.cleanOldSearches();

      return true;
    } catch (error) {
      return false;
    }
  },

  cleanOldSearches() {
    const MAX_SEARCHES = 50;
    const searches = this.getSearches();
    
    if (searches.length > MAX_SEARCHES) {
      // Eliminar las búsquedas más antiguas
      searches
        .slice(MAX_SEARCHES)
        .forEach(search => {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}${search.id}`);
        });
    }
  },

  getSearchById(searchId) {
    try {
      return JSON.parse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}${searchId}`)
      );
    } catch {
      return null;
    }
  },

  clearHistory() {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(STORAGE_KEY_PREFIX)
    );
    keys.forEach(key => localStorage.removeItem(key));
  }
}; */

