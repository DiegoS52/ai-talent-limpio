<script>
import { hiringRoomService } from '@/services/hiringRoomService';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export default {
  data() {
    return {
      username: '',
      password: '',
      token: '',
      vacancies: [],
      totalVacancies: 0,
      error: '',
      loading: false,
      result: null,
      serverStatus: null,
      searchText: '',
      selectedStatus: 'all', // 'all' o cualquier estado específico
      downloading: false,
      downloadProgress: 0,
      showModal: false,
      activeModal: null,
      selectedVacante: null,
      showPostulantModal: false,
      selectedPostulant: null,
      exportingExcel: false,
      loadingPostulants: false,
      postulantSearchText: '',
      selectedPostulantStatus: 'all',
      loadingVacancyId: null, // Para trackear qué vacante está cargando
      loadingInitialData: true, // Para el estado de carga inicial
    }
  },
  computed: {
    // Obtener lista única de estados disponibles
    availableStatuses() {
      const statuses = new Set(this.vacancies.map(v => v.estadoActual));
      return ['all', ...Array.from(statuses)];
    },
    // Filtrar vacantes según búsqueda y estado
    filteredVacancies() {
      return this.vacancies.filter(vacante => {
        const matchesSearch = this.searchText === '' || 
          vacante.nombre.toLowerCase().includes(this.searchText.toLowerCase()) ||
          vacante.area?.nombre?.toLowerCase().includes(this.searchText.toLowerCase());
        
        const matchesStatus = this.selectedStatus === 'all' || 
          vacante.estadoActual === this.selectedStatus;

        return matchesSearch && matchesStatus;
      });
    },
    modalTitle() {
      switch (this.activeModal) {
        case 'usuarios':
          return 'Usuarios Asignados';
        case 'postulantes':
          return 'Postulantes';
        case 'detalles':
          return 'Detalles de la Vacante';
        case 'perfil':
          return 'Perfil Buscado';
        default:
          return '';
      }
    },
    filteredPostulants() {
      if (!this.selectedVacante?.postulants) return [];
      
      return this.selectedVacante.postulants.filter(postulant => {
        const matchesSearch = this.postulantSearchText === '' || 
          `${postulant.nombre} ${postulant.apellido}`.toLowerCase().includes(this.postulantSearchText.toLowerCase()) ||
          postulant.email?.toLowerCase().includes(this.postulantSearchText.toLowerCase());
        
        const matchesStatus = this.selectedPostulantStatus === 'all' || 
          (this.selectedPostulantStatus === 'activo' && postulant.rechazado === 'no') ||
          (this.selectedPostulantStatus === 'rechazado' && postulant.rechazado === 'si');

        return matchesSearch && matchesStatus;
      });
    }
  },
  methods: {
    async testAuth() {
      try {
        this.loading = true;
        this.error = '';
        this.result = null;
        console.log('Iniciando autenticación...');
        
        const response = await hiringRoomService.authenticate({
          username: this.username,
          password: this.password,
          clientId: 'sooftglobal',  // Asegúrate de incluir estos campos si son necesarios
          clientSecret: 'your_client_secret'
        });
        
        console.log('Autenticación exitosa, guardando token...');
        this.token = response.token;
        this.result = response;
        
        console.log('Iniciando carga de vacantes inmediatamente después de autenticación...');
        await this.loadVacancies();  // Llamada explícita a loadVacancies
        
      } catch (error) {
        console.error('Error en el proceso:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async loadVacancies() {
      console.log('Método loadVacancies llamado');
      if (!this.token) {
        console.warn('No hay token disponible para cargar vacantes');
        return;
      }

      console.log('Iniciando carga de vacantes...');
      try {
        this.loading = true;
        this.error = '';
        
        console.log('Llamando a hiringRoomService.getVacancies()...');
        const data = await hiringRoomService.getVacancies();
        
        console.log('Datos de vacantes recibidos:', data);
        this.vacancies = data.vacantes.map(v => ({
          ...v,
          showCardContent: false,
          activeSection: null,
          downloading: false,
          downloadProgress: 0
        }));
        this.totalVacancies = data.total;
        
      } catch (error) {
        console.error('Error cargando vacantes:', error);
        this.error = `Error al cargar vacantes: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.token = '';
      this.vacancies = [];
      this.totalVacancies = 0;
      localStorage.removeItem('hr_token');
    },
    async checkServer() {
      try {
        const response = await fetch('http://localhost:3005/api/health')
        const data = await response.json()
        this.serverStatus = data.status === 'ok'
        console.log('Estado del servidor:', data)
      } catch (err) {
        console.error('Error al verificar servidor:', err)
        this.serverStatus = false
      }
    },
    async loadVacancyDetails(vacancyId) {
      console.log('loadVacancyDetails llamado con ID:', vacancyId);
      try {
        this.loading = true;
        this.error = '';

        const vacante = this.vacancies.find(v => v.id === vacancyId);
        
        // Si no tenemos los datos cargados, los cargamos
        if (!vacante.detailsLoaded) {
          console.log('Cargando detalles...');
          const [notes, requirements, postulants, baseInfo] = await Promise.all([
            hiringRoomService.getVacancyNotes(vacancyId),
            hiringRoomService.getVacancyRequirements(vacancyId),
            hiringRoomService.getVacancyPostulants(vacancyId),
            hiringRoomService.getVacancyBase(vacancyId)
          ]);

          // Actualizar la vacante con los detalles
          vacante.description = notes.result?.message || 'Sin descripción disponible';
          vacante.requirements = requirements.requisitos?.camposObligatorios?.join(', ') || 'Sin requisitos específicos';
          vacante.postulants = postulants.curriculums || [];
          vacante.baseInfo = baseInfo.vacante;
          vacante.detailsLoaded = true;
        }

      } catch (error) {
        console.error('Error en loadVacancyDetails:', error);
        this.error = `Error al cargar detalles: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    toggleCardContent(vacante) {
      vacante.showCardContent = !vacante.showCardContent;
    },
    async toggleSection(vacante, section) {
      try {
        if (section === 'postulantes') {
          this.loadingVacancyId = vacante.id;
        }

        // Para la sección de perfil
        if (section === 'perfil') {
          // Log para ver todos los campos de la vacante
          console.log('Campos disponibles en la vacante:', Object.keys(vacante));
          console.log('Valor de condiciones:', vacante.condiciones);
          console.log('Valor de condicionesRol:', vacante.condicionesRol);
          console.log('Valor de condicionesTrabajo:', vacante.condicionesTrabajo);
          console.log('Vacante completa:', vacante);
          
          this.selectedVacante = {
            ...vacante,
            requisitos: vacante.requisitos || 'Sin requisitos disponibles',
            descripcionTrabajo: vacante.descripcionTrabajo || 'Sin descripción disponible',
            condiciones: vacante.condiciones || vacante.condicionesRol || vacante.condicionesTrabajo || 'Sin condiciones especificadas',
            beneficios: vacante.beneficios || 'Sin beneficios especificados'
          };
        } else {
          // Si necesitamos cargar datos y no están cargados
          if ((section === 'detalles' || section === 'postulantes') && !vacante.detailsLoaded) {
            const [notes, requirements, postulants, baseInfo] = await Promise.all([
              hiringRoomService.getVacancyNotes(vacante.id),
              hiringRoomService.getVacancyRequirements(vacante.id),
              hiringRoomService.getVacancyPostulants(vacante.id),
              hiringRoomService.getVacancyBase(vacante.id)
            ]);

            // Actualizar la vacante con los detalles
            vacante.description = notes.result?.message || 'Sin descripción disponible';
            vacante.requirements = requirements.requisitos?.camposObligatorios?.join(', ') || 'Sin requisitos específicos';
            vacante.postulants = postulants.curriculums || [];
            vacante.baseInfo = baseInfo.vacante;
            vacante.detailsLoaded = true;

            // Si es la sección de postulantes, cargar los archivos
            if (section === 'postulantes') {
              for (const postulant of vacante.postulants) {
                const files = await hiringRoomService.getPostulantDetails(postulant.id);
                postulant.archivos = files.archivos || [];
              }
            }
          }
          
          this.selectedVacante = vacante;
        }

        this.activeModal = section;
        this.showModal = true;

      } catch (error) {
        console.error('Error en toggleSection:', error);
        alert('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        this.loadingVacancyId = null;
        this.loadingPostulants = false;
      }
    },
    clearFilters() {
      this.searchText = '';
      this.selectedStatus = 'all';
    },
    async loadPostulantFiles(postulantId) {
      try {
        const details = await hiringRoomService.getPostulantDetails(postulantId);
        return details.archivos;
      } catch (error) {
        console.error('Error cargando archivos:', error);
        return [];
      }
    },
    async downloadAllCVs(vacante) {
      try {
        // Primero asegurarnos de que los postulantes estén cargados
        if (!vacante.detailsLoaded) {
          await this.loadVacancyDetails(vacante.id);
        }

        // Verificar que hay postulantes
        if (!vacante.postulants?.length) {
          alert('No hay postulantes disponibles para esta vacante');
          return;
        }

        // Obtener todos los archivos disponibles
        const archivosPromises = vacante.postulants.map(async postulant => {
          const details = await hiringRoomService.getPostulantDetails(postulant.id);
          return {
            postulant,
            archivos: details.archivos || []
          };
        });

        const resultados = await Promise.all(archivosPromises);
        const totalArchivos = resultados.reduce((total, res) => total + res.archivos.length, 0);

        if (totalArchivos === 0) {
          alert('No hay archivos adjuntos disponibles para descargar en esta vacante');
          return;
        }

        if (!confirm(`¿Desea descargar ${totalArchivos} archivo(s) de esta vacante?`)) {
          return;
        }

        vacante.downloading = true;
        vacante.downloadProgress = 0;

        // Procesar los archivos para el ZIP
        const files = resultados.flatMap(resultado => {
          const { postulant, archivos } = resultado;
          return archivos.map(archivo => {
            // Determinar la extensión de manera más robusta
            let extension;
            if (archivo.nombre.includes('.')) {
              extension = archivo.nombre.split('.').pop();
            } else {
              extension = 'pdf';
            }
            
            // Extraer el ID de referencia del título de la vacante
            const refId = vacante.nombre.split(' ')[0] || '';
            
            // Limpiar el nombre de caracteres especiales
            const nombreLimpio = archivo.nombre.replace(/[^a-z0-9.-]/gi, '_');
            
            // Si el nombre no tiene extensión, remover cualquier guión bajo al final
            const nombreBase = !archivo.nombre.includes('.') ? 
              nombreLimpio.replace(/_+$/, '') : 
              nombreLimpio;
            
            // Construir el nuevo nombre
            const nombreFinal = `REF${refId}_${postulant.nombre}_${postulant.apellido}_${nombreBase}.${extension}`;

            return {
              nombre: nombreFinal,
              url: archivo.url
            };
          });
        });

        // Crear y llenar el ZIP
        const zip = new JSZip();
        const totalFiles = files.length;
        
        // Agregar una función de reintento
        async function downloadWithRetry(url, token, maxRetries = 3) {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await fetch(`http://localhost:3005/api/download-file`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, token })
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              return await response.blob();
            } catch (error) {
              console.log(`Intento ${attempt} fallido:`, error.message);
              
              if (attempt === maxRetries) {
                throw new Error(`No se pudo descargar el archivo después de ${maxRetries} intentos: ${error.message}`);
              }
              
              // Esperar antes de reintentar (tiempo exponencial)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        }

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const blob = await downloadWithRetry(
              file.url, 
              localStorage.getItem('hr_token')
            );
            
            zip.file(file.nombre, blob);
            vacante.downloadProgress = Math.round(((i + 1) / totalFiles) * 100);
          } catch (error) {
            console.error(`Error al descargar ${file.nombre}:`, error);
            // Preguntar al usuario si quiere continuar con los demás archivos
            if (!confirm(`Error al descargar ${file.nombre}. ¿Desea continuar con los demás archivos?`)) {
              throw new Error('Descarga cancelada por el usuario');
            }
          }
        }

        // Generar y descargar el ZIP
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 9 }
        });

        const downloadUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `CVs_${vacante.nombre.replace(/[^a-z0-9]/gi, '_')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

      } catch (error) {
        console.error('Error al descargar CVs:', error);
        alert(error.message || 'Error al descargar los CVs. Por favor, intente nuevamente.');
      } finally {
        vacante.downloading = false;
        vacante.downloadProgress = 0;
      }
    },
    closeModal() {
      this.showModal = false;
      this.activeModal = null;
      this.selectedVacante = null;
    },
    showPostulantDetails(postulant) {
      console.log('Datos completos del postulante:', JSON.stringify(postulant, null, 2));
      this.selectedPostulant = postulant;
      this.showPostulantModal = true;
    },
    closePostulantModal() {
      this.showPostulantModal = false;
      this.selectedPostulant = null;
    },
    exportToExcel(vacante) {
      this.exportingExcel = true;
      try {
        // Preparar los datos para el Excel
        const data = vacante.postulants.map(p => ({
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
        }));

        // Convertir a worksheet
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Crear libro y agregar la hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Postulantes');

        // Generar el archivo y descargarlo
        const fileName = `Postulantes_${vacante.nombre.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (error) {
        console.error('Error exportando a Excel:', error);
        alert('Error al exportar a Excel');
      } finally {
        this.exportingExcel = false;
      }
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
      return data; // Si ya es un objeto, lo devolvemos tal cual
    }
  },
  // Cargar vacantes si hay token al montar el componente
  async mounted() {
    const token = localStorage.getItem('hr_token');
    if (token) {
      this.token = token;
      await this.loadVacancies();
    }
    await this.checkServer();
  },
  async created() {
    try {
      this.loadingInitialData = true;
      // Aquí van tus llamadas a la API para cargar los datos iniciales
      await this.loadInitialData(); // o el método que uses para cargar datos
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    } finally {
      this.loadingInitialData = false;
    }
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header y filtros siempre visibles -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Postulaciones</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Buscar Vacantes -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Buscar Vacantes</label>
          <input type="text" 
                 v-model="searchText"
                 placeholder="Ingrese título o área..."
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
          <p class="mt-1 text-sm text-gray-500">Ingrese palabras clave para filtrar vacantes</p>
        </div>

        <!-- Filtrar por Estado -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Estado</label>
          <select v-model="selectedStatus"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
            <option value="all">Todos los estados</option>
            <option v-for="status in availableStatuses" 
                    :key="status" 
                    :value="status"
                    v-if="status !== 'all'"
            >
              {{ status }}
            </option>
          </select>
          <p class="mt-1 text-sm text-gray-500">Seleccione un estado específico o vea todas</p>
        </div>
      </div>
    </div>

    <!-- Estado de carga después de los filtros -->
    <div v-if="loadingInitialData" 
         class="min-h-[400px] flex flex-col items-center justify-center">
      <div class="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
      <p class="mt-4 text-gray-600 font-medium">Cargando datos...</p>
      <p class="text-sm text-gray-500">Por favor espere</p>
    </div>

    <!-- Contenido principal (se muestra cuando termina de cargar) -->
    <div v-else>
      <div class="max-w-7xl mx-auto p-8">
        <!-- Lista de vacantes -->
        <div class="space-y-6 mb-8">
          <div v-for="vacante in filteredVacancies" :key="vacante.id" 
               class="bg-white rounded-lg shadow-sm overflow-hidden">
            <!-- Header clickeable -->
            <div class="flex items-start p-4 border-b hover:bg-gray-50 transition-colors">
              <!-- Logo (izquierda) -->
              <div class="flex-shrink-0 w-16 h-16 mr-4" @click="toggleCardContent(vacante)">
                <img v-if="vacante.logoUrl" 
                     :src="vacante.logoUrl" 
                     :alt="vacante.nombre"
                     class="w-full h-full object-contain rounded"
                     @error="$event.target.style.display='none'"
                >
              </div>
              
              <!-- Información (centro) -->
              <div class="flex-grow" @click="toggleCardContent(vacante)">
                <h4 class="text-xl font-bold text-gray-900 mb-1">{{ vacante.nombre }}</h4>
                <p v-if="vacante.area?.nombre" class="text-gray-700">{{ vacante.area.nombre }}</p>
              </div>
              
              <!-- Estado, botones y flecha (derecha) -->
              <div class="flex-shrink-0 ml-4 flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full text-sm" 
                      :class="vacante.estadoActual === 'Activa' ? 'bg-green-100 text-gray-800' : 'bg-gray-100 text-gray-800'">
                  {{ vacante.estadoActual }}
                </span>

                <!-- Botones duplicados en el header -->
                <button @click.stop="toggleSection(vacante, 'usuarios')"
                        class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Ver Usuarios {{ `(${vacante.usuarios?.length || 0})` }}
                </button>

                <button 
                  @click="toggleSection(vacante, 'postulantes')"
                  :disabled="loadingVacancyId === vacante.id"
                  class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-75 disabled:cursor-wait"
                >
                  <!-- Spinner cuando está cargando -->
                  <svg 
                    v-if="loadingVacancyId === vacante.id" 
                    class="animate-spin h-4 w-4 text-gray-600" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      class="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      stroke-width="4"
                    ></circle>
                    <path 
                      class="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  
                  <!-- Texto del botón -->
                  <span>{{ loadingVacancyId === vacante.id ? 'Cargando...' : 'Ver Postulantes' }}</span>
                </button>

                <button @click.stop="toggleSection(vacante, 'detalles')"
                        class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Ver Detalles
                </button>

                <button @click.stop="toggleSection(vacante, 'perfil')"
                        class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Perfil
                </button>

                <!-- Botón de descarga -->
                <button 
                  @click.stop="downloadAllCVs(vacante)"
                  :disabled="vacante.downloading"
                  class="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  :title="vacante.downloading ? `Descargando (${vacante.downloadProgress}%)` : 'Descargar CVs'"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  <span class="hidden md:inline">{{ vacante.downloading ? `${vacante.downloadProgress}%` : 'CVs' }}</span>
                </button>

                <svg class="w-5 h-5 transform transition-transform duration-200 cursor-pointer"
                     :class="vacante.showCardContent ? 'rotate-180' : ''"
                     @click="toggleCardContent(vacante)"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            <!-- Contenido colapsable -->
            <div v-show="vacante.showCardContent" 
                 class="transition-all duration-200 ease-in-out">
              
                 <div class="p-4">
                  <!-- 
                
                <div class="mb-4 flex flex-wrap gap-2">
                  <button @click="toggleSection(vacante, 'usuarios')"
                          class="px-4 py-2 rounded-lg transition-colors"
                          :class="vacante.activeSection === 'usuarios' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'">
                    {{ vacante.activeSection === 'usuarios' ? 'Ocultar Usuarios' : `Ver1 Usuarios (${vacante.usuarios?.length || 0})` }}
                  </button>

                  <button @click="toggleSection(vacante, 'postulantes')"
                          class="px-4 py-2 rounded-lg transition-colors"
                          :class="vacante.activeSection === 'postulantes' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'">
                    {{ vacante.activeSection === 'postulantes' ? 'Ocultar Postulantes' : 'Ver Postulantes' }}
                  </button>

                  <button @click="toggleSection(vacante, 'detalles')"
                          class="px-4 py-2 rounded-lg transition-colors"
                          :class="vacante.activeSection === 'detalles' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'">
                    {{ vacante.activeSection === 'detalles' ? 'Ocultar Detalles' : 'Ver Detalles' }}
                  </button>

                  <button @click="toggleSection(vacante, 'perfil')"
                          class="px-4 py-2 rounded-lg transition-colors"
                          :class="vacante.activeSection === 'perfil' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'">
                    {{ vacante.activeSection === 'perfil' ? 'Ocultar Perfil' : 'Perfil Buscado' }}
                  </button>

                  <button 
                    @click="downloadAllCVs(vacante)"
                    :disabled="vacante.downloading"
                    class="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    {{ vacante.downloading ? `Descargando (${vacante.downloadProgress}%)` : 'Descargar CVs' }}
                  </button>
                </div>
                -->
                

                <!-- Información general -->
                <div class="space-y-4">
                  <!-- Mostrar todos los campos que no sean objetos o arrays -->
                  <template v-for="(value, key) in vacante" :key="key">
                    <div v-if="typeof value !== 'object' && !['id', 'nombre', 'showDetails', 'showUsuarios', 'logoUrl', 'requisitos', 'descripcionTrabajo', 'beneficios'].includes(key)" 
                         class="bg-gray-50 p-4 rounded-lg">
                      <h5 class="font-bold mb-2 text-gray-900 capitalize">{{ key.replace(/([A-Z])/g, ' $1').trim() }}</h5>
                      <p class="text-gray-800">{{ value }}</p>
                    </div>
                  </template>

                  <!-- Ubicación -->
                  <div v-if="vacante.ubicacion" class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold mb-2 text-gray-900">Ubicación</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div v-for="(value, key) in vacante.ubicacion" :key="key" class="text-gray-800">
                        <span class="font-medium capitalize">{{ key }}:</span> {{ value }}
                      </div>
                    </div>
                  </div>

                  <!-- Área -->
                  <div v-if="vacante.area" class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold mb-2 text-gray-900">Información del Área</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div v-for="(value, key) in vacante.area" :key="key" class="text-gray-800">
                        <span class="font-medium capitalize">{{ key }}:</span> {{ value }}
                      </div>
                    </div>
                  </div>

                  <!-- Contenido HTML -->
                  <template v-for="(value, key) in vacante" :key="key">
                    <div v-if="typeof value === 'string' && (value.includes('<') || key.toLowerCase().includes('html'))"
                         class="bg-gray-50 p-4 rounded-lg">
                      <h5 class="font-bold mb-2 text-gray-900 capitalize">{{ key.replace(/([A-Z])/g, ' $1').trim() }}</h5>
                      <div class="text-gray-800 prose max-w-none" v-html="value"></div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección de pruebas de API (oculta) -->
        <div class="hidden">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Pruebas de Conexión</h3>
            
            <div class="space-y-4">
              <!-- Verificar Servidor -->
              <div>
                <button @click="checkServer" 
                        class="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Verificar Servidor
                </button>
                <span v-if="serverStatus" 
                      :class="serverStatus === 'OK' ? 'text-green-600' : 'text-red-600'"
                      class="ml-3">
                  {{ serverStatus }}
                </span>
              </div>

              <!-- Probar Autenticación -->
              <div>
                <button @click="testAuth" 
                        class="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Probar Autenticación
                </button>
                <span v-if="result" 
                      :class="result === 'OK' ? 'text-green-600' : 'text-red-600'"
                      class="ml-3">
                  {{ result }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modales -->
        <div v-if="showModal" 
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <!-- Header del modal -->
            <div class="p-4 border-b flex justify-between items-center">
              <h3 class="text-lg font-bold text-gray-900">
                {{ modalTitle }}
              </h3>
              <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <!-- Contenido del modal -->
            <div class="p-6">
              <!-- Usuarios -->
              <div v-if="activeModal === 'usuarios'">
                <div v-for="(usuario, index) in selectedVacante?.usuarios" 
                     :key="usuario.id"
                     class="flex items-center p-3 bg-gray-50 rounded-lg mb-2 last:mb-0">
                  <span class="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-800 rounded-full mr-3 font-medium">
                    {{ index + 1 }}
                  </span>
                  <div>
                    <p class="font-medium text-gray-900">{{ usuario.nombre }} {{ usuario.apellido }}</p>
                    <p class="text-gray-700">{{ usuario.email }}</p>
                  </div>
                </div>
              </div>

              <!-- Postulantes -->
              <div v-if="activeModal === 'postulantes'" class="relative">
                <!-- Header con título y contador -->
                <div class="flex justify-between items-center mb-6">
                  <div class="flex items-baseline gap-2">
                    <h4 class="text-lg font-medium text-gray-900">
                      Postulantes de la vacante
                    </h4>
                    <span class="text-sm text-gray-500">
                      ({{ selectedVacante?.postulants?.length || 0 }} total)
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <!-- Botones existentes de Excel y Descargar CVs -->
                    <button 
                      @click="exportToExcel(selectedVacante)"
                      :disabled="exportingExcel || loadingPostulants"
                      class="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      {{ exportingExcel ? 'Exportando...' : 'Exportar a Excel' }}
                    </button>

                    <button 
                      @click="downloadAllCVs(selectedVacante)"
                      :disabled="selectedVacante.downloading || loadingPostulants"
                      class="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      {{ selectedVacante.downloading ? `Descargando (${selectedVacante.downloadProgress}%)` : 'Descargar CVs' }}
                    </button>
                  </div>
                </div>

                <!-- Filtros -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                  <!-- Buscador -->
                  <div class="relative">
                    <input 
                      type="text"
                      v-model="postulantSearchText"
                      placeholder="Buscar por nombre o email..."
                      class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    >
                    <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>

                  <!-- Filtro de estado -->
                  <select 
                    v-model="selectedPostulantStatus"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="all">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="rechazado">Rechazados</option>
                  </select>
                </div>

                <!-- Estado de carga -->
                <div v-if="loadingPostulants" 
                     class="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center min-h-[200px]">
                  <div class="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                  <p class="mt-4 text-gray-600 font-medium">Cargando postulantes...</p>
                  <p class="text-sm text-gray-500">Esto puede tomar unos segundos</p>
                </div>

                <!-- Lista de postulantes -->
                <div v-else>
                  <div v-if="filteredPostulants.length">
                    <div v-for="postulant in filteredPostulants" 
                         :key="postulant.id"
                         class="flex items-start p-3 bg-gray-50 rounded-lg mb-2 last:mb-0">
                      
                      <!-- Foto de perfil -->
                      <div class="flex-shrink-0 mr-4">
                        <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                          <img v-if="postulant.fotoPerfil" 
                               :src="postulant.fotoPerfil" 
                               :alt="`Foto de ${postulant.nombre}`"
                               class="w-full h-full object-cover"
                               @error="$event.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(postulant.nombre + ' ' + postulant.apellido)"
                          >
                          <div v-else 
                               class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                            {{ postulant.nombre?.[0]?.toUpperCase() }}{{ postulant.apellido?.[0]?.toUpperCase() }}
                          </div>
                        </div>
                      </div>

                      <!-- Información del postulante -->
                      <div class="flex-grow">
                        <p class="font-medium text-gray-900">{{ postulant.nombre }} {{ postulant.apellido }}</p>
                        <p v-if="postulant.email" class="text-gray-700">{{ postulant.email }}</p>
                        
                        <!-- Archivos adjuntos -->
                        <div v-if="postulant.archivos?.length" class="mt-2 pl-4 border-l-2 border-gray-100">
                          <div v-for="archivo in postulant.archivos" 
                               :key="archivo.nombre"
                               class="flex items-center text-sm py-1">
                            <a :href="archivo.url" 
                               target="_blank"
                               class="text-blue-600 hover:underline flex items-center">
                              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              {{ archivo.nombre }}
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Botón Ver Datos -->
                      <button @click="showPostulantDetails(postulant)"
                              class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                        Ver Datos
                      </button>
                    </div>
                    
                    <!-- Mostrar resultados del filtro -->
                    <div v-if="postulantSearchText || selectedPostulantStatus !== 'all'" 
                         class="text-sm text-gray-500 mt-4">
                      Mostrando {{ filteredPostulants.length }} de {{ selectedVacante?.postulants?.length }} postulantes
                    </div>
                  </div>
                  <div v-else class="text-gray-500 text-center py-8">
                    {{ selectedVacante?.postulants?.length ? 'No se encontraron postulantes con los filtros actuales' : 'No hay postulantes disponibles' }}
                  </div>
                </div>
              </div>

              <!-- Detalles -->
              <div v-if="activeModal === 'detalles'">
                <div v-if="selectedVacante?.description" class="mb-4">
                  <h4 class="font-bold mb-2 text-gray-900">Descripción Adicional</h4>
                  <p class="text-gray-800">{{ selectedVacante.description }}</p>
                </div>
                
                <div v-if="selectedVacante?.requirements">
                  <h4 class="font-bold mb-2 text-gray-900">Requisitos Adicionales</h4>
                  <p class="text-gray-800">{{ selectedVacante.requirements }}</p>
                </div>
              </div>

              <!-- Perfil -->
              <div v-if="activeModal === 'perfil'" class="p-6 space-y-6">
                <div v-if="!selectedVacante" class="text-center py-8 text-gray-500">
                  Cargando información del perfil...
                </div>
                
                <template v-else>
                  <!-- Requisitos -->
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold mb-2 text-gray-900">Requisitos</h4>
                    <div class="text-gray-800 prose max-w-none" v-html="selectedVacante.requisitos"></div>
                  </div>

                  <!-- Descripción del Trabajo -->
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold mb-2 text-gray-900">Descripción del Trabajo</h4>
                    <div class="text-gray-800 prose max-w-none" v-html="selectedVacante.descripcionTrabajo"></div>
                  </div>

                  <!-- Condiciones del Rol -->
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold mb-2 text-gray-900">Condiciones del Rol</h4>
                    <div class="text-gray-800 prose max-w-none" v-html="selectedVacante.condiciones"></div>
                  </div>

                  <!-- Beneficios -->
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold mb-2 text-gray-900">Beneficios</h4>
                    <div class="text-gray-800 prose max-w-none" v-html="selectedVacante.beneficios"></div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Nuevo modal para detalles del postulante -->
        <div v-if="showPostulantModal" 
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div class="bg-white rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <!-- Header del modal -->
            <div class="p-4 border-b flex justify-between items-center">
              <h3 class="text-lg font-bold text-gray-900">
                Datos del Postulante
              </h3>
              <button @click="closePostulantModal" class="text-gray-500 hover:text-gray-700">
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
                      <img v-if="selectedPostulant?.fotoPerfil" 
                           :src="selectedPostulant.fotoPerfil" 
                           :alt="`Foto de ${selectedPostulant.nombre}`"
                           class="w-full h-full object-cover"
                           @error="$event.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedPostulant.nombre + ' ' + selectedPostulant.apellido)"
                      >
                      <div v-else 
                           class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xl">
                        {{ selectedPostulant?.nombre?.[0]?.toUpperCase() }}{{ selectedPostulant?.apellido?.[0]?.toUpperCase() }}
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4 flex-grow">
                    <div v-if="selectedPostulant?.nombre || selectedPostulant?.apellido">
                      <p class="text-sm text-gray-600">Nombre completo</p>
                      <p class="font-medium text-gray-900">
                        {{ selectedPostulant?.nombre }} {{ selectedPostulant?.apellido }}
                      </p>
                    </div>
                    <div v-if="selectedPostulant?.email">
                      <p class="text-sm text-gray-600">Email</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.email }}</p>
                    </div>
                    <div v-if="selectedPostulant?.telefonoFijo">
                      <p class="text-sm text-gray-600">Teléfono Fijo</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.telefonoFijo }}</p>
                    </div>
                    <div v-if="selectedPostulant?.telefonoCelular">
                      <p class="text-sm text-gray-600">Teléfono Celular</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.telefonoCelular }}</p>
                    </div>
                    <div v-if="selectedPostulant?.fechaNacimiento">
                      <p class="text-sm text-gray-600">Fecha de Nacimiento</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.fechaNacimiento }}</p>
                    </div>
                    <div v-if="selectedPostulant?.dni">
                      <p class="text-sm text-gray-600">DNI</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.dni }}</p>
                    </div>
                    <div v-if="selectedPostulant?.cuil">
                      <p class="text-sm text-gray-600">CUIL</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.cuil }}</p>
                    </div>
                    <div v-if="selectedPostulant?.genero">
                      <p class="text-sm text-gray-600">Género</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.genero }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ubicación -->
              <div v-if="selectedPostulant?.direccion" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Ubicación</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="selectedPostulant.direccion.pais">
                    <p class="text-sm text-gray-600">País</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.direccion.pais }}</p>
                  </div>
                  <div v-if="selectedPostulant.direccion.provincia">
                    <p class="text-sm text-gray-600">Provincia</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.direccion.provincia }}</p>
                  </div>
                  <div v-if="selectedPostulant.direccion.ciudad">
                    <p class="text-sm text-gray-600">Ciudad</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.direccion.ciudad }}</p>
                  </div>
                  <div v-if="selectedPostulant.direccion.direccion">
                    <p class="text-sm text-gray-600">Dirección</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.direccion.direccion }}</p>
                  </div>
                </div>
              </div>

              <!-- Presentación -->
              <div v-if="selectedPostulant?.presentacionPostulante" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Presentación</h4>
                <div class="prose max-w-none text-gray-800 whitespace-pre-line">
                  {{ selectedPostulant.presentacionPostulante }}
                </div>
              </div>

              <!-- Información de la Postulación -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Información de la Postulación</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="selectedPostulant?.vacanteNombre">
                    <p class="text-sm text-gray-600">Puesto</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.vacanteNombre }}</p>
                  </div>
                  <div v-if="selectedPostulant?.fechaPostulacion">
                    <p class="text-sm text-gray-600">Fecha de Postulación</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.fechaPostulacion }}</p>
                  </div>
                  <div v-if="selectedPostulant?.etapa">
                    <p class="text-sm text-gray-600">Etapa</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.etapa }}</p>
                  </div>
                  <div v-if="selectedPostulant?.fuente">
                    <p class="text-sm text-gray-600">Fuente</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.fuente }}</p>
                  </div>
                  <div v-if="selectedPostulant?.salarioPretendido">
                    <p class="text-sm text-gray-600">Salario Pretendido</p>
                    <p class="font-medium text-gray-900">$ {{ selectedPostulant.salarioPretendido.toLocaleString('es-AR') }}</p>
                  </div>
                  <div v-if="selectedPostulant?.rechazado">
                    <p class="text-sm text-gray-600">Estado</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.rechazado === 'no' ? 'Activo' : 'Rechazado' }}</p>
                  </div>
                </div>
              </div>

              <!-- Experiencia Laboral -->
              <div v-if="selectedPostulant?.experienciasLaborales" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Experiencia Laboral</h4>
                
                <div class="relative pl-8 border-l-2 border-orange-200 space-y-8">
                  <div v-for="(exp, index) in safeJSONParse(selectedPostulant.experienciasLaborales)" 
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
              <div v-if="selectedPostulant?.estudios" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Estudios</h4>
                
                <div class="space-y-4">
                  <div v-for="(edu, index) in safeJSONParse(selectedPostulant.estudios)" 
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

              <!-- Tags -->
              <div v-if="selectedPostulant?.tags" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Tags</h4>
                
                <div class="flex flex-wrap gap-2">
                  <div v-for="(tag, index) in safeJSONParse(selectedPostulant.tags)" 
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
      </div>
    </div>
  </div>
</template>