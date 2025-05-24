<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-[#111827] rounded-lg flex overflow-hidden w-[750px] relative">
      
      <!-- Botón de cerrar -->
      <button 
        @click="closeModal"
        class="absolute top-4 right-4 p-2 bg-transparent text-gray-400 hover:text-white text-2xl rounded-full"
      >
        &times;
      </button>

      <!-- Imagen del costado -->
      <div class="hidden md:block w-1/2 bg-gray-900">
        <img src="@/assets/logo.png" alt="Login Image" class="object-cover h-full w-full" />
      </div>

      <!-- Formulario -->
      <div class="w-full md:w-1/2 p-10 flex flex-col justify-center">
        <div class="mb-6">
          <div class="flex items-center mb-2">
            <img src="@/assets/logo2.png" alt="AiTalent Logo" class="h-20 mr-2" />
            <h1 class="text-2xl font-bold text-white">AiTalent</h1>
          </div>
          <h2 class="text-lg text-gray-300">Iniciar sesión en AiTalent</h2>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-4">
            <input 
              v-model="username"
              type="text"
              placeholder="Usuario o correo electrónico"
              class="w-full px-4 py-2 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
          </div>

          <div class="mb-6 relative">
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Contraseña"
              class="w-full px-4 py-2 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              required
            >
            <button 
              type="button"
              @click="togglePassword"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 bg-transparent"
            >
              <svg 
                v-if="showPassword"
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5 text-gray-400 hover:text-white transition-colors" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg 
                v-else
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5 text-gray-400 hover:text-white transition-colors" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5.52 0-10-4.48-10-10a9.94 9.94 0 012.06-6.06m2.88-2.88A10.94 10.94 0 0112 4c5.52 0 10 4.48 10 10a9.94 9.94 0 01-2.06 6.06m-2.88 2.88L3 3"/>
              </svg>
            </button>
          </div>

          <div v-if="error" class="mb-4 text-red-400 text-sm">
            {{ error }}
          </div>

          <button 
            type="submit"
            class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 rounded-md font-semibold"
            :disabled="loading"
          >
            {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-400 text-xs">© SOOFT TECHNOLOGY</span>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { hiringRoomService } from '@/services/hiringRoomService'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'success'])

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)
const userStore = useUserStore()

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function handleLogin() {
  try {
    loading.value = true
    error.value = ''
    
    const response = await hiringRoomService.authenticate({
      username: username.value,
      password: password.value,
      clientId: import.meta.env.VITE_HIRING_ROOM_CLIENT_ID,
      clientSecret: import.meta.env.VITE_HIRING_ROOM_CLIENT_SECRET
    })

    // Guardar en localStorage
    localStorage.setItem('user', JSON.stringify({
      name: username.value,
      email: username.value
    }))
    localStorage.setItem('hr_token', response.token)

    // Actualizar store
    userStore.login({
      name: username.value,
      email: username.value,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username.value)}`
    })

    emit('success')
  } catch (err) {
    error.value = 'Usuario o contraseña incorrectos'
  } finally {
    loading.value = false
  }
}

function closeModal() {
  emit('close')
}
</script>