<script>
import { hiringRoomService } from '@/services/hiringRoomService';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { openAIService } from '@/services/openAIService';
import { hiringRoomConfig } from '@/config/hiringRoom';
import { searchHistoryService } from '@/services/searchHistoryService';
import { analysisService } from '@/services/analysisService';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import axios from 'axios';

const current_env = () => {
  return import.meta.env.VITE_NODE_ENV
}

const BASE_URL = current_env() === 'production'
  ? "https://aitalent.sooft.tech"
  : "http://127.0.0.1:3005";

export default {
  name: 'ValidacionCV',
  components: {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot
  },
  
  data() {
  return {
    perfilBuscado: '',
    botonGenerandoFicha: false,
    botonGenerandoFichaOS: false,
    requisitosExtraidos: [],
    procesandoPerfil: false,
    buscandoCandidatos: false,
    showProgresoModal: false,
    estadoActualProceso: '',
    progresoPostulantes: 0,
    procesoBusquedaCompleto: false,
    cancelando: false,
    showAnalysisModalFlag: false,
    selectedAnalysis: null,
    showInstrucciones: true,
    showPerfilInput: true,
    showRequisitos: true,
    showRequisitosModal: false,
    requisitosSeleccionados: null,
    showResultadosBPModal: false,
    resultadosBPSeleccionados: null,
    expandedMatches: [],
    showPostulanteBPModal: false,
    postulanteBPSeleccionado: null,
    showPostulantModal1: false,
    selectedPostulant1: null,
    exportingExcel: false,
    downloadingAllCVs: false
  };
},
  
computed: {
  tieneUbicacion() {
    const ubicacion = this.requisitosExtraidos?.ubicacion;
    return ubicacion && (
      ubicacion.pais !== 'No especificado' ||
      ubicacion.provincia !== 'No especificado' ||
      ubicacion.ciudad !== 'No especificado'
    );
  },

  requisitosFormateados() {
    if (!this.requisitosSeleccionados?.requisitos) return [];
    return this.requisitosSeleccionados.requisitos
      .split('.')
      .map(req => req.trim())
      .filter(req => req.length > 0);
  },

  puedeRealizarBusqueda() {
    return this.requisitosExtraidos && 
           Object.keys(this.requisitosExtraidos).length > 0 && 
           !this.buscandoCandidatos;
  }
},

  methods: {

limpiarBusqueda() {
    this.procesandoPerfil = false;
    this.buscandoCandidatos = false;
    this.perfilBuscado = '';
    this.showInstrucciones = true;
    this.showPerfilInput = true; 
    this.requisitosExtraidos = {};  // Cambiamos null por un objeto vacío
    
    // Limpiar el input de archivo
    if (this.$refs.fileInput) {
      this.$refs.fileInput.value = '';
    }
},


toggleInstrucciones() {
  this.showInstrucciones = !this.showInstrucciones;
},


togglePerfilInput() {
    this.showPerfilInput = !this.showPerfilInput;
},


expandTextarea() {
if (this.$refs.perfilTextarea) {
  this.$refs.perfilTextarea.style.height = '32rem';
}
},

compactTextarea() {
if (this.$refs.perfilTextarea) {
  this.$refs.perfilTextarea.style.height = '12rem';
}
},

toggleRequisitos() {
  this.showRequisitos = !this.showRequisitos;
},

cerrarModalProgreso() {
console.log('Estado actual antes de cerrar:', {
    showProgresoModal: this.showProgresoModal,
    estadoActualProceso: this.estadoActualProceso,
    procesoBusquedaCompleto: this.procesoBusquedaCompleto,
    cancelando: this.cancelando
});




// Si estamos generando ficha curricular
if (this.estadoActualProceso.includes('Ficha Curricular')) {
    this.showProgresoModal = false;
    // Limpiar estados específicos de la ficha
    this.downloading = false;
    this.downloadProgress = 0;
    this.estadoActualProceso = '';
    console.log('Cerrando modal de Ficha Curricular');
    return;
}

// Si estamos buscando candidatos
if (this.procesoBusquedaCompleto || this.cancelando) {
    this.showProgresoModal = false;
    this.showResultadosModal = false;
    // Limpiar estados de búsqueda
    this.buscandoCandidatos = false;
    this.estadoActualProceso = '';
    console.log('Cerrando modal de búsqueda y mostrando resultados');
} else {
    if (confirm('¿Está seguro que desea cancelar el proceso?')) {
        this.cancelarBusqueda();
        console.log('Proceso cancelado por usuario');
    }
}
console.log('Estado después de cerrar:', {
    showProgresoModal: this.showProgresoModal,
    showResultadosModal: this.showResultadosModal
});
},

closeAnalysisModal() {
    this.showAnalysisModalFlag = false;
    this.selectedAnalysis = null;
},


getScoreWeight(key) {
    const weights = {
        technical: '40%',
        experience: '25%',
        education: '15%',
        years: '10%',
        location: '5%',
        tags: '5%'
    };
    return weights[key] || '';
},


closeRequisitosModal() {
    console.log('Cerrando modal');
    this.showRequisitosModal = false;
    this.requisitosSeleccionados = null;
},


    closePostulantModal1() {
      this.showPostulantModal1 = false;
      this.selectedPostulant1 = null;
    },


    safeJSONParse(data, fallback = []) {
      if (!data) return fallback;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          return fallback;
        }
      }
      return data;
    },


    getSocialIcon(red) {
    const icons = {
      linkedin: 'fab fa-linkedin',
      twitter: 'fab fa-twitter',
      facebook: 'fab fa-facebook',
      instagram: 'fab fa-instagram',
      github: 'fab fa-github',
      default: 'fas fa-globe'
    };
    return icons[red.toLowerCase()] || icons.default;
  },

  formatPeriod(exp) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const desde = `${months[parseInt(exp.mesDesde) - 1]} ${exp.añoDesde}`;
  
  if (exp.trabajoActual) {
    return `${desde} - Actual`;
  }
  
  return `${desde} - ${months[parseInt(exp.mesHasta) - 1]} ${exp.añoHasta}`;
},

formatEducationPeriod(edu) {
  if (edu.estudioActual) {
    return `${edu.añoDesde} - Actual`;
  }
  return `${edu.añoDesde} - ${edu.añoHasta}`;
},


formatDate(dateStr) {
  const [day, month, year] = dateStr.split('-');
  return `${day}/${month}/${year}`;
},

    exportBPMatchesToExcel() {
    this.exportingExcel = true;
    try {
      if (!this.resultadosBPSeleccionados?.matches?.length) {
        alert('No hay postulantes para exportar.');
        return;
      }
      const data = this.resultadosBPSeleccionados.matches.map(m => {
        const p = m.postulantInfo;
        return {
          'Nombre': p.nombre || '',
          'Apellido': p.apellido || '',
          'Email': p.email || '',
          'Teléfono Fijo': p.telefonoFijo || '',
          'Teléfono Celular': p.telefonoCelular || '',
          'País': p.direccion?.pais || '',
          'Provincia': p.direccion?.provincia || '',
          'Ciudad': p.direccion?.ciudad || '',
          'Fecha Postulación': p.fechaPostulacion || '',
          'Etapa': p.etapa || '',
          'Fuente': p.fuente || '',
          'Salario Pretendido': p.salarioPretendido ? `$${p.salarioPretendido.toLocaleString('es-AR')}` : '',
          'Estado': p.rechazado === 'no' ? 'Activo' : 'Rechazado',
          'Presentación': p.presentacionPostulante || '',
          'Experiencia Laboral': p.experienciasLaborales || '',
          'Estudios': p.estudios || '',
          'Tags': p.tags ? p.tags.join(', ') : ''
        }
      });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Postulantes');
        const fileName = `BP_Postulantes_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (error) {
        console.error('Error exportando a Excel:', error);
        alert('Error al exportar a Excel');
      } finally {
        this.exportingExcel = false;
      }
    },


toggleMatch(index) {
if (this.expandedMatches.includes(index)) {
  this.expandedMatches = this.expandedMatches.filter(i => i !== index);
} else {
  this.expandedMatches.push(index);
}
},


verPostulanteBP(postulante) {
console.log("1. Abriendo modal de postulante:", postulante);
console.log("2. Estado previo:", this.showPostulanteBPModal);
this.postulanteBPSeleccionado = postulante;
this.showPostulanteBPModal = true;
console.log("3. Estado posterior:", this.showPostulanteBPModal);
console.log("4. Datos del postulante guardados:", this.postulanteBPSeleccionado);
},


closeResultadosBPModal() {
console.log('Cerrando modal de resultados BP');
this.showResultadosBPModal = false;
this.resultadosBPSeleccionados = null;
this.expandedMatches = [];
},

closePostulanteBPModal() {
this.showPostulanteBPModal = false;
this.postulanteBPSeleccionado = null;
},

async analizarPerfil() {
  try {
    this.procesandoPerfil = true;
    const resultado = await openAIService.analizarPerfil(this.perfilBuscado);
    this.requisitosExtraidos = resultado;
    this.showInstrucciones = false;
    this.showPerfilInput = false;
    this.showRequisitos = true;
  } catch (error) {
    console.error('Error al analizar perfil:', error);
    alert('Error al analizar el perfil. Por favor, intente nuevamente.');
  } finally {
    this.procesandoPerfil = false;
  }
},

async buscarCandidatos() {
  try {
    this.buscandoCandidatos = true;
    this.showProgresoModal = true;
    this.estadoActualProceso = 'Iniciando búsqueda de candidatos...';
    this.progresoPostulantes = 0;

    const resultado = await openAIService.buscarCandidatos(this.requisitosExtraidos);
    
    this.resultadosBPSeleccionados = resultado;
    this.showResultadosBPModal = true;
    this.procesoBusquedaCompleto = true;
    this.estadoActualProceso = 'Búsqueda completada';
    this.progresoPostulantes = 100;
  } catch (error) {
    console.error('Error al buscar candidatos:', error);
    alert('Error al buscar candidatos. Por favor, intente nuevamente.');
  } finally {
    this.buscandoCandidatos = false;
  }
},

}}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
      <div class="p-4 border-b">
        
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-900">
            Búsqueda Proactiva de candidatos según Perfil
          </h3>
          <div class="flex items-center gap-4">
            <!-- Botones de acción -->
            <button
              @click="analizarPerfil"
              :disabled="!perfilBuscado || procesandoPerfil"
              class="px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!procesandoPerfil">Analizar Perfil - Paso 2</span>
              <span v-else class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            </button>

            <button
              @click="buscarCandidatos"
              :disabled="!puedeRealizarBusqueda"
              class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!buscandoCandidatos">Buscar Candidatos - Paso 3</span>
              <span v-else>Buscando... {{progresoPostulantes.toFixed(2)}}%</span>
            </button>

            <button
              @click="limpiarBusqueda"
              class="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Limpiar Descripción del Perfil
            </button>

            <input
              type="file"
              ref="fileInput"
              @change="handleFileUpload"
              accept=".txt,.doc,.docx,.pdf"
              class="hidden"
            >
            
            <button
              @click="$refs.fileInput.click()"
              class="px-3 py-1.5 bg-green-700 text-white text-sm rounded hover:bg-green-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
            >
              Cargar archivo con Descripción del Perfil
            </button>

        
          </div>
          </div>
        </div>
    
    <!-- Contenido del modal con scroll -->
    <div class="flex-1 p-6 overflow-y-auto">
      <!-- Información de uso -->
      <div class="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div class="flex items-center justify-between cursor-pointer" @click="toggleInstrucciones">
              <h3 class="text-blue-800 font-medium">¿Cómo funciona la búsqueda proactiva?</h3>
              <svg 
                class="w-5 h-5 text-blue-800 transform transition-transform duration-200"
                :class="{ 'rotate-180': showInstrucciones }"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>

        <div  v-show="showInstrucciones" class="text-blue-700 text-sm space-y-2 mt-2 transition-all duration-200">
          <p class="flex items-start">
            <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs mr-2 flex-shrink-0">1</span>
            <span>Ingrese la descripción del perfil que busca. Puede escribirla directamente o cargar un archivo con los requisitos.</span>
          </p>
          <p class="flex items-start">
            <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs mr-2 flex-shrink-0">2</span>
            <span>Presione "Analizar Perfil" para que nuestro sistema identifique automáticamente los requisitos clave.</span>
          </p>
          <p class="flex items-start">
            <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs mr-2 flex-shrink-0">3</span>
            <span>Revise los requisitos identificados y, si está conforme, presione "Buscar Candidatos" para encontrar perfiles que coincidan.</span>
          </p>
        </div>
      </div>

      <!-- Área de entrada de texto -->
      <div class="mb-6">
        <!-- Título clickeable con botón -->
        <div 
          class="flex items-center justify-between cursor-pointer bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors" 
          @click="togglePerfilInput"
          style="cursor: pointer;"
        >
          <label class="text-sm font-medium text-gray-700 select-none">
            Descripción del Perfil Buscado - Paso 1
          </label>
          <svg 
            class="w-5 h-5 text-gray-500 transform transition-transform duration-200"
            :class="{ 'rotate-180': !showPerfilInput }"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            style="min-width: 1.25rem;"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>

        <!-- Textarea colapsable -->
        <transition
          enter-active-class="transition-all duration-300 ease-in-out"
          leave-active-class="transition-all duration-300 ease-in-out"
        >
          <div 
            v-show="showPerfilInput"
            class="mt-2"
          >
          <div class="relative">
            <textarea
            ref="perfilTextarea"  
              v-model="perfilBuscado"
              @paste="handlePaste"
              class="w-full h-48 p-3 border rounded-lg bg-gray-50 text-gray-900 text-sm focus:ring-orange-500 focus:border-orange-500 resize min-h-[12rem] max-h-[32rem]"
              placeholder="Pegue o escriba aquí la descripción completa del perfil buscado..."
            ></textarea>
            
  <!-- Controles de tamaño -->
  <div class="absolute bottom-2 right-2 flex gap-2">
    <button 
      @click="expandTextarea"
      class="p-1 text-gray-500 hover:text-gray-700 bg-white rounded border"
      title="Expandir"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/>
      </svg>
    </button>
    <button 
      @click="compactTextarea"
      class="p-1 text-gray-500 hover:text-gray-700 bg-white rounded border"
      title="Compactar"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
      </svg>
    </button>
  </div>
</div>
          </div>
        </transition>
      </div>

      <!-- Área de requisitos extraídos -->
      <div v-if="requisitosExtraidos && Object.keys(requisitosExtraidos).length > 0" class="mb-6 flex flex-col h-[50vh]">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-semibold text-gray-800">Requisitos Identificados:</h4>
                <button 
                  @click="toggleRequisitos"
                  class="text-gray-500 hover:text-gray-700 p-2"
                >
                  <i class="fas" :class="showRequisitos ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
           </div>
           <div v-show="showRequisitos" class="bg-gray-50 p-6 rounded-lg flex-1 overflow-y-auto transition-all duration-300">
  <!-- Grid principal de 3 columnas -->
  <div class="grid grid-cols-3 gap-6">
    
    <!-- Columna 1: Información Principal y Descripciones -->
    <div class="space-y-6">
      <!-- Información Principal -->
      <div class="bg-white p-4 rounded-lg shadow-sm">
        <h5 class="font-medium text-gray-900 mb-4 flex items-center">
          <i class="fas fa-briefcase text-blue-500 mr-2"></i>
          Información Principal
        </h5>
        <div class="space-y-3">
          <div>
            <span class="block text-sm font-medium text-blue-600">Título</span>
            <span class="text-gray-700">{{requisitosExtraidos.titulo}}</span>
          </div>
          <div>
            <span class="block text-sm font-medium text-blue-600">Área</span>
            <span class="text-gray-700">{{requisitosExtraidos.area || requisitosExtraidos.areaTrabajo}}</span>
          </div>
        </div>
      </div>

        <!-- Ubicación - NUEVO -->
        <div class="bg-white p-4 rounded-lg shadow-sm">
          <h5 class="font-medium text-gray-900 mb-4 flex items-center">
            <i class="fas fa-map-marker-alt text-red-500 mr-2"></i>
            Ubicación
          </h5>
          <div class="space-y-3">
            <div>
              <span class="block text-sm font-medium text-red-600">País</span>
              <p class="text-gray-700">{{requisitosExtraidos.ubicacion?.pais}}</p>
            </div>
            <div>
              <span class="block text-sm font-medium text-red-600">Provincia</span>
              <p class="text-gray-700">{{requisitosExtraidos.ubicacion?.provincia}}</p>
            </div>
            <div>
              <span class="block text-sm font-medium text-red-600">Ciudad</span>
              <p class="text-gray-700">{{requisitosExtraidos.ubicacion?.ciudad}}</p>
            </div>
          </div>
        </div>



      <!-- Descripciones -->
      <div class="bg-white p-4 rounded-lg shadow-sm">
        <h5 class="font-medium text-gray-900 mb-4 flex items-center">
          <i class="fas fa-file-alt text-yellow-500 mr-2"></i>
          Descripciones
        </h5>
        <div class="space-y-4">
          <div>
            <span class="block text-sm font-medium text-yellow-600">Descripción General</span>
            <p class="text-gray-700 whitespace-pre-line">{{requisitosExtraidos.descripcion}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-yellow-600">Descripción del Trabajo</span>
            <p class="text-gray-700 whitespace-pre-line">{{requisitosExtraidos.descripcionTrabajo}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-yellow-600">Descripción de la Empresa</span>
            <p class="text-gray-700 whitespace-pre-line">{{requisitosExtraidos.descripcionEmpresa}}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Columna 2: Requisitos y Detalles de Posición -->
    <div class="space-y-6">
      <!-- Requisitos -->
      <div class="bg-white p-4 rounded-lg shadow-sm">
        <h5 class="font-medium text-gray-900 mb-4 flex items-center">
          <i class="fas fa-list-check text-green-500 mr-2"></i>
          Requisitos
        </h5>
        <div class="space-y-3">
          <div>
            <span class="block text-sm font-medium text-green-600">Requisitos Técnicos</span>
            <p class="text-gray-700">{{requisitosExtraidos.requisitos}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-green-600">Nivel Mínimo de Educación</span>
            <p class="text-gray-700">{{requisitosExtraidos.nivelMinimoEducacion}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-green-600">Estado Nivel Educación</span>
            <p class="text-gray-700">{{requisitosExtraidos.estadoNivelEducacion}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-green-600">Secundario Completo</span>
            <p class="text-gray-700">{{requisitosExtraidos.requisitoSecundarioCompleto}}</p>
          </div>
        </div>
      </div>

      <!-- Detalles de Posición -->
      <div class="bg-white p-4 rounded-lg shadow-sm">
        <h5 class="font-medium text-gray-900 mb-4 flex items-center">
          <i class="fas fa-briefcase text-purple-500 mr-2"></i>
          Detalles de Posición
        </h5>
        <div class="space-y-3">
          <div>
            <span class="block text-sm font-medium text-purple-600">Modalidad de Trabajo</span>
            <p class="text-gray-700">{{requisitosExtraidos.modalidadTrabajo}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-purple-600">Tipo de Trabajo</span>
            <p class="text-gray-700">{{requisitosExtraidos.tipoTrabajo}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-purple-600">Jerarquía</span>
            <p class="text-gray-700">{{requisitosExtraidos.jerarquia}}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Columna 3: Condiciones y Requisitos Adicionales -->
    <div class="space-y-6">
      <!-- Condiciones -->
      <div class="bg-white p-4 rounded-lg shadow-sm">
        <h5 class="font-medium text-gray-900 mb-4 flex items-center">
          <i class="fas fa-clipboard-list text-indigo-500 mr-2"></i>
          Condiciones
        </h5>
        <div class="space-y-3">
          <div>
            <span class="block text-sm font-medium text-indigo-600">Tipo de Contratación</span>
            <p class="text-gray-700">{{requisitosExtraidos.tipoDeContratacion}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-indigo-600">Modalidad de Contratación</span>
            <p class="text-gray-700">{{requisitosExtraidos.modalidadDeContratacion}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-indigo-600">Beneficios</span>
            <p class="text-gray-700">{{requisitosExtraidos.beneficios}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-indigo-600">Condiciones</span>
            <p class="text-gray-700">{{requisitosExtraidos.condiciones}}</p>
          </div>
        </div>
      </div>

      <!-- Requisitos Adicionales -->
      <div class="bg-white p-4 rounded-lg shadow-sm">
        <h5 class="font-medium text-gray-900 mb-4 flex items-center">
          <i class="fas fa-plus-circle text-pink-500 mr-2"></i>
          Requisitos Adicionales
        </h5>
        <div class="space-y-3">
          <div>
            <span class="block text-sm font-medium text-pink-600">Idioma Requerido</span>
            <p class="text-gray-700">{{requisitosExtraidos.requisitoIdioma}} - {{requisitosExtraidos.idioma}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-pink-600">Reubicación Laboral</span>
            <p class="text-gray-700">{{requisitosExtraidos.requisitoReubicacionLaboral}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-pink-600">Disponibilidad Horaria</span>
            <p class="text-gray-700">{{requisitosExtraidos.requisitoDisponibilidadHoraria}}</p>
          </div>
          <div>
            <span class="block text-sm font-medium text-pink-600">Género</span>
            <p class="text-gray-700">{{requisitosExtraidos.requisitoGenero || requisitosExtraidos.genero}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>

      
 



  


    <!-- Modal de Progreso -->
    <div v-if="showProgresoModal" 
     class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center"
     style="z-index: 100;">
  <div class="bg-white p-8 rounded-lg shadow-xl w-[60%] !max-w-none">
    <!-- Agregar header con X -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900">
        Estado de procesamiento
      </h3>
      <button 
        @click="cerrarModalProgreso" 
        class="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="mb-4">
      <pre v-text="estadoActualProceso || ''" class="progress-messages"></pre>
    </div>

        <!-- Barra de progreso -->
        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            :style="{width: `${progresoPostulantes}%`}"
          ></div>
        </div>

        

        <!-- Botones -->
        <div class="flex justify-end space-x-3">
          <button
            v-if="!procesoBusquedaCompleto"
            @click="cancelarBusqueda"
            :disabled="cancelando"
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {{ cancelando ? 'Cancelando...' : 'Cancelar' }}
          </button>
          <button
            v-if="procesoBusquedaCompleto || cancelando"
            @click="showProgresoModal = false"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Ver Resultados
          </button>
        </div>
      </div>
    </div>

   
  <!-- Modal de Análisis -->
  <div v-if="showAnalysisModalFlag" 
       class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-[90%] max-w-4xl shadow-lg rounded-md bg-white">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-4">
            <h3 class="text-lg font-medium text-gray-900">
                Análisis del Candidato: {{selectedAnalysis?.postulantInfo?.nombre}} {{selectedAnalysis?.postulantInfo?.apellido}}
            </h3>
            <button @click="closeAnalysisModal" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Contenido -->
        <div class="mt-4 space-y-4">
            <!-- NUEVO: Score Total -->
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Score Total</h4>
                <div class="text-2xl font-bold text-blue-600">
                    {{selectedAnalysis?.analysis?.analysis?.totalScore?.toFixed(2)}}%
                </div>
            </div>

            <!-- NUEVO: Scores Detallados -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-4">Scores Detallados</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div v-for="(score, key) in selectedAnalysis?.analysis?.analysis?.scores" 
                         :key="key" 
                         class="bg-white p-3 rounded shadow-sm">
                        <div class="text-sm text-gray-500 capitalize">{{key}} 
                            <span class="text-xs">
                                ({{getScoreWeight(key)}})
                            </span>
                        </div>
                        <div class="flex items-center mt-1">
                            <div class="flex-grow">
                                <div class="h-2 bg-gray-200 rounded-full">
                                    <div class="h-2 bg-blue-600 rounded-full" 
                                         :style="{width: `${score}%`}">
                                    </div>
                                </div>
                            </div>
                            <div class="ml-2 text-sm font-medium">
                                {{score}}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cumplimiento de requisitos (existente) -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Cumplimiento de requisitos excluyentes</h4>
                <div class="ml-4">
                    <p class="text-green-600 font-medium">
                        Respuesta: {{selectedAnalysis?.analysis?.analysis['Cumplimiento de requisitos excluyentes']?.respuesta}}
                    </p>
                    <p class="text-gray-600 mt-1">
                        {{selectedAnalysis?.analysis?.analysis['Cumplimiento de requisitos excluyentes']?.justificación}}
                    </p>
                </div>
            </div>

            <!-- Aptitud general (existente) -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Aptitud general para el puesto</h4>
                <p class="text-gray-600">{{selectedAnalysis?.analysis?.analysis['Aptitud general para el puesto']}}</p>
            </div>

            <!-- Fortalezas (existente) -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Fortalezas identificadas</h4>
                <ul class="list-disc ml-6">
                    <li v-for="(fortaleza, index) in selectedAnalysis?.analysis?.analysis['Fortalezas identificadas']" 
                        :key="index" 
                        class="text-gray-600">
                        {{fortaleza}}
                    </li>
                </ul>
            </div>

            <!-- Áreas de mejora (existente) -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Debilidades o áreas de mejora</h4>
                <ul class="list-disc ml-6">
                    <li v-for="(debilidad, index) in selectedAnalysis?.analysis?.analysis['Debilidades o áreas de mejora']" 
                        :key="index" 
                        class="text-gray-600">
                        {{debilidad}}
                    </li>
                </ul>
            </div>

            <!-- Calificación (existente) -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Calificación de adecuación</h4>
                <p class="text-gray-900 font-medium">Calificación: {{selectedAnalysis?.analysis?.analysis['Calificación de adecuación']?.calificación}}/10</p>
                <p class="text-gray-600 mt-1">{{selectedAnalysis?.analysis?.analysis['Calificación de adecuación']?.justificación}}</p>
            </div>

            <!-- NUEVO: Datos de Contacto -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Datos de Contacto</h4>
                <p class="text-gray-600">
                    {{selectedAnalysis?.analysis?.analysis?.contactos?.datos || 'No se proporcionaron datos de contacto'}}
                </p>
            </div>
        </div>
    </div>
</div>
</div>
</div>

  <!-- Modal de Requisitos -->
  <TransitionRoot appear :show="showRequisitosModal" as="template">
    <Dialog as="div" @close="closeRequisitosModal" class="relative">
        <div class="fixed inset-0 z-[9999]">
            <!-- Overlay -->
            <TransitionChild
                enter="ease-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in duration-200"
                leave-from="opacity-100"
                leave-to="opacity-0"
            >
                <div class="fixed inset-0 bg-black/25" />
            </TransitionChild>

            <!-- Modal panel -->
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center">
                    <TransitionChild
                        enter="ease-out duration-300"
                        enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95"
                    >
                        <DialogPanel 
                            v-if="requisitosSeleccionados" 
                            class="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all z-[9999]"
                        >
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                              Detalles del Perfil Buscado
                            </DialogTitle>

                            <div class="mt-4 space-y-6">
                              <!-- Título y Área -->
                              <div class="bg-blue-50 p-4 rounded-lg">
                                <h4 class="text-xl font-semibold text-blue-900">{{ requisitosSeleccionados?.titulo || 'No especificado' }}</h4>
                                <p class="text-blue-700">{{ requisitosSeleccionados?.area || 'No especificado' }}</p>
                              </div>

                              <!-- Ubicación y Modalidad -->
                              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                  <h5 class="font-medium text-gray-700">Ubicación</h5>
                                  <p class="text-gray-600">País: {{ requisitosSeleccionados?.ubicacion?.pais || 'No especificado' }}</p>
                                  <p class="text-gray-600">Provincia: {{ requisitosSeleccionados?.ubicacion?.provincia || 'No especificado' }}</p>
                                  <p class="text-gray-600">Ciudad: {{ requisitosSeleccionados?.ubicacion?.ciudad || 'No especificado' }}</p>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-lg">
                                  <h5 class="font-medium text-gray-700">Modalidad</h5>
                                  <p class="text-gray-600">Trabajo: {{ requisitosSeleccionados?.modalidadTrabajo || 'No especificado' }}</p>
                                  <p class="text-gray-600">Tipo: {{ requisitosSeleccionados?.tipoTrabajo || 'No especificado' }}</p>
                                  <p class="text-gray-600">Contratación: {{ requisitosSeleccionados?.modalidadDeContratacion || 'No especificado' }}</p>
                                </div>
                              </div>

                              <!-- Descripción -->
                              <div v-if="requisitosSeleccionados?.descripcionTrabajo" class="bg-gray-50 p-4 rounded-lg">
                                <h5 class="font-medium text-gray-700 mb-2">Descripción del Puesto</h5>
                                <p class="text-gray-600">{{ requisitosSeleccionados.descripcionTrabajo }}</p>
                              </div>

                              <!-- Requisitos -->
                              <div v-if="requisitosFormateados?.length" class="bg-gray-50 p-4 rounded-lg">
                                <h5 class="font-medium text-gray-700 mb-2">Requisitos</h5>
                                <ul class="list-disc list-inside space-y-1 text-gray-600">
                                  <li v-for="(requisito, index) in requisitosFormateados" :key="index">
                                    {{ requisito }}
                                  </li>
                                </ul>
                              </div>

                              <!-- Otros Requisitos -->
                              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                  <h5 class="font-medium text-gray-700">Educación</h5>
                                  <p class="text-gray-600">Nivel mínimo: {{ requisitosSeleccionados?.nivelMinimoEducacion || 'No especificado' }}</p>
                                  <p class="text-gray-600">Secundario: {{ requisitosSeleccionados?.requisitoSecundarioCompleto || 'No especificado' }}</p>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-lg">
                                  <h5 class="font-medium text-gray-700">Idiomas</h5>
                                  <p class="text-gray-600">Requisito: {{ requisitosSeleccionados?.requisitoIdioma || 'No especificado' }}</p>
                                </div>
                              </div>

                              <!-- Beneficios y Condiciones -->
                              <div v-if="requisitosSeleccionados?.beneficios !== 'No especificado' || requisitosSeleccionados?.condiciones !== 'No especificado'" 
                                   class="bg-gray-50 p-4 rounded-lg">
                                <h5 class="font-medium text-gray-700 mb-2">Beneficios y Condiciones</h5>
                                <p v-if="requisitosSeleccionados?.beneficios !== 'No especificado'" class="text-gray-600">
                                  <span class="font-medium">Beneficios:</span> {{ requisitosSeleccionados.beneficios }}
                                </p>
                                <p v-if="requisitosSeleccionados?.condiciones !== 'No especificado'" class="text-gray-600">
                                  <span class="font-medium">Condiciones:</span> {{ requisitosSeleccionados.condiciones }}
                                </p>
                              </div>
                            </div>

                            <div class="mt-6 flex justify-end">
                              <button
                                type="button"
                                class="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                @click="closeRequisitosModal"
                              >
                                Cerrar
                              </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </div>
    </Dialog>
  </TransitionRoot>

  
 <!-- Nuevo modal para detalles del postulante -->
 <div v-if="showPostulantModal1" 
        :key="selectedPostulant1?.id"
        class="fixed absolute inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-80">
        <div class="relative top-20 mx-auto p-5 border w-[90%] max-w-4xl shadow-lg rounded-md bg-white">
       <!-- Header del modal -->
            <div class="p-4 border-b flex justify-between items-center">
              <h3 class="text-lg font-bold text-gray-900">
                Datos del Postulante Elegido
              </h3>
              <button @click="closePostulantModal1" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <!-- Contenido del modal -->
            <div class="p-6 space-y-6">
              <!-- Datos personales -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Datos Personales</h4>
                
                <!-- Agregar foto de perfil -->
                <div class="flex items-start gap-4 mb-4">
                  <div class="flex-shrink-0">
                    <div class="w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                      <img v-if="selectedPostulant1?.fotoPerfil" 
                           :src="selectedPostulant1.fotoPerfil" 
                           :alt="`Foto de ${selectedPostulant1.nombre}`"
                           class="w-full h-full object-cover"
                           @error="$event.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedPostulant1.nombre + ' ' + selectedPostulant1.apellido)"
                      >
                      <div v-else 
                           class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xl">
                        {{ selectedPostulant1?.nombre?.[0]?.toUpperCase() }}{{ selectedPostulant1?.apellido?.[0]?.toUpperCase() }}
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4 flex-grow">
                    <div v-if="selectedPostulant1?.nombre || selectedPostulant1?.apellido">
                      <p class="text-sm text-gray-600">Nombre completo</p>
                      <p class="font-medium text-gray-900">
                          {{ selectedPostulant1?.nombre }} {{ selectedPostulant1?.apellido }}
                      </p>
                    </div>
                    <div v-if="selectedPostulant1?.email">
                      <p class="text-sm text-gray-600">Email</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.email }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.telefonoFijo">
                      <p class="text-sm text-gray-600">Teléfono Fijo</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.telefonoFijo }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.telefonoCelular">
                      <p class="text-sm text-gray-600">Teléfono Celular</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.telefonoCelular }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.fechaNacimiento">
                      <p class="text-sm text-gray-600">Fecha de Nacimiento</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.fechaNacimiento }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.dni">
                      <p class="text-sm text-gray-600">DNI</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.dni }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.cuil">
                      <p class="text-sm text-gray-600">CUIL</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.cuil }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.genero">
                      <p class="text-sm text-gray-600">Género</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.genero }}</p>
                    </div>
                    <div v-if="selectedPostulant1?.nacionalidad">
                      <p class="text-sm text-gray-600">Nacionalidad</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant1.nacionalidad }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="selectedPostulant1?.redesSociales" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-bold mb-4 text-gray-900">Redes Sociales</h4>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div v-for="(url, red) in safeJSONParse(selectedPostulant1.redesSociales)" 
                        :key="red"
                        class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <i :class="getSocialIcon(red)" class="text-gray-600"></i>
                      </div>
                      <a :href="url" 
                        target="_blank" 
                        class="text-blue-600 hover:underline truncate">
                        {{ url }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Nueva sección para Datos de Contacto del CV, después de datos personales -->
                <div v-if="selectedPostulant1?.contactos1" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-bold mb-4 text-gray-900">Datos de Contacto del CV</h4>
                  <div class="text-gray-700 whitespace-pre-line">
                    {{ selectedPostulant1.contactos1 }}
                  </div>
                </div>


              <!-- Conocimientos y Habilidades -->
              <div v-if="selectedPostulant1?.conocimientos" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Conocimientos y Habilidades</h4>
                
                <div class="space-y-4">
                  <div v-for="(con, index) in safeJSONParse(selectedPostulant1.conocimientos)" 
                      :key="index"
                      class="bg-white p-4 rounded-lg shadow-sm">
                    <div class="flex justify-between items-start">
                      <div>
                        <h5 class="font-semibold text-gray-900">{{ con.nombre }}</h5>
                        <p class="text-gray-600">{{ con.tipo }}</p>
                      </div>
                      <span class="px-2 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                        {{ con.nivel }}
                      </span>
                    </div>
                    <div v-if="con.calificacion" class="mt-2">
                      <span class="text-sm text-gray-600">Calificación: </span>
                      <span class="font-medium">{{ con.calificacion }}</span>
                    </div>
                    <div v-if="con.descripcion" class="mt-2 text-gray-700">
                      {{ con.descripcion }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Disponibilidad -->
              <div v-if="selectedPostulant1?.disponibilidadHoraria || selectedPostulant1?.disponibilidadRelocacion" 
                  class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Disponibilidad</h4>
                
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="selectedPostulant1.disponibilidadHoraria">
                    <p class="text-sm text-gray-600">Disponibilidad Horaria</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.disponibilidadHoraria }}</p>
                  </div>
                  <div v-if="selectedPostulant1.disponibilidadRelocacion">
                    <p class="text-sm text-gray-600">Disponibilidad para Relocación</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.disponibilidadRelocacion }}</p>
                  </div>
                </div>
              </div>


              <!-- Ubicación -->
              <div v-if="selectedPostulant1?.direccion" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Ubicación</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="selectedPostulant1.direccion.pais">
                    <p class="text-sm text-gray-600">País</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.direccion.pais }}</p>
                  </div>
                  <div v-if="selectedPostulant1.direccion.provincia">
                    <p class="text-sm text-gray-600">Provincia</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.direccion.provincia }}</p>
                  </div>
                  <div v-if="selectedPostulant1.direccion.ciudad">
                    <p class="text-sm text-gray-600">Ciudad</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.direccion.ciudad }}</p>
                  </div>
                  <div v-if="selectedPostulant1.direccion.direccion">
                    <p class="text-sm text-gray-600">Dirección</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.direccion.direccion }}</p>
                  </div>
                </div>
              </div>

              <!-- Presentación -->
              <div v-if="selectedPostulant1?.presentacionPostulante" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Presentación</h4>
                <div class="prose max-w-none text-gray-800 whitespace-pre-line">
                  {{ selectedPostulant1.presentacionPostulante }}
                </div>
              </div>

              <!-- Información de la Postulación -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Información de la Postulación</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="selectedPostulant1?.vacanteNombre">
                    <p class="text-sm text-gray-600">Puesto</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.vacanteNombre }}</p>
                  </div>
                  <div v-if="selectedPostulant1?.fechaPostulacion">
                    <p class="text-sm text-gray-600">Fecha de Postulación</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.fechaPostulacion }}</p>
                  </div>
                  <div v-if="selectedPostulant1?.etapa">
                    <p class="text-sm text-gray-600">Etapa</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.etapa }}</p>
                  </div>
                  <div v-if="selectedPostulant1?.fuente">
                    <p class="text-sm text-gray-600">Fuente</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.fuente }}</p>
                  </div>
                  <div v-if="selectedPostulant1?.salarioPretendido">
                    <p class="text-sm text-gray-600">Salario Pretendido</p>
                    <p class="font-medium text-gray-900">$ {{ selectedPostulant1.salarioPretendido.toLocaleString('es-AR') }}</p>
                  </div>
                  <div v-if="selectedPostulant1?.rechazado">
                    <p class="text-sm text-gray-600">Estado</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant1.rechazado === 'no' ? 'Activo' : 'Rechazado' }}</p>
                  </div>
                </div>
              </div>

              <!-- Experiencia Laboral -->
              <div v-if="selectedPostulant1?.experienciasLaborales" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Experiencia Laboral</h4>
                
                <div class="relative pl-8 border-l-2 border-orange-200 space-y-8">
                  <div v-for="(exp, index) in safeJSONParse(selectedPostulant1.experienciasLaborales)" 
                       :key="index"
                       class="relative">
                    <!-- Punto en la línea de tiempo -->
                    <div class="absolute -left-[2.45rem] bg-white p-1 rounded-full">
                      <div class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg class="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                      </div>
                    </div>

                    <!-- Contenido de la experiencia -->
                    <div class="bg-white p-4 rounded-lg shadow-sm">
                      <div class="flex justify-between items-start mb-2">
                        <div>
                      <h5 class="font-semibold text-gray-900">{{ exp.puesto }}</h5>
                      <p class="text-gray-600">{{ exp.empresa }}</p>
                      <div class="mt-1 text-sm text-gray-500">
                        <p v-if="exp.area">Área: {{ exp.area }}</p>
                        <p v-if="exp.subArea">Sub-área: {{ exp.subArea }}</p>
                        <p v-if="exp.industria">Industria: {{ exp.industria }}</p>
                        <p v-if="exp.seniority">Seniority: {{ exp.seniority }}</p>
                        <p v-if="exp.pais">País: {{ exp.pais }}</p>
                      </div>
                    </div>
                        <span class="px-2 py-1 text-sm rounded-full" 
                              :class="exp.trabajoActual ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'">
                          {{ formatPeriod(exp) }}
                        </span>
                      </div>
                      
                      <div v-if="exp.descripcion" class="mt-2 text-gray-700 whitespace-pre-line">
                        {{ exp.descripcion }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
               
              <!-- Estudios -->
              <div v-if="selectedPostulant1?.estudios" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Estudios</h4>
                
                <div class="space-y-4">
                  <div v-for="(edu, index) in safeJSONParse(selectedPostulant1.estudios)" 
                       :key="index"
                       class="bg-white p-4 rounded-lg shadow-sm flex gap-4">
                    <!-- Ícono -->
                    <div class="flex-shrink-0">
                      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                        </svg>
                      </div>
                    </div>
                    
                    <!-- Contenido -->
                    <div class="flex-grow">
                      <div class="flex justify-between items-start">
                        <div>
                          <h5 class="font-semibold text-gray-900">{{ edu.titulo }}</h5>
                          <p v-if="edu.institucion" class="text-gray-600">{{ edu.institucion }}</p>
                          <div class="mt-1 text-sm text-gray-500">
                            <p v-if="edu.nivel">Nivel: {{ edu.nivel }}</p>
                            <p v-if="edu.estado">Estado: {{ edu.estado }}</p>
                            <p v-if="edu.area">Área: {{ edu.area }}</p>
                            <p v-if="edu.pais">País: {{ edu.pais }}</p>
                          </div>
                        </div>
                        <span class="text-sm text-gray-500">
                          {{ formatEducationPeriod(edu) }}
                        </span>
                      </div>
                      
                      <div v-if="edu.descripcion" class="mt-2">
                        <div class="flex flex-wrap gap-2">
                          <span v-for="(skill, idx) in edu.descripcion.split(', ')" 
                                :key="idx"
                                class="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            {{ skill }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


                <!-- Nueva sección para Archivos, antes de cerrar el modal -->
                <div v-if="selectedPostulant1?.archivos?.length > 0" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-bold mb-4 text-gray-900">Archivos Adjuntos</h4>
                  
                  <div class="space-y-2">
                    <div v-for="(archivo, index) in selectedPostulant1.archivos" 
                        :key="index"
                        class="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm">
                      <!-- Icono de documento -->
                      <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      
                      <!-- Nombre y botón de descarga -->
                      <div class="flex-grow">
                        <p class="text-sm font-medium text-gray-900">{{ archivo.nombre }}</p>
                      </div>
                      
                      <a :href="archivo.url" 
                        target="_blank"
                        download
                        class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar
                      </a>
                    </div>
                  </div>
                </div>




              <!-- Tags -->
              <div v-if="selectedPostulant1?.tags" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Tags</h4>
                
                <div class="flex flex-wrap gap-2">
                  <div v-for="(tag,index) in safeJSONParse(selectedPostulant1.tags)" 
                       :key="index" 
                       class="group relative">
                    <span class="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors">
                      {{ tag.nombre }}
                    </span>
                    
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      <div>Creado por: {{ tag.creadoPor }}</div>
                      <div>Fecha: {{ formatDate(tag.fechaCreacion) }}</div>
                      <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

       
  <!-- Modal de Resultados de Búsqueda Proactiva -->
  <TransitionRoot appear :show="showResultadosBPModal" as="template">
  <Dialog as="div" @close="closeResultadosBPModal" class="relative z-60">
    <TransitionChild
      enter="ease-out duration-300"
      enter-from="opacity-0"
      enter-to="opacity-100"
      leave="ease-in duration-200"
      leave-from="opacity-100"
      leave-to="opacity-0"
    >
      <div class="fixed inset-0 bg-black/25" />
    </TransitionChild>

    <div class="fixed inset-0 overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4 text-center">
        <TransitionChild
          enter="ease-out duration-300"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-200"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel 
            v-if="resultadosBPSeleccionados" 
            class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
          >
            <DialogTitle as="h3" class="text-lg font-semibold leading-6 text-gray-900 mb-4">
              Resultados de Búsqueda Proactiva
            </DialogTitle>

            <!-- Resumen de resultados -->
             <!--<div class="bg-gray-50 p-4 rounded-lg mb-6">  -->
              <p class="text-sm text-gray-600 mb-6">
                <span class="font-semibold">Postulantes encontrados para este perfil:</span> 
                {{ resultadosBPSeleccionados.matches_encontrados }}
              </p>
              <!-- Botones de acción -->
                <div class="bg-gray-50 p-4 rounded-lg mb-6 flex justify-end items-center">
                  <div class="flex gap-2">
                    <button @click="exportBPMatchesToExcel"
                            :class="['inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm', exportingExcel ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50']"
                            :disabled="exportingExcel">
                      <i class="fas fa-file-excel mr-1 text-green-600"></i>
                      {{ exportingExcel ? 'Exportando...' : 'Exportar a Excel' }}
                    </button>

                    <button @click="downloadAllBPMatchesCVs"
                            :class="['inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm', downloadingAllCVs ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50']"
                            :disabled="downloadingAllCVs">
                      <i class="fas fa-download mr-1 text-orange-600"></i>
                      {{ downloadingAllCVs ? 'Descargando...' : 'Descargar CVs' }}
                    </button>
                  </div>
                </div>
              
            <!-- Lista de matches -->
            <div class="space-y-4">
              <div v-for="(match, index) in resultadosBPSeleccionados.matches" :key="index" 
                  class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                <!-- Cabecera clickeable -->
                <div @click="toggleMatch(index)" 
                    class="flex flex-col md:flex-row justify-between md:items-center gap-3 cursor-pointer">
                  <!-- Info del postulante -->
                  <div class="flex-grow">
                    <h4 class="font-medium text-gray-900 text-base">
                      {{ match.postulantInfo.nombre }} {{ match.postulantInfo.apellido }}
                    </h4>
                    <p class="text-sm text-gray-500">
                      {{ match.postulantInfo.email }} | {{ match.postulantInfo.telefonoFijo }}
                    </p>
                    <a
                      v-if="match.postulantInfo && match.postulantInfo.hiringRoomId && match.postulantInfo.vacanteId"
                      :href="`https://sooftglobal.hiringroom.com/app/postulant/getPostulant/${match.postulantInfo.hiringRoomId}/${match.postulantInfo.vacanteId}`"
                      target="_blank"
                      class="text-primary-blue hover:underline flex items-center mt-1"
                    >
                      Ver ficha en HiringRoom
                      <i class="fas fa-external-link-alt ml-2"></i>
                    </a>
                  </div>
                  
                  <!-- Calificación -->
                  <div class="text-center">
                    <p class="text-sm font-medium text-gray-700">Resultado:</p>
                    <span class="text-lg font-bold" 
                          :class="match.analysis.analysis['Calificación de adecuación'].calificación >= 7 ? 'text-green-600' : 'text-yellow-600'">
                      {{ match.analysis.analysis['Calificación de adecuación'].calificación }}/10
                    </span>
                  </div>
                  
                  <!-- Badges y acciones -->
                  <div class="flex md:flex-col items-center md:items-end gap-2">
                    <div class="flex items-center gap-2">
                      <!-- Score Badge -->
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                            :class="match.analysis.analysis.totalScore >= 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'">
                        Score: {{ match.analysis.analysis.totalScore }}%
                      </span>

                      <!-- Validation Status -->
                      <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-800 border border-blue-200">
                      <i class="fas fa-tasks mr-1 text-blue-500"></i>
                      {{ match.postulantInfo.etapa || 'Sin etapa' }}
                    </span>
                    </div>
                    
                    <!-- Toggle chevron -->
                    <svg 
                      class="w-5 h-5 text-gray-500 transform transition-transform duration-200 ml-auto"
                      :class="expandedMatches.includes(index) ? 'rotate-180' : ''"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                <!-- Contenido expandible -->
                <div v-show="expandedMatches.includes(index)" 
                    class="mt-4 border-t pt-4 transition-all duration-200">
                  
                  <!-- Acciones -->
                  <div class="flex flex-wrap gap-2 mb-4">
                    <button 
                    @click="generarFichaConSpinner(match.postulantInfo, selectedVacante)"
                    :disabled="botonGenerandoFicha"
                    class="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <i v-if="!botonGenerandoFicha" class="fas fa-file-alt mr-2"></i>
                    <svg v-else class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ botonGenerandoFicha ? 'Generando...' : 'Ficha Sooft' }}
                    </button>

                    <button 
                      @click="generarFichaOneSelectConSpinner(match.postulantInfo, selectedVacante)"
                      :disabled="botonGenerandoFichaOS"
                      class="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      <i v-if="!botonGenerandoFicha" class="fas fa-file-alt mr-2"></i>
                      <svg v-else class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {{ botonGenerandoFichaOS ? 'Generando...' : 'Ficha OneSelect' }}
                    </button>

                    <button 
                      @click.stop="downloadCV(match.postulantInfo)"
                      class="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition">
                      <i class="fas fa-download mr-2"></i>
                      Descargar CV
                    </button>
                    
                    <button 
                      @click="verPostulanteBP(match.postulantInfo)"
                      class="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition ml-auto"
                    >
                      <i class="fas fa-info-circle mr-2"></i>
                      Ver información completa
                    </button>
                  </div>
                  
                  <!-- Requisitos Excluyentes -->
                  <div class="bg-gray-50 p-3 rounded mb-4">
                    <p class="text-sm">
                      <span class="font-medium text-gray-700">Cumple Requisitos Excluyentes: </span>
                      <span :class="match.analysis.analysis['Cumplimiento de requisitos excluyentes'].respuesta === 'Si' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                        {{ match.analysis.analysis['Cumplimiento de requisitos excluyentes'].respuesta }}
                      </span>
                    </p>
                    <p class="text-sm text-gray-600 mt-1">
                      {{ match.analysis.analysis['Cumplimiento de requisitos excluyentes'].justificación }}
                    </p>
                  </div>

                  <!-- Aptitud -->
                  <div class="mb-4">
                    <p class="text-sm font-medium text-gray-700">Aptitud general:</p>
                    <p class="text-sm text-gray-600 mt-1">
                      {{ match.analysis.analysis['Aptitud general para el puesto'] }}
                    </p>
                  </div>

                  <!-- Scores Detallados -->
                  <div class="mb-4">
                    <p class="text-sm font-medium text-gray-700 mb-2">Scores detallados:</p>
                    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div v-for="(score, key) in match.analysis.analysis.scores" :key="key" 
                          class="bg-gray-50 p-3 rounded">
                        <p class="text-xs text-gray-500 capitalize mb-1">{{ key }}</p>
                        <p class="text-sm font-medium" :class="score >= 70 ? 'text-green-600' : 'text-yellow-600'">
                          {{ score }}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Two columns for Strengths and Weaknesses -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- Fortalezas -->
                    <div class="bg-green-50 bg-opacity-40 p-3 rounded">
                      <p class="text-sm font-medium text-gray-700 mb-2">Fortalezas:</p>
                      <ul class="list-disc list-inside text-sm text-gray-600">
                        <li v-for="(fortaleza, idx) in match.analysis.analysis['Fortalezas identificadas']" 
                            :key="idx" class="mb-1 pl-1">
                          {{ fortaleza }}
                        </li>
                      </ul>
                    </div>

                    <!-- Debilidades -->
                    <div class="bg-amber-50 bg-opacity-40 p-3 rounded">
                      <p class="text-sm font-medium text-gray-700 mb-2">Áreas de mejora:</p>
                      <ul class="list-disc list-inside text-sm text-gray-600">
                        <li v-for="(debilidad, idx) in match.analysis.analysis['Debilidades o áreas de mejora']" 
                            :key="idx" class="mb-1 pl-1">
                          {{ debilidad }}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- Calificación de adecuación -->
                  <div class="bg-gray-50 p-4 rounded">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-700">Calificación de adecuación:</p>
                      <span class="text-lg font-bold" 
                            :class="match.analysis.analysis['Calificación de adecuación'].calificación >= 7 ? 'text-green-600' : 'text-yellow-600'">
                        {{ match.analysis.analysis['Calificación de adecuación'].calificación }}/10
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                      {{ match.analysis.analysis['Calificación de adecuación'].justificación }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 flex justify-end">
              <button
                type="button"
                class="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition"
                @click="closeResultadosBPModal"
              >
                Cerrar
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </div>
  </Dialog>
</TransitionRoot>


<!-- Modal de Información del Postulante en Consulta de Busqueda Proactiva   -->
<TransitionRoot appear :show="showPostulanteBPModal" as="template">
  
  <Dialog as="div" @close="closePostulanteBPModal" class="relative z-[9999]">
    <TransitionChild
      enter="ease-out duration-300"
      enter-from="opacity-0"
      enter-to="opacity-100"
      leave="ease-in duration-200"
      leave-from="opacity-100"
      leave-to="opacity-0"
    >
      <div class="fixed inset-0 bg-black/25" />
    </TransitionChild>

    <div class="fixed inset-0 overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4 text-center">
        <TransitionChild
          enter="ease-out duration-300"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-200"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel 
            v-if="postulanteBPSeleccionado" 
            class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
          >
            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4 flex justify-between items-center">
              <span>Información del Postulante</span>
              <button 
                @click="closePostulanteBPModal"
                class="text-gray-300 hover:text-gray-400"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </DialogTitle>

            <!-- Contenido del modal -->
            <div class="mt-4 space-y-6">
              <!-- Información Personal -->
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <h4 class="font-medium text-gray-900 mb-4">Información Personal</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm font-medium text-gray-500">Nombre completo</span>
                    <p class="text-gray-900">{{postulanteBPSeleccionado.nombre}} {{postulanteBPSeleccionado.apellido}}</p>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Nacionalidad</span>
                    <p class="text-gray-900">{{postulanteBPSeleccionado.nacionalidad}}</p>
                   
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Email</span>
                    <p class="text-gray-900">{{postulanteBPSeleccionado.email}}</p>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Teléfono</span>
                    <p class="text-gray-900">{{postulanteBPSeleccionado.telefonoFijo || postulanteBPSeleccionado.telefonoCelular}}</p>
                  </div>
                </div>
              </div>

              <!-- Experiencia Laboral -->
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <h4 class="font-medium text-gray-900 mb-4">Experiencia Laboral</h4>
                <div class="space-y-4">
                  <div v-for="(exp, index) in postulanteBPSeleccionado.experienciasLaborales" :key="index" 
                       class="border-b pb-4 last:border-0">
                    <p class="font-medium text-gray-900">{{exp.puesto}}</p>
                    <p class="text-gray-600">{{exp.empresa}}</p>
                    <p class="text-sm text-gray-500">
                      {{exp.mesDesde}}/{{exp.anioDesde}} - 
                      {{exp.mesHasta ? `${exp.mesHasta}/${exp.anioHasta}` : 'Actualidad'}}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Educación -->
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <h4 class="font-medium text-gray-900 mb-4">Educación</h4>
                <div class="space-y-4">
                  <div v-for="(edu, index) in postulanteBPSeleccionado.estudios" :key="index" 
                       class="border-b pb-4 last:border-0">
                    <p class="font-medium text-gray-900">{{edu.titulo}}</p>
                    <p class="text-gray-600">{{edu.institucion}}</p>
                  </div>
                </div>
              </div>

              <!-- Tags/Habilidades -->
              <div v-if="postulanteBPSeleccionado.tags?.length" class="bg-white p-4 rounded-lg shadow-sm">
                <h4 class="font-medium text-gray-900 mb-4">Habilidades</h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="tag in postulanteBPSeleccionado.tags" 
                        :key="tag.nombre"
                        class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {{tag.nombre}}
                  </span>
                </div>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </div>
  </Dialog>
</TransitionRoot>

</template>

<style scoped>
@keyframes processingBackground {
  0% { background-color: #a55df1; }  /* blue-50 */
  50% { background-color: white; }
  100% { background-color: #a55df1; }
}

.processing-card {
  animation: processingBackground 2s ease-in-out infinite;
}

.progress-messages {
  white-space: pre-line;
  text-align: left;
  margin: 10px 0;
  color: #000000;
  font-weight: normal;
  max-height: 400px;
  overflow-y: auto;
}

/* Asegurarnos que no haya límites de ancho máximo */
:deep(.modal-dialog),
.progress-modal {
    max-width: none !important;
    width: 60% !important;
}

.fixed {
  z-index: 9999 !important;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9998;
}

.dialog-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-test {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.modal-content-test {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
}


.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>