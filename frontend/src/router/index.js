import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import BasePostulantes from '../views/BasePostulantes.vue'
import TokenUsageView from '../views/TokenUsageView.vue'

const routes = [
  {
    path: '/',
    name: 'Splash',
    component: () => import('@/views/SplashScreen.vue')
  },
  {
    path: '/app',
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'postulaciones/lista',
        name: 'PostulacionesList',
        component: () => import('../views/postulaciones/Lista.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'postulaciones/detalle',
        name: 'PostulacionesDetail',
        component: () => import('../views/postulaciones/Detalle.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'validacion-cv',
        name: 'ValidacionCV',
        component: () => import('@/views/ValidacionCV.vue'),
        meta: {
          requiresAuth: true,
          title: 'Validación de CV'
        }
      },
      {
        path: 'base-postulantes',
        name: 'BasePostulantes',
        component: BasePostulantes,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'base-postulantes/:id',
        name: 'PostulanteDetalle',
        component: () => import('@/views/PostulanteDetalle.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'entrevistas',
        name: 'Entrevistas',
        component: () => import('../views/Entrevistas.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'reportes',
        name: 'Reportes',
        component: () => import('../views/Reportes.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'test-api',
        name: 'VacantesHiring',
        component: () => import('@/views/TestAPI.vue'),
        meta: {
          requiresAuth: true,
          title: 'Vacantes Hiring'
        }
      }
    ]
  },
  // Agregar una ruta directa para validacion-cv
  {
    path: '/validacion-cv',
    redirect: '/app/validacion-cv'
  },
  {
    path: '/token-usage',
    name: 'TokenUsage',
    component: TokenUsageView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = localStorage.getItem('hr_token')
  
  // Si estamos en el splash screen y ya estamos autenticados, redirigir al home
  if (to.path === '/' && token) {
    next('/app')
    return
  }

  // Permitir acceso al splash screen sin autenticación
  if (to.path === '/') {
    next()
    return
  }

  // Si la ruta requiere autenticación y no hay token
  if (to.meta.requiresAuth && !token) {
    localStorage.setItem('redirectAfterLogin', to.fullPath)
    next('/')
  } else {
    next()
  }
})

export default router