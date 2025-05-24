<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import axios from 'axios'

const tokens = ref([])
const loading = ref(true)
const error = ref(null)
const sortField = ref('fecha')
const sortOrder = ref('desc')
const dateFilter = ref({
  startDate: '',
  endDate: ''
})
const queryFilter = ref([])
const currentPage = ref(1)
const itemsPerPage = 10
const totalItems = ref(0)
const totalPages = ref(0)
const showQueryDropdown = ref(false)
const totalConsumido = ref(0)
const openaiBalance = ref(null)
const loadingBalance = ref(false)
const balanceUpdateInterval = ref(null)
const balanceDetails = ref(null)

// Tipos de consulta disponibles
const tiposConsulta = [
  'Busqueda Proactiva',
  'analyzeCandidate',
  'Analizar Perfil de Busqueda Proactiva',
  'Generar Cuestionario',
  'Generar Ficha de Soft',
  'Generar ficha OneSelect',
  'Ocr'
]

// Computed property para calcular el total consumido
const totalConsumidoComputed = computed(() => {
  return tokens.value.reduce((total, token) => total + parseFloat(token.costo_total), 0).toFixed(4)
})

// Función para resetear filtros
const resetFilters = () => {
  dateFilter.value = {
    startDate: '',
    endDate: ''
  }
  queryFilter.value = []
  currentPage.value = 1
  loadTokens()
}

// Función para toggle selección de tipo
const toggleQueryType = (tipo) => {
  const index = queryFilter.value.indexOf(tipo)
  if (index === -1) {
    queryFilter.value.push(tipo)
  } else {
    queryFilter.value.splice(index, 1)
  }
}

// Función para cerrar el dropdown al hacer clic fuera
const closeDropdown = (event) => {
  const dropdown = document.getElementById('queryDropdown')
  const button = document.getElementById('queryButton')
  if (dropdown && !dropdown.contains(event.target) && !button.contains(event.target)) {
    showQueryDropdown.value = false
  }
}

// Función para aplicar filtros
const applyFilters = () => {
  currentPage.value = 1 // Resetear a primera página
  loadTokens()
}

// Función para cargar datos
const loadTokens = async () => {
  try {
    loading.value = true
    console.log('Cargando tokens...')
    
    // Construir el objeto de filtros
    const params = {
      page: currentPage.value,
      limit: itemsPerPage,
      sortField: sortField.value,
      sortOrder: sortOrder.value
    }

    // Agregar filtros solo si tienen valor
    if (dateFilter.value.startDate) {
      // Asegurar que la fecha se envíe en formato YYYY-MM-DD
      params.startDate = dateFilter.value.startDate
      console.log('Fecha inicio:', params.startDate)
    }
    if (dateFilter.value.endDate) {
      // Asegurar que la fecha se envíe en formato YYYY-MM-DD
      params.endDate = dateFilter.value.endDate
      console.log('Fecha fin:', params.endDate)
    }
    if (queryFilter.value.length > 0) {
      params.query = queryFilter.value.join(',')
    }

    console.log('Parámetros de búsqueda:', params)
    
    const response = await axios.get('http://localhost:3005/api/tokens/historico', { params })
    
    console.log('Respuesta recibida:', response.data)
    tokens.value = response.data.tokens
    totalItems.value = response.data.total
    totalPages.value = response.data.totalPages
    totalConsumido.value = response.data.totalConsumido
  } catch (err) {
    console.error('Error al cargar tokens:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Función para ordenar
const handleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  loadTokens()
}

// Función para cambiar de página
const handlePageChange = (newPage) => {
  currentPage.value = newPage
  loadTokens()
}

// Computed properties para la paginación
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage + 1)
const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage, totalItems.value))

// Función para exportar a CSV
const exportarCSV = async () => {
  try {
    // Obtener todos los registros sin paginación
    const params = {
      sortField: sortField.value,
      sortOrder: sortOrder.value,
      limit: 999999 // Número muy grande para obtener todos los registros
    }

    // Agregar filtros solo si tienen valor
    if (dateFilter.value.startDate) {
      params.startDate = dateFilter.value.startDate
    }
    if (dateFilter.value.endDate) {
      params.endDate = dateFilter.value.endDate
    }
    if (queryFilter.value.length > 0) {
      params.query = queryFilter.value.join(',')
    }

    const response = await axios.get('http://localhost:3005/api/tokens/historico', { params })
    const todosLosTokens = response.data.tokens

    // Crear encabezados
    const headers = ['Fecha', 'Consulta', 'Modelo', 'Tokens Prompt', 'Tokens Respuesta', 'Tokens Total', 'Costo Input', 'Costo Output', 'Costo Total', 'Usuario']
    
    // Crear filas de datos
    const rows = todosLosTokens.map(token => [
      new Date(token.fecha).toLocaleString(),
      token.consulta,
      token.modelo,
      token.tokens_prompt,
      token.tokens_respuesta,
      token.tokens_total,
      token.costo_input,
      token.costo_output,
      token.costo_total,
      token.usuario
    ])
    
    // Combinar encabezados y filas
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `consumo_ia_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error al exportar CSV:', error)
    error.value = error.message
  }
}

// Función para actualizar datos
const actualizarDatos = () => {
  currentPage.value = 1 // Resetear a primera página
  loadTokens()
}

// Función para obtener el saldo de OpenAI
const getOpenAIBalance = async () => {
  try {
    loadingBalance.value = true
    console.log('Intentando obtener el saldo de OpenAI...')
    const response = await axios.get('http://localhost:3005/api/openai/balance')
    console.log('Respuesta del servidor:', response.data)
    if (response.data && response.data.balance) {
      openaiBalance.value = response.data.balance
      balanceDetails.value = response.data.details
    } else {
      console.error('La respuesta no contiene el balance esperado:', response.data)
      openaiBalance.value = null
      balanceDetails.value = null
    }
  } catch (error) {
    console.error('Error detallado al obtener el saldo:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    openaiBalance.value = null
    balanceDetails.value = null
  } finally {
    loadingBalance.value = false
  }
}

// Función para iniciar la actualización periódica
const startBalanceUpdates = () => {
  // Actualizar cada 5 minutos
  balanceUpdateInterval.value = setInterval(getOpenAIBalance, 5 * 60 * 1000)
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
  loadTokens()
  getOpenAIBalance()
  startBalanceUpdates()
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
  if (balanceUpdateInterval.value) {
    clearInterval(balanceUpdateInterval.value)
  }
})
</script>

<template>
  <div class="p-6 bg-white">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Consumo de IA</h1>
    
    <!-- Filtros -->
    <div class="mb-6 flex gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Fecha Inicio</label>
        <input 
          type="date" 
          v-model="dateFilter.startDate"
          class="mt-1 block w-full rounded-md border-2 border-gray-900 shadow-sm focus:border-primary-blue focus:ring focus:ring-primary-blue focus:ring-opacity-50 bg-white text-gray-900 text-sm h-10 text-center"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Fecha Fin</label>
        <input 
          type="date" 
          v-model="dateFilter.endDate"
          class="mt-1 block w-full rounded-md border-2 border-gray-900 shadow-sm focus:border-primary-blue focus:ring focus:ring-primary-blue focus:ring-opacity-50 bg-white text-gray-900 text-sm h-10 text-center"
        >
      </div>
      <div class="relative w-96">
        <label class="block text-sm font-medium text-gray-700">Tipos de Consulta</label>
        <button 
          id="queryButton"
          @click="showQueryDropdown = !showQueryDropdown"
          type="button"
          class="mt-1 w-full px-3 py-2 text-left border-2 border-gray-900 rounded-md shadow-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue flex justify-between items-center text-gray-700 text-sm h-10"
        >
          <span class="truncate">
            {{ queryFilter.length ? `${queryFilter.length} tipos seleccionados` : 'Seleccionar tipos de consulta' }}
          </span>
          <i class="fas fa-chevron-down ml-2" :class="{ 'transform rotate-180': showQueryDropdown }"></i>
        </button>
        
        <!-- Dropdown de selección múltiple -->
        <div 
          id="queryDropdown"
          v-if="showQueryDropdown"
          class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
        >
          <div class="px-3 py-2">
            <div class="mb-2 px-2 py-1 text-sm text-gray-500 border-b flex justify-between items-center">
              <span>Seleccione uno o más tipos</span>
              <button 
                v-if="queryFilter.length > 0"
                @click="queryFilter = []"
                class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
              >
                Limpiar selección
              </button>
            </div>
            <div 
              v-for="tipo in tiposConsulta" 
              :key="tipo"
              class="flex items-center px-2 py-2 hover:bg-gray-100 rounded cursor-pointer text-gray-700"
              @click="toggleQueryType(tipo)"
            >
              <input 
                type="checkbox"
                :checked="queryFilter.includes(tipo)"
                class="h-4 w-4 text-primary-blue focus:ring-primary-blue border-gray-300 rounded"
                @click.stop
              >
              <span class="ml-2">{{ tipo }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-2 mt-6">
        <button 
          @click="applyFilters"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Aplicar Filtros
        </button>
        <button 
          @click="resetFilters"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Resetear
        </button>
        <button 
          @click="exportarCSV"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Exportar CSV
        </button>
        <button 
          @click="actualizarDatos"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <i class="fas fa-sync-alt"></i>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Total Consumido -->
    <div class="mb-4 p-4 bg-gray-50 rounded-lg">
      <div class="flex justify-between items-center mb-2">
        <div class="text-2xl font-bold text-gray-800">
          Total Consumido: ${{ totalConsumido.toFixed(4) }}
        </div>
        <div class="flex space-x-2">
          <button 
            @click="handlePageChange(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-4 py-2 border rounded-lg disabled:opacity-50 text-gray-700 hover:bg-gray-100 bg-white"
          >
            Anterior
          </button>
          <button 
            @click="handlePageChange(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-4 py-2 border rounded-lg disabled:opacity-50 text-gray-700 hover:bg-gray-100 bg-white"
          >
            Siguiente
          </button>
        </div>
      </div>
      
      <div class="mt-4 p-4 bg-white rounded-lg shadow hidden">
        <div class="text-xl font-semibold text-gray-800 mb-2">
          Saldo OpenAI
        </div>
        <div v-if="loadingBalance" class="text-gray-500">
          Cargando información...
        </div>
        <div v-else-if="openaiBalance" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-sm text-gray-600">Saldo Disponible</div>
              <div class="text-lg font-semibold">${{ openaiBalance.available.toFixed(2) }}</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-sm text-gray-600">Total Usado</div>
              <div class="text-lg font-semibold">${{ openaiBalance.totalUsed.toFixed(2) }}</div>
            </div>
          </div>
          <div v-if="balanceDetails" class="text-xs text-gray-500">
            <div>Total Otorgado: ${{ openaiBalance.totalGranted.toFixed(2) }}</div>
            <div>Última actualización: {{ new Date(balanceDetails.lastUpdated).toLocaleString() }}</div>
          </div>
        </div>
        <div v-else class="text-red-500">
          No se pudo obtener el saldo. Por favor, intente nuevamente.
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th 
              v-for="header in ['Fecha', 'Consulta', 'Modelo', 'Tokens Prompt', 'Tokens Respuesta', 'Tokens Total', 'Costo Input', 'Costo Output', 'Costo Total', 'Usuario']"
              :key="header"
              @click="handleSort(header.toLowerCase())"
              class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              {{ header }}
              <span v-if="sortField === header.toLowerCase()">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="token in tokens" :key="token._id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">
              {{ new Date(token.fecha).toLocaleString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ token.consulta }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ token.modelo }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ token.tokens_prompt }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ token.tokens_respuesta }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ token.tokens_total }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">${{ token.costo_input }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">${{ token.costo_output }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">${{ token.costo_total }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ token.usuario }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div class="mt-4 flex justify-between items-center text-gray-700">
      <div class="text-sm">
        Mostrando {{ startIndex }} a {{ endIndex }} de {{ totalItems }} resultados
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos para el dropdown */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Estilo para el scrollbar del dropdown */
#queryDropdown::-webkit-scrollbar {
  width: 8px;
}

#queryDropdown::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

#queryDropdown::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

#queryDropdown::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Estilo para el ícono del calendario en inputs de fecha */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(0.5);
  cursor: pointer;
}

input[type="date"]::-webkit-calendar-picker-indicator:hover {
  filter: invert(0.3);
}
</style>