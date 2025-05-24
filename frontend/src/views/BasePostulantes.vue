<template>
  <div class="container mx-auto px-4">
    <!-- Título y controles superiores -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-gray-800">Base de Postulantes</h1>
      <div class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
        <!-- Búsqueda existente -->
        <div class="relative flex items-center w-full md:w-auto">
          <div class="relative w-full md:w-auto">
            <input 
              type="text" 
              v-model="searchQuery"
              @input="handleSearch"
              placeholder="Buscar texto..." 
              class="w-full md:w-auto pl-10 pr-8 py-2 border-2 border-black bg-gray-100 text-black rounded-lg focus:outline-none focus:border-black"
            >
            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            <button 
              v-if="searchQuery"
              @click="() => { searchQuery = ''; handleSearch(); }"
              class="absolute right-2 top-1 text-gray-400 hover:text-gray-600 p-1"
              title="Limpiar búsqueda"
              type="button"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
          <button
            @click="showSearchHelpModal = true"
            class="ml-2 p-2 border-2 border-black bg-gray-100 text-black rounded-lg hover:bg-gray-200"
            title="Ayuda de búsqueda"
            type="button"
          >
            <i class="fas fa-question-circle"></i>
          </button>
        </div>
        
        <!-- Filtros -->
        <div class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <!-- Filtro por países -->
          <div class="relative w-full md:w-48">
            <input 
              type="text"
              v-model="selectedPais"
              @input="handlePaisInput"
              list="paisesList"
              placeholder="Buscar país..." 
              class="w-full pl-10 pr-8 py-2 border-2 border-black bg-gray-100 text-black rounded-lg focus:outline-none focus:border-black"
            >
            <i class="fas fa-globe absolute left-3 top-3 text-gray-400"></i>
            <button 
              v-if="selectedPais"
              @click="clearPaisFilter"
              class="absolute right-2 top-1 text-gray-400 hover:text-gray-600 p-1"
              title="Limpiar filtro"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
            <datalist id="paisesList">
              <option v-for="pais in paises" :key="pais" :value="pais"></option>
            </datalist>
          </div>

          <!-- Filtro por provincias -->
          <div v-if="selectedPais === 'Argentina'" class="relative w-full md:w-48">
            <input 
              type="text"
              v-model="selectedProvincia"
              @input="handleProvinciaInput"
              list="provinciasList"
              placeholder="Buscar provincia..." 
              class="w-full pl-10 pr-8 py-2 border-2 border-black bg-gray-100 text-black rounded-lg focus:outline-none focus:border-black"
            >
            <i class="fas fa-map-marker-alt absolute left-3 top-3 text-gray-400"></i>
            <button 
              v-if="selectedProvincia"
              @click="clearProvinciaFilter"
              class="absolute right-2 top-1 text-gray-400 hover:text-gray-600 p-1"
              title="Limpiar filtro"
            >
              <i class="fas fa-times"></i>
            </button>
            <datalist id="provinciasList">
              <option v-for="provincia in provincias" :key="provincia" :value="provincia"></option>
            </datalist>
          </div>
        </div>

        <!-- Filtro por etapa -->
        <div class="relative w-full md:w-auto">
          <button 
            @click="showEtapasDropdown = !showEtapasDropdown"
            class="w-full md:w-[300px] border-2 border-black bg-gray-100 text-black rounded-lg px-4 py-2 focus:outline-none focus:border-black text-left flex justify-between items-center"
          >
            <span>{{ selectedEtapa.length ? `${selectedEtapa.length} etapas seleccionadas` : 'Todas las etapas' }}</span>
            <i class="fas fa-chevron-down ml-2"></i>
          </button>
          
          <!-- Dropdown con checkboxes -->
          <div 
            v-if="showEtapasDropdown" 
            class="absolute z-10 mt-1 w-[300px] bg-white text-black border-2 border-black rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            <div class="p-2">
              <div v-if="selectedEtapa.length > 0" class="flex justify-end mb-2">
                <button @click="() => { selectedEtapa = []; handleEtapaChange(); }" class="text-xs border border-black bg-gray-100 text-black rounded px-2 py-1 hover:bg-gray-200">Limpiar selección</button>
              </div>
              <div 
                v-for="etapa in etapas" 
                :key="etapa"
                class="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
              >
                <input 
                  type="checkbox"
                  :id="etapa"
                  :value="etapa"
                  v-model="selectedEtapa"
                  @change="handleEtapaChange"
                  class="mr-2"
                >
                <label :for="etapa" class="cursor-pointer text-gray-900">{{ etapa }}</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="text-sm text-gray-500">
        Mostrando {{ startIndex }} a {{ endIndex }} de {{ totalItems }} resultados
      </div>
      <div class="flex space-x-2">
        <button 
          @click="handlePageChange(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-4 py-2 border-2 border-black bg-gray-100 text-black rounded-lg hover:bg-gray-200 disabled:opacity-10"
        >
          Anterior
        </button>
        <button 
          @click="handlePageChange(currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="px-4 py-2 border-2 border-black bg-gray-100 text-black rounded-lg hover:bg-gray-200 disabled:opacity-10"
        >
          Siguiente
        </button>
      </div>
    </div>

    <!-- Loading spinner -->
    <div v-if="loading" class="flex flex-col items-center justify-center h-64">
      <div class="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-primary-blue mb-4"></div>
      <p class="text-lg text-gray-600 font-medium">Cargando postulantes...</p>
      <p class="text-sm text-gray-500">Por favor, espere un momento</p>
    </div>

    <!-- Tabla de postulantes -->
    <div v-else class="bg-white rounded-lg shadow overflow-x-auto">
      <div class="min-w-full divide-y divide-gray-200">
        <div class="bg-gray-50">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4">
            <div v-for="column in columns" 
              :key="column.key"
              class="text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              @click="sortBy(column.key)"
            >
              {{ column.label }}
              <i 
                v-if="sortKey === column.key" 
                :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"
              ></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white divide-y divide-gray-200">
          <div v-for="postulante in postulantes" 
            :key="postulante._id"
            class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-gray-50"
          >
            <div v-for="column in columns" 
              :key="column.key"
              :class="['text-sm text-gray-500', column.class]"
            >
              <span v-if="column.getValue">{{ column.getValue(postulante) }}</span>
              <span v-else>{{ postulante[column.key] || '-' }}</span>
            </div>
            <!-- Columna de acciones -->
            <div class="flex items-center space-x-2 justify-end">
              <button 
                @click="verDetalle(postulante._id)"
                class="p-1.5 rounded-md text-primary-blue bg-white hover:bg-gray-50 focus:outline-none transition border border-gray-300 shadow-sm"
                title="Ver Detalle"
              >
                <i class="fas fa-user text-xs"></i>
              </button>
              <button 
                v-if="postulante.presentacionPostulante && postulante.presentacionPostulante.trim() !== ''"
                @click="verPresentacion(postulante.presentacionPostulante)"
                class="p-1.5 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition border border-gray-300 shadow-sm"
                title="Ver Presentación"
              >
                <i class="fas fa-align-left text-xs"></i>
              </button>
              <button 
                @click="abrirModalFicha(postulante)"
                class="p-1.5 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition border border-gray-300 shadow-sm"
                title="Ficha Curricular"
              >
                <i class="fas fa-file-signature text-xs"></i>
              </button>
              <button 
                v-if="postulante.analisisRealizados?.length > 0"
                @click="verAnalisis(postulante)"
                class="p-1.5 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition border border-gray-300 shadow-sm"
                title="Ver Análisis"
              >
                <i class="fas fa-chart-line text-xs"></i>
              </button>
              <button 
                v-if="postulante.entrevistas?.length > 0"
                @click="verEntrevista(postulante)"
                class="p-1.5 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition border border-gray-300 shadow-sm"
                title="Ver Entrevista"
              >
                <i class="fas fa-headset text-xs"></i>
              </button>
              <a
                v-if="postulante.hiringRoomId && postulante.vacanteId"
                :href="`https://sooftglobal.hiringroom.com/app/postulant/getPostulant/${postulante.hiringRoomId}/${postulante.vacanteId}`"
                target="_blank"
                class="p-1.5 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition border border-gray-300 shadow-sm"
                title="Ver en HiringRoom"
              >
                <i class="fas fa-external-link-alt text-black text-xs"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Presentación -->
  <PostulantModal 
    :show="showPresentacionModal" 
    title="Presentación del Postulante"
    @close="showPresentacionModal = false"
  >
    <div class="bg-white p-6">
      <div v-if="currentPresentacion" class="prose max-w-none">
        <p class="whitespace-pre-wrap text-gray-700 text-base leading-relaxed">
          {{ currentPresentacion }}
        </p>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-8">
        <i class="fas fa-file-alt text-4xl text-gray-400 mb-3"></i>
        <p class="text-gray-500 text-lg">No hay presentación disponible para este postulante</p>
      </div>
    </div>
  </PostulantModal>

  <!-- Modal de Análisis -->
  <PostulantModal 
    :show="showAnalisisModal" 
    title="Análisis del Postulante"
    @close="showAnalisisModal = false"
  >
    <div v-if="currentPostulante?.analisisRealizados">
      <div v-for="analisis in currentPostulante.analisisRealizados" :key="analisis.fecha" class="mb-4">
        <h4 class="font-semibold">{{ analisis.tipo }}</h4>
        <p class="text-sm text-gray-600">Fecha: {{ new Date(analisis.fecha).toLocaleDateString() }}</p>
        <p class="text-sm text-gray-600">Usuario: {{ analisis.usuario }}</p>
        <div class="mt-2">{{ analisis.resultado }}</div>
      </div>
    </div>
  </PostulantModal>

  <!-- Modal de Entrevista -->
  <PostulantModal 
    :show="showEntrevistaModal" 
    title="Entrevistas del Postulante"
    @close="showEntrevistaModal = false"
  >
    <div v-if="currentPostulante?.entrevistas">
      <div v-for="entrevista in currentPostulante.entrevistas" :key="entrevista.fecha" class="mb-4">
        <h4 class="font-semibold">{{ entrevista.tipo }}</h4>
        <p class="text-sm text-gray-600">Fecha: {{ new Date(entrevista.fecha).toLocaleDateString() }}</p>
        <p class="text-sm text-gray-600">Entrevistador: {{ entrevista.entrevistador }}</p>
        <div class="mt-2">{{ entrevista.comentarios }}</div>
      </div>
    </div>
  </PostulantModal>

  <PostulantModal
    :show="showProgresoModal"
    title="Generando Ficha Curricular"
    @close="showProgresoModal = false"
  >
    <div class="p-6">
      <div class="flex flex-col items-center justify-center">
        <div v-if="botonGenerandoFicha" class="mb-4">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-blue border-t-transparent"></div>
        </div>
        <p class="text-gray-700 text-center">{{ estadoActualProceso }}</p>
      </div>
    </div>
  </PostulantModal>

  <PostulantModal 
    :show="showFichaModal" 
    title="Seleccionar tipo de ficha"
    @close="showFichaModal = false"
  >
    <div class="flex flex-col gap-4 p-4">
      <button 
        @click="generarFichaSooft(currentPostulanteFicha)"
        class="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700">
        Ficha Sooft
      </button>

      <button 
        @click="generarFichaOneSelect(currentPostulanteFicha)"
        class="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700">
        Ficha One Select
      </button>
    </div>
  </PostulantModal>

  <!-- Modal de Ayuda de Búsqueda -->
  <PostulantModal 
    :show="showSearchHelpModal" 
    title="Ayuda de Búsqueda"
    @close="showSearchHelpModal = false"
  >
    <div class="p-6">
      <div class="space-y-4">
        <h3 class="font-semibold text-lg text-gray-900">Cómo realizar búsquedas avanzadas</h3>
        
        <div class="space-y-2">
          <h4 class="font-medium text-gray-900">Búsqueda exacta</h4>
          <p class="text-gray-800">Para buscar términos exactos, enciérralos entre comillas dobles:</p>
          <div class="bg-gray-100 p-2 rounded">
            <code class="text-gray-900">".NET" "Buenos Aires"</code>
          </div>
          <p class="text-sm text-gray-700">Esto encontrará candidatos que contengan exactamente ".NET" y "Buenos Aires"</p>
        </div>

        <div class="space-y-2">
          <h4 class="font-medium text-gray-900">Excluir términos</h4>
          <p class="text-gray-800">Para excluir términos, usa el signo menos (-) antes del término:</p>
          <div class="bg-gray-100 p-2 rounded">
            <code class="text-gray-900">Python -Java</code>
          </div>
          <p class="text-sm text-gray-700">Esto encontrará candidatos con Python pero sin Java</p>
        </div>

        <div class="space-y-2">
          <h4 class="font-medium text-gray-900">Combinar búsquedas</h4>
          <p class="text-gray-800">Puedes combinar búsquedas exactas y exclusiones:</p>
          <div class="bg-gray-100 p-2 rounded">
            <code class="text-gray-900">".NET" -Java "Buenos Aires"</code>
          </div>
          <p class="text-sm text-gray-700">Esto encontrará candidatos con ".NET" y "Buenos Aires", pero sin Java</p>
        </div>

        <div class="space-y-2">
          <h4 class="font-medium text-gray-900">Búsqueda normal</h4>
          <p class="text-gray-800">Para búsquedas simples, escribe los términos normalmente:</p>
          <div class="bg-gray-100 p-2 rounded">
            <code class="text-gray-900">Python Juarez</code>
          </div>
          <p class="text-sm text-gray-700">Esto encontrará candidatos que contengan Python o Juarez</p>
        </div>

        <div class="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 class="font-medium text-blue-900">Consejos adicionales</h4>
          <ul class="list-disc list-inside text-blue-800 space-y-1 mt-2">
            <li>La búsqueda no distingue entre mayúsculas y minúsculas</li>
            <li>Puedes buscar en nombre, apellido, email, teléfono, dirección y tags</li>
            <li>Los términos se buscan en cualquier parte del texto</li>
            <li>Puedes combinar múltiples términos y exclusiones</li>
          </ul>
        </div>
      </div>
    </div>
  </PostulantModal>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useRoute } from 'vue-router'
import PostulantModal from '../components/PostulantModal.vue'
import { hiringRoomService } from '@/services/hiringRoomService'
import { openAIService } from '@/services/openAIService'
import { analysisService } from '@/services/analysisService'

function debounce(fn, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

const current_env = () => {
  return import.meta.env.VITE_NODE_ENV
}
const BASE_URL = current_env() === 'production'
  ? "https://aitalent.sooft.tech" 
  : "http://127.0.0.1:3005";

export default {
  name: 'BasePostulantes',
  components: {
    PostulantModal
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const postulanteData = router.currentRoute.value.state?.postulanteData
    const postulantes = ref([])
    const searchQuery = ref('')
    const selectedStatus = ref('')
    const selectedEtapa = ref([])
    const currentPage = ref(1)
    const itemsPerPage = 10
    const sortKey = ref('nombre')
    const sortOrder = ref('asc')
    const loading = ref(false)
    const totalItems = ref(0)
    const botonGenerandoFicha = ref(false)
    const showProgresoModal = ref(false)
    const estadoActualProceso = ref('')
    const paises = ref([])
    const selectedPais = ref('')
    const selectedProvincia = ref('')
    const showFichaModal = ref(false)
    const currentPostulanteFicha = ref(null)
    const showSearchHelpModal = ref(false)
    const showEtapasDropdown = ref(false)
    const etapas = ref([])

    const provincias = ref([
      'Buenos Aires',
      'Capital Federal',
      'Catamarca',
      'Chaco',
      'Chubut',
      'Córdoba',
      'Corrientes',
      'Entre Ríos',
      'Formosa',
      'Jujuy',
      'La Pampa',
      'La Rioja',
      'Mendoza',
      'Misiones',
      'Neuquén',
      'Río Negro',
      'Salta',
      'San Juan',
      'San Luis',
      'Santa Cruz',
      'Santa Fe',
      'Santiago del Estero',
      'Tierra del Fuego',
      'Tucumán'
    ])

    const columns = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'apellido', label: 'Apellido' },
      { key: 'fuente', label: 'Fuente' },
      { key: 'etapa', label: 'Etapa' },
      {
        key: 'tags',
        label: 'Tags',
        getValue: (postulante) => {
          if (!Array.isArray(postulante.tags) || postulante.tags.length === 0) return '-';
          return postulante.tags
            .filter(tag => tag && tag.nombre)
            .map(tag => {
              let nombre = String(tag.nombre).trim();
              nombre = nombre.replace(/^import_\d{2}_\d{4}(\s*-)?/i, '').trim();
              return nombre.length > 0 ? (nombre.length > 60 ? nombre.substring(0, 57) + '...' : nombre) : null;
            })
            .filter(Boolean)
            .join('\n');
        },
        class: 'max-w-[200px] whitespace-pre-line text-sm'
      },
      { 
        key: 'direccion.ciudad', 
        label: 'Ciudad',
        getValue: (postulante) => postulante.direccion?.ciudad || '-'
      },
      { 
        key: 'direccion.provincia', 
        label: 'Provincia',
        getValue: (postulante) => postulante.direccion?.provincia || '-'
      },
      { 
        key: 'direccion.pais', 
        label: 'País',
        getValue: (postulante) => postulante.direccion?.pais || '-'
      },
      { key: 'telefonoFijo', label: 'Teléfono Fijo' },
      { key: 'telefonoCelular', label: 'Teléfono Celular' },
      { key: 'dni', label: 'DNI' }
    ]

    const cargarEtapas = async () => {
      try {
        const response = await axios.get('http://localhost:3005/api/postulants/etapas');
        etapas.value = response.data.etapas.filter(e => !!e);
      } catch (error) {
        console.error('Error al cargar etapas:', error);
        etapas.value = [];
      }
    };

    // Recuperar estado guardado al montar el componente
    onMounted(async () => {
      const savedState = sessionStorage.getItem('postulantsState');
      if (savedState) {
        const state = JSON.parse(savedState);
        currentPage.value = state.page;
        searchQuery.value = state.search;
        selectedPais.value = state.pais;
        selectedEtapa.value = state.etapa;
        sortKey.value = state.sort;
        sortOrder.value = state.order;
      }
      await cargarEtapas();
      await cargarPaises();
      fetchPostulantes();
      document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.etapas-dropdown')
        if (dropdown && !dropdown.contains(e.target)) {
          showEtapasDropdown.value = false
        }
      })
      // Agregar event listeners para los botones
      window.addEventListener('verDetalle', (e) => verDetalle(e.detail));
      window.addEventListener('verPresentacion', (e) => verPresentacion(e.detail));
      window.addEventListener('abrirModalFicha', (e) => abrirModalFicha(e.detail));
      window.addEventListener('verAnalisis', (e) => verAnalisis(e.detail));
      window.addEventListener('verEntrevista', (e) => verEntrevista(e.detail));
    });

    onUnmounted(() => {
      window.removeEventListener('verDetalle', (e) => verDetalle(e.detail));
      window.removeEventListener('verPresentacion', (e) => verPresentacion(e.detail));
      window.removeEventListener('abrirModalFicha', (e) => abrirModalFicha(e.detail));
      window.removeEventListener('verAnalisis', (e) => verAnalisis(e.detail));
      window.removeEventListener('verEntrevista', (e) => verEntrevista(e.detail));
    });

    const processSearchTerms = (search) => {
      const terms = [];
      const exclusions = [];
      
      // Procesar la búsqueda
      let currentTerm = '';
      let inQuotes = false;
      
      for (let i = 0; i < search.length; i++) {
        const char = search[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
          if (!inQuotes && currentTerm) {
            // Terminamos un término entre comillas
            terms.push({
              exact: true,
              value: currentTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            });
            currentTerm = '';
          }
        } else if (char === ' ' && !inQuotes) {
          // Procesar el término actual si existe
          if (currentTerm) {
            if (currentTerm.startsWith('-')) {
              // Manejar múltiples exclusiones en el mismo término
              const exclusionTerms = currentTerm.substring(1).split('-').map(t => t.trim()).filter(t => t);
              exclusions.push(...exclusionTerms.map(t => 
                t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              ));
            } else {
              terms.push({
                exact: false,
                value: currentTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              });
            }
            currentTerm = '';
          }
        } else {
          currentTerm += char;
        }
      }
      
      // Procesar el último término si existe
      if (currentTerm) {
        if (currentTerm.startsWith('-')) {
          // Manejar múltiples exclusiones en el último término
          const exclusionTerms = currentTerm.substring(1).split('-').map(t => t.trim()).filter(t => t);
          exclusions.push(...exclusionTerms.map(t => 
            t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          ));
        } else {
          terms.push({
            exact: false,
            value: currentTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          });
        }
      }

      return { terms, exclusions };
    };

    const fetchPostulantes = async () => {
      try {
        loading.value = true;
        
        // Procesar los términos de búsqueda
        const { terms, exclusions } = processSearchTerms(searchQuery.value);

        // Construir el query base
        const baseQuery = {};
        
        // Agregar filtros de status y etapa si existen
        if (selectedStatus.value) baseQuery.status = selectedStatus.value;
        if (selectedEtapa.value.length > 0) baseQuery.etapa = { $in: selectedEtapa.value };
        
        // Agregar filtros de ubicación si existen
        if (selectedPais.value) baseQuery['direccion.pais'] = selectedPais.value;
        if (selectedProvincia.value) baseQuery['direccion.provincia'] = selectedProvincia.value;

        // Si hay términos de búsqueda, crear condiciones
        if (terms.length > 0 || exclusions.length > 0) {
          const searchConditions = [];
          
          // Procesar términos de inclusión
          if (terms.length > 0) {
            const termConditions = terms.map(term => {
              const searchFields = [
                { nombre: term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { apellido: term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { email: term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { telefonoFijo: term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { telefonoCelular: term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { 'direccion.pais': term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { 'direccion.provincia': term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { 'direccion.ciudad': term.exact ? term.value : { $regex: `.*${term.value}.*`, $options: 'i' } },
                { 
                  'tags.nombre': term.exact 
                    ? term.value 
                    : { $regex: `.*${term.value}.*`, $options: 'i' }
                }
              ];
              
              return { $or: searchFields };
            });
            
            searchConditions.push({ $and: termConditions });
          }

          // Procesar exclusiones
          if (exclusions.length > 0) {
            const exclusionConditions = exclusions.map(term => ({
              $and: [
                { nombre: { $not: { $regex: term, $options: 'i' } } },
                { apellido: { $not: { $regex: term, $options: 'i' } } },
                { email: { $not: { $regex: term, $options: 'i' } } },
                { telefonoFijo: { $not: { $regex: term, $options: 'i' } } },
                { telefonoCelular: { $not: { $regex: term, $options: 'i' } } },
                { 'direccion.pais': { $not: { $regex: term, $options: 'i' } } },
                { 'direccion.provincia': { $not: { $regex: term, $options: 'i' } } },
                { 'direccion.ciudad': { $not: { $regex: term, $options: 'i' } } },
                { 
                  'tags.nombre': { 
                    $not: { 
                      $regex: `.*${term}.*`, 
                      $options: 'i' 
                    } 
                  } 
                }
              ]
            }));
            
            searchConditions.push(...exclusionConditions);
          }

          // Combinar todas las condiciones
          baseQuery.$and = searchConditions;
        }

        const response = await axios.get('http://localhost:3005/api/postulants', {
          params: {
            page: currentPage.value,
            limit: itemsPerPage,
            query: JSON.stringify(baseQuery),
            sort: sortKey.value,
            order: sortOrder.value
          }
        });

        postulantes.value = response.data.postulantes;
        totalItems.value = response.data.total;
        totalPages.value = response.data.totalPages;

        // Guardar estado
        sessionStorage.setItem('postulantsState', JSON.stringify({
          page: currentPage.value,
          search: searchQuery.value,
          pais: selectedPais.value,
          provincia: selectedProvincia.value,
          etapa: selectedEtapa.value,
          sort: sortKey.value,
          order: sortOrder.value
        }));

      } catch (error) {
        console.error('Error al cargar postulantes:', error);
        postulantes.value = [];
        totalItems.value = 0;
      } finally {
        loading.value = false;
      }
    };

    const cargarPaises = async () => {
      try {
        const response = await axios.get('https://restcountries.com/v3.1/all');
        paises.value = [...new Set(
          response.data
            .map(country => country.translations?.spa?.common || country.name.common)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'))
        )];
      } catch (error) {
        console.error('Error al cargar países:', error);
        paises.value = [];
      }
    };

    const handlePaisInput = debounce(() => {
      currentPage.value = 1
      fetchPostulantes()
    }, 300)

    // Función para limpiar el filtro pais
    const clearPaisFilter = () => {
      selectedPais.value = ''
      selectedProvincia.value = ''
      currentPage.value = 1
      fetchPostulantes()
    }

    const handleProvinciaInput = debounce(() => {
      currentPage.value = 1
      fetchPostulantes()
    }, 300)

    // Limpiar filtro de provincia
    const clearProvinciaFilter = () => {
      selectedProvincia.value = ''
      currentPage.value = 1
      fetchPostulantes()
    }

    const handleSearch = debounce(() => {
      currentPage.value = 1
      fetchPostulantes()
    }, 300)

    const handleStatusChange = () => {
      currentPage.value = 1
      fetchPostulantes()
    }

    const handleEtapaChange = () => {
      currentPage.value = 1
      fetchPostulantes()
    }

    const handlePageChange = (newPage) => {
      currentPage.value = newPage
      fetchPostulantes()
    }

    const sortBy = (key) => {
      if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortKey.value = key
        sortOrder.value = 'asc'
      }
      fetchPostulantes()
    }

    const verDetalle = async (postulanteId) => {
      try {
        const response = await axios.get(`${BASE_URL}/api/postulants/${postulanteId}`);
        const postulante = response.data;
        
        // Navegar a la ruta y pasar los datos como state
        router.push({
          path: `/app/base-postulantes/${postulanteId}`,
          state: { postulanteData: postulante }  // Pasamos los datos en el state
        });
        
      } catch (error) {
        console.error('Error al obtener detalles del postulante:', error);
        alert('No se encontró el postulante');
      }
    }

    // Computed properties para la paginación
    const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage + 1)
    const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage, totalItems.value))
    const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

    const showPresentacionModal = ref(false)
    const currentPresentacion = ref('')
    const showAnalisisModal = ref(false)
    const showEntrevistaModal = ref(false)
    const currentPostulante = ref(null)

    const verPresentacion = (presentacion) => {
      if (!presentacion || presentacion.trim() === '') {
        currentPresentacion.value = null
      } else {
        currentPresentacion.value = presentacion
      }
      showPresentacionModal.value = true
    }

    const verAnalisis = async (postulante) => {
      currentPostulante.value = postulante
      if (postulante.analisisRealizados?.length > 0) {
        showAnalisisModal.value = true
      } else {
        alert('No hay análisis disponibles para este postulante')
      }
    }

    const verEntrevista = async (postulante) => {
      currentPostulante.value = postulante
      if (postulante.entrevistas?.length > 0) {
        showEntrevistaModal.value = true
      } else {
        alert('No hay entrevistas disponibles para este postulante')
      }
    }

    const agregarFichaCurricular = async (postulante) => {
      try {
        botonGenerandoFicha.value = true;
        showProgresoModal.value = true;
        estadoActualProceso.value = 'Iniciando generación de Ficha Curricular...';

        // Verificar que tenemos los datos necesarios
        if (!postulante.hiringRoomId) {
          throw new Error('No se encontró el ID del postulante');
        }

        // Obtener detalles del postulante de HiringRoom
        const details = await hiringRoomService.getPostulantDetails(postulante.hiringRoomId);
        console.log('Detalles del postulante:', details);
        console.log('Archivos disponibles:', details.archivos);

        // Intentar obtener análisis previo solo si tenemos los IDs necesarios
        let analisisPostulante = null;
        if (postulante.vacanteId && postulante.id) {
          try {
            const analysis = await analysisService.getAnalysis(
              postulante.vacanteId,
              postulante.id
            );
            
            console.log('Análisis obtenido:', analysis);
            
            // También verificar en localStorage
            const analysisKey = `analysis_${postulante.vacanteId}_${postulante.id}`;
            const analysisData = localStorage.getItem(analysisKey);
            
            analisisPostulante = analysis || (analysisData ? JSON.parse(analysisData) : null);
            console.log('Análisis final a usar:', analisisPostulante);
          } catch (error) {
            console.log('Error al obtener análisis previo:', error);
          }
        }

        estadoActualProceso.value = 'Generando Ficha Curricular. Espere por favor...';

        // Preparar datos para la generación con mejor manejo de datos nulos
        const requestData = {
          postulantInfo: {
            id: details.id || postulante.id,
            nombre: (details.nombre || postulante.nombre || '').trim(),
            apellido: (details.apellido || postulante.apellido || '').trim(),
            email: (details.email || postulante.email || '').trim(),
            fechaNacimiento: details.fechaNacimiento || null,
            telefonoFijo: details.telefonoFijo || '',
            telefonoCelular: details.telefonoCelular || '',
            dni: details.dni || null,
            cuil: details.cuil || '',
            genero: details.genero || null,
            fotoPerfil: details.fotoPerfil || null,
            presentacionPostulante: details.presentacionPostulante || '',
            redesSociales: {
              linkedin: details.redesSociales?.linkedin || '',
              facebook: details.redesSociales?.facebook || '',
              twitter: details.redesSociales?.twitter || '',
              googlePlus: details.redesSociales?.googlePlus || false,
              skype: details.redesSociales?.skype || '',
              website: details.redesSociales?.website || ''
            },
            direccion: {
              pais: details.direccion?.pais || null,
              provincia: details.direccion?.provincia || null,
              ciudad: details.direccion?.ciudad || null,
              direccion: details.direccion?.direccion || null,
              paisId: details.direccion?.paisId || null,
              provinciaId: details.direccion?.provinciaId || null,
              ciudadId: details.direccion?.ciudadId || null
            },
            nacionalidad: details.nacionalidad || null,
            experienciasLaborales: (details.experienciasLaborales || []).map(exp => ({
              empresa: exp.empresa || '',
              puesto: exp.puesto || '',
              mesDesde: exp.mesDesde || null,
              añoDesde: exp.añoDesde || null,
              mesHasta: exp.mesHasta || null,
              añoHasta: exp.añoHasta || null,
              trabajoActual: exp.trabajoActual || false,
              pais: exp.pais || null,
              area: exp.area || null,
              subArea: exp.subArea || null,
              industria: exp.industria || null,
              seniority: exp.seniority || null,
              descripcion: exp.descripcion || ''
            })),
            estudios: (details.estudios || []).map(est => ({
              institucion: est.institucion || '',
              titulo: est.titulo || '',
              mesDesde: est.mesDesde || null,
              añoDesde: est.añoDesde || null,
              mesHasta: est.mesHasta || null,
              añoHasta: est.añoHasta || null,
              enCurso: est.enCurso || false,
              descripcion: est.descripcion || ''
            }))
          },
          archivos: details.archivos || [],
          analisis: analisisPostulante,
          templatePath: "files/Template CV sooft.docx",
          sinCV: !details.archivos || details.archivos.length === 0
        };

        // Log detallado de los datos que se enviarán
        console.log('=== DATOS COMPLETOS A ENVIAR ===');
        console.log(JSON.stringify(requestData, null, 2));

        try {
          const response = await openAIService.generateCurriculumFicha(
            requestData.postulantInfo,
            requestData.archivos,
            requestData.analisis,
            requestData.sinCV
          );

          if (!response) {
            throw new Error('La respuesta del servicio está vacía');
          }

          // Crear y descargar el archivo DOCX
          const blob = new Blob([response], { 
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Ficha_Curricular_${postulante.nombre}_${postulante.apellido}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          estadoActualProceso.value = '✅ Ficha Curricular lista para revisar. Gracias por esperar';
          setTimeout(() => {
            showProgresoModal.value = false;
          }, 2000);

        } catch (error) {
          console.error('Error en la generación del documento:', error);
          if (error.response) {
            console.error('Detalles del error:', {
              status: error.response.status,
              data: error.response.data,
              headers: error.response.headers
            });
          }
          throw new Error(`Error al generar el documento: ${error.message}`);
        }

      } catch (error) {
        console.error('Error completo generando ficha curricular:', error);
        console.error('Stack trace:', error.stack);
        estadoActualProceso.value = `❌ Error: ${error.message}`;
      } finally {
        botonGenerandoFicha.value = false;
      }
    }

    const abrirModalFicha = (postulante) => {
      currentPostulanteFicha.value = postulante
      showFichaModal.value = true
    }

    const generarFichaSooft = async (postulante) => {
      showFichaModal.value = false
      try {
        botonGenerandoFicha.value = true
        showProgresoModal.value = true
        estadoActualProceso.value = 'Iniciando generación de Ficha Sooft...'
        
        // Aquí va tu lógica actual de agregarFichaCurricular
        await agregarFichaCurricular(postulante)
      } catch (error) {
        console.error('Error generando ficha Sooft:', error)
        estadoActualProceso.value = `❌ Error: ${error.message}`
      } finally {
        botonGenerandoFicha.value = false
      }
    }

    const generarFichaOneSelect = async (postulante) => {
      showFichaModal.value = false
      try {
        await agregarFichaCurricularOneSelect(postulante)
      } catch (error) {
        console.error('Error generando ficha One Select:', error)
        estadoActualProceso.value = `❌ Error: ${error.message}`
      }
    } 

    const agregarFichaCurricularOneSelect = async (postulante) => {
      try {
        botonGenerandoFicha.value = true;
        showProgresoModal.value = true;
        estadoActualProceso.value = 'Iniciando generación de Ficha One Select...';

        // Verificar que tenemos los datos necesarios
        if (!postulante.hiringRoomId) {
          throw new Error('No se encontró el ID del postulante');
        }

        // Obtener detalles del postulante de HiringRoom
        const details = await hiringRoomService.getPostulantDetails(postulante.hiringRoomId);
        console.log('Detalles del postulante:', details);

        // Intentar obtener análisis previo solo si tenemos los IDs necesarios
        let analisisPostulante = null;
        if (postulante.vacanteId && postulante.id) {
          try {
            const analysis = await analysisService.getAnalysis(
              postulante.vacanteId,
              postulante.id
            );
            
            console.log('Análisis obtenido:', analysis);
            
            // También verificar en localStorage
            const analysisKey = `analysis_${postulante.vacanteId}_${postulante.id}`;
            const analysisData = localStorage.getItem(analysisKey);
            
            analisisPostulante = analysis || (analysisData ? JSON.parse(analysisData) : null);
            console.log('Análisis final a usar:', analisisPostulante);
          } catch (error) {
            console.log('Error al obtener análisis previo:', error);
          }
        }

        estadoActualProceso.value = 'Generando Ficha One Select. Espere por favor...';

        // Preparar datos para la generación
        const requestData = {
          postulantInfo: {
            id: details.id || postulante.id,
            nombre: (details.nombre || postulante.nombre || '').trim(),
            apellido: (details.apellido || postulante.apellido || '').trim(),
            email: (details.email || postulante.email || '').trim(),
            fechaNacimiento: details.fechaNacimiento || null,
            telefonoFijo: details.telefonoFijo || '',
            telefonoCelular: details.telefonoCelular || '',
            dni: details.dni || null,
            cuil: details.cuil || '',
            genero: details.genero || null,
            fotoPerfil: details.fotoPerfil || null,
            presentacionPostulante: details.presentacionPostulante || '',
            redesSociales: {
              linkedin: details.redesSociales?.linkedin || '',
              facebook: details.redesSociales?.facebook || '',
              twitter: details.redesSociales?.twitter || '',
              googlePlus: details.redesSociales?.googlePlus || false,
              skype: details.redesSociales?.skype || '',
              website: details.redesSociales?.website || ''
            },
            direccion: {
              pais: details.direccion?.pais || null,
              provincia: details.direccion?.provincia || null,
              ciudad: details.direccion?.ciudad || null,
              direccion: details.direccion?.direccion || null,
              paisId: details.direccion?.paisId || null,
              provinciaId: details.direccion?.provinciaId || null,
              ciudadId: details.direccion?.ciudadId || null
            },
            nacionalidad: details.nacionalidad || null,
            experienciasLaborales: (details.experienciasLaborales || []).map(exp => ({
              empresa: exp.empresa || '',
              puesto: exp.puesto || '',
              mesDesde: exp.mesDesde || null,
              añoDesde: exp.añoDesde || null,
              mesHasta: exp.mesHasta || null,
              añoHasta: exp.añoHasta || null,
              trabajoActual: exp.trabajoActual || false,
              pais: exp.pais || null,
              area: exp.area || null,
              subArea: exp.subArea || null,
              industria: exp.industria || null,
              seniority: exp.seniority || null,
              descripcion: exp.descripcion || ''
            })),
            estudios: (details.estudios || []).map(est => ({
              institucion: est.institucion || '',
              titulo: est.titulo || '',
              mesDesde: est.mesDesde || null,
              añoDesde: est.añoDesde || null,
              mesHasta: est.mesHasta || null,
              añoHasta: est.añoHasta || null,
              enCurso: est.enCurso || false,
              descripcion: est.descripcion || ''
            }))
          },
          archivos: details.archivos || [],
          analisis: analisisPostulante,
          templatePath: "files/Template CV oneSelect.docx",
          sinCV: !details.archivos || details.archivos.length === 0
        };

        // Log detallado de los datos que se enviarán
        console.log('=== DATOS COMPLETOS A ENVIAR (One Select) ===');
        console.log(JSON.stringify(requestData, null, 2));

        try {
          const response = await openAIService.generateCurriculumFichaOneSelect(
            requestData.postulantInfo,
            requestData.archivos,
            requestData.analisis,
            requestData.sinCV
          );

          if (!response) {
            throw new Error('La respuesta del servicio está vacía');
          }

          // Crear y descargar el archivo DOCX
          const blob = new Blob([response], { 
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Ficha_Curricular_OneSelect_${postulante.nombre}_${postulante.apellido}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          estadoActualProceso.value = '✅ Ficha One Select lista para revisar. Gracias por esperar';
          setTimeout(() => {
            showProgresoModal.value = false;
          }, 2000);

        } catch (error) {
          console.error('Error en la generación del documento One Select:', error);
          if (error.response) {
            console.error('Detalles del error:', {
              status: error.response.status,
              data: error.response.data,
              headers: error.response.headers
            });
          }
          throw new Error(`Error al generar el documento One Select: ${error.message}`);
        }

      } catch (error) {
        console.error('Error completo generando ficha One Select:', error);
        console.error('Stack trace:', error.stack);
        estadoActualProceso.value = `❌ Error: ${error.message}`;
      } finally {
        botonGenerandoFicha.value = false;
      }
    };

    return {
      postulantes,
      searchQuery,
      selectedStatus,
      selectedEtapa,
      etapas,
      currentPage,
      columns,
      startIndex,
      endIndex,
      totalPages,
      totalItems,
      sortKey,
      sortOrder,
      loading,
      handleSearch,
      handleStatusChange,
      handleEtapaChange,
      handlePageChange,
      sortBy,
      verDetalle,
      showPresentacionModal,
      currentPresentacion,
      showAnalisisModal,
      showEntrevistaModal,
      currentPostulante,
      verPresentacion,
      verAnalisis,
      verEntrevista,
      agregarFichaCurricular,
      botonGenerandoFicha,
      showProgresoModal,
      estadoActualProceso,
      paises,
      selectedPais,
      handlePaisInput,
      clearPaisFilter,
      selectedProvincia,
      provincias,
      handleProvinciaInput,
      clearProvinciaFilter,
      showFichaModal,
      currentPostulanteFicha,
      abrirModalFicha,
      generarFichaSooft,
      generarFichaOneSelect,
      agregarFichaCurricularOneSelect,
      showSearchHelpModal,
      showEtapasDropdown,
    }
  }
}
</script>

<style scoped>
table {
  min-width: max-content;
}

.sticky {
  position: sticky;
  z-index: 1;
}

.sticky.right-0::after {
  content: '';
  position: absolute;
  top: 0;
  right: 100%;
  height: 100%;
  width: 8px;
  background: linear-gradient(to right, transparent, rgba(0,0,0,0.05));
  pointer-events: none;
}

input[list]::-webkit-calendar-picker-indicator {
  opacity: 0;
}

.datalist-input-container {
  position: relative;
  width: 200px;
}

/* Nuevos estilos responsivos */
@media (max-width: 768px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .grid-cols-12 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .grid-cols-12 > div {
    padding: 0.5rem;
  }

  .grid-cols-12 > div:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }

  .grid-cols-12 > div:first-child {
    font-weight: 600;
    background-color: #f9fafb;
  }
}

/* Mejoras para la tabla en móvil */
@media (max-width: 768px) {
  .overflow-x-auto {
    -webkit-overflow-scrolling: touch;
  }

  .grid-cols-12 > div {
    white-space: normal;
    word-break: break-word;
  }
}

/* Mejoras para los botones de acción */
@media (max-width: 768px) {
  .flex-wrap {
    justify-content: flex-start;
    gap: 0.25rem;
  }

  .group button {
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
  }

  /* Ajustes para la tabla en móvil */
  .grid-cols-12 > div {
    padding: 0.5rem;
  }

  /* Ajustes para los botones en móvil */
  button {
    min-width: 2rem;
    min-height: 2rem;
  }

  /* Ajustes para el texto en móvil */
  .text-sm {
    font-size: 0.875rem;
  }
}

/* Mejoras generales para los botones */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

button:active {
  transform: translateY(0);
}

/* Estilos para los enlaces */
a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style> 