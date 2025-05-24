<script setup>
// NUEVO: Importaciones necesarias para autenticación
import { ref, watch } from 'vue'  // <-- Aquí está el cambio
import { useUserStore } from '@/stores/user'
import { useRouter, useRoute } from 'vue-router'
import LoginModal from '@/components/LoginModal.vue'

// NUEVO: Inicialización de stores y refs
const router = useRouter()
const route = useRoute()  // <-- Mover esta línea arriba
const userStore = useUserStore()
const openMenu = ref('')
const showLoginModal = ref(false)



// NUEVO: Watch para el query param
watch(
  () => route.query.showLogin,
  (newValue) => {
    console.log('showLogin query param cambió a:', newValue)
    if (newValue === 'true') {
      showLoginModal.value = true
    }
  },
  { immediate: true }
)

// EXISTENTE: Función original sin cambios
const toggleMenu = (menu) => {
  openMenu.value = openMenu.value === menu ? '' : menu
}



// Función simple para cerrar el modal y redirigir a home
const handleCloseLoginModal = () => {
  showLoginModal.value = false
  router.push('/') // Esto fuerza la redirección a home cuando se cierra el modal
}

// NUEVO: Funciones para manejo de autenticación
const handleLogout = () => {
  userStore.logout()
  router.push('/')
}

const handleLoginSuccess = () => {
  showLoginModal.value = false
  const redirectPath = localStorage.getItem('redirectAfterLogin')
  if (redirectPath) {
    localStorage.removeItem('redirectAfterLogin')
    router.push(redirectPath)
  }
}

// NUEVO: Método para mostrar el modal (mover arriba)
const showLoginForm = () => {
  console.log('Mostrando modal de login')
  showLoginModal.value = true
}

// NUEVO: Exponer método al router
router.showLoginForm = showLoginForm


// NUEVO: Agregar este console.log para ver cuando cambia showLoginModal
watch(showLoginModal, (newValue) => {
  console.log('showLoginModal cambió a:', newValue)
})
</script>
<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 w-64 bg-primary-dark text-white overflow-y-auto">
      <!-- Logo y título del sidebar -->
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary-blue rounded-lg flex items-center justify-center">
            <span class="text-xl font-bold">AI</span>
          </div>
          <span class="text-xl font-bold">AITalent</span>
        </div>
      </div>

      <!-- Menú de navegación -->
      <nav class="mt-6">
        <!-- Postulaciones 
        <div class="px-3 py-2">
          <div @click="toggleMenu('postulaciones')" 
               class="flex items-center justify-between px-4 py-2 text-sm rounded-lg hover:bg-primary-blue cursor-pointer">
            <div class="flex items-center">
              <i class="fas fa-clipboard-list mr-3"></i>
              <span>Postulaciones</span>
            </div>
            <i class="fas fa-chevron-down" :class="{ 'transform rotate-180': openMenu === 'postulaciones' }"></i>
          </div>
          <div v-show="openMenu === 'postulaciones'" class="mt-2 ml-4 space-y-1">
            <router-link to="/postulaciones/lista" class="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-primary-blue rounded-lg">
              Lista de Postulaciones
            </router-link>
            <router-link to="/postulaciones/detalle" class="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-primary-blue rounded-lg">
              Detalle de Postulación
            </router-link>
          </div>
        </div>-->

        <!-- Entrevistas 
        <div class="px-3 py-2">
          <router-link to="/entrevistas" class="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-primary-blue">
            <i class="fas fa-file-upload mr-3"></i>
            <span>Subir Entrevistas</span>
          </router-link>
        </div>-->

        <!-- Home -->
        <div class="px-3 py-2">
          <router-link to="/" class="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-primary-blue cursor-pointer">
            <i class="fas fa-chart-bar mr-3"></i>
            <span>Home</span>
          </router-link>
        </div>

        <!-- Test API
        <div class="px-3 py-2">
          <router-link to="/test-api" class="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-primary-blue">
            <i class="fas fa-vial mr-3"></i>
            <span>Vacantes Hiring</span>
          </router-link>
        </div> -->

        <!-- Validación de CV -->
        <div class="px-3 py-2">
          <router-link to="/validacion-cv" class="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-primary-blue">
            <i class="fas fa-file-alt mr-3"></i>
            <span>Validación de CV</span>
          </router-link>
        </div>

        <!-- Base de Postulantes -->
        <div class="px-3 py-2">
          <router-link to="/app/base-postulantes" class="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-primary-blue">
            <i class="fas fa-users mr-3"></i>
            <span>Base de Postulantes</span>
          </router-link>
        </div>

        <div class="px-3 py-2">
          <router-link to="/token-usage" class="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-primary-blue">
            <i class="fas fa-chart-line mr-3"></i>
            <span>Consumo de IA</span>
          </router-link>
        </div>
      </nav>
    </aside>

    <!-- Contenido principal -->
    <div class="flex-1 ml-64 flex flex-col">
      <!-- Header -->
      <header class="fixed top-0 right-0 left-64 bg-white shadow-md h-16 z-10">
        <div class="h-full px-6 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-8 h-8 bg-primary-blue rounded-lg flex items-center justify-center text-white">
              <span class="font-bold">AI</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-primary-dark">AITalent</h1>
              <p class="text-sm text-gray-600">Inteligente, Ágil y Confiable</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">{{ userStore.user?.name || 'Sin Autenticación' }}</span>
            <img 
              class="w-8 h-8 rounded-full" 
              :src="userStore.user?.avatar || 'https://ui-avatars.com/api/?name=Sin+Autenticar'" 
              alt="Avatar"
            >
            <!-- NUEVO: Botón de logout que solo aparece si está autenticado -->
            <button 
              v-if="userStore.isAuthenticated"
              @click="handleLogout"
              class="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <!-- Contenido principal -->
      <main class="flex-1 p-6 mt-16 mb-16 overflow-y-auto">
        <slot></slot>
      </main>

      <!-- Footer -->
      <footer class="fixed bottom-0 right-0 left-64 bg-white shadow-md h-16">
        <div class="h-full px-6 flex items-center justify-between">
          <div class="text-sm text-gray-600">
            © 2025 AITalent. Todos los derechos reservados.
          </div>
          <div class="flex items-center space-x-4">
            <a href="#" class="text-gray-600 hover:text-primary-blue">Contacto</a>
            <a href="#" class="text-gray-600 hover:text-primary-blue">Política de Privacidad</a>
          </div>
          <div class="flex items-center space-x-4">
            <a href="#" class="text-gray-600 hover:text-primary-blue" title="LinkedIn">
              <i class="fab fa-linkedin text-xl"></i>
            </a>
            <a href="#" class="text-gray-600 hover:text-primary-blue" title="Twitter">
              <i class="fab fa-twitter text-xl"></i>
            </a>
            <a href="#" class="text-gray-600 hover:text-primary-blue" title="Instagram">
              <i class="fab fa-instagram text-xl"></i>
            </a>
            <a href="#" class="text-gray-600 hover:text-primary-blue" title="WhatsApp">
              <i class="fab fa-whatsapp text-xl"></i>
            </a>
            <a href="#" class="text-gray-600 hover:text-primary-blue" title="Telegram">
              <i class="fab fa-telegram text-xl"></i>
            </a>
            <a href="mailto:contacto@aitalent.com" class="text-gray-600 hover:text-primary-blue" title="Email">
              <i class="fas fa-envelope text-xl"></i>
            </a>
            <a href="tel:+1234567890" class="text-gray-600 hover:text-primary-blue" title="Teléfono">
              <i class="fas fa-phone text-xl"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  </div>

  
 <!-- MODIFICADO: Modal fuera del template -->
 <LoginModal 
    v-if="showLoginModal"
    :show="true"
    @close="handleCloseLoginModal"
    @success="handleLoginSuccess"
  />
</template>



<style>

</style> 