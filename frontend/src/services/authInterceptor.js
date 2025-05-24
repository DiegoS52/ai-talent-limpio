import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { useUserStore } from '@/stores/user';

// Función para verificar si el token está expirado
const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Función para manejar la expiración del token
const handleTokenExpiration = () => {
  const userStore = useUserStore();
  userStore.logout(); // Esto limpiará tanto el token como el estado
  const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
  localStorage.removeItem('redirectAfterLogin');
  window.location.href = redirectPath;
};

// Interceptor global de Axios
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hr_token');
    
    if (token) {
      if (isTokenExpired(token)) {
        handleTokenExpiration();
        return Promise.reject('Token expirado');
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleTokenExpiration();
    }
    return Promise.reject(error);
  }
);