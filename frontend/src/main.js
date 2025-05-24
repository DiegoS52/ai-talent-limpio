import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import syncScheduler from './services/syncSchedulerService'
import './services/authInterceptor' // Agregar esta línea

// Crear y montar la aplicación
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Iniciar el programador de sincronización
syncScheduler.initialize().catch(error => {
    console.error('Error al inicializar el programador de sincronización:', error);
});
app.mount('#app')
