import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// Importar componentes
import MainLayout from './layouts/MainLayout.vue'
import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'

// Configurar rutas
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: Home
        },
        {
          path: '/dashboard',
          name: 'dashboard',
          component: Dashboard
        }
      ]
    }
  ]
})

// Crear y montar la aplicación
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
