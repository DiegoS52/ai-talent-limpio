<template>
  <div class="container mx-auto p-4">
    <!-- Encabezado con foto y nombre -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-6">
        <button @click="$router.back()" class="text-gray-600 hover:text-primary-blue">
          <i class="fas fa-arrow-left text-xl"></i>
        </button>
        
        <!-- Foto de perfil -->
        <div class="relative">
          <img 
            v-if="postulante.fotoPerfil" 
            :src="postulante.fotoPerfil" 
            :alt="`Foto de ${postulante.nombre}`"
            class="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            @error="handleImageError"
          />
          <div 
            v-else 
            class="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center"
          >
            <i class="fas fa-user text-4xl text-gray-400"></i>
          </div>
        </div>

        <div>
          <h1 class="text-2xl font-bold text-gray-800">
            {{ postulante.nombre }} {{ postulante.apellido }}
          </h1>
          <p class="text-gray-600">{{ postulante.vacanteNombre }}</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <span 
          class="px-3 py-1 rounded-full text-sm font-medium flex items-center"
          :class="postulante.isActive ? 
            'bg-green-100 text-green-800' : 
            'bg-red-100 text-red-800'"
        >
          <span class="w-2 h-2 rounded-full mr-2"
                :class="postulante.isActive ? 
                  'bg-green-400' : 
                  'bg-red-400'">
          </span>
          {{ postulante.isActive ? 'Activo' : 'Inactivo' }}
        </span>
        <button 
          @click="editarPostulante" 
          class="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600"
        >
          <i class="fas fa-edit mr-2"></i>
          Editar
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
    </div>

    <!-- Contenido principal -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Información Personal -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-user mr-2 text-primary-blue"></i>
          Información Personal
        </h2>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Nombre</label>
              <p class="text-gray-800">{{ postulante.nombre || '-' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Apellido</label>
              <p class="text-gray-800">{{ postulante.apellido || '-' }}</p>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Email</label>
            <p class="text-gray-800">{{ postulante.email || '-' }}</p>
            <a
              v-if="postulante.id && postulante.vacanteId"
              :href="`https://sooftglobal.hiringroom.com/app/postulant/getPostulant/${postulante.id}/${postulante.vacanteId}`"
              target="_blank"
              class="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-1"
            >
              <i class="fas fa-external-link-alt"></i>
              Ver ficha en HiringRoom
            </a>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">DNI</label>
              <p class="text-gray-800">{{ postulante.dni || '-' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">CUIL</label>
              <p class="text-gray-800">{{ postulante.cuil || '-' }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Teléfono Fijo</label>
              <p class="text-gray-800">{{ postulante.telefonoFijo || '-' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Teléfono Celular</label>
              <p class="text-gray-800">{{ postulante.telefonoCelular || '-' }}</p>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Nacionalidad</label>
            <p class="text-gray-800">{{ postulante.nacionalidad || '-' }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Fecha de Nacimiento</label>
              <p class="text-gray-800">{{ formatFecha(postulante.fechaNacimiento) || '-' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Género</label>
              <p class="text-gray-800">{{ postulante.genero || '-' }}</p>
            </div>
          </div>
          <div>
          <label class="text-sm font-medium text-gray-500">Tags</label>
          <div class="flex flex-wrap gap-2">
            <span v-if="postulante.tags?.length" 
                  v-for="tag in postulante.tags" 
                  :key="tag._id" 
                  class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {{ tag.nombre || '-' }}
            </span>
            <span v-else class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">-</span>
          </div>
        </div>
        </div>
      </div>

      <!-- Ubicación -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-map-marker-alt mr-2 text-primary-blue"></i>
          Ubicación
        </h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-500">País</label>
            <p class="text-gray-800">{{ postulante.direccion?.pais || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Provincia</label>
            <p class="text-gray-800">{{ postulante.direccion?.provincia || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Ciudad</label>
            <p class="text-gray-800">{{ postulante.direccion?.ciudad || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Información de Postulación -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-briefcase mr-2 text-primary-blue"></i>
          Información de Postulación
        </h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-500">Vacante</label>
            <p class="text-gray-800">{{ postulante.vacanteNombre || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Etapa</label>
            <span class="px-2 py-1 text-sm rounded-full" 
                  :class="getEtapaClass(postulante.etapa)">
              {{ postulante.etapa || '-' }}
            </span>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Calificación</label>
            <p class="text-gray-800">{{ postulante.calificacion || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Salario Pretendido</label>
            <p class="text-gray-800">{{ formatSalario(postulante.salarioPretendido) }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Fecha de Postulación</label>
            <p class="text-gray-800">{{ formatFecha(postulante.fechaPostulacion) }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Fuente</label>
            <p class="text-gray-800">{{ postulante.fuente || '-' }}</p>
          </div>

          <!-- Información de Rechazo -->
          <div v-if="postulante.rechazado?.length" class="mt-6 border-t pt-4">
            <label class="text-sm font-medium text-gray-500 block mb-2">
              <i class="fas fa-times-circle text-red-500 mr-2"></i>
              Información de Rechazo
            </label>
            <div v-for="(rechazo, index) in postulante.rechazado" 
                 :key="index"
                 class="bg-red-50 rounded-lg p-3 space-y-2">
              <div v-if="rechazo.razon">
                <span class="text-sm text-gray-600">Razón:</span>
                <span class="ml-2 text-red-700">{{ rechazo.razon }}</span>
              </div>
              <div v-if="rechazo.fechaRechazo">
                <span class="text-sm text-gray-600">Fecha:</span>
                <span class="ml-2 text-red-700">{{ formatFecha(rechazo.fechaRechazo) }}</span>
              </div>
              <div v-if="rechazo.vacanteId">
                <span class="text-sm text-gray-600">Vacante ID:</span>
                <span class="ml-2 text-red-700">{{ rechazo.vacanteId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Presentación -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-file-alt mr-2 text-primary-blue"></i>
          Presentación
        </h2>
        <div class="space-y-4">
          <p class="text-gray-800 whitespace-pre-line">
            {{ postulante.presentacionPostulante || 'Sin presentación' }}
          </p>
        </div>
      </div>

      <!-- Estudios -->
      <div class="bg-white rounded-lg shadow p-6 md:col-span-2">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-graduation-cap mr-2 text-primary-blue"></i>
          Estudios
        </h2>
        <div v-if="postulante.estudios?.length" class="space-y-4">
          <div v-for="estudio in postulante.estudios" 
               :key="estudio._id" 
               class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 class="font-semibold text-lg text-gray-800">{{ estudio.titulo || '-' }}</h3>
                <p class="text-gray-600">{{ estudio.institucion || 'Institución no especificada' }}</p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm"
                      :class="estudio.estudioActual ? 
                        'bg-green-100 text-green-800' : 
                        'bg-gray-100 text-gray-800'">
                  {{ formatPeriodoEstudio(estudio) }}
                </span>
              </div>
            </div>
            
            <div class="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-gray-500">País: <span class="ml-1">{{ estudio.pais || '-' }}</span></span>
              </div>
              <div>
                <span class="text-gray-500">Área: <span class="ml-1">{{ estudio.area || '-' }}</span></span>
              </div>
              <div>
                <span class="text-gray-500">Nivel: <span class="ml-1">{{ estudio.nivel || '-' }}</span></span>
              </div>
              <div>
                <span class="text-gray-500">Estado: <span class="ml-1">{{ estudio.estado || '-' }}</span></span>
              </div>
            </div>

            <div v-if="estudio.descripcion" class="mt-3 text-gray-600 text-sm">
              <p class="whitespace-pre-line">{{ estudio.descripcion }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay estudios registrados</p>
      </div>

      <!-- Experiencia Laboral -->
      <div class="bg-white rounded-lg shadow p-6 mt-6 md:col-span-2">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-briefcase mr-2 text-primary-blue"></i>
          Experiencia Laboral
        </h2>
        <div v-if="postulante.experienciasLaborales?.length" class="space-y-6">
          <div v-for="experiencia in postulante.experienciasLaborales" 
               :key="experiencia._id" 
               class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">{{ experiencia.puesto || '-' }}</h3>
                <p class="text-lg text-gray-700 mt-1">{{ experiencia.empresa || 'Empresa no especificada' }}</p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm"
                      :class="experiencia.trabajoActual ? 
                        'bg-green-100 text-green-800' : 
                        'bg-gray-100 text-gray-800'">
                  {{ formatPeriodoLaboral(experiencia) }}
                </span>
              </div>
            </div>
            
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span class="text-gray-500">País:</span>
                <span class="ml-2 text-gray-900">{{ experiencia.pais || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Área:</span>
                <span class="ml-2 text-gray-900">{{ experiencia.area || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Sub Área:</span>
                <span class="ml-2 text-gray-900">{{ experiencia.subArea || '-' }}</span>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Industria:</span>
                <span class="ml-2 text-gray-900">{{ experiencia.industria || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Seniority:</span>
                <span class="ml-2 text-gray-900">{{ experiencia.seniority || '-' }}</span>
              </div>
            </div>

            <div v-if="experiencia.descripcion" class="mt-4 text-gray-900">
              <p class="whitespace-pre-line">{{ experiencia.descripcion }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">Sin experiencia laboral registrada</p>
      </div>
    </div>
    <div class="h-8"></div> <!-- Espaciador explícito -->
    <!-- Secciones adicionales al final -->
    <div class="grid grid-cols-1 gap-8">
      <!-- Conocimientos -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-brain mr-2 text-primary-blue"></i>
          Conocimientos
        </h2>
        <div v-if="postulante.conocimientos?.length">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(conocimiento, index) in postulante.conocimientos" 
                  :key="index"
                  class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ conocimiento.nombre || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ conocimiento.tipo || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ conocimiento.nivel || '-' }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {{ conocimiento.descripcion || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-gray-500">No hay conocimientos registrados</p>
      </div>

      <!-- Redes Sociales -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-share-alt mr-2 text-primary-blue"></i>
          Redes Sociales
        </h2>
        <div v-if="postulante.redesSociales?.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="(red, index) in postulante.redesSociales" :key="index">
            <div v-if="red.tipo === 'linkedin'" class="flex items-center">
              <i class="fab fa-linkedin text-blue-600 mr-2"></i>
              <a :href="red.url" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a>
            </div>
            <div v-else-if="red.tipo === 'facebook'" class="flex items-center">
              <i class="fab fa-facebook text-blue-800 mr-2"></i>
              <a :href="red.url" target="_blank" class="text-blue-600 hover:underline">Facebook</a>
            </div>
            <div v-else-if="red.tipo === 'twitter'" class="flex items-center">
              <i class="fab fa-twitter text-blue-400 mr-2"></i>
              <a :href="red.url" target="_blank" class="text-blue-600 hover:underline">Twitter</a>
            </div>
            <div v-else-if="red.tipo === 'skype'" class="flex items-center">
              <i class="fab fa-skype text-blue-500 mr-2"></i>
              <span>{{ red.url }}</span>
            </div>
            <div v-else-if="red.tipo === 'website'" class="flex items-center">
              <i class="fas fa-globe text-gray-600 mr-2"></i>
              <a :href="red.url" target="_blank" class="text-blue-600 hover:underline">Sitio Web</a>
            </div>
            <div v-else-if="red.tipo === 'portfolio'" class="flex items-center">
          <i class="fas fa-briefcase text-gray-600 mr-2"></i>
          <a :href="red.url" target="_blank" class="text-blue-600 hover:underline">Portfolio</a>
        </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay redes sociales registradas</p>
      </div>

      <!-- Referencias -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-user-check mr-2 text-primary-blue"></i>
          Referencias
        </h2>
        <div v-if="postulante.referencias?.length" class="space-y-4">
          <div v-for="(referencia, index) in postulante.referencias" 
               :key="index"
               class="border border-gray-200 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-gray-500 text-sm">Nombre:</span>
                <p class="font-medium text-gray-900">{{ referencia.nombre }} {{ referencia.apellido }}</p>
              </div>
              <div>
                <span class="text-gray-500 text-sm">Relación:</span>
                <p class="font-medium text-gray-900">{{ referencia.relacion || '-' }}</p>
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-4">
              <div>
                <span class="text-gray-500 text-sm">Email:</span>
                <p class="text-gray-900">{{ referencia.email || '-' }}</p>
              </div>
              <div>
                <span class="text-gray-500 text-sm">Teléfono:</span>
                <p class="text-gray-900">{{ referencia.telefono || '-' }}</p>
              </div>
            </div>
            <div v-if="referencia.descripcion" class="mt-2">
              <span class="text-gray-500 text-sm">Descripción:</span>
              <p class="text-gray-900">{{ referencia.descripcion }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay referencias registradas</p>
      </div>

      <!-- Comentarios -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-comments mr-2 text-primary-blue"></i>
          Comentarios
        </h2>
        <div v-if="postulante.comentarios?.length" class="space-y-4">
          <div v-for="(comentario, index) in postulante.comentarios" 
               :key="index"
               class="bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="font-medium text-gray-900">{{ comentario.usuario }}</span>
                <span class="text-gray-500 text-sm"> - {{ comentario.vacante }}</span>
              </div>
              <span class="text-sm text-gray-500">{{ formatFecha(comentario.fecha) }}</span>
            </div>
            <p class="text-gray-900">{{ comentario.comentario }}</p>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay comentarios registrados</p>
      </div>

      <!-- Reportes -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-file-alt mr-2 text-primary-blue"></i>
          Reportes
        </h2>
        <div v-if="postulante.reportes?.length" class="space-y-4">
          <div v-for="(reporte, index) in postulante.reportes" 
               :key="index"
               class="border border-gray-200 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4 mb-2">
              <div>
                <span class="text-gray-500 text-sm">Vacante:</span>
                <p class="font-medium text-gray-900">{{ reporte.vacante }}</p>
              </div>
              <div>
                <span class="text-gray-500 text-sm">Fecha Creación:</span>
                <p class="text-gray-900">{{ formatFecha(reporte.fechaCreacion) }}</p>
              </div>
            </div>
            <div class="mb-2">
              <span class="text-gray-500 text-sm">Descripción:</span>
              <p class="text-gray-900">{{ reporte.descripcion }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm text-gray-900">
              <div>Creado por: {{ reporte.creadoPor }}</div>
              <div>Última modificación: {{ formatFecha(reporte.fechaUltimaModificacion) }}</div>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay reportes registrados</p>
      </div>

      <!-- Adjuntos -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-paperclip mr-2 text-primary-blue"></i>
          Archivos Adjuntos
        </h2>
        <div v-if="postulante.archivos?.length" class="space-y-2">
  <!-- Si tenés un array de archivos, mostralos como antes -->
  <div v-for="archivo in postulante.archivos" :key="archivo.nombre" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
    <div class="flex items-center">
      <i class="fas fa-file mr-2 text-gray-500"></i>
      <span class="text-gray-900">{{ archivo.nombre }}</span>
    </div>
    <a v-if="archivo.url" :href="archivo.url" target="_blank" class="text-primary-blue hover:text-blue-700">
      <i class="fas fa-download"></i>
    </a>
  </div>
</div>
<div v-else-if="postulante.adjuntos && Object.keys(postulante.adjuntos).length" class="space-y-2">
  <div
    v-for="(url, nombre) in postulante.adjuntos"
    :key="nombre"
    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
  >
    <div class="flex items-center">
      <i class="fas fa-file mr-2 text-gray-500"></i>
      <span class="text-gray-900">{{ nombre }}</span>
    </div>
    <a :href="url" target="_blank" class="text-primary-blue hover:text-blue-700">
      <i class="fas fa-download"></i>
    </a>
  </div>
    </div>
    <div v-else-if="loading" class="text-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mx-auto"></div>
    </div>
    <p v-else class="text-gray-500">No hay archivos adjuntos</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hiringRoomService } from '../services/hiringRoomService'
import axios from 'axios'

const current_env = () => {
  return import.meta.env.VITE_NODE_ENV
}
const BASE_URL = current_env() === 'production'
  ? "https://aitalent.sooft.tech"
  : "http://127.0.0.1:3005";

export default {
  name: 'PostulanteDetalle',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const postulante = ref({})
    const loading = ref(true)

    const fetchPostulante = async () => {
  try {
    loading.value = true;

    // 1. Obtener datos del postulante desde tu API local
    const response = await axios.get(`${BASE_URL}/api/postulants/${route.params.id}`);
    
    // 2. Obtener datos desde HiringRoom
    if (response.data.hiringRoomId) {
      const hiringRoomData = await hiringRoomService.getPostulantDetails(response.data.hiringRoomId);
      
      // Datos que queremos de la BD local
      const localData = {
        email: response.data.email,
        telefonoFijo: response.data.telefonoFijo,
        telefonoCelular: response.data.telefonoCelular,
        redesSociales: response.data.redesSociales,
        tags: response.data.tags,
        isActive: response.data.isActive
      };
      
      // Combinar los datos
      postulante.value = {
        // Datos de HiringRoom
        ...hiringRoomData, // Primero tomamos todo de HiringRoom
        ...hiringRoomData.postulant, // Luego sobrescribimos con los datos del postulante
        
        // Sobrescribir con datos locales
        ...localData,
        
        // Mantener los adjuntos de HiringRoom
        adjuntos: hiringRoomData.adjuntos || {}
      };

      // Log para verificar
      console.log('Datos de HiringRoom:', hiringRoomData);
      console.log('Datos locales:', localData);
      console.log('Postulante completo:', postulante.value);
    } else {
      // Si no hay hiringRoomId, usar los datos locales
      postulante.value = response.data;
    }

  } catch (error) {
    console.error('Error al cargar el postulante:', error);
  } finally {
    loading.value = false;
  }
}

    const formatSalario = (salario) => {
      if (!salario) return '-'
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(salario)
    }

    const formatFecha = (fecha) => {
      if (!fecha) return '-'
      // Si la fecha ya viene en formato string DD-MM-YYYY, la devolvemos directamente
      if (typeof fecha === 'string' && fecha.match(/^\d{2}-\d{2}-\d{4}$/)) {
        return fecha
      }
      // Si no, intentamos formatearla como Date
      return new Date(fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    const getEtapaClass = (etapa) => {
      const classes = {
        'Nuevo': 'bg-blue-100 text-blue-800',
        'En Proceso': 'bg-yellow-100 text-yellow-800',
        'Finalizado': 'bg-green-100 text-green-800',
        'Rechazado': 'bg-red-100 text-red-800'
      }
      return classes[etapa] || 'bg-gray-100 text-gray-800'
    }

    const editarPostulante = () => {
      router.push(`/base-postulantes/${route.params.id}/editar`)
    }

    const handleImageError = (e) => {
      // Si la imagen falla al cargar, reemplazamos con el ícono por defecto
      e.target.style.display = 'none'
      e.target.parentElement.innerHTML = '<i class="fas fa-user text-4xl text-gray-400"></i>'
    }

    const formatPeriodoEstudio = (estudio) => {
      const mesDesde = estudio.mesDesde ? `${estudio.mesDesde}/` : ''
      const mesHasta = estudio.mesHasta ? `${estudio.mesHasta}/` : ''
      const desde = estudio.añoDesde ? `${mesDesde}${estudio.añoDesde}` : '-'
      const hasta = estudio.estudioActual ? 'Actual' : 
                   (estudio.añoHasta ? `${mesHasta}${estudio.añoHasta}` : '-')
      
      return `${desde} - ${hasta}`
    }

    const formatPeriodoLaboral = (experiencia) => {
      const mesDesde = experiencia.mesDesde ? `${experiencia.mesDesde}/` : ''
      const mesHasta = experiencia.mesHasta ? `${experiencia.mesHasta}/` : ''
      const desde = experiencia.añoDesde ? `${mesDesde}${experiencia.añoDesde}` : '-'
      const hasta = experiencia.trabajoActual ? 'Actual' : 
                   (experiencia.añoHasta ? `${mesHasta}${experiencia.añoHasta}` : '-')
      
      return `${desde} - ${hasta}`
    }

    onMounted(fetchPostulante)

    return {
      postulante,
      loading,
      formatSalario,
      formatFecha,
      getEtapaClass,
      editarPostulante,
      handleImageError,
      formatPeriodoEstudio,
      formatPeriodoLaboral
    }
  }
}
</script> 