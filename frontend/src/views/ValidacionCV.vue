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
      username: '',
      password: '',
      token: '',
      showBusquedaProactivaModal: false,  // Agregamos esta línea´
      perfilBuscado: '',
      botonGenerandoFicha: false,
      botonGenerandoFichaOS: false,
    requisitosExtraidos: [],
    procesandoPerfil: false,
    buscandoCandidatos: false,
      vacancies: [],
      totalVacancies: 0,
      error: '',
      loading: false,
      result: null,
      serverStatus: null,
      searchText: '',
      selectedStatus: 'all',
      selectedCompanies: 'all',
      showContactInfo: {},
      selectedPostulantStatus: 'all',
      downloading: false,
      downloadProgress: 0,
      showModal: false,
      activeModal: null,
      selectedVacante: null,
      showPostulantModal: false,
      showPostulantModal1: false,
      selectedPostulant: null,
      selectedPostulant1: null,
      exportingExcel: false,
      downloadingAllCVs: false,
      loadingPostulants: false,
      postulantSearchText: '',
      loadingInitialData: true,
      loadingConsultasHistoricas: false,
      validationStatuses: {
        pendiente: { text: 'Pendiente', icon: 'clock', color: 'gray' },
        validado: { text: 'Validado', icon: 'check-circle', color: 'green' },
        no_aplica: { text: 'No aplica', icon: 'times-circle', color: 'red' },
        info_insuficiente: { text: 'Info Insuficiente', icon: 'exclamation-circle', color: 'yellow' },
        ia_no_disponible: { text: 'IA no disponible', icon: 'robot', color: 'gray' }
      },
      processingValidation: false,
      validationProgress: 0,
      currentProcessingIndex: 0,
      showValidationModal: false,
      validationResults: {
        validated: 0,
        notApplicable: 0
      },
      stopValidation: false,
      isReprocessing: false,
      openAIService: openAIService,
      showBackendResponseModal: false,
      selectedPostulantResponse: null,
      loadingVacancies: false,
      loadingMessage: '',
      showEntrevistaModal: false,
      cuestionario: null,
      showProgresoModal: false,
      estadoActualProceso: '',  
      scoreOrder: 'desc',
      buttonTextInterval: null,
      showProcessingText: false,
      currentPostulantName: '',
      currentPostulantResult: '',
      showPostulantResult: false,
      currentProcessingPostulantId: null,
      loadingVacancyId: null,
      postulantStatesVersion: 0,
      processingInterview: false,
      interviewData: null,
      entrevistaEnCurso: false,
      preguntaActual: null,
      progresoEntrevista: {
        total: 0,
        completadas: 0,
        porcentaje: 0
      },
      entrevistaRespuestas: null,
      responderEntrevistaModal: {
        show: false,
        preguntaActual: null,
        preguntas: [],
        preguntaActualIndex: 0,
        progreso: {
          total: 0,
          completadas: 0,
          porcentaje: 0
        },
        estado: 'sin_iniciar',
        isRecording: false
      },
      recognition: null,
      isRecording: false,
      currentCommentField: null,
      respuestaActual: null,  // Agregar esta línea
      mostrarRespuestaCorrecta: false,
      pagination: {
        currentPage: 1,
        limit: 100,
        total: 0,
        totalPages: 0
      },
      mostrarModalRequisitos: false,
      totalPostulantsToProcess: 0,
      showProgresoModal: false,
      estadoActualProceso: '',
      procesoBusquedaCompleto: false,
      progresoPostulantes: 0, // Agregamos esta línea
      estadisticasProceso: {
        totalPostulantes: 0,
        matchesEncontrados: 0,
        scorePromedio: 0
      },
      cancelarProceso: false,
      showResultadosModal: false,
      showCandidatoDetails: {},
      showInstrucciones: true,
      selectedPostulantIds: [],
      selectAllPostulants: false,
      entrevistados: {},
      showPerfilInput: true, // Inicialmente abierto
      showRequisitos: true, // Para controlar la visibilidad de los requisitos
      cancelando: false, // nuevo estado para tracking
      showAnalysisModalFlag: false,
      selectedAnalysis: null,
      mensajesProceso: [], // Array para almacenar todos los mensajes
      showConsultasHistoricasModal: false,
      busquedasHistoricas: [],  // Ahora es un array
      showRequisitosModal: false,
      requisitosSeleccionados: null,
      showResultadosBPModal: false,
      resultadosBPSeleccionados: null,
      expandedMatches: [],
      showPostulanteBPModal: false,
      postulanteBPSeleccionado: null,
      // AGREGAR AL INICIO DEL COMPONENTE, ANTES DE LOS MÉTODOS
 PESOS_CRITERIOS :{
    TECNICO: { peso: 40, minimo: 30 },
    LOCALIDAD: { peso: 30, minimo: 25 },
    IDIOMA: { peso: 15, minimo: 15 },
    EDUCACION: { peso: 10, minimo: 5 },
    SENIORITY: { peso: 5, minimo: 3 }
},
ROLES_TECNICOS : [
   // Desarrollo de Software
    'programador', 'desarrollador', 'developer', 'programmer', 'coder', 
    'software engineer', 'ingeniero de software', 'dev', 'analista programador', 
    'analista desarrollador', 'tech lead', 'technical leader', 'arquitecto', 
    'architect', 'analista', 'analyst', 'desarrollador full stack', 
    'full stack developer', 'frontend developer', 'backend developer', 
    'mobile developer', 'game developer', 'embedded developer',

    // Desarrollo en plataformas específicas
    'mainframe', 'cobol programmer', 'cobol developer', 'mainframe developer', 
    'SAP consultant', 'SAP developer', 'ABAP developer',

    // Data & Analytics
    'data analyst', 'data scientist', 'data engineer', 'machine learning engineer', 
    'AI engineer', 'BI developer', 'big data engineer',

    // Cloud & DevOps
    'cloud engineer', 'cloud architect', 'devops engineer', 'SRE', 'site reliability engineer', 
    'kubernetes engineer', 'AWS engineer', 'Azure engineer', 'GCP engineer',

    // Ciberseguridad
    'cybersecurity analyst', 'cybersecurity engineer', 'ethical hacker', 'pentester', 
    'security architect', 'SOC analyst', 'network security engineer',

    // Infraestructura & Redes
    'network engineer', 'network administrator', 'IT support', 'help desk', 
    'systems administrator', 'sysadmin', 'IT consultant',

    // QA & Testing
    'QA engineer', 'quality assurance engineer', 'test engineer', 'automation tester', 
    'manual tester', 'performance tester', 'penetration tester',

    // Gestión de proyectos & Product Management
    'scrum master', 'product owner', 'project manager', 'technical project manager', 
    'agile coach', 'business analyst', 'IT manager',

    // Especialistas en Tecnologías Específicas
    'Python developer', 'Java developer', 'C++ developer', 'JavaScript developer', 
    'React developer', 'Angular developer', 'Node.js developer', 'PHP developer', 
    'Ruby on Rails developer', 'Go developer', 'Swift developer', 'Kotlin developer',
    'Rust developer', 'Scala developer', 'SQL developer', 'NoSQL developer',

    // Inteligencia Artificial y Blockchain
    'AI specialist', 'blockchain developer', 'smart contract developer', 
    'crypto engineer', 'robotics engineer'
],
TERMINOS_PROFESIONALES : {
    'programador': ['developer', 'desarrollador', 'programmer', 'prog', 'dev', 'coder', 'programación', 'desarrollo'],
    'analista': ['analyst', 'analyser', 'analytic', 'análisis', 'analista de sistemas', 'business analyst', 'data analyst'],
    'arquitecto': ['architect', 'architecture', 'arquitectura', 'solutions architect', 'software architect', 'cloud architect'],
    'líder': ['lead', 'leader', 'leadership', 'liderazgo', 'team lead', 'tech lead', 'technical leader', 'scrum master'],
    'senior': ['sr', 'senior', 'especialista', 'experto', 'advanced', 'principal', 'seasoned'],
    'junior': ['jr', 'junior', 'entry-level', 'trainee', 'apprentice', 'beginner'],
    'fullstack': ['full stack', 'full-stack', 'stack completo', 'desarrollador integral', 'end-to-end developer'],
    'frontend': ['front end', 'front-end', 'cliente', 'ui developer', 'web developer', 'javascript developer', 'react developer', 'angular developer'],
    'backend': ['back end', 'back-end', 'servidor', 'api developer', 'server side', 'nodejs developer', 'java developer', 'python developer'],
    'devops': ['devops engineer', 'site reliability engineer', 'sre', 'automation engineer', 'cloud engineer', 'cicd', 'kubernetes', 'docker', 'terraform'],
    'data': ['data scientist', 'data engineer', 'data analyst', 'big data', 'bi developer', 'machine learning', 'ai engineer'],
    'seguridad': ['cybersecurity', 'security engineer', 'ethical hacker', 'pentester', 'soc analyst', 'ciberseguridad', 'hacking'],
    'qa': ['quality assurance', 'qa engineer', 'test engineer', 'automation tester', 'manual tester', 'software tester'],
    'infraestructura': ['sysadmin', 'it administrator', 'network engineer', 'system engineer', 'cloud administrator', 'soporte técnico'],
    'mobile': ['mobile developer', 'android developer', 'ios developer', 'swift developer', 'kotlin developer', 'flutter developer', 'react native developer'],
    'producto': ['product manager', 'product owner', 'gestor de producto', 'product lead'],
    'proyecto': ['project manager', 'technical project manager', 'gestor de proyectos', 'agile coach', 'scrum master'],
    'blockchain': ['blockchain developer', 'smart contract developer', 'crypto engineer', 'web3 developer'],
    'inteligencia artificial': ['ai engineer', 'machine learning engineer', 'deep learning', 'computer vision', 'nlp specialist'],
    'soporte': ['help desk', 'it support', 'desktop support', 'service desk', 'technical support'],
    'base de datos': ['database administrator', 'dba', 'sql developer', 'nosql', 'database engineer'],
    'erp': ['sap consultant', 'sap developer', 'abap developer', 'oracle consultant', 'erp specialist']
},

PALABRAS_COMUNES : new Set([
    "programador", "desarrollador", "analista", "arquitecto", "líder", 
    "senior", "junior", "fullstack", "frontend", "backend", "devops", "data", "seguridad", "qa", "infraestructura", 
    "mobile", "producto", "proyecto", "blockchain", "inteligencia artificial", "soporte", "base de datos", "erp","experiencia",
    "desarrollo","mantenimiento","implementación","configuración","optimización","integración","desarrollo web","desarrollo móvil",
    "desarrollo de software","desarrollo de aplicaciones","desarrollo de sistemas","desarrollo de bases de datos","desarrollo de interfaces",
    "desarrollo de APIs","desarrollo de microservicios","desarrollo de aplicaciones móviles","desarrollo de aplicaciones web",
    "desarrollo de aplicaciones de escritorio","desarrollo de aplicaciones de servidor","desarrollo de aplicaciones de cliente",
    "desarrollo de aplicaciones de servidor","desarrollo de aplicaciones de cliente","desarrollo de aplicaciones de servidor",
    "desarrollo de aplicaciones de cliente","sistemas","sistemas operativos","sistemas operativos","sistemas operativos","posición",
    "puesto","trabajo","empleo","oportunidad","oportunidades","oportunidad laboral","oportunidad laboral","oportunidad laboral",
 
    
 
// Artículos
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',

    // Conjunciones
    'y', 'o', 'e', 'u', 'pero', 'sino', 'aunque', 'porque', 'pues', 'mientras',
    'además', 'sin embargo', 'por lo tanto', 'entonces', 'así que', 'luego', 'ya que',

    // Preposiciones
    'de', 'del', 'en', 'con', 'para', 'por', 'al', 'a', 'ante', 'bajo', 'cabe', 
    'desde', 'hacia', 'hasta', 'sobre', 'tras', 'durante', 'mediante', 'según', 
    'excepto', 'salvo', 'conforme', 'contra', 'entre', 'sin',

    // Pronombres
    'yo', 'tú', 'él', 'ella', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 
    'ellos', 'ellas', 'usted', 'ustedes', 'me', 'te', 'se', 'nos', 'os', 
    'mi', 'mí', 'ti', 'le', 'les', 'lo', 'la', 'los', 'las', 'su', 'sus', 
    'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 
    'vuestros', 'vuestras', 'esto', 'eso', 'aquello', 'cual', 'cuales', 
    'quien', 'quienes', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'que', 'donde',

    // Adverbios
    'muy', 'más', 'menos', 'también', 'tampoco', 'así', 'entonces', 'luego', 
    'ya', 'todavía', 'aún', 'hoy', 'ayer', 'mañana', 'antes', 'después', 
    'pronto', 'tarde', 'siempre', 'nunca', 'jamás', 'quizás', 'tal vez', 
    'acaso', 'cerca', 'lejos', 'arriba', 'abajo', 'delante', 'detrás', 
    'fuera', 'dentro', 'encima', 'debajo', 'alrededor', 'mucho', 'poco',

    // Verbos comunes en infinitivo
    'ser', 'estar', 'haber', 'tener', 'hacer', 'poder', 'decir', 'ir', 'ver', 
    'dar', 'saber', 'querer', 'llegar', 'pasar', 'deber', 'poner', 'parecer', 
    'quedar', 'creer', 'hablar', 'llevar', 'dejar', 'seguir', 'encontrar', 
    'llamar', 'venir', 'pensar', 'salir', 'volver', 'tomar', 'conocer', 'vivir',

    // Interjecciones
    'ah', 'oh', 'eh', 'ay', 'uy', 'hala', 'vaya', 'caramba', 'dios', 'madre mía', 
    'hombre', 'bueno', 'vale', 'claro', 'seguro',

    // Otras palabras irrelevantes en una búsqueda laboral
    'tipo', 'forma', 'modo', 'manera', 'asunto', 'caso', 'cosa', 'tema', 'cuestión', 
    'aspecto', 'ejemplo', 'general', 'mismo', 'otra', 'otro', 'algunos', 'algunas', 
    'cada', 'cualquier', 'cualquiera', 'dicho', 'gran', 'mayor', 'menor', 'tal', 'total'
]),

 NIVELES_EDUCACION : {
    'secundario': { valor: 1, equivalencias: ['bachiller', 'high school', 'secundaria'] },
    'terciario': { valor: 2, equivalencias: ['técnico superior', 'technical degree'] },
    'universitario': { valor: 3, equivalencias: ['grado', 'licenciatura', 'ingeniería', 'bachelor'] },
    'posgrado': { valor: 4, equivalencias: ['maestría', 'master', 'doctorado', 'phd', 'postgrado'] }
},

 NIVELES_IDIOMA : {
    'basico': { valor: 1, equivalencias: ['basic', 'a1', 'a2', 'beginner'] },
    'intermedio': { valor: 2, equivalencias: ['intermediate', 'b1', 'b2', 'medium'] },
    'avanzado': { valor: 3, equivalencias: ['advanced', 'c1', 'c2', 'fluent', 'proficient'] },
    'nativo': { valor: 4, equivalencias: ['native', 'mother tongue', 'lengua materna'] }
},

 MODALIDADES_TRABAJO : {
    'remoto': ['remote', 'home office', 'trabajo remoto', 'teletrabajo', 'virtual', 'a distancia'],
    'presencial': ['on-site', 'oficina', 'on site', 'presencial', 'in-office'],
    'hibrido': ['hybrid', 'mixto', 'semi presencial', 'flexible']
},

TECNOLOGIAS_RELACIONADAS: {
				  // Tecnologías de los 80
				  'c': ['c89', 'c90', 'ansi c', 'k&r c'],
				  'c++': ['cpp', 'c with classes', 'borland c++'],
				  'pascal': ['delphi', 'turbo pascal', 'object pascal'],
				  'cobol': ['cobol-85', 'cobol-2002'],
				  'fortran': ['fortran77', 'fortran90', 'fortran95'],
				  'foxpro': ['fox pro', 'visual foxpro', 'vfp', 'fox', 'xbase', 'dbase'],

				  // Tecnologías de los 90
				  'java': ['spring', 'springboot', 'j2ee', 'jakarta', 'jdk', 'jre', 'jdbc', 'jsp'],
				  'javascript': ['js', 'ecmascript', 'es6', 'typescript', 'ts', 'node', 'nodejs'],
				  'php': ['laravel', 'symfony', 'wordpress', 'drupal', 'zend', 'codeigniter'],
				  'visual basic': ['vb6', 'vb.net', 'vba', 'vbscript'],
				  'perl': ['perl5', 'mod_perl', 'cgi'],
				  'sql': ['mysql', 'postgresql', 'oracle', 'sqlserver', 'mariadb', 'pl/sql', 't-sql'],
				  'asp': ['classic asp', 'asp.net', 'aspx', 'asp.net core'],
				  'vbscript': ['wscript', 'hta'],
				  'coldfusion': ['cfml'],

				  // Cloud y DevOps
				  'aws': ['amazon', 'ec2', 's3', 'lambda', 'rds', 'cloudfront', 'route53'],
				  'azure': ['microsoft azure', 'ms azure', 'azure devops', 'azure functions'],
				  'gcp': ['google cloud', 'google cloud platform', 'gcs', 'gke', 'cloud run', 'cloud functions'],
				  'terraform': ['iac', 'infra as code', 'hcl', 'terraform cloud'],
				  'ansible': ['ansible-playbook', 'ansible tower', 'config management'],
				  'puppet': ['puppetlabs', 'puppet enterprise'],
				  'kubernetes': ['k8s', 'kube', 'kubectl', 'minikube', 'eks', 'gke'],
				  'docker': ['container', 'kubernetes', 'k8s', 'podman', 'docker-compose', 'dockers', 'dockerfile'],

				  // Observabilidad
				  'grafana': ['grafana dashboards', 'grafana loki', 'grafana cloud'],
				  'datadog': ['monitoring', 'observability', 'ddog'],
				  'prometheus': ['metrics', 'prometheus.io', 'alertmanager'],

				  // CI/CD
				  'jenkins': ['ci/cd', 'pipeline', 'jenkinsfile'],
				  'teamcity': ['jetbrains', 'ci tool', 'build server'],
				  'rundeck': ['automation', 'job scheduling'],

				  // Infraestructura y redes
				  'haproxy': ['proxy', 'load balancer'],
				  'nginx': ['reverse proxy', 'web server'],
				  'varnish': ['cache', 'http accelerator'],
				  'ldap': ['active directory', 'directory service'],

				  // Bases de datos
				  'elasticsearch': ['elastic', 'elk', 'opensearch'],
				  'mysql': ['mariadb', 'sql'],
				  'mongodb': ['nosql', 'document db'],
				  'oracle': ['oracle db', 'pl/sql', 'oracle ebs', 'oracle bi', 'oracle di'],

				  // Scripting y programación
				  'bash': ['shell', 'bash script', 'sh'],
				  'python': ['django', 'flask', 'fastapi', 'py', 'pandas', 'numpy', 'scipy', 'scripting', 'automation'],

				  // Gestión de proyectos y soporte
				  'jira': ['atlassian', 'issue tracking'],
				  'confluence': ['wiki', 'documentation'],
				  'opsgenie': ['alerting', 'incident management'],
				  'pagerduty': ['incident response', 'alerting'],
				  'salesforce': ['crm', 'sales cloud'],

				  // Tecnologías modernas front-end
				  'typescript': ['ts', 'javascript', 'js', 'angular', 'vue', 'react'],
				  'node': ['nodejs', 'node.js', 'express', 'nestjs', 'npm', 'yarn'],
				  'react': ['reactjs', 'react.js', 'nextjs', 'gatsby', 'redux', 'react native'],
				  'angular': ['angularjs', 'angular.js', 'ng', 'angular cli', 'angular material'],
				  'vue': ['vuejs', 'vue.js', 'nuxt', 'vuex', 'vue router', 'vue cli'],
				  'net': ['.net', 'c#', 'csharp', 'asp.net', 'dotnet', 'net core', 'xamarin'],
				  'nosql': ['mongodb', 'cassandra', 'redis', 'dynamodb', 'couchdb', 'firebase'],
				  'git': ['github', 'gitlab', 'bitbucket', 'svn', 'source control', 'version control'],
				  'testing': ['jest', 'cypress', 'selenium', 'junit', 'phpunit', 'mocha', 'chai'],

				  // Diseño y multimedia
				  'adobe': ['photoshop', 'illustrator', 'after effects', 'premiere pro', 'xd'],
				  'figma': ['ux', 'ui', 'prototyping', 'wireframe', 'mockup'],
				  'blender': ['3d modeling', 'animation', 'rendering', '3d design'],
				  'unity': ['game development', 'c#', 'shadergraph', 'game engine'],
				  'unreal engine': ['game development', 'blueprints', 'c++', 'ue4', 'ue5'],
				  'maya': ['3d modeling', 'rigging', 'animation', 'autodesk'],
				  '3ds max': ['3d modeling', 'rendering', 'vray', 'autodesk'],

				  // Reclutamiento y RRHH
				  'ats': ['applicant tracking system', 'greenhouse', 'lever', 'jobvite'],
				  'linkedin': ['linkedin recruiter', 'linkedin talent insights'],
				  'workday': ['workday hcm', 'recruiting module', 'hr software'],
				  'sap successfactors': ['talent management', 'sap hcm', 'hr cloud'],
				  'bamboohr': ['hr software', 'recruitment', 'human resources'],
				  'zoho recruit': ['crm', 'recruitment automation', 'talent acquisition'],

				  // Alias generales útiles
				  'linux': ['gnu/linux', 'ubuntu', 'debian', 'centos', 'red hat', 'rhel'],
				  'devops': ['ci/cd', 'automation', 'infrastructure as code'],
				  'sre': ['site reliability', 'incident response', 'on-call', 'pagerduty'],
				  'cloud': ['aws', 'azure', 'gcp', 'cloud computing']
				}
    }
  },
  computed: {
    availableStatuses() {
      const statuses = new Set(this.vacancies.map(v => v.estadoActual));
      return ['all', ...Array.from(statuses)];
    },
    availableCompanies() {
    const companies = new Set(this.vacancies.map(v => v.area && v.area.nombre).filter(Boolean));
    return Array.from(companies);
    },
    analysisData1() {
      return localStorage.getItem(`analysis_${this.selectedVacante?.id}_${this.postulant?.id}`) || "No hay datos disponibles.";
    },
    filteredVacancies() {
    return this.vacancies.filter(vacante => {
      const matchesSearch = this.searchText === '' || 
        vacante.nombre.toLowerCase().includes(this.searchText.toLowerCase()) ||
        vacante.area?.nombre?.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesStatus = this.selectedStatus === 'all' || 
        vacante.estadoActual === this.selectedStatus;

      const matchesCompany = this.selectedCompanies === 'all' || 
        vacante.area?.nombre === this.selectedCompanies;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  },
    modalTitle() {
      switch (this.activeModal) {
        case 'usuarios':
          return `Usuarios Asignados de la vacante ${this.selectedVacante.nombre}`;
        case 'postulantes':
          return `Postulantes de la vacante ${this.selectedVacante.nombre}`;
        case 'detalles':
          return 'Detalles de la Vacante';
        case 'perfil':
          return `Perfil Buscado de la vacante ${this.selectedVacante.nombre}`;
        default:
          return '';
      }
    },
    tieneUbicacion() {
    const ubicacion = this.requisitosExtraidos?.ubicacion;
    return ubicacion && (
      ubicacion.pais !== 'No especificado' ||
      ubicacion.provincia !== 'No especificado' ||
      ubicacion.ciudad !== 'No especificado'
    )
  },
    filteredPostulants() {
      if (!this.selectedVacante?.postulants) return [];
      
      let filtered = [...this.selectedVacante.postulants];

      // Filtrar por texto de búsqueda
      if (this.postulantSearchText) {
        const searchText = this.postulantSearchText.toLowerCase();
        filtered = filtered.filter(postulant => 
          postulant.nombre?.toLowerCase().includes(searchText) ||
          postulant.apellido?.toLowerCase().includes(searchText) ||
          postulant.email?.toLowerCase().includes(searchText)
        );
      }

      // Filtrar por estado
      if (this.selectedPostulantStatus !== 'all') {
        filtered = filtered.filter(postulant => {
          switch(this.selectedPostulantStatus) {
            case 'validado':
              return postulant.validationStatus === 'validado';
            case 'no_aplica':
              return postulant.validationStatus === 'no_aplica';
            case 'pendiente':
              return postulant.validationStatus === 'pendiente';
            case 'info_insuficiente':
              return postulant.validationStatus === 'Info Insuficiente';
            case 'ia_no_disponible':
              return postulant.validationStatus === 'IA no disponible';
            default:
              return true;
          }
        });
      }

      // Ordenar por score
      if (this.scoreOrder) {
        console.log('Valor actual de scoreOrder:', this.scoreOrder);
        filtered.sort((a, b) => {
          // Si alguno es pendiente (no tiene score)
          const isPendingA = a.validationStatus === 'pendiente';
          const isPendingB = b.validationStatus === 'pendiente';
          
          // Convertir scores a números y manejar valores no numéricos
          const scoreA = isPendingA ? -999 : (Number(a.score) || -999);
          const scoreB = isPendingB ? -999 : (Number(b.score) || -999);
          
          // Para "Pendientes Primero"
          if (this.scoreOrder === 'Pendientes Primero') {
            if (isPendingA && !isPendingB) return -1;
            if (!isPendingA && isPendingB) return 1;
          }
          
          // Para "Pendientes Último"
          if (this.scoreOrder === 'Pendientes Último') {
            if (isPendingA && !isPendingB) return 1;
            if (!isPendingA && isPendingB) return -1;
          }
          
          // Ordenar por score (incluyendo asc/desc)
          if (this.scoreOrder === 'Score (Mayor a Menor)' || this.scoreOrder === 'desc') {
            return scoreB - scoreA;
          }
          if (this.scoreOrder === 'Score (Menor a Mayor)' || this.scoreOrder === 'asc') {
            return scoreA - scoreB;
          }
          
          return 0;
        });
      }

      return filtered;
    },
    tieneDetallesPosicion() {
      return this.requisitosExtraidos.modalidadTrabajo !== 'No especificada' ||
             this.requisitosExtraidos.tipoTrabajo !== 'No especificado' ||
             this.requisitosExtraidos.tipoDeContratacion !== 'No especificado' ||
             this.requisitosExtraidos.modalidadDeContratacion !== 'No especificada' ||
             this.requisitosExtraidos.jerarquia !== 'No especificada';
    },
    tieneRequisitosAdicionales() {
      return this.requisitosExtraidos.nivelMinimoEducacion !== 'No especificado' ||
             this.requisitosExtraidos.estadoNivelEducacion !== 'No especificado' ||
             this.requisitosExtraidos.requisitoSecundarioCompleto !== 'No especificado' ||
             this.requisitosExtraidos.requisitoIdioma !== 'No especificado' ||
             this.requisitosExtraidos.requisitoReubicacionLaboral !== 'No especificado' ||
             this.requisitosExtraidos.requisitoDisponibilidadHoraria !== 'No especificado' ||
             this.requisitosExtraidos.requisitoGenero !== 'No especificado' ||
             this.requisitosExtraidos.genero !== 'No especificado';
    },
    tieneBeneficiosCondiciones() {
      return this.requisitosExtraidos.beneficios !== 'No especificados' ||
             this.requisitosExtraidos.condiciones !== 'No especificado';
    },
    hasInterview() {
      // Agregar esta línea para que el computed dependa de postulantStatesVersion
      this.postulantStatesVersion; 
      if (!this.selectedVacante) return false;
      const interviewKey = `interview_${this.selectedVacante.id}`;
      const savedInterview = localStorage.getItem(interviewKey);
      return savedInterview !== null;
    },
    respuestaActual: {
      get() {
        if (!this.responderEntrevistaModal.preguntaActual) return '';
        const preguntaId = `${this.responderEntrevistaModal.preguntaActual.tipo}_${this.responderEntrevistaModal.preguntaActual.numero}`;
        if (!this.entrevistaRespuestas?.respuestas[preguntaId]) {
          return '';
        }
        return this.entrevistaRespuestas.respuestas[preguntaId].respuesta || '';
      },
      set(value) {
        if (!this.responderEntrevistaModal.preguntaActual) return;
        const preguntaId = `${this.responderEntrevistaModal.preguntaActual.tipo}_${this.responderEntrevistaModal.preguntaActual.numero}`;
        if (!this.entrevistaRespuestas.respuestas[preguntaId]) {
          this.entrevistaRespuestas.respuestas[preguntaId] = {
            respuesta: '',
            comentario: '',
            vioExplicacion: false
          };
        }
        this.entrevistaRespuestas.respuestas[preguntaId].respuesta = value;
        
        // Actualizar última modificación
        this.entrevistaRespuestas.fechaUltimaModificacion = new Date().toISOString();
        
        // Guardar en localStorage
        if (this.selectedVacante && this.selectedPostulant) {
          const answersKey = `interview_answers_${this.selectedVacante.id}_${this.selectedPostulant.id}`;
          localStorage.setItem(answersKey, JSON.stringify(this.entrevistaRespuestas));
        }
      }
    },


    requisitosFormateados() {
      if (!this.requisitosSeleccionados?.requisitos) return [];
      return this.requisitosSeleccionados.requisitos
        .split('.')
        .map(req => req.trim())
        .filter(req => req.length > 0);
    },

    filteredFields() {
      if (!this.vacancies || !this.vacancies.length) {
            console.log('No hay vacantes disponibles');
            return [];
        }
        
        // Tomamos solo la vacante seleccionada o la primera
        const vacante = this.selectedVacante || this.vacancies[0];
        console.log('Procesando vacante:', vacante);
        

        const fields = Object.entries(vacante)
            .filter(([key, value]) => 
                typeof value !== 'object' && 
                !['id', 'nombre', 'showDetails', 'showUsuarios',
                'estadoActual', 'publicadaMicrosite', 'publicada',
                'pipelineId', 'showCardContent', 'downloading',
                'downloadProgress', 'logoUrl', 'requisitos', 
                'descripcionTrabajo', 'prioridad','beneficios'].includes(key)
            )
            .map(([key, value]) => ({ key, value }));
            
        console.log('Campos filtrados:', fields);
        return fields;
    },
    firstColumnFields() {
        const middleIndex = Math.ceil(this.filteredFields.length / 2);
        const fields = this.filteredFields.slice(0, middleIndex);
        console.log('Primera columna:', fields);
        return this.filteredFields.slice(0, middleIndex);
    },
    secondColumnFields() {
        const middleIndex = Math.ceil(this.filteredFields.length / 2);
        const fields = this.filteredFields.slice(middleIndex);
        console.log('Segunda columna:', fields);
        return this.filteredFields.slice(middleIndex);
    },
    puedeRealizarBusqueda() {
      return this.requisitosExtraidos && 
             Object.keys(this.requisitosExtraidos).length > 0 && 
             !this.buscandoCandidatos;
    }
  },
  methods: {
    // Métodos de utilidad
    stripHtml(html) {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '');
    },

    handlePaste(event) {
        this.showPerfilInput = true;
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
verPostulanteBP(postulante) {
    console.log("1. Abriendo modal de postulante:", postulante);
    console.log("2. Estado previo:", this.showPostulanteBPModal);
    this.postulanteBPSeleccionado = postulante;
    this.showPostulanteBPModal = true;
    console.log("3. Estado posterior:", this.showPostulanteBPModal);
    console.log("4. Datos del postulante guardados:", this.postulanteBPSeleccionado);
},
  closePostulanteBPModal() {
    this.showPostulanteBPModal = false;
    this.postulanteBPSeleccionado = null;
  },
  toggleMatch(index) {
    if (this.expandedMatches.includes(index)) {
      this.expandedMatches = this.expandedMatches.filter(i => i !== index);
    } else {
      this.expandedMatches.push(index);
    }
  },
    togglePerfilInput() {
        this.showPerfilInput = !this.showPerfilInput;
    },

    verResultadosBP(busqueda) {
  console.log('1. Método verResultadosBP llamado');
  
  if (!busqueda) {
    console.error('No hay datos de búsqueda');
    return;
  }

  console.log('2. Datos de búsqueda:', busqueda);

  if (busqueda.resultados) {
    const matches = [...busqueda.resultados.matches];

    // Ordenar por calificación descendente (de mayor a menor)
    matches.sort((a, b) => {
      const scoreA = a.analysis?.analysis?.["Calificación de adecuación"]?.calificación ?? 0;
      const scoreB = b.analysis?.analysis?.["Calificación de adecuación"]?.calificación ?? 0;
      return scoreB - scoreA;
    });
    
    // Usar Promise.all para manejar todas las llamadas asíncronas
    Promise.all(matches.map(async (match, index) => {
      if (match.postulantInfo) {
        try {
          console.log('Intentando obtener detalles del postulante:', {
            hiringRoomId: match.postulantInfo.hiringRoomId
          });
          
          const response = await hiringRoomService.getPostulantDetails(
            match.postulantInfo.hiringRoomId
          );
          
          console.log('Respuesta completa:', response);
          
          // Verificar si la respuesta tiene la estructura esperada
          if (response && response.postulant && response.postulant.etapa) {
            matches[index].postulantInfo.etapa = response.postulant.etapa;
            console.log('Etapa asignada:', response.postulant.etapa);
          } else {
            console.log('Estructura de respuesta inesperada:', response);
          }
        } catch (error) {
          console.error('Error obteniendo detalles del postulante:', error);
        }
      }
    })).then(() => {
      // Asignamos los matches actualizados al objeto
      this.resultadosBPSeleccionados = {
        ...busqueda.resultados,
        matches,
      };

      console.log('3. resultadosBPSeleccionados actualizado:', this.resultadosBPSeleccionados);
      this.showResultadosBPModal = true;
      this.expandedMatches = [];
    });
  } else {
    console.error('No hay resultados BP disponibles');
    this.$toast.error('No hay resultados de búsqueda proactiva disponibles');
  }
},

  closeResultadosBPModal() {
    console.log('Cerrando modal de resultados BP');
    this.showResultadosBPModal = false;
    this.resultadosBPSeleccionados = null;
    this.expandedMatches = [];
  },
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.showInstrucciones = true;
        this.showPerfilInput = true;
        try {
            const text = await this.readFileContent(file);
            this.perfilBuscado = text;
            this.$toast.success('Archivo cargado correctamente');
            this.showPerfilInput = true; // Agregamos esta línea
            this.showInstrucciones = true;
          this.showPerfilInput = true;
        } catch (error) {
            console.error('Error al leer el archivo:', error);
            this.$toast.error('Error al cargar el archivo. Por favor, intente nuevamente.');
        }
    },

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },

 

    calcularExperienciaTotal(experiencias) {
        if (!experiencias?.length) return 0;
        const hoy = new Date().getFullYear();
        return experiencias.reduce((total, exp) => {
            const desde = exp.añoDesde ? parseInt(exp.añoDesde) : hoy;
            const hasta = exp.añoHasta ? parseInt(exp.añoHasta) : hoy;
            return total + Math.max(0, hasta - desde);
        }, 0);
    },

    calcularPuntajeExperiencia(años, minimo) {
        if (años >= minimo) return 20;
        if (años >= minimo * 0.75) return 15;
        if (años >= minimo * 0.5) return 10;
        if (años >= minimo * 0.25) return 5;
        return 0;
    },

    evaluarNivelSenior(experiencias) {
        if (!experiencias?.length) return 0;
        const tienePuestoSenior = experiencias.some(exp => 
            exp.puesto?.toLowerCase().includes('senior') ||
            exp.puesto?.toLowerCase().includes('lead') ||
            exp.puesto?.toLowerCase().includes('architect')
        );
        const añosExperiencia = this.calcularExperienciaTotal(experiencias);
        
        if (tienePuestoSenior && añosExperiencia >= 5) return 15;
        if (tienePuestoSenior || añosExperiencia >= 5) return 10;
        if (añosExperiencia >= 3) return 5;
        return 0;
    },

    evaluarEducacion(estudios, nivelRequerido) {
        if (!estudios?.length) return 0;
        const niveles = {
            'secundario': 1,
            'terciario': 2,
            'universitario': 3,
            'posgrado': 4
        };
        
        const nivelRequeridoNum = niveles[nivelRequerido.toLowerCase()] || 0;
        const maxNivelPostulante = Math.max(...estudios.map(e => 
            niveles[e.nivel?.toLowerCase()] || 0
        ));

        if (maxNivelPostulante >= nivelRequeridoNum) return 15;
        if (maxNivelPostulante === nivelRequeridoNum - 1) return 10;
        if (maxNivelPostulante === nivelRequeridoNum - 2) return 5;
        return 0;
    },

    evaluarIdioma(idiomas, idiomaRequerido, nivelRequerido) {
        if (!idiomas?.length) return 0;
        const niveles = {
            'basico': 1,
            'intermedio': 2,
            'avanzado': 3,
            'nativo': 4
        };

        const nivelRequeridoNum = niveles[nivelRequerido?.toLowerCase()] || 0;
        const idiomaEncontrado = idiomas.find(i => 
            i.nombre?.toLowerCase() === idiomaRequerido?.toLowerCase()
        );

        if (!idiomaEncontrado) return 0;
        const nivelPostulante = niveles[idiomaEncontrado.nivel?.toLowerCase()] || 0;

        if (nivelPostulante >= nivelRequeridoNum) return 10;
        if (nivelPostulante === nivelRequeridoNum - 1) return 5;
        return 0;
    },

    /* Métodos de búsquedas históricas
    cargarBusquedasHistoricas() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('search_history_search_')) {
                keys.push(key);
            }
        }
        
        keys.sort().reverse();
        
        const busquedas = keys.map(key => {
            return JSON.parse(localStorage.getItem(key));
        });
        
        this.busquedasHistoricas = busquedas;
    },
    */  
    async cargarBusquedasHistoricas() {
    try {
      console.log('Cargando búsquedas históricas desde MongoDB...');
      // Usar el servicio para obtener las búsquedas desde MongoDB
      this.busquedasHistoricas = await searchHistoryService.getSearchHistory();
      console.log('Búsquedas históricas cargadas:', this.busquedasHistoricas);
    } catch (error) {
      console.error('Error al cargar búsquedas históricas:', error);
      // Opcional: mostrar mensaje de error al usuario
      this.mostrarError('Error al cargar el historial de búsquedas');
    }
  },
  
  // Método opcional para mostrar errores
  mostrarError(mensaje) {
    // Implementar según tu sistema de notificaciones
    console.error(mensaje);
  },
    async abrirModalHistorico() {
      this.showConsultasHistoricasModal = true;
      await this.cargarBusquedasHistoricas();
    },
    async mounted() {
    await this.cargarBusquedasHistoricas();
  },


    verRequisitos(busqueda) {
        console.log('1. Método verRequisitos llamado');
        
        if (!busqueda) {
            console.error('No hay datos de búsqueda');
            return;
        }

        console.log('2. Datos de búsqueda:', busqueda);

        if (busqueda.requisitos_extraidos) {
            this.requisitosSeleccionados = busqueda.requisitos_extraidos;
            console.log('3. requisitosSeleccionados establecido:', this.requisitosSeleccionados);
            
            this.showRequisitosModal = true;
            console.log('4. showRequisitosModal establecido a:', this.showRequisitosModal);
        } else {
            console.error('No se encontraron requisitos extraídos en:', busqueda);
            this.$toast.error('No hay requisitos disponibles para mostrar');
        }
    },

  

    verDetallesResultados(busqueda) {
        console.log('Ver resultados:', busqueda);
    },

    async abrirConsultasHistoricas() {
  try {
    this.loadingConsultasHistoricas = true;
    console.log('Abriendo modal de consultas históricas');
    this.showConsultasHistoricasModal = true;
    await this.cargarBusquedasHistoricas();
  } catch (error) {
    console.error('Error al abrir consultas históricas:', error);
  } finally {
    this.loadingConsultasHistoricas = false; 
  }
},
    // Lifecycle hooks
    async mounted() {
        const token = localStorage.getItem('hr_token');
        if (token) {
            this.token = token;
            await this.loadVacancies();
        }
        await this.checkServer();
        this.initializeSpeechRecognition();
    },

    async created() {
        this.loadingVacancies = true;
        this.loadingMessage = 'Iniciando búsqueda de vacantes...';
        await this.getVacancies();
        try {
            this.loadingInitialData = true;
            /*await this.loadInitialData();*/
            await this.loadVacancies();
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
        } finally {
            this.loadingInitialData = false;
        }
        console.log('Iniciando inicialización de estados de postulantes');
        await this.initializePostulantStates();
    },

    // Métodos de búsqueda
    async buscarCandidatos() {
        try {
            // Inicialización
            this.buscandoCandidatos = true;
            this.mensajesProceso = []; // Array para almacenar todos los mensajes
            this.showProgresoModal = true;
            this.cancelarProceso = false;
            this.procesoBusquedaCompleto = false;
            this.progresoPostulantes = 0;
            this.candidatosEncontrados = [];

            // Configurar modal de progreso
            const modalStyle = document.querySelector('.progress-modal')?.style;
            if (modalStyle) modalStyle.zIndex = '9999';

            // Función helper para agregar mensajes
            const agregarMensaje = (mensaje) => {
                this.mensajesProceso.push(mensaje);
                this.estadoActualProceso = this.mensajesProceso.join('\n');
            };

            // FASE 1
let totalPostulantes = 0;
let resultado;

try {
    agregarMensaje('Iniciando búsqueda de candidatos...');
    
    // Ya no necesitamos el manejo de archivos local
    resultado = await hiringRoomService.getAllActivePostulants(progress => {
        this.progresoPostulantes = progress;
        this.mensajesProceso[this.mensajesProceso.length - 1] = 
            `Fase 1/5: Progreso de búsqueda... ${progress.toFixed(1)}%`;
        this.estadoActualProceso = this.mensajesProceso.join('\n');
    });

    if (resultado.canceled) {
        agregarMensaje('Proceso cancelado por el usuario');
        this.showProgresoModal = false;
        return;
    }
       // Esperar 1 segundo para asegurarnos que el backend guardó bien la data
       await new Promise(resolve => setTimeout(resolve, 1000));
        // Recuperar los postulantes usando la clave temporal devuelta
        const response = await axios.get(BASE_URL+`/api/postulants/retrieve-temp?key=${resultado.tempKey}`);
        const postulants = response.data;

        totalPostulantes = postulants.length;
        // agregarMensaje(`✅ Se encontraron ${totalPostulantes} postulantes activos`);
        resultado.postulants = postulants; // reemplazamos en el objeto para que todo siga funcionando igual


    
   /*  totalPostulantes = resultado.postulants.length;
    agregarMensaje(`✅ Se encontraron ${totalPostulantes} postulantes activos`); */

} catch (error) {
    console.error('Error en FASE 1:', error);
    agregarMensaje('❌ Error: No se pudieron obtener los datos de candidatos');
    throw new Error('No se pudieron obtener los datos de candidatos');
}
       /*      // FASE 1
            let totalPostulantes = 0;
            let resultado;  // Declaramos resultado al inicio

            try {
                // Función para guardar datos en archivo fijo
                const saveToFile = async (data) => {
                    try {
                        // Usar un directorio y nombre de archivo fijo
                        const dirHandle = await navigator.storage.getDirectory();
                        const fileHandle = await dirHandle.getFileHandle('hiring_room_cache.json', { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(JSON.stringify(data));
                        await writable.close();
                        return true;
                    } catch (error) {
                        console.error('Error guardando archivo:', error);
                        return false;
                    }
                };

                // Función para leer datos del archivo fijo
                const readFromFile = async () => {
                    try {
                        const dirHandle = await navigator.storage.getDirectory();
                        const fileHandle = await dirHandle.getFileHandle('hiring_room_cache.json');
                        const file = await fileHandle.getFile();
                        const content = await file.text();
                        return JSON.parse(content);
                    } catch (error) {
                        console.error('Error leyendo archivo:', error);
                        return null;
                    }
                };

                // Intentar leer datos cacheados
                const today = new Date().toISOString().split('T')[0];
                agregarMensaje('Buscando datos almacenados localmente...');
                const cachedData = await readFromFile();

                console.log('Fecha actual:', today);
                console.log('Datos cacheados:', cachedData);
                if (cachedData) {
                    console.log('Fecha del caché:', cachedData.fetchDate);
                    console.log('¿Son iguales?', cachedData.fetchDate === today);
                }

                if (cachedData && cachedData.fetchDate === today) {
                    // Usar datos cacheados
                    agregarMensaje(`Usaremos datos de Postulantes almacenados localmente (última actualización: ${new Date(cachedData.lastFetch).toLocaleTimeString()})`);
                    totalPostulantes = cachedData.postulants.length;
                    resultado = { postulants: cachedData.postulants };
                } else {
                    // Si hay datos pero son de otro día
                    if (cachedData) {
                        agregarMensaje(`⚠️ Datos encontrados pero son del ${cachedData.fetchDate} (hoy es ${today})`);
                    }
                    // Primera ejecución del día - fetch desde HiringRoom
                    agregarMensaje('⚠️ Primera ejecución del día - Obteniendo datos desde Hiring Room (puede demorar varios minutos)');
                    let mensajeProgresoIndex = this.mensajesProceso.length - 1;

                    resultado = await hiringRoomService.getAllActivePostulants(progress => {
                        if (this.cancelarProceso) {
                            if (confirm('¿Está seguro de que desea cancelar el proceso? Esta acción no se puede deshacer.')) {
                                throw new Error('CANCELED');
                            }
                            this.cancelarProceso = false;
                        }
                        this.progresoPostulantes = progress;
                        this.mensajesProceso[mensajeProgresoIndex] = 
                            `Fase 1/5: Progreso de búsqueda... ${progress.toFixed(1)}%`;
                        this.estadoActualProceso = this.mensajesProceso.join('\n');
                    });

                    if (resultado.canceled) {
                        agregarMensaje('Proceso cancelado por el usuario');
                        this.showProgresoModal = false;
                        return;
                    }

                    // Guardar nuevos datos en archivo
                    const saveData = {
                        fetchDate: today,
                        lastFetch: new Date().toISOString(),
                        postulants: resultado.postulants
                    };

                    const saved = await saveToFile(saveData);
                    if (saved) {
                        agregarMensaje('✅ Datos guardados localmente para futuras búsquedas');
                    } else {
                        agregarMensaje('⚠️ No se pudieron guardar los datos localmente');
                    }

                    totalPostulantes = resultado.postulants.length;
                }

                agregarMensaje(`Fase 1/5: Búsqueda inicial de candidatos completada (Hay ${totalPostulantes} postulantes)`);

            } catch (error) {
                if (error.message === 'CANCELED') {
                    throw error;
                }
                console.error('Error en FASE 1:', error);
                agregarMensaje('❌ Error: No se pudieron obtener los datos de candidatos');
                throw new Error('No se pudieron obtener los datos de candidatos');
            } */

            // FASE 2
            agregarMensaje(`Fase 2/5: Iniciando filtrado por tags (Vamos a procesar: ${totalPostulantes} postulantes)`);
            let postulantesFase1;
            try {
                postulantesFase1 = this.filtrarPorTags(
                    resultado.postulants,
                    this.requisitosExtraidos
                );
                agregarMensaje(`Postulantes que quedan después del filtro por tags: ${postulantesFase1.length}`);
                //agregarMensaje(`Fase 2/5: Filtrado por tags completado (Quedan: ${postulantesFase1.length} de ${totalPostulantes})`);
            } catch (error) {
                agregarMensaje(`Fase 2/5: Error en filtrado por tags: ${error.message}`);
                throw error;
            }

            // FASE 3: Evaluación técnica (antes era FASE 4)
            agregarMensaje(`Fase 3/5: Evaluación técnica basada en palabras claves (Vamos a procesar ${postulantesFase1.length} postulantes)`);
            const postulantesFase2 = this.filtrarPorPuntuacion(
                postulantesFase1,
                this.requisitosExtraidos
            );
            agregarMensaje(`Fase 3/5: Evaluación técnica completada (Quedan: ${postulantesFase2.length} postulantes de ${postulantesFase1.length})`);

            // FASE 4: Verificación de documentación y datos de contacto (antes era FASE 3)
            agregarMensaje(`Fase 4/5: Verificamos quienes tienen CV y datos de contacto (Procesaremos ${postulantesFase2.length} postulantes)`);
            const postulantesFiltrados = [];
            let procesados = 0;

            for (const postulante of postulantesFase2) {
                if (this.cancelarProceso) {
                    if (confirm('¿Está seguro de que desea cancelar el proceso? Esta acción no se puede deshacer.')) {
                        throw new Error('CANCELED');
                    }
                    this.cancelarProceso = false;
                }

                try {
                    procesados++;
                    this.progresoPostulantes = (procesados / postulantesFase2.length) * 100;
                    let mensajeProgresoFase4 = this.mensajesProceso.length - 1;
                    this.mensajesProceso[mensajeProgresoFase4] = `Fase 4/5: Verificando quienes tienen CV y datos de contacto... ${this.progresoPostulantes.toFixed(1)}%`;
                    
                    const detalles = await hiringRoomService.getPostulantDetails(postulante.hiringRoomId);
                    const tieneArchivos = detalles.archivos && detalles.archivos.length > 0;
                    const tieneDatosContacto = Boolean(detalles.email || detalles.telefono);
                    
                    if (tieneArchivos && tieneDatosContacto) {
                        postulantesFiltrados.push(postulante);
                    }
                } catch (error) {
                    console.error(`Error al obtener detalles del postulante ${postulante.hiringRoomId}:`, error);
                    continue;
                }
            }

            agregarMensaje(`Fase 4/5: Verificación completada (Quedan: ${postulantesFiltrados.length} de ${postulantesFase2.length})`);

            // FASE 5: Evaluación con OpenAI
            agregarMensaje(`Fase 5/5: Evaluaremos con Inteligencia Artificial los postulantes restantes (Procesando ${postulantesFiltrados.length} postulantes)`);
            const totalPostulantesFase5 = postulantesFiltrados.length; // Renombrada la variable
                
            // Continuar con el código existente pero usando postulantesFiltrados
            this.estadisticasProceso = {
                totalPostulantes: totalPostulantesFase5,
                matchesEncontrados: 0,
                scorePromedio: 0
            };
            const BATCH_SIZE = 5;
            const matches = [];

            for (let i = 0; i < postulantesFiltrados.length; i += BATCH_SIZE) {
              //agregarMensaje(`Procesando batch ${Math.floor(i/BATCH_SIZE) + 1} de ${Math.ceil(postulantesFiltrados.length/BATCH_SIZE)}`);
              const postulantesInicioBatch = i + 1;
    const postulantesFinalBatch = Math.min(i + BATCH_SIZE, postulantesFiltrados.length);
    agregarMensaje(`Analizando postulantes ${postulantesInicioBatch} a ${postulantesFinalBatch} de ${postulantesFiltrados.length}`);
                if (this.cancelarProceso) {
                    if (confirm('¿Está seguro de que desea cancelar el proceso? Esta acción no se puede deshacer.')) {
                        throw new Error('CANCELED');
                    }
                    this.cancelarProceso = false;
                }

                const batch = postulantesFiltrados.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map(async (postulant, batchIndex) => {
                    const currentIndex = i + batchIndex;
                    const progressPercent = ((currentIndex + 1) / totalPostulantesFase5 * 100);
                    this.progresoPostulantes = progressPercent;
                    let mensajeProgresoFase5 = this.mensajesProceso.length - 1;
                    this.mensajesProceso[mensajeProgresoFase5] = `Fase 5/5: Analizando con Inteligencia Artificial... ${progressPercent.toFixed(1)}%`;

                    // Obtener archivos del postulante
                    let archivos = [];
                    console.log('BUSCANDO CV DE :', postulant.apellido, postulant.nombre,postulant.hiringRoomId,postulant.id);
                    try {
                        const details = await hiringRoomService.getPostulantDetails(postulant.hiringRoomId);
                        archivos = details.archivos || [];
                    } catch (error) {
                        console.error('No se encontraron archivos adjuntos:', error);
                    }
                  console.log('ARCHIVOS ENCONTRADOS:', archivos);
                    try {
                        const analysis = await openAIService.detectPostulantesByProactivePerfil(
                            this.requisitosExtraidos,
                            this.buildCandidateInfo(postulant),
                            archivos
                        );
                      

                        const cumpleRequisitos = analysis.analysis['Cumplimiento de requisitos excluyentes'].respuesta === 'Si';
                       //const tieneScoreAlto = analysis.analysis.totalScore >= 60;
                        const tieneScoreAlto = analysis.analysis['Calificación de adecuación'].calificación >= 5

                           // Agregar mensaje si cumple alguno de los criterios
                           if (cumpleRequisitos && tieneScoreAlto) {
                              agregarMensaje(
                                  `✅ Match encontrado: ${postulant.nombre} ${postulant.apellido} ` +
                                  `(${cumpleRequisitos ? 'Cumple requisitos' : 'Score alto: ' + analysis.analysis.totalScore + '%'})`
                              );
                          }
                        console.log(
                            `✅ Postulante ${postulant.nombre} ${postulant.apellido} procesado - ` +
                            `Cumple requisitos: ${analysis.analysis['Cumplimiento de requisitos excluyentes'].respuesta} - ` +
                            `Score: ${analysis.analysis.totalScore}% ` +
                            `(T:${analysis.analysis.scores.technical}%, ` +
                            `E:${analysis.analysis.scores.experience}%, ` +
                            `Ed:${analysis.analysis.scores.education}%, ` +
                            `Y:${analysis.analysis.scores.years}%, ` +
                            `L:${analysis.analysis.scores.location}%, ` +
                            `T:${analysis.analysis.scores.tags}%)`
                        );
                        return (cumpleRequisitos && tieneScoreAlto) ? {
                            postulantInfo: postulant,
                            totalScore: analysis.totalScore,
                            detailedScores: analysis.scores,
                            analysis: analysis
                        } : null;
                    } catch (error) {
                        console.error(`Error procesando postulante ${currentIndex + 1}:`, error);
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                const validBatchResults = batchResults.filter(result => result !== null);
                matches.push(...validBatchResults);
                agregarMensaje(
                        `✅ ${validBatchResults.length} de ${batch.length} candidatos matchearon`
                    );

                this.candidatosEncontrados = [...matches].sort((a, b) => b.totalScore - a.totalScore);

                // Actualizar estadísticas
                this.estadisticasProceso.matchesEncontrados = matches.length;
                this.estadisticasProceso.scorePromedio = 
                    matches.reduce((acc, curr) => acc + curr.totalScore, 0) / matches.length;
            }

            // Proceso completado
            this.procesoBusquedaCompleto = true;

            // Agregar mensaje de resumen de resultados
            const cantidadMatches = matches.length;
            let mensajeResultado;

            if (cantidadMatches === 0) {
                mensajeResultado = '❌ No se encontraron postulantes que cumplan con los requisitos';
            } else {
                const scorePromedioFormateado = this.estadisticasProceso.scorePromedio.toFixed(1);
                mensajeResultado = `✅ Se encontraron ${cantidadMatches} postulante${cantidadMatches === 1 ? '' : 's'} con un score promedio de ${scorePromedioFormateado}%`;
            }

            agregarMensaje('\n=== RESULTADOS FINALES ===');
            agregarMensaje(mensajeResultado);
            agregarMensaje('Proceso completado exitosamente');
            this.showResultadosModal = true;


            console.log('\n=== PROCESO COMPLETADO ===');
            console.log(`Total postulantes procesados: ${totalPostulantesFase5}`);
            console.log(`Matches encontrados: ${this.estadisticasProceso.matchesEncontrados}`);
            console.log(`Score promedio: ${this.estadisticasProceso.scorePromedio?.toFixed(2) || 0}%`);

            // 1. Para el guardado en localStorage
            const validMatches = this.candidatosEncontrados.filter(match => 
                match.analysis?.analysis?.['Cumplimiento de requisitos excluyentes']?.respuesta === 'Si'
            );

            // Calcular score promedio de forma segura
            const scorePromedio = validMatches.length > 0 
                ? (validMatches.reduce((acc, curr) => acc + (curr.totalScore || 0), 0) / validMatches.length)
                : 0;
            // Guardar resultados
            const searchData = {
                perfil_buscado: this.perfilBuscado,
                requisitos_extraidos: this.requisitosExtraidos,
                resultados: {
                    total_postulantes: totalPostulantesFase5,
                    matches_encontrados: matches.length,
                    score_promedio: matches.length > 0 
                        ? matches.reduce((acc, curr) => acc + (curr.totalScore || 0), 0) / matches.length
                        : 0,
                    matches: matches
                }
            };

            //searchHistoryService.saveSearch(searchData);
            try {
    const jsonSize = JSON.stringify(searchData).length;
    console.log('Tamaño de datos a guardar:', (jsonSize / 1024 / 1024).toFixed(2), 'MB');
    
    // Verificar keys antes
    console.log('Keys en localStorage ANTES:', Object.keys(localStorage));
    
    await searchHistoryService.saveSearch(searchData);
    
    // Verificar keys después
    console.log('Keys en localStorage DESPUÉS:', Object.keys(localStorage));
    console.log('Búsqueda guardada exitosamente');
    
    // Intentar leer lo que se guardó
    const keys = Object.keys(localStorage).filter(k => k.startsWith('search_history_'));
    if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        console.log('Última búsqueda guardada:', {
            key: lastKey,
            data: JSON.parse(localStorage.getItem(lastKey))
        });
    } else {
        console.warn('No se encontraron búsquedas en localStorage');
    }
} catch (error) {
    console.error('Error al guardar la búsqueda:', error);
    if (error.name === 'QuotaExceededError') {
        console.error('Error: localStorage está lleno');
    }
}



        } catch (error) {
            if (error.message === 'CANCELED') {
                agregarMensaje('El proceso ha sido cancelado');
                setTimeout(() => this.showProgresoModal = false, 2000);
            } else {
                console.error('Error en búsqueda de candidatos:', error);
                agregarMensaje(`Error: ${error.message}`);
            }
        } finally {
            this.buscandoCandidatos = false;
        }
    },

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

    async loadPostulantsCount(vacante) {
  if (!vacante.postulantsCount) {
    try {
      vacante.postulantsCount = await hiringRoomService.getVacancyPostulantsCount(vacante.id);
     
    } catch (error) {
      console.error('Error cargando cantidad de postulantes:', error);
      vacante.postulantsCount = 0;
    }
  }
},  



        async testAuth() {
          try {
            this.loading = true;
            this.error = '';
            this.result = null;
            console.log('Iniciando autenticación...');
            
            const response = await hiringRoomService.authenticate({
              username: hiringRoomConfig.username,
              password: hiringRoomConfig.password,
              clientId: hiringRoomConfig.clientId,
              clientSecret: hiringRoomConfig.clientSecret
            });
            
            console.log('AJUTENTICACION EXITOSA guardando token...');
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



          console.log('Método loadVacancies llamado')
          const token = localStorage.getItem('hr_token')
          if (!token) {
            throw new Error('No hay token disponible')
          }
    
          console.log('Método loadVacancies llamado');
          this.loading = true;
            this.error = '';
            this.result = null;
            console.log('Iniciando autenticación X...');
            
            /*const response = await hiringRoomService.authenticate({
              username: hiringRoomConfig.username,
              password: hiringRoomConfig.password,
              clientId: hiringRoomConfig.clientId,
              clientSecret: hiringRoomConfig.clientSecret
            });*/
            
           
            /*console.log('AJUTENTICACION EXITOSA X guardando token...');
            this.token = response.token;
            this.result = response;*/
            
            console.log('Iniciando carga de vacantes inmediatamente después de autenticación...');
          if (!this.token) {
            console.warn('No hay token disponible para cargar vacantes');
            return;
          }

          console.log('Iniciando carga de vacantes...');
          console.log('Token obtenido:', this.token);
          try {
            console.log('Método loadVacancies llamado');
            console.log('Página actual:', this.pagination.currentPage);
            this.loadingVacancies = true;
            this.loadingMessage = 'Iniciando carga de vacantes...';

            const response = await hiringRoomService.getVacancies(
              this.pagination.currentPage - 1,  // Pasamos la página actual
              this.pagination.pageSize || -1 // Pasamos el tamaño de página
            );

            console.log('Respuesta completa:', response);
    console.log('Items en respuesta:', response?.items);
    console.log('Paginación en respuesta:', response?.pagination);
    // Agregamos validación antes del map



      /*       this.vacancies = response.items.map(v => ({
              ...v,
              showCardContent: false,
              activeSection: null,
              downloading: false,
              downloadProgress: 0
            })); */

        // NUEVO BLOQUE
        this.vacancies = await Promise.all(response.items.map(async v => {
          let postulantsCount = 0;
          try {
            const postulantsResponse = await hiringRoomService.getVacancyPostulantsCount(v.id);
            postulantsCount = postulantsResponse;
          } catch (error) {
            console.error(`Error obteniendo postulantes para vacante ${v.id}:`, error);
          }

          return {
            ...v,
            showCardContent: false,
            activeSection: null,
            downloading: false,
            downloadProgress: 0,
            postulantsCount
          };
        }));

            this.pagination = response.pagination;
            this.totalVacancies = response.pagination.total;


 
            this.pagination = {
              ...this.pagination,
              total: response.pagination.total,
              totalPages: response.pagination.totalPages,
              currentPage: response.pagination.currentPage + 1,
              limit: response.pagination.limit
            };

          } catch (error) {
            console.error('Error cargando vacantes:', error);
            this.error = 'Error al cargar las vacantes';
          } finally {
            this.loadingVacancies = false;
            this.loadingMessage = '';
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
            const response = await fetch(BASE_URL+'/api/health')
            const data = await response.json()
            this.serverStatus = data.status === 'ok'
            console.log('Estado del servidor:', data)
          } catch (err) {
            console.error('Error al verificar servidor:', err)
            this.serverStatus = false
          }
        },
        async analizarPerfil() {
          // Cerrar ambos collapsibles
          this.showInstrucciones = false;
          this.showPerfilInput = false;

          // Resto del código existente del método
          this.procesandoPerfil = true;
          try {
            const response = await openAIService.analizarPerfil(this.perfilBuscado);
            // Guardamos la respuesta completa sin transformarla
            this.requisitosExtraidos = response;
          } catch (error) {
            console.error('Error al analizar perfil:', error);
            this.$toast.error('Error al analizar el perfil. Por favor, intente nuevamente.');
          } finally {
            this.procesandoPerfil = false;
          }
        },
        async loadVacancyDetails(vacancyId) {
          console.log('loadVacancyDetails llamado con ID:', vacancyId);
          try {
            this.loading = true;
            this.error = '';

            const vacante = this.vacancies.find(v => v.id === vacancyId);
            
            if (!vacante.detailsLoaded) {
              console.log('Cargando detalles...');
              const [notes, requirements, postulants, baseInfo] = await Promise.all([
                hiringRoomService.getVacancyNotes(vacancyId),
                hiringRoomService.getVacancyRequirements(vacancyId),
                hiringRoomService.getVacancyPostulants(vacancyId),
                hiringRoomService.getVacancyBase(vacancyId)
              ]);

              const curriculums = postulants.curriculums || [];
              for (const postulant of curriculums) {
        try {
          console.log('Procesando postulante:', postulant.id);
          const analysis = await analysisService.getAnalysis(vacancyId, postulant.id);
          console.log('Análisis obtenido:', {
          postulantId: postulant.id,
          analysisFound: !!analysis,
          analysisData: analysis
        });
          
          if (analysis) {
            console.log('Análisis encontrado en MongoDB para postulante:', postulant.id);
            postulant.validationStatus = analysis.validationStatus;
            postulant.score = analysis.score;
          } else {
            // Fallback a localStorage
            const analysisKey = `analysis_${vacancyId}_${postulant.id}`;
            const localData = localStorage.getItem(analysisKey);
            
            if (localData) {
              console.log('Análisis encontrado en localStorage para postulante:', postulant.id);
              const parsedData = JSON.parse(localData);
              postulant.validationStatus = parsedData.validationStatus;
              postulant.score = parsedData.score;
            } else {
              console.log('No se encontró análisis para postulante:', postulant.id);
              postulant.validationStatus = 'pendiente';
            }
          }
        } catch (error) {
          console.error('Error cargando análisis para postulante:', postulant.id, error);
          postulant.validationStatus = 'pendiente';
        }
      }


              vacante.description = notes.result?.message || 'Sin descripción disponible';
              vacante.requirements = requirements.requisitos?.camposObligatorios?.join(', ') || 'Sin requisitos específicos';
            //  vacante.postulants = postulants.curriculums || [];
              vacante.postulants = curriculums;
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
        toggleCardContent(vacante) {
          vacante.showCardContent = !vacante.showCardContent;
        },
        async toggleSection(vacante, section) {
          console.log('1. Inicio toggleSection:', { section, vacanteId: vacante?.id });
          try {
            if (section === 'postulantes') {
              this.loadingVacancyId = vacante.id;
              console.log('2. Entrando a sección postulantes');
            }

            if (section === 'perfil') {
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
              if ((section === 'detalles' || section === 'postulantes') && !vacante.detailsLoaded) {
                const [notes, requirements, postulants, baseInfo] = await Promise.all([
                  hiringRoomService.getVacancyNotes(vacante.id),
                  hiringRoomService.getVacancyRequirements(vacante.id),
                  hiringRoomService.getVacancyPostulants(vacante.id),
                  hiringRoomService.getVacancyBase(vacante.id)
                ]);

                vacante.description = notes.result?.message || 'Sin descripción disponible';
                vacante.requirements = requirements.requisitos?.camposObligatorios?.join(', ') || 'Sin requisitos específicos';
                //PAGINACION MANUAL DE POSTULANTES PARA MOSTRAR TODOS EN UN MISMO MODAL
                let allPostulants = postulants.curriculums || [];
                let currentPage = 0;
                const totalPages = postulants.totalPaginas || 1;

                while (currentPage + 1 < totalPages) {
                  currentPage++;
                  const nextPageResponse = await hiringRoomService.getVacancyPostulants(vacante.id, currentPage);
                  allPostulants = allPostulants.concat(nextPageResponse.curriculums || []);
                }

                vacante.postulants = allPostulants;

                vacante.baseInfo = baseInfo.vacante;
                vacante.detailsLoaded = true;

                if (section === 'postulantes') {
                  console.log('3. Cargando detalles de postulantes');
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

            if (section === 'postulantes') {
              console.log('4. Antes de inicializar estados:', {
                tieneVacante: !!this.selectedVacante,
                tienePostulantes: !!this.selectedVacante?.postulants,
                cantidadPostulantes: this.selectedVacante?.postulants?.length
              });
              this.initializePostulantStates();
              console.log('5. Estados inicializados');
            }

          } catch (error) {
            console.error('Error detallado en toggleSection:', {
              message: error.message,
              error: error,
              stack: error.stack
            });
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
            if (!vacante.detailsLoaded) {
              await this.loadVacancyDetails(vacante.id);
            }

            if (!vacante.postulants?.length) {
              alert('No hay postulantes disponibles para esta vacante');
              return;
            }

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

            const files = resultados.flatMap(resultado => {
              const { postulant, archivos } = resultado;
              return archivos.map(archivo => {
                let extension;
                if (archivo.nombre.includes('.')) {
                  extension = archivo.nombre.split('.').pop();
                } else {
                  extension = 'pdf';
                }
                
                const refId = vacante.nombre.split(' ')[0] || '';
                
                const nombreLimpio = archivo.nombre.replace(/[^a-z0-9.-]/gi, '_');
                
                const nombreBase = !archivo.nombre.includes('.') ? 
                  nombreLimpio.replace(/_+$/, '') : 
                  nombreLimpio;
                
                const nombreFinal = `REF${refId}_${postulant.nombre}_${postulant.apellido}_${nombreBase}.${extension}`;

                return {
                  nombre: nombreFinal,
                  url: archivo.url
                };
              });
            });

            const zip = new JSZip();
            const totalFiles = files.length;
            
            async function downloadWithRetry(url, token, maxRetries = 3) {
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  const response = await fetch(BASE_URL+`/api/download-file`, {
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
                if (!confirm(`Error al descargar ${file.nombre}. ¿Desea continuar con los demás archivos?`)) {
                  throw new Error('Descarga cancelada por el usuario');
                }
              }
            }

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
        async showPostulantDetails1(postulant) {
          console.log('AHORA Datos completos del postulante:', JSON.stringify(postulant, null, 2));
          this.showPostulantModal1 = false;  // Cierra el modal antes de abrirlo para forzar re-render
          await this.$nextTick();  // Espera a que Vue actualice el DOM
      this.selectedPostulant1 = postulant;
      this.showPostulantModal1 = true;
    },
        closePostulantModal() {
          this.showPostulantModal = false;
          this.selectedPostulant = null;
        },
        closePostulantModal1() {
          this.showPostulantModal1 = false;
          this.selectedPostulant1 = null;
        },


        exportToExcel(vacante) {
          this.exportingExcel = true;
          try {
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

            const ws = XLSX.utils.json_to_sheet(data);
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Postulantes');

            const fileName = `Postulantes_${vacante.nombre.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
          } catch (error) {
            console.error('Error exportando a Excel:', error);
            alert('Error al exportar a Excel');
          } finally {
            this.exportingExcel = false;
          }
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
          return data;
        },
        toggleContactInfo(postulantId) {
        this.showContactInfo[postulantId] = !this.showContactInfo[postulantId];
      },
        toggleValidationMenu(postulant) {
          if (!postulant.validationStatus) {
            this.$set(postulant, 'validationStatus', 'pendiente');
          }
          
          const newStatus = window.confirm('¿Desea marcar como validado?') ? 
            'validado' : 
            window.confirm('¿Marcar como no aplica?') ? 
              'no_aplica' : 
              'pendiente';
          
          this.$set(postulant, 'validationStatus', newStatus);
        },
//        async validarCVs(reprocessAll = false) {

        async validarCVs(reprocessAll = false, postulantsToProcessOverride = null) {
              let postulantsToProcess;

              if (postulantsToProcessOverride) {
                postulantsToProcess = postulantsToProcessOverride;
              } else if (!this.selectedVacante?.postulants?.length) {
                alert('No hay postulantes para validar');
                return;
              } else {
                postulantsToProcess = reprocessAll
                  ? this.selectedVacante.postulants
                  : this.selectedVacante.postulants.filter(p => !p.validationStatus || p.validationStatus === 'pendiente');
              }

              if (!postulantsToProcess.length) {
                alert('No hay postulantes pendientes para validar');
                this.processingValidation = false;
                return;
              }



              this.totalPostulantsToProcess = postulantsToProcess.length;

      /*     if (!this.selectedVacante?.postulants?.length) {
            alert('No hay postulantes para validar');
            return;
          } */

          this.processingValidation = true;
          this.showProcessingText = false;
          
          if (this.buttonTextInterval) {
            clearInterval(this.buttonTextInterval);
          }
          
          this.buttonTextInterval = setInterval(() => {
            this.showProcessingText = !this.showProcessingText;
          }, 1000);

          this.validationProgress = 0;
          this.currentProcessingIndex = 0;
          this.validationResults = { validated: 0, notApplicable: 0 };
          this.stopValidation = false;
          this.isReprocessing = reprocessAll;

          /* const postulantsToProcess = reprocessAll ? 
            this.selectedVacante.postulants : 
            this.selectedVacante.postulants.filter(p => !p.validationStatus || p.validationStatus === 'pendiente');
 */
          if (!reprocessAll && postulantsToProcess.length === 0) {
            alert('No hay postulantes pendientes para validar');
            this.processingValidation = false;
            return;
          }

          for (let i = 0; i < postulantsToProcess.length; i++) {
            if (this.stopValidation) break;

            const postulant = postulantsToProcess[i];
            this.currentProcessingIndex = i;
            this.currentProcessingPostulantId = postulant.id;
            this.currentPostulantName = `${postulant.nombre} ${postulant.apellido}`;
            this.showPostulantResult = false;

            try {
              const jobDescription = {
        // Información básica
        titulo: this.selectedVacante.nombre || '',
        area: this.selectedVacante.areaTrabajo?.nombre || this.selectedVacante.areaTrabajo || '',
        descripcion: this.stripHtml(this.selectedVacante.descripcionTrabajo || ''),
        requisitos: this.stripHtml(this.selectedVacante.requisitos || ''),
        
        // Modalidad y tipo
        modalidadTrabajo: this.selectedVacante.modalidadTrabajo || '',
        tipoTrabajo: this.selectedVacante.tipoTrabajo || '',
        tipoDeContratacion: this.selectedVacante.tipoContratacion || '',
        modalidadDeContratacion: this.selectedVacante.modalidadContratacion || '',
        
        // Ubicación
        ubicacion: {
            pais: this.selectedVacante.ubicacion?.pais || this.selectedVacante.pais || '',
            provincia: this.selectedVacante.ubicacion?.provincia || this.selectedVacante.provincia || '',
            ciudad: this.selectedVacante.ubicacion?.ciudad || this.selectedVacante.ciudad || ''
        },
        
        // Información de la empresa y área
        descripcionEmpresa: this.stripHtml(this.selectedVacante.descripcionEmpresa || ''),
        areaTrabajo: this.selectedVacante.areaTrabajo?.nombre || this.selectedVacante.areaTrabajo || '',
        descripcionTrabajo: this.stripHtml(this.selectedVacante.descripcionTrabajo || ''),
        
        // Requisitos educativos
        estadoNivelEducacion: this.selectedVacante.estadoNivelEducacion || '',
        nivelMinimoEducacion: this.selectedVacante.nivelMinimoEducacion || '',
        requisitoSecundarioCompleto: this.selectedVacante.requisitoSecundarioCompleto || 'no',
        
        // Requisitos específicos
        requisitoIdioma: this.selectedVacante.requisitoIdioma || 'no',
        idioma: this.selectedVacante.idioma || '',
        requisitoReubicacionLaboral: this.selectedVacante.requisitoReubicacionLaboral || 'no',
        requisitoDisponibilidadHoraria: this.selectedVacante.requisitoDisponibilidadHoraria || 'no',
        requisitoGenero: this.selectedVacante.requisitoGenero || 'no',
        
        // Jerarquía y género
        jerarquia: this.selectedVacante.jerarquia || '',
        genero: this.selectedVacante.genero || '',

        // Información adicional
        beneficios: this.stripHtml(this.selectedVacante.beneficios || ''),
        condiciones: this.stripHtml(
            this.selectedVacante.condiciones || 
            this.selectedVacante.condicionesRol || 
            this.selectedVacante.condicionesTrabajo || 
            ''
        )
    };

    const candidateInfo = {
        // Datos personales básicos
        datosPersonales: {
            dni: postulant.dni || '',
            nombre: postulant.nombre || '',
            apellido: postulant.apellido || '',
            fechaNacimiento: postulant.fechaNacimiento || '',
            telefonoFijo: postulant.telefonoFijo || '',
            telefonoCelular: postulant.telefonoCelular || '',
            email: postulant.email || '',
            genero: postulant.genero || '',
            fotoPerfil: postulant.fotoPerfil || '',
            nacionalidad: postulant.nacionalidad || ''
        },

        // Ubicación y contacto
        direccion: postulant.direccion ? {
            pais: postulant.direccion.pais || '',
            provincia: postulant.direccion.provincia || '',
            ciudad: postulant.direccion.ciudad || '',
            direccion: postulant.direccion.direccion || ''
        } : {},

        // Redes sociales
        redesSociales: {
            linkedin: postulant.redesSociales?.linkedin || '',
            facebook: postulant.redesSociales?.facebook || '',
            twitter: postulant.redesSociales?.twitter || '',
            googlePlus: postulant.redesSociales?.googlePlus || '',
            skype: postulant.redesSociales?.skype || '',
            website: postulant.redesSociales?.website || ''
        },

        // Conocimientos y habilidades
        conocimientos: Array.isArray(postulant.conocimientos) ? 
            postulant.conocimientos.map(c => ({
                tipo: c.tipo || '',
                nombre: c.nombre || '',
                nivel: c.nivel || '',
                calificacion: c.calificacion || '',
                descripcion: c.descripcion || ''
            })) : 
            this.safeJSONParse(postulant.conocimientos, []),

        // Experiencia laboral
        experiencia: this.safeJSONParse(postulant.experienciasLaborales).map(exp => ({
            empresa: exp.empresa || '',
            puesto: exp.puesto || '',
            mesDesde: exp.mesDesde || 0,
        añoDesde: exp.añoDesde || 0,
        mesHasta: exp.mesHasta || 0,
        añoHasta: exp.añoHasta || 0,
        trabajoActual: exp.trabajoActual || false,
        pais: exp.pais || 0,
        area: exp.area || 0,
        subArea: exp.subArea || 0,
        industria: exp.industria || 0,
        seniority: exp.seniority || 0,
        descripcion: this.stripHtml(exp.descripcion || ''),
        periodo: `${exp.mesDesde}/${exp.añoDesde} - ${exp.trabajoActual ? 'Actual' : `${exp.mesHasta}/${exp.añoHasta}`}`
    })),

    // Formación académica
    estudios: this.safeJSONParse(postulant.estudios).map(estudio => ({
        institucion: estudio.institucion || 0,
        titulo: estudio.titulo || '',
        mesDesde: estudio.mesDesde || 0,
        añoDesde: estudio.añoDesde || 0,
        mesHasta: estudio.mesHasta || 0,
        añoHasta: estudio.añoHasta || 0,
        estudioActual: estudio.estudioActual || false,
        pais: estudio.pais || 0,
        area: estudio.area || 0,
        nivel: estudio.nivel || 0,
        estado: estudio.estudioActual ? 'En curso' : 'Finalizado',
        descripcion: this.stripHtml(estudio.descripcion || ''),
        periodo: `${estudio.añoDesde} - ${estudio.estudioActual ? 'Actual' : estudio.añoHasta}`
    })),

    // Referencias laborales
    referencias: (postulant.referencias || []).map(ref => ({
        apellido: ref.apellido || '',
        nombre: ref.nombre || '',
        relacion: ref.relacion || '',
        telefono: ref.telefono || '',
        email: ref.email || '',
        descripcion: ref.descripcion || ''
    })),

    // Disponibilidad y presentación
    disponibilidadHoraria: postulant.disponibilidadHoraria || '',
    disponibilidadRelocacion: postulant.disponibilidadRelocacion || '',
    presentacion: this.stripHtml(postulant.presentacionPostulante || ''),
    etapa: postulant.etapa || '',

    // Archivos adjuntos
    archivosCV: (postulant.archivos || []).map(a => ({
        nombre: a.nombre || '',
        url: a.url || ''
    }))
};

          const result = await openAIService.analyzeCandidate(
            jobDescription,
            candidateInfo
          );

          // Obtener el score de la respuesta de OpenAI
          const score = result?.analysis?.["Calificación de adecuación"]?.calificación;
          postulant.score = score;

          // En la parte donde se determina el estado
          if (score === -2) {
            console.log(`Postulante ${postulant.nombre}: Score -2 -> IA no disponible`);
            postulant.validationStatus = 'IA no disponible';
          } else if (score === -1) {
            console.log(`Postulante ${postulant.nombre}: Score -1 -> Info Insuficiente`);
            postulant.validationStatus = 'Info Insuficiente';
          } else if (score >= 7) {
            console.log(`Postulante ${postulant.nombre}: Score ${score} -> Validado`);
            postulant.validationStatus = 'validado';
          } else {
            console.log(`Postulante ${postulant.nombre}: Score ${score} -> No aplica`);
            postulant.validationStatus = 'no_aplica';
          }

          // Agregar log después de asignar el estado
          console.log('Estado actualizado:', {
            postulante: postulant.nombre,
            score: score,
            nuevoEstado: postulant.validationStatus,
            postulantCompleto: postulant
          });

          // Actualizar la lista de postulantes
          this.selectedVacante.postulants = [...this.selectedVacante.postulants];

          // Actualizar contadores de resultados
          this.validationResults[postulant.validationStatus === 'validado' ? 'validated' : 'notApplicable']++;

          console.log('Resultado del procesamiento:', {
            postulante: `${postulant.nombre} ${postulant.apellido}`,
            status: postulant.validationStatus,
            resultado: result
          });

          console.log('Procesando postulante:', postulant.nombre);
          console.log('Resultado:', result);

          /*const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
          localStorage.setItem(analysisKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            jobInfo: jobDescription,
            candidateInfo,
            result: {
              ...result,
              score: result.score || (result.isMatch ? 7 : 3)
            }
          }));*/

              // Crear el objeto con los datos del análisis
              const analysisData = {
                timestamp: new Date().toISOString(),
                vacancyId: this.selectedVacante.id,
                postulantId: postulant.id,
                jobInfo: jobDescription,
                candidateInfo,
                result: {
                  ...result,
                  score: result.score || (result.isMatch ? 7 : 3)
                },
                userEmail: localStorage.getItem('user_email') || '',
                validationStatus: postulant.validationStatus
              };

              // Guardar en localStorage (manteniendo el nombre original de la variable)
              const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
              //localStorage.setItem(analysisKey, JSON.stringify(analysisData));

              try {
                localStorage.setItem(analysisKey, JSON.stringify(analysisData));
              } catch (storageError) {
                console.warn('⚠️ Warning: No se pudo guardar en localStorage:', storageError);
              }

              // Guardar en MongoDB
              try {
                console.log('Intentando guardar análisis...', analysisData);
                await analysisService.saveAnalysis(analysisData);
                console.log('Análisis guardado en MongoDB correctamente');
              } catch (mongoError) {
                console.error('Error al guardar en MongoDB:', mongoError);
              }

          // Mostrar resultado
          this.currentPostulantResult = 
              score === -2 ? 'IA no disponible' :
              score === -1 ? 'Info Insuficiente' :
              score >= 7 ? 'Validado' : 'No aplica';

          this.showPostulantResult = true;
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Actualizar estados después de guardar
          this.initializePostulantStates();

        } catch (error) {
          console.error('Error al procesar candidato:', error);
          this.currentPostulantResult = 'Información insuficiente';
          this.showPostulantResult = true;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      clearInterval(this.buttonTextInterval);
      this.buttonTextInterval = null;
      this.processingValidation = false;
      this.showProcessingText = false;
      
      const resumenMensaje = this.stopValidation ? 
        `Proceso detenido:\n${this.validationResults.validated} validados\n${this.validationResults.notApplicable} no aplican\n(${postulantsToProcess.length - (this.currentProcessingIndex + 1)} pendientes)` :
        `Proceso completado:\n${this.validationResults.validated} validados\n${this.validationResults.notApplicable} no aplican`;
      
      alert(resumenMensaje);
      this.currentProcessingPostulantId = null; // Limpiar al terminar
    },
    stopValidationProcess() {
      this.stopValidation = true;
      this.currentProcessingPostulantId = null;
      clearInterval(this.buttonTextInterval);
      this.buttonTextInterval = null;
    },
    getInitials(nombre, apellido) {
      const firstInitial = nombre ? nombre.charAt(0).toUpperCase() : '';
      const lastInitial = apellido ? apellido.charAt(0).toUpperCase() : '';
      return `${firstInitial}${lastInitial}`;
    },
    validateData(jobDescription, candidateInfo) {
      const requiredJobFields = ['titulo', 'descripcion', 'requisitos'];
      const requiredCandidateFields = ['estudios', 'experiencia', 'presentacion'];
      
      const missingJobFields = requiredJobFields.filter(field => !jobDescription[field]);
      const missingCandidateFields = requiredCandidateFields.filter(field => !candidateInfo[field]);
      
      if (missingJobFields.length > 0) {
        console.warn('Campos faltantes en la descripción del trabajo:', missingJobFields);
      }
      
      if (missingCandidateFields.length > 0) {
        console.warn('Campos faltantes en la información del candidato:', missingCandidateFields);
      }
      
      return {
        isValid: missingJobFields.length === 0 && missingCandidateFields.length === 0,
        missingJobFields,
        missingCandidateFields
      };
    },
    async showBackendResponse(postulant) {
  try {
    console.log('Solicitando análisis para:', {
      vacante: this.selectedVacante.id,
      postulante: postulant.id
    });
    
    const analysis = await analysisService.getAnalysis(
      this.selectedVacante.id, 
      postulant.id
    );
    
    if (analysis) {
      console.log('Datos recuperados de MongoDB:', analysis);
      this.selectedPostulantResponse = analysis;
      this.showBackendResponseModal = true;
    } else {
      // Fallback a localStorage para datos antiguos
      const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
      const localData = localStorage.getItem(analysisKey);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        console.log('Datos recuperados del localStorage:', parsedData);
        this.selectedPostulantResponse = parsedData;
        this.showBackendResponseModal = true;
      } else {
        alert('No hay datos de análisis disponibles para este postulante');
      }
    }
  } catch (error) {
    console.error('Error al obtener análisis:', error);
    alert('Error al obtener los datos del análisis');
  }
},

async showBackendResponse1(postulant) {
  try {
    const analysis = await analysisService.getAnalysis(
      this.selectedVacante.id, 
      postulant.id
    );
    
    if (analysis) {
      console.log('Datos recuperados de MongoDB:', analysis);
      this.selectedPostulantResponse = analysis;
    } else {
      // Fallback a localStorage para datos antiguos
      const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
      const localData = localStorage.getItem(analysisKey);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        console.log('Datos recuperados del localStorage:', parsedData);
        this.selectedPostulantResponse = parsedData;
      } else {
        console.log('No hay datos de análisis disponibles');
      }
    }
  } catch (error) {
    console.error('Error al obtener análisis:', error);
  }
},
getContactos(postulant) {
  // Primero intentamos con localStorage
  const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
  const localData = localStorage.getItem(analysisKey);
  
  if (localData) {
    const parsedData = JSON.parse(localData);
    // Actualizar en segundo plano
    this.updateContactosFromDB(postulant);
    return parsedData?.result?.analysis?.contactos?.datos;
  }
  return null;
},

// Método separado para actualizar desde DB
async updateContactosFromDB(postulant) {
  try {
    const analysis = await analysisService.getAnalysis(
      this.selectedVacante.id,
      postulant.id
    );
    if (analysis) {
      const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
      localStorage.setItem(analysisKey, JSON.stringify(analysis));
    }
  } catch (error) {
    console.error('Error actualizando contactos desde DB:', error);
  }
},
    closeBackendResponseModal() {
      this.showBackendResponseModal = false;
      this.selectedPostulantResponse = null;
    },
    getValidationStatusClass(postulant) {
      console.log('getValidationStatusText llamado para:', {
    id: postulant.id,
    status: postulant.validationStatus
  });
      switch (postulant.validationStatus) {
        case 'pendiente':
          return 'bg-gray-50 text-gray-700';
        case 'validado':
          return 'bg-green-50 text-green-700';
        case 'no_aplica':
          return 'bg-red-50 text-red-700';
        case 'Info Insuficiente':
          return 'bg-yellow-50 text-yellow-700';
        case 'IA no disponible':
          return 'bg-blue-50 text-blue-700';
        default:
          return 'bg-gray-50 text-gray-700';
      }
    },
    getValidationStatusText(postulant) {
      /*console.log('getValidationStatusText llamado para:', {
        postulante: postulant.nombre,
        estado: postulant.validationStatus
      });*/
      switch (postulant.validationStatus) {
        case 'pendiente':
          return 'Pendiente';
        case 'validado':
          return 'Validado';
        case 'no_aplica':
          return 'No aplica';
        case 'Info Insuficiente':
          return 'Info Insuficiente';
        case 'IA no disponible':
          return 'IA no disponible';
        default:
          return 'Pendiente';
      }
    },
    formatJSON(data) {
      try {
        if (typeof data === 'string') {
          const parsed = JSON.parse(data);
          
          if (parsed.analysis) {
            const analysisData = JSON.parse(parsed.analysis);
            return this.renderAnalysis(analysisData);
          }
          
          return JSON.stringify(parsed, null, 2);
        }
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return data;
      }
    },
    renderAnalysis(analysis) {
      let output = '';

      if (analysis['Cumplimiento de requisitos excluyentes']) {
        const req = analysis['Cumplimiento de requisitos excluyentes'];
        output += `📋 Cumplimiento de requisitos excluyentes:\n`;
        output += `   Respuesta: ${req.respuesta}\n`;
        output += `   Justificación: ${req.justificación}\n\n`;
      }

      if (analysis['Aptitud general para el puesto']) {
        output += `🎯 Aptitud general para el puesto:\n`;
        output += `   ${analysis['Aptitud general para el puesto']}\n\n`;
      }

      if (analysis['Fortalezas identificadas']) {
        output += `💪 Fortalezas identificadas:\n`;
        analysis['Fortalezas identificadas'].forEach((fortaleza, index) => {
          output += `   ${index + 1}. ${fortaleza}\n`;
        });
        output += '\n';
      }

      if (analysis['Debilidades o áreas de mejora']) {
        output += `🔍 Áreas de mejora:\n`;
        analysis['Debilidades o áreas de mejora'].forEach((debilidad, index) => {
          output += `   ${index + 1}. ${debilidad}\n`;
        });
        output += '\n';
      }

      if (analysis['Calificación de adecuación']) {
        const cal = analysis['Calificación de adecuación'];
        output += `⭐ Calificación de adecuación:\n`;
        output += `   Puntaje: ${cal.calificación}/10\n`;
        output += `   Justificación: ${cal.justificación}\n`;
      }

      return output;
    },
    getScore() {
      const analysis = this.getAnalysisData();
      return analysis?.['Calificación de adecuación']?.calificación || 0;
    },
    getScoreText() {
      const score = this.getScore();
      if (score >= 7) return 'Muy buena adecuación al puesto';
      if (score >= 4) return 'Adecuación moderada al puesto';
      return 'Baja adecuación al puesto';
    },
    getCumplimientoClass() {
      const text = this.getCumplimientoText().toLowerCase();
      if (text === 'si') return 'text-green-600 font-medium';
      if (text === 'no') return 'text-red-600 font-medium';
      return 'text-gray-600 font-medium';
    },
    getCumplimientoText() {
      const analysis = this.getAnalysisData();
      return analysis?.['Cumplimiento de requisitos excluyentes']?.respuesta || 'No especificado';
    },
    getCumplimientoJustificacion() {
      const analysis = this.getAnalysisData();
      return analysis?.['Cumplimiento de requisitos excluyentes']?.justificación || '';
    },
    getFortalezas() {
      const analysis = this.getAnalysisData();
      return analysis?.['Fortalezas identificadas'] || [];
    },
    getDebilidades() {
      const analysis = this.getAnalysisData();
      return analysis?.['Debilidades o áreas de mejora'] || [];
    },
    getContactos() {
      const analysis = this.getAnalysisData();
      return analysis?.['contactos'] || [];
    },
    formatRequisitos(requisitos) {
      if (!requisitos) return [];
      return requisitos
        .split('\n')
        .map(req => req.trim())
        .filter(req => req.length > 0);
    },
    getAnalysisData() {
      if (!this.selectedPostulantResponse?.result?.analysis) return null;
      
      try {
          // Si analysis ya es un objeto, retornarlo directamente
          if (typeof this.selectedPostulantResponse.result.analysis === 'object') {
              return this.selectedPostulantResponse.result.analysis;
          }
          // Si es string, intentar parsearlo
          return JSON.parse(this.selectedPostulantResponse.result.analysis);
      } catch (e) {
          console.error('Error parsing analysis:', e);
          return null;
      }
    },
    getAnalysisDetail(path) {
      const analysis = this.getAnalysisData();
      if (!analysis) return '';
      
      return path.split('.').reduce((obj, key) => {
        return obj ? obj[key] : '';
      }, analysis);
    },
    getPostulantScore(postulant) {
      try {
        if (!postulant.analysis) return null;
        
        // Si analysis ya es un objeto, usarlo directamente
        const analysisObj = typeof postulant.analysis === 'object' 
            ? postulant.analysis 
            : JSON.parse(postulant.analysis);
        
        // Usamos la misma estructura que en el resto del código
        return analysisObj?.["Calificación de adecuación"]?.calificación;
    } catch (error) {
        console.error('Error getting score:', error);
        return null; // Retornamos null si hay error de parsing
    }
    },
    getPostulantDatosContacto(postulant) {
      try {
        if (!postulant.analysis) return null;
        
        // Si analysis ya es un objeto, usarlo directamente
        const analysisObj = typeof postulant.analysis === 'object' 
            ? postulant.analysis 
            : JSON.parse(postulant.analysis);
        
        // Usamos la misma estructura que en el resto del código
        return analysisObj?.["contactos"]?.datos;
    } catch (error) {
        console.error('ERROR AL OBTENER DATOS DE CONTACTO:', error);
        return null; // Retornamos null si hay error de parsing
    }
    },
    async getVacancies() {
      try {
        this.loadingMessage = 'Iniciando conexión con el servidor...';
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.loadingMessage = 'Obteniendo lista de vacantes...';
        const response = await hiringRoomService.getVacancies();
        
        this.loadingMessage = 'Procesando información de postulantes...';
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (response?.data?.vacancies) {
          this.loadingMessage = 'Finalizando carga de datos...';
          await new Promise(resolve => setTimeout(resolve, 800));
          this.vacancies = response.data.vacancies.map(v => ({
            ...v,
            showCardContent: false,
            activeSection: null,
            downloading: false,
            downloadProgress: 0
          }));
        }
      } catch (error) {
        console.error('Error fetching vacancies:', error);
        this.error = 'Error al cargar las vacantes';
        this.loadingMessage = 'Error al cargar las vacantes';
      } finally {
        this.loadingVacancies = false;
      }
    },
    hasAnalysis(postulant) {
      const analysisKey = `analysis_${this.selectedVacante?.id}_${postulant.id}`;
      return localStorage.getItem(analysisKey) !== null;
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
    showAnalysis(postulant) {
      try {
        const analysisKey = `analysis_${this.selectedVacante?.id}_${postulant.id}`;
        const savedAnalysis = localStorage.getItem(analysisKey);
        
        if (!savedAnalysis) {
          alert('No hay análisis disponible para este postulante');
          return;
        }

        const analysis = JSON.parse(savedAnalysis);
        this.selectedPostulantResponse = analysis;
        this.showBackendResponseModal = true;
      } catch (error) {
        console.error('Error al mostrar análisis:', error);
        alert('Error al cargar el análisis');
      }
    },
    async showEntrevista(postulant) {
  try {
    // Primero intentar obtener de MongoDB
    const analysis = await analysisService.getAnalysis(
      this.selectedVacante.id,
      postulant.id
    );

    let analysisData;
    if (analysis) {
      // Si encontramos datos en MongoDB, los usamos
      analysisData = analysis;
    } else {
      // Fallback a localStorage
      const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
      const localData = localStorage.getItem(analysisKey);
      
      if (!localData) {
        alert('No hay datos de análisis disponibles para este postulante');
        return;
      }
      analysisData = JSON.parse(localData);
    }

    this.selectedPostulant = postulant;
    this.selectedPostulantResponse = analysisData;

    try {
      const parsedAnalysis = JSON.parse(analysisData.result.analysis);
      this.cuestionario = parsedAnalysis.cuestionario;
    } catch (error) {
      console.error('Error parsing analysis:', error);
      alert('Error al cargar el análisis del postulante');
      return;
    }

    this.showEntrevistaModal = true;
  } catch (error) {
    console.error('Error al mostrar análisis:', error);
    alert('Error al cargar el análisis');
  }
},
    closeEntrevistaModal() {
      this.showEntrevistaModal = false;
      this.selectedPostulant = null;
      this.cuestionario = null;
    },
    async processPostulant(postulant) {
      try {
        this.currentPostulantName = `${postulant.nombre} ${postulant.apellido}`;
        this.showPostulantResult = false;
        
        // ... existing processing code ...
        
        // Al terminar el procesamiento:
        this.currentPostulantResult = result.status === 'validado' ? 'Validado' : 
                                     result.status === 'no_aplica' ? 'No aplica' : 
                                     'Información insuficiente';
        
        this.showPostulantResult = true;
        
        // Esperar 2 segundos antes de continuar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('Error processing postulant:', error);
        this.currentPostulantResult = 'Error en procesamiento';
        this.showPostulantResult = true;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    },
    // Método para inicializar estados desde localStorage
    async initializePostulantStates() {
    if (!this.selectedVacante?.postulants) return;
    
    console.log('Iniciando inicialización con postulantes:', this.selectedVacante.postulants);
    
    const updatedPostulants = await Promise.all(this.selectedVacante.postulants.map(async postulant => {
        let validationStatus = 'pendiente';
        let score = undefined;
        let contactos1 = undefined;
        let entrevistado = false; // Declaramos la variable al inicio

        try {

          try {
            const interviewData = await hiringRoomService.getPostulantInterviewEvent(postulant.id);
            entrevistado = interviewData.eventos && interviewData.eventos.length > 0;
            // Guardar el estado en el objeto entrevistados
            this.entrevistados[postulant.id] = entrevistado;
            
        } catch (error) {
            console.error('Error al verificar entrevista:', error);
            this.entrevistados[postulant.id] = false;
        }
            // 1. Intentar MongoDB primero
            const mongoAnalysis = await analysisService.getAnalysis(
                this.selectedVacante.id,
                postulant.id
            );

            //if (mongoAnalysis) {
            if (mongoAnalysis && mongoAnalysis.result?.analysis) {
                console.log('Análisis encontrado en MongoDB:', mongoAnalysis);
                validationStatus = mongoAnalysis.validationStatus || 'pendiente';
                score = mongoAnalysis.result?.analysis?.["Calificación de adecuación"]?.calificación;
                contactos1 = mongoAnalysis.result?.analysis?.["contactos"]?.datos;
            }

            // 2. Si no hay datos en MongoDB o falta algún dato, intentar localStorage (mantiene compatibilidad)
            if (!mongoAnalysis || !validationStatus || validationStatus === 'pendiente') {
                const analysisKey = `analysis_${this.selectedVacante.id}_${postulant.id}`;
                const savedAnalysis = localStorage.getItem(analysisKey);
                
                if (savedAnalysis) {
                    try {
                        const analysis = JSON.parse(savedAnalysis);
                        const localScore = analysis.result?.analysis?.["Calificación de adecuación"]?.calificación;
                        const localContactos = analysis.result?.analysis?.["contactos"]?.datos;
                        
                        // Usar datos de localStorage solo si no tenemos datos de MongoDB
                        if (!mongoAnalysis) {
                            score = localScore;
                            contactos1 = localContactos;
                            
                            // Mantener lógica original exacta de estados
                            if (score === -2) {
                                validationStatus = 'IA no disponible';
                            } else if (score === -1) {
                                validationStatus = 'Info Insuficiente';
                            } else if (score >= 7) {
                                validationStatus = 'validado';
                            } else if (score !== null && score !== undefined) {
                                validationStatus = 'no_aplica';
                            }
                        }
                    } catch (error) {
                          // CAMBIO 3: Manejo silencioso de 404
                          if (!error.response || error.response.status !== 404) {
                              console.error('Error al inicializar estado:', error);
                          }
                          validationStatus = 'pendiente';
                      }
                }
            }
            
            // Mantener logs originales
            console.log('Procesando postulante:', {
                id: postulant.id,
                nombre: postulant.nombre,
                estadoAnterior: postulant.validationStatus,
                nuevoEstado: validationStatus,
                score,
                contactos1,
                tieneAnalisis: !!(mongoAnalysis || localStorage.getItem(`analysis_${this.selectedVacante.id}_${postulant.id}`))
            });

        } catch (error) {
            console.error('Error al inicializar estado:', error);
            // Mantener estado pendiente en caso de error
            validationStatus = 'pendiente';
        }
        
        // Mantener estructura exacta del objeto retornado
        return {
            ...postulant,
            validationStatus,
            score,
            contactos1,
            entrevistado
        };
    }));
    
    // Mantener log original
    console.log('Estados actualizados:', updatedPostulants.map(p => ({
        nombre: p.nombre,
        estado: p.validationStatus,
        score: p.score
    })));
    
    // Actualizar estado exactamente igual que antes
    this.selectedVacante.postulants = updatedPostulants;
    this.postulantStatesVersion++;
},
    async generarEntrevista() {
      if (!this.selectedVacante) {
        alert('Por favor seleccione una vacante primero');
        return;
      }

      this.processingInterview = true;
      
      try {
        const jobDescription = {
          titulo: this.selectedVacante.nombre || '',
          area: this.selectedVacante.areaTrabajo?.nombre || this.selectedVacante.areaTrabajo || '',
          descripcion: this.stripHtml(this.selectedVacante.descripcionTrabajo || ''),
          modalidadContratacion: this.selectedVacante.modalidadContratacion || '',
          modalidadTrabajo: this.selectedVacante.modalidadTrabajo || '',
          nivelEducacion: this.selectedVacante.nivelMinimoEducacion || '',
          requisitos: this.stripHtml(this.selectedVacante.requisitos || ''),
          tipoTrabajo: this.selectedVacante.tipoTrabajo || '',
          beneficios: this.stripHtml(this.selectedVacante.beneficios || ''),
          condiciones: this.stripHtml(
            this.selectedVacante.condiciones || 
            this.selectedVacante.condicionesRol || 
            this.selectedVacante.condicionesTrabajo || 
            ''
          )
        };

       
        const result = await this.openAIService.generateInterview(jobDescription);
        
        // Guardar en localStorage
        const interviewKey = `interview_${this.selectedVacante.id}`;
        localStorage.setItem(interviewKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          jobInfo: jobDescription,
          cuestionario: result.cuestionario
        }));

        this.interviewData = result;
        this.postulantStatesVersion++; // Agregar esta línea
        alert('Entrevista generada correctamente.\nPuede verla haciendo clic en "Ver Entrevista"');

      } catch (error) {
        console.error('Error generando entrevista:', error);
        alert('Error al generar la entrevista. Por favor intente nuevamente.');
      } finally {
        this.processingInterview = false;
      }
    },

    verEntrevista() {
      if (!this.selectedVacante) return;
      
      const interviewKey = `interview_${this.selectedVacante.id}`;
      const savedInterview = localStorage.getItem(interviewKey);
      
      if (savedInterview) {
        const interviewData = JSON.parse(savedInterview);
        this.interviewData = interviewData;
        this.cuestionario = interviewData.cuestionario;
        this.showEntrevistaModal = true;
      } else {
        alert('No se encontró una entrevista generada para esta vacante');
      }
    },

    closeEntrevistaModal() {
      this.showEntrevistaModal = false;
      this.interviewData = null;
    },

    iniciarEntrevista() {
      this.entrevistaEnCurso = true;
      this.calcularProgresoEntrevista();
      
      // Encontrar la primera pregunta sin responder
      const todasLasPreguntas = [
        ...this.cuestionario.preguntas_psicologicas,
        ...this.cuestionario.preguntas_tecnicas
      ];
      
      this.progresoEntrevista.total = todasLasPreguntas.length;
      this.preguntaActual = todasLasPreguntas.find(pregunta => 
        !this.entrevistaRespuestas[`${pregunta.tipo}_${pregunta.numero}`]?.respuesta
      ) || todasLasPreguntas[0];
    },

    calcularProgresoEntrevista() {
      const todasLasPreguntas = [
        ...this.cuestionario.preguntas_psicologicas,
        ...this.cuestionario.preguntas_tecnicas
      ];
      
      this.progresoEntrevista.total = todasLasPreguntas.length;
      this.progresoEntrevista.completadas = todasLasPreguntas.filter(pregunta => 
        this.entrevistaRespuestas[`${pregunta.tipo}_${pregunta.numero}`]?.respuesta
      ).length;
      
      this.progresoEntrevista.porcentaje = Math.round(
        (this.progresoEntrevista.completadas / this.progresoEntrevista.total) * 100
      );
    },

    siguientePregunta() {
      const todasLasPreguntas = [
        ...this.cuestionario.preguntas_psicologicas.map(p => ({...p, tipo: 'preguntas_psicologicas'})),
        ...this.cuestionario.preguntas_tecnicas.map(p => ({...p, tipo: 'preguntas_tecnicas'}))
      ];
      
      const indexActual = todasLasPreguntas.findIndex(p => 
        p.numero === this.responderEntrevistaModal.preguntaActual.numero && 
        p.tipo === this.responderEntrevistaModal.preguntaActual.tipo
      );
      
      if (indexActual < todasLasPreguntas.length - 1) {
        this.responderEntrevistaModal.preguntaActual = todasLasPreguntas[indexActual + 1];
        this.responderEntrevistaModal.preguntaActualIndex = indexActual + 1;
        this.saveEntrevistaState(); // Guardar estado al cambiar de pregunta
        const preguntaId = `${this.responderEntrevistaModal.preguntaActual.tipo}_${this.responderEntrevistaModal.preguntaActual.numero}`;
        this.respuestaActual = this.entrevistaRespuestas.respuestas[preguntaId]?.respuesta || null;
      }
    },

    preguntaAnterior() {
      const todasLasPreguntas = [
        ...this.cuestionario.preguntas_psicologicas.map(p => ({...p, tipo: 'preguntas_psicologicas'})),
        ...this.cuestionario.preguntas_tecnicas.map(p => ({...p, tipo: 'preguntas_tecnicas'}))
      ];
      
      const indexActual = todasLasPreguntas.findIndex(p => 
        p.numero === this.responderEntrevistaModal.preguntaActual.numero && 
        p.tipo === this.responderEntrevistaModal.preguntaActual.tipo
      );
      
      if (indexActual > 0) {
        this.responderEntrevistaModal.preguntaActual = todasLasPreguntas[indexActual - 1];
        this.responderEntrevistaModal.preguntaActualIndex = indexActual - 1;
        this.saveEntrevistaState(); // Guardar estado al cambiar de pregunta
        const preguntaId = `${this.responderEntrevistaModal.preguntaActual.tipo}_${this.responderEntrevistaModal.preguntaActual.numero}`;
        this.respuestaActual = this.entrevistaRespuestas.respuestas[preguntaId]?.respuesta || null;
      }
    },

    saltarPregunta() {
      // Simplemente llamamos a siguientePregunta
      this.siguientePregunta();
    },

    // Propiedad computada para controlar si hay siguiente pregunta
    hasPreguntaSiguiente() {
      const todasLasPreguntas = [
        ...this.cuestionario.preguntas_psicologicas,
        ...this.cuestionario.preguntas_tecnicas
      ];
      return this.responderEntrevistaModal.preguntaActualIndex < todasLasPreguntas.length - 1;
    },

    guardarRespuesta(tipo, numero, respuesta) {
      this.entrevistaRespuestas[`${tipo}_${numero}`] = { respuesta };
    },
    guardarComentario(tipo, numero, comentario) {
      this.entrevistaRespuestas[`${tipo}_${numero}`].comentario = comentario;
    },
    toggleRecording(tipo, numero) {
      // Implementa la lógica para grabar o detener la grabación aquí
      console.log(`Grabando pregunta ${numero} de tipo ${tipo}`);
    },
    isValidContactData(contactData) {
    if (!contactData) return false;
    
    // Lista de patrones que indican datos vacíos o inválidos
    const invalidPatterns = [
      "email: , telefono: , telefono otro",
      "email, telefono, telefono otro",
      "No se proporcionan datos de contacto",
      "email:",
      "telefono:",
      "No hay datos de contacto",
      "No se encontraron datos"
    ];
    
    // Verifica si el texto contiene alguno de los patrones inválidos
    return !invalidPatterns.some(pattern => 
      contactData.toLowerCase().includes(pattern.toLowerCase())
    );
  },
    async responderEntrevista(postulant) {
      // Logs de diagnóstico
      console.log({
          vacantId: this.selectedVacante?.id,
          interviewKey: `interview_${this.selectedVacante?.id}`,
          hasInterview: !!localStorage.getItem(`interview_${this.selectedVacante?.id}`),
          savedInterview: localStorage.getItem(`interview_${this.selectedVacante?.id}`)
      });

      try {
        if (!this.selectedVacante) {
          throw new Error('No se ha seleccionado una vacante');
        }

        // Obtener la entrevista existente
        const interviewKey = `interview_${this.selectedVacante.id}`;
        const savedInterview = localStorage.getItem(interviewKey);

        if (savedInterview) {
          const interviewData = JSON.parse(savedInterview);
          // Asignar el cuestionario
          this.cuestionario = interviewData.cuestionario;  // Añadido esta línea

          // Obtener respuestas previas si existen
          const answersKey = `interview_answers_${this.selectedVacante.id}_${postulant.id}`;
          const savedAnswers = localStorage.getItem(answersKey);

          this.entrevistaRespuestas = savedAnswers ? JSON.parse(savedAnswers) : {
            estado: 'sin_iniciar',
            fechaInicio: new Date().toISOString(),
            fechaUltimaModificacion: new Date().toISOString(),
            respuestas: {},
            totalPreguntas: 0,
            preguntasRespondidas: 0,
            porcentajeCompletitud: 0
          };

          this.selectedPostulant = postulant;
          this.responderEntrevistaModal.show = true;
          await this.inicializarResponderEntrevista();
        }
      } catch (error) {
        console.error('Error al abrir entrevista:', error);
        alert(error.message);
      }
    },
    updateEntrevistaProgress() {
      const respuestas = this.entrevistaRespuestas.respuestas;
      const total = this.entrevistaRespuestas.totalPreguntas;
      const answered = Object.keys(respuestas).length;
      
      this.responderEntrevistaModal.progreso = {
        total,
        answered,
        percentage: Math.round((answered / total) * 100)
      };

      // Actualizar estado
      if (answered === 0) {
        this.responderEntrevistaModal.estado = 'sin_iniciar';
      } else if (answered === total) {
        this.responderEntrevistaModal.estado = 'completada';
      } else {
        this.responderEntrevistaModal.estado = 'en_curso';
      }

      // Guardar cambios
      this.saveEntrevistaState();
    },
    saveEntrevistaState() {
      const answersKey = `interview_answers_${this.selectedVacante.id}_${this.selectedPostulant.id}`;
      this.entrevistaRespuestas.estado = this.responderEntrevistaModal.estado;
      this.entrevistaRespuestas.fechaUltimaModificacion = new Date().toISOString();
      this.entrevistaRespuestas.preguntasRespondidas = this.responderEntrevistaModal.progreso.answered;
      this.entrevistaRespuestas.porcentajeCompletitud = this.responderEntrevistaModal.progreso.percentage;
      
      localStorage.setItem(answersKey, JSON.stringify(this.entrevistaRespuestas));
    },
    initializeSpeechRecognition() {
      // Verificar si el navegador soporta la API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('El reconocimiento de voz no está soportado en este navegador');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      // Event handlers
      this.recognition.onstart = () => {
        this.isRecording = true;
      };

      this.recognition.onend = () => {
        this.isRecording = false;
      };

      this.recognition.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        if (event.results[current].isFinal) {
          // Actualizar el comentario de la pregunta actual
          const preguntaId = `${this.responderEntrevistaModal.preguntaActual.tipo}_${this.responderEntrevistaModal.preguntaActual.numero}`;
          if (!this.entrevistaRespuestas.respuestas[preguntaId]) {
            this.entrevistaRespuestas.respuestas[preguntaId] = {
              respuesta: '',
              comentario: transcript,
              vioExplicacion: false
            };
          } else {
            this.entrevistaRespuestas.respuestas[preguntaId].comentario += ' ' + transcript;
          }
          
          // Guardar en localStorage
          this.saveEntrevistaState();
        }
      };
    },
    toggleVoiceRecording() {
      if (!this.recognition) {
        this.initializeSpeechRecognition();
      }

      if (this.isRecording) {
        this.recognition.stop();
      } else {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Error al iniciar el reconocimiento:', error);
          this.recognition.stop();
        }
      }
    },
    inicializarResponderEntrevista() {
      // Asegurarnos de que entrevistaRespuestas tenga la estructura básica
      if (!this.entrevistaRespuestas || !this.entrevistaRespuestas.respuestas) {
        this.entrevistaRespuestas = {
          estado: 'sin_iniciar',
          fechaInicio: new Date().toISOString(),
          fechaUltimaModificacion: new Date().toISOString(),
          respuestas: {},
          totalPreguntas: 0,
          preguntasRespondidas: 0,
          porcentajeCompletitud: 0
        };
      }

      // Combinar preguntas psicológicas y técnicas en un array
      const todasLasPreguntas = [
        ...this.cuestionario.preguntas_psicologicas.map(p => ({...p, tipo: 'preguntas_psicologicas'})),
        ...this.cuestionario.preguntas_tecnicas.map(p => ({...p, tipo: 'preguntas_tecnicas'}))
      ];

      // Inicializar el progreso
      this.responderEntrevistaModal.progreso = {
        total: todasLasPreguntas.length,
        completadas: Object.keys(this.entrevistaRespuestas.respuestas).length,
        porcentaje: 0
      };

      // Calcular porcentaje
      this.responderEntrevistaModal.progreso.porcentaje = Math.round(
        (this.responderEntrevistaModal.progreso.completadas / this.responderEntrevistaModal.progreso.total) * 100
      );

      // Inicializar la primera pregunta
      if (todasLasPreguntas.length > 0) {
        this.responderEntrevistaModal.preguntaActual = todasLasPreguntas[0];
        
        // Asegurarse de que existe la estructura para esta pregunta
        const preguntaId = `${todasLasPreguntas[0].tipo}_${todasLasPreguntas[0].numero}`;
        if (!this.entrevistaRespuestas.respuestas[preguntaId]) {
          this.entrevistaRespuestas.respuestas[preguntaId] = {
            respuesta: '',
            comentario: '',
            vioExplicacion: false
          };
        }
      }

      // Guardar todas las preguntas en el estado del modal para navegación
      this.responderEntrevistaModal.preguntas = todasLasPreguntas;
      this.responderEntrevistaModal.preguntaActualIndex = 0;

      // Actualizar estado según progreso
      if (this.responderEntrevistaModal.progreso.completadas === 0) {
        this.responderEntrevistaModal.estado = 'sin_iniciar';
      } else if (this.responderEntrevistaModal.progreso.completadas === this.responderEntrevistaModal.progreso.total) {
        this.responderEntrevistaModal.estado = 'completada';
      } else {
        this.responderEntrevistaModal.estado = 'en_curso';
      }
    },
    getComentario(preguntaId) {
      return this.entrevistaRespuestas?.respuestas?.[preguntaId]?.comentario || '';
    },
    toggleSelectAllPostulants() {
    if (this.selectAllPostulants) {
      this.selectedPostulantIds = this.filteredPostulants.map(p => p.id);
    } else {
      this.selectedPostulantIds = [];
    }
  },
  onSelectPostulant() {
    this.selectAllPostulants = this.selectedPostulantIds.length === this.filteredPostulants.length;
  },
  reprocesarPostulantes(ids) {
  // Filtra los postulantes de la vacante actual según los IDs recibidos
  const postulantesAReprocesar = this.selectedVacante.postulants.filter(p => ids.includes(p.id));
  if (!postulantesAReprocesar.length) {
    alert('No hay postulantes para reprocesar');
    return;
  }

  // Llama al método principal de validación con los seleccionados
  this.validarCVs(false, postulantesAReprocesar);
},
async validarCVsCustom(postulantsToProcess) {
  if (!postulantsToProcess.length) {
    alert('No hay postulantes para validar');
    return;
  }

  this.processingValidation = true;
  this.showProcessingText = false;

  if (this.buttonTextInterval) {
    clearInterval(this.buttonTextInterval);
  }

  this.buttonTextInterval = setInterval(() => {
    this.showProcessingText = !this.showProcessingText;
  }, 1000);

  this.validationProgress = 0;
  this.currentProcessingIndex = 0;
  this.validationResults = { validated: 0, notApplicable: 0 };
  this.stopValidation = false;
  this.isReprocessing = true;

  for (let i = 0; i < postulantsToProcess.length; i++) {
    if (this.stopValidation) break;

    const postulant = postulantsToProcess[i];
    this.currentProcessingIndex = i;
    this.currentProcessingPostulantId = postulant.id;
    this.currentPostulantName = `${postulant.nombre} ${postulant.apellido}`;
    this.showPostulantResult = false;

    try {
      // Aquí puedes reutilizar la lógica de procesamiento individual de tu método validarCVs
      // Por ejemplo, podrías extraer el bloque de procesamiento de cada postulante y llamarlo aquí
      // ...
    } catch (error) {
      console.error('Error al procesar candidato:', error);
      this.currentPostulantResult = 'Información insuficiente';
      this.showPostulantResult = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  clearInterval(this.buttonTextInterval);
  this.buttonTextInterval = null;
  this.processingValidation = false;
  this.showProcessingText = false;

  // Puedes mostrar un resumen si lo deseas
},
  handleReprocesarClick() {
    if (this.selectedPostulantIds.length > 0) {
      // Si hay seleccionados, preguntar si quiere reprocesar solo esos o todos
      if (confirm('¿Deseas reprocesar solo los seleccionados? (Aceptar = solo seleccionados, Cancelar = todos)')) {
        this.reprocesarPostulantes(this.selectedPostulantIds);
      } else {
        this.reprocesarPostulantes(this.filteredPostulants.map(p => p.id));
      }
    } else {
      // Si no hay ninguno seleccionado, preguntar si quiere reprocesar todos
      if (confirm('No hay postulantes seleccionados. ¿Deseas reprocesar a todos?')) {
        this.reprocesarPostulantes(this.filteredPostulants.map(p => p.id));
      }
    }
  },
    setComentario(preguntaId, valor) {
      if (!this.entrevistaRespuestas.respuestas[preguntaId]) {
        this.entrevistaRespuestas.respuestas[preguntaId] = {
          respuesta: this.respuestaActual,
          comentario: '',
          vioExplicacion: false
        };
      }
      this.entrevistaRespuestas.respuestas[preguntaId].comentario = valor;
      this.saveEntrevistaState(); // Guardar en localStorage
    },
    handleGenerarFicha() {
        console.log('Botón presionado');
        console.log('selectedPostulant:', this.selectedPostulant);
        if (this.selectedPostulant) {
            this.generarFichaCurricular(this.selectedPostulant);
        } else {
            console.log('No hay postulante seleccionado');
        }
    },
    handleRespuesta(letra) {
      const preguntaId = `${this.responderEntrevistaModal.preguntaActual.tipo}_${this.responderEntrevistaModal.preguntaActual.numero}`;
      
      if (!this.entrevistaRespuestas.respuestas[preguntaId]) {
        this.entrevistaRespuestas.respuestas[preguntaId] = {
          respuesta: letra,
          comentario: '',
          vioExplicacion: false
        };
      } else {
        this.entrevistaRespuestas.respuestas[preguntaId].respuesta = letra;
      }
      
      // Actualizar progreso
      const preguntasRespondidas = Object.keys(this.entrevistaRespuestas.respuestas).length;
      const totalPreguntas = this.responderEntrevistaModal.preguntas.length;
      
      this.responderEntrevistaModal.progreso = {
        total: totalPreguntas,
        completadas: preguntasRespondidas,
        porcentaje: Math.round((preguntasRespondidas / totalPreguntas) * 100)
      };

      // Guardar en localStorage
      this.saveEntrevistaState();
    },
    getEntrevistaStatus(postulant) {
      const answersKey = `interview_answers_${this.selectedVacante.id}_${postulant.id}`;
      const entrevistaData = JSON.parse(localStorage.getItem(answersKey) || '{"respuestas":{}}');
      const porcentaje = Math.round((Object.keys(entrevistaData.respuestas).length / 13) * 100);
      
      const icono = porcentaje === 0 ? '🔵' :      // sin iniciar
                    porcentaje === 100 ? '✅' :     // completada
                    '⏳';                           // en curso
      
      return `${icono} ${porcentaje}%`;
    },
   changePage(newPage) {
      console.log('Cambiando a página:', newPage);
      this.pagination.currentPage = newPage;
      this.loadVacancies();
    }, 
    async cancelarBusqueda() {
        this.cancelando = true;
        this.estadoActualProceso = "Cancelando búsqueda...";
        
        // Esperamos a que termine el proceso actual
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.cancelarProceso = true;
        this.procesoBusquedaCompleto = true; // Marcamos como completo para mostrar resultados
        this.estadoActualProceso = "Búsqueda cancelada";
        
        // Habilitamos el botón de ver resultados
        this.showResultadosModal = true;
        this.showProgresoModal = false;
    },
   
    verDetallesCandidato(candidato) {
      // TODO: Implementar vista detallada del candidato
      console.log('Ver detalles de:', candidato);
    },
    exportarCV(candidato) {
      // TODO: Implementar exportación de CV individual
      console.log('Exportar CV de:', candidato);
    },
    exportarTodosCV() {
      // TODO: Implementar exportación masiva de CVs
      console.log('Exportar todos los CVs');
    },
    toggleCandidatoDetails(id) {
      this.showCandidatoDetails = {
        ...this.showCandidatoDetails,
        [id]: !this.showCandidatoDetails[id]
      };
    },

    getScoreColorClass(score) {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-blue-600';
      if (score >= 40) return 'text-yellow-600';
      return 'text-red-600';
    },


    toggleInstrucciones() {
      this.showInstrucciones = !this.showInstrucciones;
    },
    toggleRequisitos() {
      this.showRequisitos = !this.showRequisitos;
    },
    buildCandidateInfo(postulant) {
        return {
            // Información personal
            nombre: postulant.nombre,
            apellido: postulant.apellido,
            email: postulant.email,
            telefonoCelular: postulant.telefonoCelular,
            telefonoFijo: postulant.telefonoFijo,
            fechaNacimiento: postulant.fechaNacimiento,
            genero: postulant.genero,
            estadoCivil: postulant.estadoCivil,
            
            // Ubicación
            ubicacion: {
                pais: postulant.direccion?.pais || 'No especificado',
                provincia: postulant.direccion?.provincia || 'No especificado',
                ciudad: postulant.direccion?.ciudad || 'No especificado',
                direccionCompleta: postulant.direccion?.direccionCompleta
            },

            // Experiencia laboral
            experienciasLaborales: (postulant.experienciasLaborales || []).map(exp => ({
                empresa: exp.empresa,
                puesto: exp.puesto,
                descripcion: exp.descripcion,
                fechaInicio: exp.fechaInicio,
                fechaFin: exp.fechaFin,
                trabajoActual: exp.trabajoActual,
                area: exp.area,
                subarea: exp.subarea,
                responsabilidades: exp.responsabilidades,
                tecnologias: exp.tecnologias,
                logros: exp.logros
            })),

            // Educación
            estudios: (postulant.estudios || []).map(edu => ({
                institucion: edu.institucion,
                titulo: edu.titulo,
                nivel: edu.nivel,
                estado: edu.estado,
                fechaInicio: edu.fechaInicio,
                fechaFin: edu.fechaFin,
                promedio: edu.promedio,
                area: edu.area
            })),

            // Habilidades y conocimientos
            habilidades: postulant.habilidades || [],
            conocimientosTecnicos: postulant.conocimientosTecnicos || [],
            certificaciones: (postulant.certificaciones || []).map(cert => ({
                nombre: cert.nombre,
                institucion: cert.institucion,
                fecha: cert.fecha,
                descripcion: cert.descripcion
            })),

            // Idiomas
            idiomas: (postulant.idiomas || []).map(idioma => ({
                nombre: idioma.nombre,
                nivel: idioma.nivel,
                certificacion: idioma.certificacion
            })),

            // Información adicional
            presentacion: postulant.presentacionPostulante || '',
            objetivoProfesional: postulant.objetivoProfesional || '',
            disponibilidadViajar: postulant.disponibilidadViajar,
            disponibilidadMudarse: postulant.disponibilidadMudarse,
            disponibilidadHoraria: postulant.disponibilidadHoraria,
            expectativaSalarial: {
                moneda: postulant.expectativaSalarial?.moneda,
                monto: postulant.expectativaSalarial?.monto
            },

            // Preferencias laborales
            preferenciasTrabajo: {
                modalidad: postulant.preferenciasTrabajo?.modalidad,
                tipoContrato: postulant.preferenciasTrabajo?.tipoContrato,
                areaInteres: postulant.preferenciasTrabajo?.areaInteres
            },

            // Metadata
            ultimaActualizacion: postulant.ultimaActualizacion,
            perfilCompletado: postulant.perfilCompletado
        };
    },
    showAnalysisModal(candidato) {
        this.selectedAnalysis = candidato;
        this.showAnalysisModalFlag = true;
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
    // NUEVOS MÉTODOS DE FILTRADO
    filtrarPorTags(postulantes, perfil) {
        // Extraer palabras clave del perfil
        const palabrasClave = new Set([
            ...this.extraerPalabrasClave(perfil.requisitos)
        ].filter(Boolean).map(palabra => palabra.toLowerCase()));

       // console.log('Palabras clave extraídas del perfil:', [...palabrasClave]);

        // Si el postulante no tiene tags, pasemos directamente a la siguiente fase
        return postulantes.filter(postulante => {
            const tagsPostulante = new Set(
                postulante.tags?.map(tag => tag.nombre.toLowerCase()) || []
            );
            
           // console.log(`\nAnalizando postulante ${postulante.nombre} ${postulante.apellido}`);
           // console.log('Tags del postulante:', [...tagsPostulante]);
            
            // Si no tiene tags, lo dejamos pasar
            if (tagsPostulante.size === 0) {
               // console.log('Postulante sin tags - Pasa a siguiente fase');
                return true;
            }
            const todasLasTags = [...tagsPostulante];
const tagsCoincidentes = todasLasTags.filter(tag => palabrasClave.has(tag));
const tagsNoCoincidentes = todasLasTags.filter(tag => !palabrasClave.has(tag));
const coincidencias = tagsCoincidentes.length;

            const porcentajeCoincidencia = coincidencias / tagsPostulante.size;
           // console.log(`Coincidencias: ${coincidencias}/${tagsPostulante.size} (${(porcentajeCoincidencia * 100).toFixed(2)}%)`);
            
            // Reducimos el umbral al 30%
            const pasa = porcentajeCoincidencia >= 0.3;
           // console.log(`Postulante ${pasa ? 'pasa' : 'no pasa'} a siguiente fase`);
            // Agregamos el log solo si pasa
            if (pasa) {
            console.log(`\n✅ ${postulante.nombre} ${postulante.apellido}:`);
            console.log(`   Palabras clave buscadas (${[...palabrasClave].length}): ${[...palabrasClave].join(', ')}`);
            console.log(`   Tags del postulante (${todasLasTags.length}): ${todasLasTags.join(', ')}`);
            console.log(`   Tags coincidentes (${tagsCoincidentes.length}): ${tagsCoincidentes.join(', ')}`);
            console.log(`   Tags no coincidentes (${tagsNoCoincidentes.length}): ${tagsNoCoincidentes.join(', ')}`);
            console.log(`   Total: ${coincidencias}/${tagsPostulante.size} (${(porcentajeCoincidencia * 100).toFixed(2)}%)`);
        }

            return pasa;
        });
    },

    filtrarPorPuntuacion(postulantes, perfil) {
    return postulantes.filter(postulante => {
       //console.log('\nEvaluando postulante:', postulante.nombre, postulante.apellido);
        
        // Inicialización de variables para tracking
        let criteriosActivos = new Map();
        let detallesEvaluacion = [];
  
        // Determinar criterios activos y loggear el motivo
        //console.log('Verificando criterios activos:');
        
        if (this.tieneRequisitosTecnicos(perfil)) {
            criteriosActivos.set('TECNICO', this.PESOS_CRITERIOS.TECNICO);
            //console.log('✓ Criterio TECNICO activado');
        } else {
            // console.log('✗ Criterio TECNICO no activado - No hay requisitos específicos');
        }
        
        if (this.tieneRequisitosLocalidad(perfil)) {
            criteriosActivos.set('LOCALIDAD', this.PESOS_CRITERIOS.LOCALIDAD);
           // console.log('✓ Criterio LOCALIDAD activado');
        } else {
           // console.log('✗ Criterio LOCALIDAD no activado - No hay requisitos específicos');
        }
        
        if (this.tieneRequisitosIdioma(perfil)) {
            criteriosActivos.set('IDIOMA', this.PESOS_CRITERIOS.IDIOMA);
            //console.log('✓ Criterio IDIOMA activado');
        } else {
            // console.log('✗ Criterio IDIOMA no activado - No hay requisitos específicos');
        }
        
        if (this.tieneRequisitosEducacion(perfil)) {
            criteriosActivos.set('EDUCACION', this.PESOS_CRITERIOS.EDUCACION);
            //console.log('✓ Criterio EDUCACION activado');
        } else {
            // console.log('✗ Criterio EDUCACION no activado - No hay requisitos específicos');
        }
        
        if (this.tieneRequisitosJerarquia(perfil)) {
            criteriosActivos.set('SENIORITY', this.PESOS_CRITERIOS.SENIORITY);
            //  console.log('✓ Criterio SENIORITY activado');
        } else {
            //  console.log('✗ Criterio SENIORITY no activado - No hay requisitos específicos');
        }

        

        // 2. Evaluar cada criterio activo
        for (const [criterio, config] of criteriosActivos) {
            let resultado;

            switch (criterio) {
                case 'TECNICO':
                    resultado = this.evaluarCriterioTecnico(postulante, perfil);
                    break;
                case 'LOCALIDAD':
                    //resultado = this.evaluarCriterioLocalidad(postulante, perfil);
                    resultado = {
            puntuacion: this.PESOS_CRITERIOS[criterio].peso,
            detalles: ['Criterio temporalmente aprobado'],
            cumpleMinimo: true
        };
                    break;
                case 'IDIOMA':
                   // resultado = this.evaluarCriterioIdioma(postulante, perfil);
                   resultado = {
            puntuacion: this.PESOS_CRITERIOS[criterio].peso,
            detalles: ['Criterio temporalmente aprobado'],
            cumpleMinimo: true
        };
                    break;
                case 'EDUCACION':
                   // resultado = this.evaluarCriterioEducacion(postulante, perfil);
                    resultado = {
            puntuacion: this.PESOS_CRITERIOS[criterio].peso,
            detalles: ['Criterio temporalmente aprobado'],
            cumpleMinimo: true
        };
                    break;
                case 'SENIORITY':
                    // resultado = this.evaluarCriterioSeniority(postulante, perfil);
                    resultado = {
            puntuacion: this.PESOS_CRITERIOS[criterio].peso,
            detalles: ['Criterio temporalmente aprobado'],
            cumpleMinimo: true
        };
                    break;
            }


                // Validar que el resultado sea válido
                if (!resultado || typeof resultado.puntuacion === 'undefined') {
                    console.error(`Evaluación de ${criterio} devolvió un resultado inválido:`, resultado);
                    return false;
                }
            const porcentajeCriterio = (resultado.puntuacion / config.peso) * 100;
            
         

            // Si no cumple el mínimo, rechazar
            if (porcentajeCriterio < config.minimo) {
             //   this.logearRechazo(postulante, criterio, porcentajeCriterio, config.minimo);
                return false;
            }

            //console.log('\nEvaluando postulante:', postulante.nombre, postulante.apellido);
          //  console.log('Criterios activos finales:', Array.from(criteriosActivos.keys()));

          /*  console.log(`Evaluación ${criterio}:`, {
                puntuacion: resultado.puntuacion,
                porcentaje: porcentajeCriterio,
                minimo: config.minimo,
                cumpleMinimo: porcentajeCriterio >= config.minimo
            }); */

     
            detallesEvaluacion.push({
                criterio,
                ...resultado,
                porcentaje: porcentajeCriterio
            });
        }

        // Si llegó hasta aquí, cumplió todos los criterios
        this.logearResultadoEvaluacion(postulante, detallesEvaluacion);
        return true;
    });
},

// Métodos de validación de requisitos
tieneRequisitosTecnicos(perfil) {
    // Para técnico, buscamos requisitos específicos en campos relevantes
    const camposRelevantes = [
        perfil.titulo,
        perfil.requisitos,
        perfil.descripcion,
        perfil.areaTrabajo,
        perfil.descripcionTrabajo
    ];

    return camposRelevantes.some(campo => 
        campo && 
        campo !== "No especificado" && 
        campo.trim() !== ""
    );
},

tieneRequisitosLocalidad(perfil) {
    // Primero verificamos si existe el objeto ubicacion
    if (!perfil.ubicacion) return false;

    // Verificamos si TODOS los valores de ubicación son "No especificado"
    const todosNoEspecificados = Object.values(perfil.ubicacion).every(valor => 
        !valor || valor === "No especificado"
    );

    // Verificamos la modalidad de trabajo
    const modalidadNoEspecificada = !perfil.modalidadTrabajo || 
                                   perfil.modalidadTrabajo === "No especificado";

    // Solo retornamos true si hay AL MENOS UN requisito específico
    // (es decir, si NO todos son "No especificado")
    return !todosNoEspecificados || !modalidadNoEspecificada;
},

tieneRequisitosIdioma(perfil) {
    // Para idioma, ambos deben ser "No especificado" para retornar false
    const requisitoNoEspecificado = !perfil.requisitoIdioma || 
        perfil.requisitoIdioma === "No especificado" || 
        perfil.requisitoIdioma === "no especificado";

    const idiomaNoEspecificado = !perfil.idioma || 
        perfil.idioma === "No especificado" || 
        perfil.idioma === "no especificado";

    return !requisitoNoEspecificado || !idiomaNoEspecificado;
},

tieneRequisitosEducacion(perfil) {
    // Para educación, ambos deben ser "No especificado" para retornar false
    const nivelNoEspecificado = !perfil.nivelMinimoEducacion || 
        perfil.nivelMinimoEducacion === "No especificado" || 
        perfil.nivelMinimoEducacion === "no especificado";

    const estadoNoEspecificado = !perfil.estadoNivelEducacion || 
        perfil.estadoNivelEducacion === "No especificado" || 
        perfil.estadoNivelEducacion === "no especificado";

    return !nivelNoEspecificado || !estadoNoEspecificado;
},

tieneRequisitosJerarquia(perfil) {
    // Para jerarquía, debe tener un valor específico
    return !(!perfil.jerarquia || 
            perfil.jerarquia === "No especificado" || 
            perfil.jerarquia === "no especificado" ||
            perfil.jerarquia.trim() === "");
},
evaluarCriterioTecnico(postulante, perfil) {
    let resultado = {
        puntuacion: 0,
        detalles: [],
        cumpleMinimo: false
    };

// Limpiar requisitos antes de procesar
const requisitosLimpios = (
  typeof perfil.requisitos === 'string' &&
  perfil.requisitos.trim().toLowerCase() !== 'no especificado'
) ? perfil.requisitos : '';
       // 1. Extraer tecnologías clave solo del título
							/* const tecnologiasPrincipales = new Set([
								...this.extraerPalabrasClave(perfil.requisitos || '')
							]);
						 */
             const tecnologiasPrincipales = new Set([
						  ...(perfil.palabrasClave?.length ? perfil.palabrasClave : this.extraerPalabrasClave(perfil.requisitos || ''))
						]);



    // 2. Extraer conocimientos del postulante (más exhaustivo)
    const conocimientosPostulante = new Set();
    
    // 2.1 Conocimientos directos
    postulante.conocimientos?.forEach(c => {
        if (c.nombre) {
            conocimientosPostulante.add(c.nombre.toLowerCase().trim());
            // Agregar variantes comunes
            conocimientosPostulante.add(c.nombre.toLowerCase().replace(/[-_\s]/g, ''));
        }
    });

    // 2.2 Experiencias laborales
    postulante.experienciasLaborales?.forEach(exp => {
        // Puesto
        if (exp.puesto) {
            conocimientosPostulante.add(exp.puesto.toLowerCase().trim());
            this.extraerPalabrasClave(exp.puesto).forEach(p => conocimientosPostulante.add(p));
        }

        // Descripción
        if (exp.descripcion) {
            this.extraerPalabrasClave(exp.descripcion).forEach(p => conocimientosPostulante.add(p));
        }

        // Tecnologías
        if (exp.tecnologias) {
            exp.tecnologias.forEach(t => {
                if (t) {
                    conocimientosPostulante.add(t.toLowerCase().trim());
                    conocimientosPostulante.add(t.toLowerCase().replace(/[-_\s]/g, ''));
                }
            });
        }
    });



    // 3. Evaluar coincidencias
    let coincidencias = new Map();
    let tieneRolTecnico = false;

    
        tieneRolTecnico = true;
 

    // 3.2 Evaluar tecnologías
    for (const tech of tecnologiasPrincipales) {
        let maxCoincidencia = 0;
        let detalleCoincidencia = '';

        for (const conocimiento of conocimientosPostulante) {
            // Coincidencia exacta
            if (conocimiento.includes(tech) || tech.includes(conocimiento)) {
                maxCoincidencia = 1;
                detalleCoincidencia = `Coincidencia: ${tech}`;
             // console.log('Coincidencia encontrada:', tech, conocimiento);
                break;
            }

            // Tecnologías relacionadas
            const relacionadas = this.TECNOLOGIAS_RELACIONADAS[tech.toLowerCase()] || [];
            if (relacionadas.some(rel => conocimiento.includes(rel))) {
                maxCoincidencia = Math.max(maxCoincidencia, 0.8);
                detalleCoincidencia = `Tecnología relacionada: ${tech} (${conocimiento})`;
           //     console.log('Tecnología relacionada encontrada:', tech, conocimiento);
            }
        }

        if (maxCoincidencia > 0) {
            coincidencias.set(tech, {
                valor: maxCoincidencia,
                detalle: detalleCoincidencia
            });
        }
    }

   // 4. Calcular puntuación
const tecnologiasEncontradas = Array.from(coincidencias.values());
const cantidadCoincidencias = tecnologiasEncontradas.length;
const cantidadBuscadas = tecnologiasPrincipales.size;

// Si encontramos al menos una tecnología, cumple el mínimo
resultado.cumpleMinimo = cantidadCoincidencias > 0;

// Calculamos la puntuación proporcional
const puntuacionTotal = Math.floor(
    (cantidadCoincidencias / cantidadBuscadas) * this.PESOS_CRITERIOS.TECNICO.peso
);

resultado.puntuacion = puntuacionTotal;
resultado.detalles = tecnologiasEncontradas.map(c => c.detalle);

// Calculamos el porcentaje para el log
const porcentajeCriterio = (cantidadCoincidencias / cantidadBuscadas) * 100;


    if (resultado.cumpleMinimo) {
      console.log('Nombre Postulante:', postulante.nombre, postulante.apellido);
    //  console.log('Tecnologías buscadas:', Array.from(tecnologiasPrincipales));
    //    console.log('Conocimientos del postulante:', Array.from(conocimientosPostulante));
  // Mostrar log de coincidencias
  for (const tech of tecnologiasPrincipales) {
        let detalleCoincidencia = '';

        for (const conocimiento of conocimientosPostulante) {
            // Coincidencia exacta
            if (conocimiento.includes(tech) || tech.includes(conocimiento)) {
              console.log('✅ ANALISIS TECNICO: Coincidencia encontrada:  Perfil-->', tech, 'Postulante-->', conocimiento);
                break;
            }

            // Tecnologías relacionadas
            const relacionadas = this.TECNOLOGIAS_RELACIONADAS[tech.toLowerCase()] || [];
            if (relacionadas.some(rel => conocimiento.includes(rel))) {
                console.log('✅ ANALISIS TECNICO: Tecnología relacionada encontrada: Perfil:', tech, 'Postulante:', conocimiento);
            }
        }

    }
    
  /*  console.log('📊 Evaluación técnica:', {
    tecnologiasBuscadas: Array.from(tecnologiasPrincipales),
    tecnologiasEncontradas: tecnologiasEncontradas.map(c => c.detalle),
    cantidadCoincidencias,
    cantidadBuscadas,
    puntuacionTotal,
    porcentajeCriterio: `${porcentajeCriterio.toFixed(2)}%`,
    cumpleMinimo: resultado.cumpleMinimo
});*/
  /*  console.log('Evaluación técnica:', {
        puntuacionTotal,
        porcentajeCriterio,
        minimoRequerido: this.PESOS_CRITERIOS.TECNICO.minimo,
        cumpleMinimo: resultado.cumpleMinimo
    });  */
  }
    
    return resultado;
},
evaluarCriterioLocalidad(postulante, perfil) {

  console.log('\n🗣️ Evaluando criterio LOCALIDAD');
    console.log('Modalidad de trabajo:', perfil.modalidadTrabajo);
    console.log('Ubicación requerida:', perfil.ubicacion);

  console.log('Perfil solicitado:', {
        modalidadTrabajo: perfil.modalidadTrabajo,
        ubicacion: perfil.ubicacion
    });

    // Convertimos el Proxy a un objeto plano
    const ubicacionPerfil = {
        pais: perfil.ubicacion?.pais || 'No especificado',
        provincia: perfil.ubicacion?.provincia || 'No especificado',
        ciudad: perfil.ubicacion?.ciudad || 'No especificado'
    };

    const ubicacionPostulante = {
        pais: postulante.direccion?.pais,
        provincia: postulante.direccion?.provincia,
        ciudad: postulante.direccion?.ciudad
    };

    console.log('Comparando ubicaciones:', {
        perfil: ubicacionPerfil,
        postulante: ubicacionPostulante
    });

    let resultado = {
        puntuacion: 0,
        detalles: [],
        cumpleMinimo: false
    };

    // Si es remoto, mantener la lógica existente
    if (perfil.modalidadTrabajo?.toLowerCase().includes('remot')) {
        const disponibilidadRemota = postulante.disponibilidadTrabajo?.some(d => 
           this.MODALIDADES_TRABAJO.remoto.some(term => d.toLowerCase().includes(term))
        );

        if (disponibilidadRemota) {
            resultado.puntuacion = this.PESOS_CRITERIOS.LOCALIDAD.peso;
            resultado.detalles.push('Modalidad remota coincidente');
            resultado.cumpleMinimo = true;
            return resultado;
        }
    }

    // Determinar el nivel de especificidad requerido
    let nivelRequerido;
    if (ubicacionPerfil.ciudad !== 'No especificado') {
        nivelRequerido = 'ciudad';
    } else if (ubicacionPerfil.provincia !== 'No especificado') {
        nivelRequerido = 'provincia';
    } else if (ubicacionPerfil.pais !== 'No especificado') {
        nivelRequerido = 'pais';
    }
    console.log('Nivel de especificidad requerido:', nivelRequerido);
    // Si no hay requisitos de ubicación
    if (!nivelRequerido) {
      console.log('❗ No hay requisitos específicos de ubicación');
        resultado.puntuacion = this.PESOS_CRITERIOS.LOCALIDAD.peso;
        resultado.cumpleMinimo = true;
        resultado.detalles.push('No hay requisitos específicos de ubicación');
        return resultado;
    }

    // Evaluar según el nivel requerido
    let coincide = false;
    
    switch (nivelRequerido) {
        case 'ciudad':
        console.log('Comparando ciudades:', {
                perfil: ubicacionPerfil.ciudad,
                postulante: ubicacionPostulante.ciudad
            });
            if (ubicacionPostulante.ciudad?.toLowerCase() === ubicacionPerfil.ciudad.toLowerCase()) {
                coincide = true;
                resultado.detalles.push(`Coincidencia exacta en ciudad: ${ubicacionPerfil.ciudad}`);
            }
            break;
            
        case 'provincia':
        console.log('Comparando provincias:', {
                perfil: ubicacionPerfil.provincia,
                postulante: ubicacionPostulante.provincia
            });
            if (ubicacionPostulante.provincia?.toLowerCase() === ubicacionPerfil.provincia.toLowerCase()) {
                coincide = true;
                resultado.detalles.push(`Coincidencia exacta en provincia: ${ubicacionPerfil.provincia}`);
            }
            break;
            
        case 'pais':
        console.log('Comparando países:', {
                perfil: ubicacionPerfil.pais,
                postulante: ubicacionPostulante.pais
            });
            if (ubicacionPostulante.pais?.toLowerCase() === ubicacionPerfil.pais.toLowerCase()) {
                coincide = true;
                resultado.detalles.push(`Coincidencia exacta en país: ${ubicacionPerfil.pais}`);
            }
            break;
    }


    console.log('Resultado de la comparación:', {
        coincide,
        detalles: resultado.detalles
    });
    if (coincide) {
        resultado.puntuacion = this.PESOS_CRITERIOS.LOCALIDAD.peso;
        resultado.cumpleMinimo = true;
    }
    console.log('Resultado final:', {
        puntuacion: resultado.puntuacion,
        cumpleMinimo: resultado.cumpleMinimo,
        detalles: resultado.detalles
    });

    // Log para debugging
    if (resultado.cumpleMinimo) {
        console.log('📍 EVALUACIÓN LOCALIDAD:', {
            nivelRequerido,
            perfilUbicacion: ubicacionPerfil,
            postulanteUbicacion: ubicacionPostulante,
            coincide,
            puntuacion: resultado.puntuacion,
            detalles: resultado.detalles
        });
    }

    return resultado;
},
evaluarCriterioIdioma(postulante, perfil) {
    let resultado = {
        puntuacion: 0,
        detalles: [],
        cumpleMinimo: false
    };

    console.log('\n🗣️ Evaluando criterio IDIOMA');
    console.log('Idioma requerido:', perfil.requisitoIdioma || perfil.idioma);
    console.log('Idiomas del postulante:', postulante.idiomas);

    // Si no hay requisitos de idioma, retornar puntuación máxima
    if (!perfil.requisitoIdioma && !perfil.idioma) {
        resultado.puntuacion = this.PESOS_CRITERIOS.IDIOMA.peso;
        resultado.cumpleMinimo = true;
        resultado.detalles.push('No se requiere idioma específico');
        return resultado;
    }

    const idiomaRequerido = (perfil.requisitoIdioma || perfil.idioma).toLowerCase();
    let nivelRequerido = 'basico'; // Nivel por defecto si no se especifica

    // Extraer nivel requerido si está especificado
    const palabrasIdioma = idiomaRequerido.split(/\s+/);
    for (const palabra of palabrasIdioma) {
        if (this.NIVELES_IDIOMA[palabra]) {
            nivelRequerido = palabra;
            break;
        }
    }

    // Buscar el idioma en los conocimientos del postulante
    const idiomasPostulante = postulante.idiomas || [];
    let mejorNivelEncontrado = null;
    let idiomaEncontrado = null;

    for (const idioma of idiomasPostulante) {
        if (!idioma.nombre || !idioma.nivel) continue;

        const nombreIdioma = idioma.nombre.toLowerCase();
        const nivelIdioma = idioma.nivel.toLowerCase();

        console.log('Comparando idiomas:', {
            perfil: idioma.nombre,
            postulante: nombreIdioma
        });

        // Verificar si el idioma coincide
        if (palabrasIdioma.some(palabra => nombreIdioma.includes(palabra))) {
            const nivelNumerico = NIVELES_IDIOMA[nivelIdioma] || 0;
            
            if (!mejorNivelEncontrado || nivelNumerico > NIVELES_IDIOMA[mejorNivelEncontrado]) {
                mejorNivelEncontrado = nivelIdioma;
                idiomaEncontrado = idioma;
            }
        }
    }

    console.log('Idioma encontrado:', idiomaEncontrado);

    // Calcular puntuación basada en el nivel encontrado
    if (idiomaEncontrado) {
        const nivelRequeridoNum = NIVELES_IDIOMA[nivelRequerido];
        const nivelEncontradoNum = NIVELES_IDIOMA[mejorNivelEncontrado];

        if (nivelEncontradoNum >= nivelRequeridoNum) {
            resultado.puntuacion = this.PESOS_CRITERIOS.IDIOMA.peso;
            resultado.detalles.push(
                `Idioma ${idiomaEncontrado.nombre} encontrado con nivel ${mejorNivelEncontrado} ` +
                `(requerido: ${nivelRequerido})`
            );
        } else {
            // Puntuación parcial si el nivel es inferior al requerido
            resultado.puntuacion = Math.floor(
                (nivelEncontradoNum / nivelRequeridoNum) * this.PESOS_CRITERIOS.IDIOMA.peso
            );
            resultado.detalles.push(
                `Idioma ${idiomaEncontrado.nombre} encontrado con nivel inferior: ${mejorNivelEncontrado} ` +
                `(requerido: ${nivelRequerido})`
            );
        }
    } else {
        console.log('❌ No se encontró el idioma requerido:', idiomaRequerido);
        resultado.detalles.push(`No se encontró el idioma requerido: ${idiomaRequerido}`);
    }

    // Verificar si cumple el mínimo requerido
    resultado.cumpleMinimo = (resultado.puntuacion / this.PESOS_CRITERIOS.IDIOMA.peso * 100) >= this.PESOS_CRITERIOS.IDIOMA.minimo;
    console.log('Resultado evaluación idioma:', {
        puntuacion: resultado.puntuacion,
        detalles: resultado.detalles,
        cumpleMinimo: resultado.cumpleMinimo
    });

    return resultado;
},

evaluarCriterioEducacion(postulante, perfil) {
    let resultado = {
        puntuacion: 0,
        detalles: [],
        cumpleMinimo: false
    };
    console.log('\n📚 Evaluando criterio EDUCACIÓN');
    console.log('Requisitos del perfil:', {
        nivelMinimo: perfil.nivelMinimoEducacion,
        requiereCompleto: perfil.requisitoSecundarioCompleto === 'Sí'
    });
    console.log('Estudios del postulante:', postulante.estudios);
    // Si no hay requisitos de educación, retornar puntuación máxima
    if (!perfil.nivelMinimoEducacion && !perfil.estadoNivelEducacion) {
        resultado.puntuacion = this.PESOS_CRITERIOS.EDUCACION.peso;
        resultado.cumpleMinimo = true;
        resultado.detalles.push('No se requiere nivel educativo específico');
        return resultado;
    }

    const estudiosPostulante = postulante.estudios || [];
    if (!estudiosPostulante.length) {
        resultado.detalles.push('No se encontraron estudios registrados');
        return resultado;
    }

    // Determinar nivel mínimo requerido
    const nivelRequerido = perfil.nivelMinimoEducacion?.toLowerCase() || 'secundario';
    const requiereCompleto = perfil.estadoNivelEducacion?.toLowerCase().includes('complet');

    // Encontrar el nivel más alto del postulante
    let maxNivelPostulante = 0;
    let estudiosRelevantes = [];

    for (const estudio of estudiosPostulante) {
        if (!estudio.nivel) continue;

        const nivelEstudio = estudio.nivel.toLowerCase();
        const nivelNumerico = this.NIVELES_EDUCACION[nivelEstudio] || 0;
        const estadoCompleto = estudio.estado?.toLowerCase().includes('complet');

        if (nivelNumerico > 0) {
            // Solo considerar estudios completos si es requerido
            if (!requiereCompleto || estadoCompleto) {
                maxNivelPostulante = Math.max(maxNivelPostulante, nivelNumerico);
                estudiosRelevantes.push({
                    nivel: nivelEstudio,
                    titulo: estudio.titulo,
                    estado: estudio.estado
                });
            }
        }
      }

    console.log('Estudios relevantes encontrados:', estudiosRelevantes);

    // Calcular puntuación
    const nivelRequeridoNum = this.NIVELES_EDUCACION[nivelRequerido] || 0;

    if (maxNivelPostulante >= nivelRequeridoNum) {
        // Cumple o supera el nivel requerido
        resultado.puntuacion = this.PESOS_CRITERIOS.EDUCACION.peso;
        resultado.detalles.push(`Supera nivel educativo requerido: ${nivelRequerido}`);
    } else if (maxNivelPostulante > 0) {
        // Puntuación parcial si tiene algún nivel educativo
        resultado.puntuacion = Math.floor(
            (maxNivelPostulante / nivelRequeridoNum) * this.PESOS_CRITERIOS.EDUCACION.peso
        );
        resultado.detalles.push(`Nivel educativo inferior al requerido: ${nivelRequerido}`);
    }

    // Agregar detalles de los estudios relevantes
    estudiosRelevantes.forEach(estudio => {
        resultado.detalles.push(
            `${estudio.nivel.charAt(0).toUpperCase() + estudio.nivel.slice(1)}: ` +
            `${estudio.titulo} (${estudio.estado})`
        );
    });

    // Verificar si cumple el mínimo requerido
    resultado.cumpleMinimo = (resultado.puntuacion / this.PESOS_CRITERIOS.EDUCACION.peso * 100) >= this.PESOS_CRITERIOS.EDUCACION.minimo;

    console.log('Resultado evaluación educación:', {
        nivelRequerido,
        maxNivelPostulante,
        estudiosRelevantes,
        puntuacion: resultado.puntuacion,
        cumpleMinimo: resultado.cumpleMinimo,
        detalles: resultado.detalles
    });

    return resultado;
},
evaluarCriterioSeniority(postulante, perfil) {
    let resultado = {
        puntuacion: 0,
        detalles: [],
        cumpleMinimo: false
    };

    // Si no hay requisito de jerarquía, retornar puntuación máxima
    if (!perfil.jerarquia) {
        resultado.puntuacion = this.PESOS_CRITERIOS.SENIORITY.peso;
        resultado.cumpleMinimo = true;
        resultado.detalles.push('No se requiere nivel de seniority específico');
        return resultado;
    }

    const jerarquiaRequerida = perfil.jerarquia.toLowerCase();
    const experiencias = postulante.experienciasLaborales || [];
    let puntos = 0;
    let detallesExperiencia = [];

    // Calcular años totales de experiencia
    const añosExperiencia = this.calcularExperienciaTotal(experiencias);

    // Buscar puestos que indiquen seniority
    const puestosSenior = experiencias.filter(exp => {
        const puesto = exp.puesto?.toLowerCase() || '';
        return puesto.includes('senior') || 
               puesto.includes('lead') || 
               puesto.includes('architect') ||
               puesto.includes('sr.') ||
               puesto.includes('manager') ||
               puesto.includes('jefe') ||
               puesto.includes('director');
    });

    // Evaluar según la jerarquía requerida
    switch (jerarquiaRequerida) {
        case 'senior':
            if (puestosSenior.length > 0 && añosExperiencia >= 5) {
                puntos = this.PESOS_CRITERIOS.SENIORITY.peso;
                detallesExperiencia.push(`Experiencia senior verificada: ${añosExperiencia} años`);
            } else if (añosExperiencia >= 5) {
                puntos = Math.floor(this.PESOS_CRITERIOS.SENIORITY.peso * 0.8);
                detallesExperiencia.push(`Años de experiencia suficientes: ${añosExperiencia} años`);
            } else if (puestosSenior.length > 0) {
                puntos = Math.floor(this.PESOS_CRITERIOS.SENIORITY.peso * 0.6);
                detallesExperiencia.push('Tiene puestos senior pero menos experiencia');
            }
            break;

        case 'semi-senior':
            if (añosExperiencia >= 3) {
                puntos = this.PESOS_CRITERIOS.SENIORITY.peso;
                detallesExperiencia.push(`Experiencia semi-senior verificada: ${añosExperiencia} años`);
            } else if (añosExperiencia >= 2) {
                puntos = Math.floor(this.PESOS_CRITERIOS.SENIORITY.peso * 0.8);
                detallesExperiencia.push(`Cerca del nivel semi-senior: ${añosExperiencia} años`);
            }
            break;

        case 'junior':
            if (añosExperiencia >= 1) {
                puntos = this.PESOS_CRITERIOS.SENIORITY.peso;
                detallesExperiencia.push(`Experiencia junior verificada: ${añosExperiencia} años`);
            } else if (añosExperiencia > 0) {
                puntos = Math.floor(this.PESOS_CRITERIOS.SENIORITY.peso * 0.8);
                detallesExperiencia.push(`Experiencia junior inicial: ${añosExperiencia} años`);
            }
            break;

        case 'trainee':
            puntos = this.PESOS_CRITERIOS.SENIORITY.peso; // No se requiere experiencia
            detallesExperiencia.push('Nivel trainee no requiere experiencia previa');
            break;
    }

    // Agregar detalles de los puestos senior encontrados
    if (puestosSenior.length > 0) {
        detallesExperiencia.push('Puestos senior encontrados:');
        puestosSenior.forEach(exp => {
            detallesExperiencia.push(`- ${exp.puesto} (${exp.añoDesde}-${exp.añoHasta || 'actual'})`);
        });
    }

    resultado.puntuacion = puntos;
    resultado.detalles = detallesExperiencia;
    resultado.cumpleMinimo = (puntos / this.PESOS_CRITERIOS.SENIORITY.peso * 100) >= this.PESOS_CRITERIOS.SENIORITY.minimo;

    return resultado;
},
async generarFichaCurricular(postulante, selectedVacante) {
  try {
    console.log('Iniciando generación de ficha curricular para:', postulante);
    console.log('OpenAI Service:', openAIService);
    
    let analisisPostulante = null;
    try {
      // Intentar obtener de MongoDB primero
      const analysis = await analysisService.getAnalysis(
        this.selectedVacante.id,
        postulante.id
      );

      // Mantener la lógica original de localStorage también
      const analysisKey = `analysis_${this.selectedVacante.id}_${postulante.id}`;
      const analysisData = localStorage.getItem(analysisKey);

      // Intentar procesar datos de MongoDB
      if (analysis?.result?.analysis) {
        const fullAnalysis = typeof analysis.result.analysis === 'string' 
          ? JSON.parse(analysis.result.analysis)
          : analysis.result.analysis;
        
        analisisPostulante = {
          justificacionAdecuacion: fullAnalysis.Calificación_de_adecuación?.justificación,
          aptitudParaPuesto: fullAnalysis["Aptitud general para el puesto"],
          fortalezas: fullAnalysis["Fortalezas identificadas"],
          debilidades: fullAnalysis["Debilidades o áreas de mejora"],
          justificacionRequisitos: fullAnalysis["Cumplimiento de requisitos excluyentes"]?.justificación
        };
        console.log('Análisis procesado desde MongoDB:', analisisPostulante);
      } 
      // Si no hay datos en MongoDB o hubo error, intentar con localStorage
      else if (analysisData) {
        const parsedData = JSON.parse(analysisData);
        if (parsedData.result?.analysis) {
          const fullAnalysis = typeof parsedData.result.analysis === 'string' 
            ? JSON.parse(parsedData.result.analysis)
            : parsedData.result.analysis;
          
          analisisPostulante = {
            justificacionAdecuacion: fullAnalysis.Calificación_de_adecuación?.justificación,
            aptitudParaPuesto: fullAnalysis["Aptitud general para el puesto"],
            fortalezas: fullAnalysis["Fortalezas identificadas"],
            debilidades: fullAnalysis["Debilidades o áreas de mejora"],
            justificacionRequisitos: fullAnalysis["Cumplimiento de requisitos excluyentes"]?.justificación
          };
          console.log('Análisis procesado desde localStorage:', analisisPostulante);
        }
      }
    } catch (error) {
      console.error('Error al procesar el análisis:', error);
    }

    console.log('Análisis recuperado:', analisisPostulante);
    console.log('Métodos disponibles:', Object.keys(openAIService));

    // Mostrar progreso
    this.showProgresoModal = true;
    this.estadoActualProceso = 'Iniciando generación de Ficha Curricular...';

    // Obtener archivos del postulante
    console.log('Llamando al servicio para obtener archivos del postulante...');
    let archivos = [];
    try {
      const details = await hiringRoomService.getPostulantDetails(postulante.id);
      archivos = details.archivos || [];
      console.log('Archivos encontrados:', archivos.length);
    } catch (error) {
      console.log('No se encontraron archivos adjuntos:', error);
    }

    this.estadoActualProceso = 'Generando Ficha Curricular. Espere por favor...';

    // Llamar al servicio con o sin archivos
    const response = await openAIService.generateCurriculumFicha(
      postulante,
      archivos,
      analisisPostulante
    );

    // Crear y descargar el archivo DOCX
    console.log('Respuesta recibida:', response);
    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    console.log('URL creada:', url);
    link.download = `Ficha_Curricular_${postulante.nombre}_${postulante.apellido}.docx`;
    console.log('Descargando archivo:', link.download);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('Archivo descargado exitosamente');

    // Mostrar éxito
    this.estadoActualProceso = '✅ Ficha Curricular lista para revisar. Gracias por esperar';
    setTimeout(() => {
      this.showProgresoModal = false;
    }, 2000);

  } catch (error) {
    console.error('Error generando documentos:', error);
    this.estadoActualProceso = `❌ Error: ${error.message}`;
  }
},
async generarFichaCurricularOneSelect(postulante, selectedVacante) {
  try {
    console.log('Iniciando generación de ficha curricular One Select para:', postulante);
    console.log('OpenAI Service:', openAIService);
    
    let analisisPostulante = null;
    try {
      // Intentar obtener de MongoDB primero
      const analysis = await analysisService.getAnalysis(
        this.selectedVacante.id,
        postulante.id
      );

      // Mantener la lógica original de localStorage también
      const analysisKey = `analysis_${this.selectedVacante.id}_${postulante.id}`;
      const analysisData = localStorage.getItem(analysisKey);

      // Intentar procesar datos de MongoDB
      if (analysis?.result?.analysis) {
        const fullAnalysis = typeof analysis.result.analysis === 'string' 
          ? JSON.parse(analysis.result.analysis)
          : analysis.result.analysis;
        
        analisisPostulante = {
          justificacionAdecuacion: fullAnalysis.Calificación_de_adecuación?.justificación,
          aptitudParaPuesto: fullAnalysis["Aptitud general para el puesto"],
          fortalezas: fullAnalysis["Fortalezas identificadas"],
          debilidades: fullAnalysis["Debilidades o áreas de mejora"],
          justificacionRequisitos: fullAnalysis["Cumplimiento de requisitos excluyentes"]?.justificación
        };
        console.log('Análisis procesado desde MongoDB:', analisisPostulante);
      } 
      // Si no hay datos en MongoDB o hubo error, intentar con localStorage
      else if (analysisData) {
        const parsedData = JSON.parse(analysisData);
        if (parsedData.result?.analysis) {
          const fullAnalysis = typeof parsedData.result.analysis === 'string' 
            ? JSON.parse(parsedData.result.analysis)
            : parsedData.result.analysis;
          
          analisisPostulante = {
            justificacionAdecuacion: fullAnalysis.Calificación_de_adecuación?.justificación,
            aptitudParaPuesto: fullAnalysis["Aptitud general para el puesto"],
            fortalezas: fullAnalysis["Fortalezas identificadas"],
            debilidades: fullAnalysis["Debilidades o áreas de mejora"],
            justificacionRequisitos: fullAnalysis["Cumplimiento de requisitos excluyentes"]?.justificación
          };
          console.log('Análisis procesado desde localStorage:', analisisPostulante);
        }
      }
    } catch (error) {
      console.error('Error al procesar el análisis:', error);
    }

    console.log('Análisis recuperado:', analisisPostulante);
    console.log('Métodos disponibles:', Object.keys(openAIService));

    // Mostrar progreso
    this.showProgresoModal = true;
    this.estadoActualProceso = 'Iniciando generación de Ficha Curricular One Select ...';

    // Obtener archivos del postulante
    console.log('Llamando al servicio para obtener archivos del postulante...');
    let archivos = [];
    try {
      const details = await hiringRoomService.getPostulantDetails(postulante.id);
      archivos = details.archivos || [];
      console.log('Archivos encontrados:', archivos.length);
    } catch (error) {
      console.log('No se encontraron archivos adjuntos:', error);
    }

    this.estadoActualProceso = 'Generando Ficha Curricular One Select . Espere por favor...';

    // Llamar al servicio con o sin archivos
    const response = await openAIService.generateCurriculumFichaOneSelect(
      postulante,
      archivos,
      analisisPostulante
    );

    // Crear y descargar el archivo DOCX
    console.log('Respuesta recibida:', response);
    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    console.log('URL creada:', url);
    link.download = `Ficha_Curricular_${postulante.nombre}_${postulante.apellido}.docx`;
    console.log('Descargando archivo:', link.download);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('Archivo descargado exitosamente');

    // Mostrar éxito
    this.estadoActualProceso = '✅ Ficha Curricular One Select lista para revisar. Gracias por esperar';
    setTimeout(() => {
      this.showProgresoModal = false;
    }, 2000);

  } catch (error) {
    console.error('Error generando documentos:', error);
    this.estadoActualProceso = `❌ Error: ${error.message}`;
  }
},
async generarFichaConSpinner(postulante, selectedVacante) {
  try {
    this.botonGenerandoFicha = true;
    await this.generarFichaCurricular(postulante, selectedVacante);
  } catch (error) {
    console.error('Error al generar ficha:', error);
  } finally {
    this.botonGenerandoFicha = false;
  }
},
async generarFichaOneSelectConSpinner(postulante, selectedVacante) {
  try {
    this.botonGenerandoFichaOS = true;
    await this.generarFichaCurricularOneSelect(postulante, selectedVacante);
  } catch (error) {
    console.error('Error al generar ficha:', error);
  } finally {
    this.botonGenerandoFichaOS  = false;
  }
},
async downloadCV(postulant) {
  try {
    console.log('Datos del postulante:', postulant);
    
    if (!postulant || !postulant.hiringRoomId) {
      console.error('No hay datos válidos del postulante');
      return;
    }

    // Obtener los detalles del postulante usando hiringRoomService
    const details = await hiringRoomService.getPostulantDetails(postulant.hiringRoomId);
    
    console.log('Respuesta de HiringRoom:', details);
    
    if (!details?.archivos?.length) {
      console.error('No hay archivos disponibles para descargar');
      return;
    }

    // Obtener el primer archivo
    const cvFile = details.archivos[0];
    
    // Crear un enlace temporal para la descarga
    const link = document.createElement('a');
    link.href = cvFile.url;
    link.download = cvFile.nombre || 'CV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error al descargar CV:', error);
  }
},
async downloadAllBPMatchesCVs() {
  this.downloadingAllCVs = true;
  try {
    if (!this.resultadosBPSeleccionados?.matches?.length) {
      alert('No hay postulantes para descargar.');
      return;
    }

    const archivosPromises = this.resultadosBPSeleccionados.matches.map(async m => {
      const postulant = m.postulantInfo;
      const details = await hiringRoomService.getPostulantDetails(postulant.hiringRoomId || postulant.id);
      return {
        postulant,
        archivos: details.archivos || []
      };
    });

    const resultados = await Promise.all(archivosPromises);
    const totalArchivos = resultados.reduce((total, res) => total + res.archivos.length, 0);

    if (totalArchivos === 0) {
      alert('No hay archivos adjuntos disponibles para descargar en estos resultados');
      return;
    }

    if (!confirm(`¿Desea descargar ${totalArchivos} archivo(s) de estos resultados?`)) {
      return;
    }

    const files = resultados.flatMap(resultado => {
      const { postulant, archivos } = resultado;
      return archivos.map(archivo => {
        let extension;
        if (archivo.nombre.includes('.')) {
          extension = archivo.nombre.split('.').pop();
        } else {
          extension = 'pdf';
        }
        const nombreLimpio = archivo.nombre.replace(/[^a-z0-9.-]/gi, '_');
        const nombreBase = !archivo.nombre.includes('.') ? nombreLimpio.replace(/_+$/, '') : nombreLimpio;
        const nombreFinal = `${postulant.nombre}_${postulant.apellido}_${nombreBase}.${extension}`;
        return {
          nombre: nombreFinal,
          url: archivo.url
        };
      });
    });

    const zip = new JSZip();

    async function downloadWithRetry(url, token, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(BASE_URL+`/api/download-file`, {
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
          if (attempt === maxRetries) throw error;
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
      } catch (error) {
        if (!confirm(`Error al descargar ${file.nombre}. ¿Desea continuar con los demás archivos?`)) {
          throw new Error('Descarga cancelada por el usuario');
        }
      }
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const downloadUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `CVs_BP_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    alert(error.message || 'Error al descargar los CVs. Por favor, intente nuevamente.');
  } finally {
    this.downloadingAllCVs = false;
  }
},

// Métodos de logging
logearRechazo(postulante, criterio, porcentajeObtenido, minimoRequerido) {
    console.log('\n' + '❌'.repeat(50));
    console.log(`POSTULANTE RECHAZADO: ${postulante.nombre} ${postulante.apellido}`);
    console.log('-'.repeat(50));
    console.log(`Criterio no cumplido: ${criterio}`);
    console.log(`Porcentaje obtenido: ${porcentajeObtenido.toFixed(2)}%`);
    console.log(`Mínimo requerido: ${minimoRequerido}%`);
    console.log('❌'.repeat(50) + '\n');
},

logearResultadoEvaluacion(postulante, detallesEvaluacion) {
    //console.log('\n' + '='.repeat(50));
    //console.log(`EVALUACIÓN COMPLETA: ${postulante.nombre} ${postulante.apellido}`);
    //console.log('='.repeat(50));
    
    // Mostrar resumen de criterios evaluados
    //console.log('\nCRITERIOS EVALUADOS:');
    //console.log('-'.repeat(25));
    
    detallesEvaluacion.forEach(detalle => {
        //console.log(`\n${detalle.criterio}:`);
        //console.log(`└─ Puntuación: ${detalle.puntuacion} puntos (${detalle.porcentaje.toFixed(2)}%)`);
    //detalle.detalles.forEach(d => console.log(`   └─ ${d}`));
    });

    // Mostrar resultado final
    //console.log('\n' + '-'.repeat(50));
    console.log('✅ POSTULANTE APROBADO: Cumple todos los criterios mínimos requeridos');
    //console.log('='.repeat(50) + '\n');
},

// Métodos auxiliares de extracción y validación
extraerPalabrasClave(texto) {
    if (!texto) return [];
    return texto.toLowerCase()
        .replace(/[^\w\s,]/g, '')
        .split(/[\s,]+/)
        .filter(palabra => 
            palabra.length > 2 && 
            !this.PALABRAS_COMUNES.has(palabra.toLowerCase())
        );
},



calcularExperienciaTotal(experiencias) {
    if (!experiencias?.length) return 0;
    
    return experiencias.reduce((total, exp) => {
        const desde = exp.añoDesde ? parseInt(exp.añoDesde) : new Date().getFullYear();
        const hasta = exp.añoHasta ? 
            parseInt(exp.añoHasta) : 
            (exp.trabajoActual ? new Date().getFullYear() : desde);
        return total + Math.max(0, hasta - desde);
    }, 0);
},
    evaluarTags(tagsPostulante, tagsRequeridos) {
        if (!tagsRequeridos?.length || !tagsPostulante?.length) return 0;

        const tagsPostulanteSet = new Set(
            tagsPostulante.map(t => t.nombre?.toLowerCase())
        );

        const coincidencias = tagsRequeridos.filter(tag =>
            tagsPostulanteSet.has(tag.toLowerCase())
        ).length;

        return Math.min(Math.floor((coincidencias / tagsRequeridos.length) * 5), 5);
    },
    
    closeRequisitosModal() {
        console.log('Cerrando modal');
        this.showRequisitosModal = false;
        this.requisitosSeleccionados = null;
    },


    verDetallesResultados(busqueda) {
      // Aquí implementaremos la lógica para mostrar los resultados
      console.log('Ver resultados:', busqueda);
    },
 
  },
  async mounted() {
    const token = localStorage.getItem('hr_token');
    if (token) {
      this.token = token;
      await this.loadVacancies();
    }
    await this.checkServer();
    this.initializeSpeechRecognition();
  },
  async created() {
    this.loadingVacancies = true;
    this.loadingMessage = 'Iniciando búsqueda de vacantes...';
    await this.getVacancies();
    try {
      this.loadingInitialData = true;
      /*await this.loadInitialData();*/
      await this.loadVacancies(); 
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    } finally {
      this.loadingInitialData = false;
    }
    // Agregar aquí
    console.log('Iniciando inicialización de estados de postulantes');
    this.initializePostulantStates();
  },
  watch: {
    scoreOrder(newValue) {
        console.log('Orden cambiado a:', newValue);
        this.initializePostulantStates();
    },
    showConsultasHistoricasModal(newValue) {
        if (newValue) {
            this.cargarBusquedasHistoricas();
        }
    }
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-900">Validación de CVs en Postulaciones</h2>
      <div class="flex gap-4">
        <button 
          @click="showBusquedaProactivaModal = true"
          class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Búsqueda Proactiva
        </button>
        <button 
          @click="abrirConsultasHistoricas"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Consultas Históricas
        </button>
      </div>
    </div>
    <p>- </p>
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Buscar Vacantes</label>
          <input type="text" 
                 v-model="searchText"
                 placeholder="Ingrese título o área..."
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-gray-900 bg-gray-50 text-gray-900">
          <p class="mt-1 text-sm text-gray-500">Ingrese palabras clave para filtrar vacantes</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Empresa</label>
          <select v-model="selectedCompanies"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-gray-50">
            <option value="all" class="text-gray-900 bg-gray-50">Todas las empresas</option>
            <option v-for="status in availableCompanies" 
                    :key="status" 
                    :value="status"
                    v-if="status !== 'all'"
                    class="text-gray-900 bg-gray-50"
            >
              {{ status }}
            </option>
          </select>
          <p class="mt-1 text-sm text-gray-500">Seleccione una empresa específico o vea todas</p>
        </div>
      </div>
    </div>

    <div v-if="loadingInitialData" 
         class="min-h-[400px] flex flex-col items-center justify-center">
      <div class="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
      <p class="mt-4 text-gray-600 font-medium">Cargando datos...</p>
      <p class="text-sm text-gray-500">Por favor espere</p>
    </div>

    <div v-else>
      <div class="max-w-7xl mx-auto p-8">
        <div class="space-y-6 mb-8">
          <div v-for="vacante in filteredVacancies" :key="vacante.id" 
               class="bg-white rounded-lg shadow-sm overflow-hidden">
            <div class="flex items-start p-4 border-b hover:bg-gray-50 transition-colors">
              <div class="flex-shrink-0 w-16 h-16 mr-4" @click="toggleCardContent(vacante)">
                <img v-if="vacante.logoUrl" 
                     :src="vacante.logoUrl" 
                     :alt="vacante.nombre"
                     class="w-full h-full object-contain rounded"
                     @error="$event.target.style.display='none'"
                >
              </div>
              
              <div class="flex-grow" @click="toggleCardContent(vacante)">
                <h4 class="text-xl font-bold text-gray-900 mb-1">{{ vacante.nombre }}</h4>
                <p v-if="vacante.area?.nombre" class="text-gray-700">{{ vacante.area.nombre }}-
                {{ vacante.fechaCreacion }}
                ({{ vacante.ubicacion.pais }}
                {{ vacante.ubicacion.provincia }}) - 
                {{ vacante.modalidadTrabajo }}</p>
              </div>
              
              <div class="flex-shrink-0 ml-4 flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full text-sm" 
                      :class="vacante.estadoActual === 'Activa' ? 'bg-green-100 text-gray-800' : 'bg-gray-100 text-gray-800'">
                  {{ vacante.estadoActual }}
                </span>

                <span class="px-3 py-1 rounded-full text-sm" 
                      :class="vacante.prioridad === 'Alta' ? 'bg-red-100 text-gray-800' : 'bg-gray-100 text-gray-800'">
                  {{ vacante.prioridad }}
                </span>

                <button @click.stop="toggleSection(vacante, 'usuarios')"
                        class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Reclutadores Asignados {{ `(${vacante.usuarios?.length || 0})` }}
                </button>

                <button 
                  @click="toggleSection(vacante, 'postulantes')"
                  :disabled="loadingVacancyId === vacante.id"
                  class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-75 disabled:cursor-wait"
                >
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
                  
                  <!-- <span>{{ loadingVacancyId === vacante.id ? 'Cargando...' : 'Ver Postulantes' }}</span> -->
                  <span>{{ loadingVacancyId === vacante.id ? 'Cargando...' : `Ver Postulantes (${vacante.postulantsCount || 0})` }}</span>

                  
                </button>

                <!-- 
                <button @click.stop="toggleSection(vacante, 'detalles')"
                       class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Ver Detalles
                </button>
                -->

                <button @click.stop="toggleSection(vacante, 'perfil')"
                        class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                  Perfil
                </button>

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
                    {{ vacante.activeSection === 'usuarios' ? 'Ocultar Usuarios' : `Ver Usuarios (${vacante.usuarios?.length || 0})` }}
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

                <div class="space-y-4">
                  <div>
    <h5 class="font-bold mb-2 text-gray-900">Detalle de la Vacante</h5>
    
    <div v-if="filteredFields.length > 0" class="grid grid-cols-2 gap-4 p-4">
        <!-- Primera columna -->
        <div class="space-y-4">
            <div v-for="(item, index) in firstColumnFields" 
                 :key="index"
                 class="bg-gray-50 p-4 rounded-lg flex items-center gap-2">
                <h3 class="font-semibold text-gray-700 capitalize">
                    {{ item.key.replace(/([A-Z])/g, ' $1').trim() }}
                </h3>
                <p class="mt-1 text-gray-600">{{ item.value }}</p>
            </div>
        </div>
        
        <!-- Segunda columna -->
        <div class="space-y-4">
            <div v-for="(item, index) in secondColumnFields" 
                 :key="index"
                 class="bg-gray-50 p-4 rounded-lg flex items-center gap-2">
                <h3 class="font-semibold text-gray-700 capitalize">
                    {{ item.key.replace(/([A-Z])/g, ' $1').trim() }}
                </h3>
                <p class="mt-1 text-gray-600">{{ item.value }}</p>
            </div>
        </div>
    </div>
</div>

<!--
                  <template v-for="(value, key) in vacante" :key="key">
                    <div v-if="typeof value !== 'object' && !['id', 'nombre', 'showDetails', 'showUsuarios',
                    'estadoActual','publicadaMicrosite','publicada','pipelineId','showCardContent','downloading','downloadProgress', 'logoUrl', 'requisitos', 
                    'descripcionTrabajo', 'beneficios'].includes(key)" 
                         class="bg-gray-50 p-4 rounded-lg">
                      <h5 class="font-bold mb-2 text-gray-900 capitalize">{{ key.replace(/([A-Z])/g, ' $1').trim() }}</h5>
                      <p class="text-gray-800">{{ value }}</p>
                    </div>
                  </template>
                -->

                  <div v-if="vacante.ubicacion" class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold mb-2 text-gray-900">Ubicación</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div v-for="(value, key) in vacante.ubicacion" :key="key" class="text-gray-800">
                        <span class="font-medium capitalize">{{ key }}:</span> {{ value }}
                      </div>
                    </div>
                  </div>

                  <div v-if="vacante.area" class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold mb-2 text-gray-900">Información del Área</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div v-for="(value, key) in vacante.area" :key="key" class="text-gray-800">
                        <span class="font-medium capitalize">{{ key }}:</span> {{ value }}
                      </div>
                    </div>
                  </div>


                  <div v-if="vacante.cliente" class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold mb-2 text-gray-900">Información del Área</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div v-for="(value, key) in vacante.area" :key="key" class="text-gray-800">
                        <span class="font-medium capitalize">{{ key }}:</span> {{ value }}
                      </div>
                    </div>
                  </div>

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

        <div class="hidden">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Pruebas de Conexión</h3>
            
            <div class="space-y-4">
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

        <div v-if="showModal" 
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg w-[90%] max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div class="sticky top-0 bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
              <h3 class="text-xl font-bold text-gray-900">
                {{ modalTitle }}
              </h3>
              <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="p-6">
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

              <div v-if="activeModal === 'postulantes'" class="relative">
                <div class="flex justify-between items-center mb-6">
                  <div class="flex items-baseline gap-2">
                    <h4 class="text-lg font-medium text-gray-900">
                      Postulantes
                    </h4>
                    <span class="text-sm text-gray-900">
                      ({{ selectedVacante?.postulants?.length || 0 }} total)
                    </span>
                  </div>
                  <div class="flex gap-2 items-center">
                    <div class="flex items-center gap-3">
                      <button @click="exportToExcel(selectedVacante)" 
                              :class="[
                                'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
                                exportingExcel ? 
                                  'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                  'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                              ]"
                              :disabled="exportingExcel">
                        <i class="fas fa-file-excel mr-1 text-green-600"></i>
                        {{ exportingExcel ? 'Exportando...' : 'Exportar a Excel' }}
                      </button>
                      
                      <button @click="downloadAllCVs(selectedVacante)"
                              :class="[
                                'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
                                selectedVacante?.downloading ? 
                                  'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                  'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                              ]"
                              :disabled="selectedVacante?.downloading">
                        <i class="fas fa-download mr-1 text-orange-600"></i>
                        {{ selectedVacante?.downloading ? 'Descargando...' : 'Descargar CVs' }}
                      </button>
                      
                      <button @click="validarCVs(false)"
                              :class="[
                                'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
                                processingValidation ? 
                                  'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                  'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                              ]"
                              :disabled="processingValidation">
                        <i class="fas fa-check-circle mr-1 text-blue-600"></i>
                        {{ processingValidation ? 'Validando...' : 'Validar CV\'s' }}
                      </button>
                      
                      <button @click="validarCVs(true)"
                              :class="[
                                'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
                                processingValidation ? 
                                  'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                  'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                              ]"
                              :disabled="processingValidation">
                        <i class="fas fa-sync mr-1 text-purple-600"></i>
                        Reprocesar Todos
                      </button>

                        <button
                        @click="handleReprocesarClick"
                        :class="[
                         'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
                         processingValidation ? 
                        'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                        'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                    ]"
                    :disabled="processingValidation"
                      >
                      <i class="fas fa-sync mr-1 text-red-600"></i>
                        Reprocesar seleccionados
                      </button>
                        <!-- Nuevos botones -->
  <button @click="generarEntrevista"
          :class="[
            'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
            processingInterview ? 
              'bg-gray-100 text-gray-400 cursor-not-allowed' : 
              'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
          ]"
          :disabled="processingInterview">
    <i class="fas fa-comments mr-1 text-indigo-600"></i>
    {{ processingInterview ? 'Generando...' : 'Generar Entrevista' }}
  </button>

  <button @click="verEntrevista"
          :class="[
            'inline-flex items-center px-2 py-1.5 rounded-md font-medium text-sm',
            !hasInterview ? 
              'bg-gray-100 text-gray-400 cursor-not-allowed' : 
              'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
          ]"
          :disabled="!hasInterview">
    <i class="fas fa-eye mr-1 text-teal-600"></i>
    Ver Entrevista
  </button>
                    </div>
                  </div>
                </div>

<!-- // Procesando CV {{ currentProcessingIndex + 1 }} de {{ selectedVacante?.postulants?.length }} -->

                <div v-if="processingValidation" class="bg-gray-50 border-b p-4 mb-4 border-t">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-4">
                      <h4 class="font-medium text-gray-900">Procesamiento en curso...</h4>
                      <span class="text-sm text-gray-600">
                       Analizando  {{ currentProcessingIndex + 1 }} de {{ totalPostulantsToProcess }} Postulantes elegidos
                      
                      </span>
                    </div>
                    <button @click="stopValidationProcess" 
                            class="px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100">
                      {{ showProcessingText ? 'Procesando...' : 'Detener proceso' }}
                    </button>
                  </div>
                  
                  <!-- Nuevo: Estado de procesamiento -->
                  <div class="mt-2 text-sm">
                    <div class="text-gray-600">
                      Procesando Postulante: {{ currentPostulantName }}
                    </div>
                    <div v-if="showPostulantResult" 
                         :class="{
                           'text-green-600': currentPostulantResult === 'Validado',
                           'text-red-600': currentPostulantResult === 'No aplica',
                           'text-yellow-600': currentPostulantResult === 'Info Insuficiente',
                           'text-blue-600': currentPostulantResult === 'IA no disponible'  // Agregamos esta línea
                         }"
                         class="font-medium">
                      Resultado: {{ currentPostulantResult }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4 mb-6">
                  <div class="relative flex-1">
                    <input 
                      v-model="postulantSearchText"
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      class="w-full pl-10 pr-4 py-2 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg class="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                  
                  <select 
                    v-model="selectedPostulantStatus"
                    class="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="validado">Validado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="no_aplica">No aplica</option>
                    <option value="info_insuficiente">Info Insuficiente</option>
                    <option value="ia_no_disponible">IA no disponible</option>
                  </select>
                  
                  <select 
                    v-model="scoreOrder" 
                    class="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Score (Mayor a Menor)</option>
                    <option value="asc">Score (Menor a Mayor)</option>
                    <option value="pending_first">Pendientes Primero</option>
                    <option value="pending_last">Pendientes Último</option>
                  </select>
                </div>

                <div v-if="loadingPostulants" 
                     class="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center min-h-[200px]">
                  <div class="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                  <p class="mt-4 text-gray-600 font-medium">Cargando postulantes...</p>
                  <p class="text-sm text-gray-500">Esto puede tomar unos segundos</p>
                </div>

      


                <!-- Lista de postulantes -->
                <div v-else>
                  <div v-if="filteredPostulants.length">
                    <div class="space-y-4">

                      <div class="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          v-model="selectAllPostulants"
                          @change="toggleSelectAllPostulants"
                          id="selectAllPostulants"
                        />
                        <label for="selectAllPostulants" class="text-sm text-gray-700">Seleccionar todos</label>
                      </div>


                      <div v-for="postulant in filteredPostulants" 
                           :key="postulant.id" 
                           :class="[
                             'flex items-center justify-between p-4 bg-white rounded-lg shadow-sm',
                             currentProcessingPostulantId === postulant.id ? 'processing-card' : ''
                           ]">

                           <div class="flex items-center mr-4">

                            <input
                              type="checkbox"
                              :value="postulant.id"
                              v-model="selectedPostulantIds"
                              @change="onSelectPostulant"
                              class="mr-4"
                            />


                        <div class="flex items-center space-x-4">

                         


                          <!-- Foto de perfil -->
                    
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
                          <div class="flex-grow ml-6">
                            <p class="font-medium text-gray-900">{{ postulant.nombre }} {{ postulant.apellido }}</p>
                            <p v-if="postulant.email" class="text-gray-900">{{ postulant.email }}</p>
                            <a
                              v-if="postulant.id && postulant.vacanteId"
                              :href="`https://sooftglobal.hiringroom.com/app/postulant/getPostulant/${postulant.id}/${postulant.vacanteId}`"
                              target="_blank"
                              class="text-primary-blue hover:underline flex items-center mt-1"
                            >
                              Ver ficha en HiringRoom
                              <i class="fas fa-external-link-alt ml-2"></i>
                            </a>
                            
                             
                            <!-- Datos de contacto del análisis -->
                            
                            <div v-if="isValidContactData(postulant.contactos1)" 
                                class="mt-2 text-gray-700">
                                <button @click="toggleContactInfo(postulant.id)" 
                                        class="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                                    <!-- ... íconos ... -->
                                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" 
                                          stroke-linejoin="round" 
                                          stroke-width="2" 
                                          d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <svg class="w-4 h-4 transform transition-transform duration-200" 
                                    :class="showContactInfo[postulant.id] ? 'rotate-180' : ''"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" 
                                          stroke-linejoin="round" 
                                          stroke-width="2" 
                                          d="M19 9l-7 7-7-7"/>
                                </svg>
                                </button>
                                
                                <div v-show="showContactInfo[postulant.id]" 
                                    class="mt-2 pl-4 border-l-2 border-green-100">
                                    <p>{{ postulant.contactos1 }}</p>
                                </div>
                            </div>
                            
                            
                                            <!--       
                                                    <span class="text-blue-600">{{ showBackendResponse1(postulant) }}</span>
                                                    <div v-if="getAnalysisDetail('contactos.datos')" 
                            class="mt-2 text-gray-700">
                            <button @click="toggleContactInfo(postulant.id)" 
                                    class="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                <svg class="w-4 h-4 transform transition-transform duration-200" 
                                    :class="showContactInfo[postulant.id] ? 'rotate-180' : ''"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            
                            <div v-show="showContactInfo[postulant.id]" 
                                class="mt-2 pl-4 border-l-2 border-green-100 transition-all duration-300 ease-in-out"
                                :class="{'opacity-0 h-0': !showContactInfo[postulant.id], 'opacity-100 h-auto': showContactInfo[postulant.id]}">
                                <div class="flex items-center gap-2">
                                    <div v-if="!getAnalysisDetail('contactos.datos')" 
                                        class="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full">
                                    </div>
                                    <p>{{ getAnalysisDetail('contactos.datos') || 'Cargando datos de contacto...' }}</p>
                                </div>
                            </div>
                        </div>

                        -->
                           
                          <!--  <span class="text-pink-600">{{ getContactos() }}</span>
                            <p v-if="analysisData1" class="text-gray-700">{{ analysisData1 }}</p>
                             {{ console.log('DATOS DE CONTACTO DE AN', getAnalysisDetail('contactos.datos')) }}
                              <span class="text-green-600">Datos de Contacto: {{ getAnalysisDetail('contactos.datos') }}</span>  OOOOK
                            {{ console.log('DATOS DE CONTACTO DE ANAL', getContactos()) }}
                             {{ console.log('DATOS DE CONTACTO DE ANALYS', getScore()) }}
                             {{ console.log('DATOS DE CONTACTO DE ANALYSIS', getPostulantDatosContacto(postulant.id)) }}
                             {{ console.log('DATOS DE CONTACTO DE ANALYSIS posttulant id:', postulant.id) }}
                             {{ console.log('DATOS DE CONTACTO DE ANALYSIS vacante.id:', selectedVacante.id) }}
                             {{ console.log('DATOS DE CONTACTO DE ANALYSIS postulante:', postulant) }}
                            <p class="text-gray-600">{{ postulant.id }}   POSTULANTE</p>
                            <p class="text-gray-600">{{ selectedVacante.id }}  VACANTE</p>
                           <span class="text-red-600">{{ getPostulantDatosContacto(postulant.id) }}</span>  -->

                             <!-- Nuevo modal para detalles del postulante -->
                                  <div v-if="showPostulantModal" 
                                      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                                    <div class="bg-white rounded-lg w-[90%] max-h-[90vh] overflow-y-auto scrollbar-thin">
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
                    <div v-if="selectedPostulant?.nacionalidad">
                      <p class="text-sm text-gray-600">Nacionalidad</p>
                      <p class="font-medium text-gray-900">{{ selectedPostulant.nacionalidad }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="selectedPostulant?.redesSociales" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-bold mb-4 text-gray-900">Redes Sociales</h4>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div v-for="(url, red) in safeJSONParse(selectedPostulant.redesSociales)" 
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
                <div v-if="selectedPostulant?.contactos1" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-bold mb-4 text-gray-900">Datos de Contacto del CV</h4>
                  <div class="text-gray-700 whitespace-pre-line">
                    {{ selectedPostulant.contactos1 }}
                  </div>
                </div>


              <!-- Conocimientos y Habilidades -->
              <div v-if="selectedPostulant?.conocimientos" class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Conocimientos y Habilidades</h4>
                
                <div class="space-y-4">
                  <div v-for="(con, index) in safeJSONParse(selectedPostulant.conocimientos)" 
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
              <div v-if="selectedPostulant?.disponibilidadHoraria || selectedPostulant?.disponibilidadRelocacion" 
                  class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-bold mb-4 text-gray-900">Disponibilidad</h4>
                
                <div class="grid grid-cols-2 gap-4">
                  <div v-if="selectedPostulant.disponibilidadHoraria">
                    <p class="text-sm text-gray-600">Disponibilidad Horaria</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.disponibilidadHoraria }}</p>
                  </div>
                  <div v-if="selectedPostulant.disponibilidadRelocacion">
                    <p class="text-sm text-gray-600">Disponibilidad para Relocación</p>
                    <p class="font-medium text-gray-900">{{ selectedPostulant.disponibilidadRelocacion }}</p>
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
                <div v-if="selectedPostulant?.archivos?.length > 0" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-bold mb-4 text-gray-900">Archivos Adjuntos</h4>
                  
                  <div class="space-y-2">
                    <div v-for="(archivo, index) in selectedPostulant.archivos" 
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
                        </div>

                        <div class="flex items-center gap-4">
                          <!-- Estado de validación -->
                          <div class="flex items-center">
                            <div class="flex items-center gap-2">
                              <div class="flex items-center">
                                <div class="inline-flex items-center px-3 py-1.5 rounded-full"
                                     :class="{
                                       'border border-green-200 bg-green-50': postulant.validationStatus === 'validado',
                                       'border border-red-200 bg-red-50': postulant.validationStatus === 'no_aplica',
                                       'border border-yellow-200 bg-yellow-50': postulant.validationStatus === 'Info Insuficiente',
                                       'border border-blue-200 bg-blue-50': postulant.validationStatus === 'IA no disponible',
                                       'border border-gray-200 bg-gray-50': postulant.validationStatus === 'pendiente',
                                       'border-blue-200 bg-blue-50': currentProcessingPostulantId === postulant.id
                                     }">
                                  <i class="mr-2 text-base"
                                     :class="{
                                       'fas fa-check-circle text-green-600': postulant.validationStatus === 'validado',
                                       'fas fa-times-circle text-red-600': postulant.validationStatus === 'no_aplica',
                                       'fas fa-exclamation-circle text-yellow-600': postulant.validationStatus === 'Info Insuficiente',
                                       'fas fa-robot text-gray-600': postulant.validationStatus === 'IA no disponible',
                                       'fas fa-clock text-gray-500': postulant.validationStatus === 'pendiente',
                                       'fas fa-spinner fa-spin text-blue-500': currentProcessingPostulantId === postulant.id
                                     }">
                                  </i>
                                  <span class="text-sm font-medium"
                                        :class="{
                                          'text-green-700': postulant.validationStatus === 'validado',
                                          'text-red-700': postulant.validationStatus === 'no_aplica',
                                          'text-yellow-700': postulant.validationStatus === 'Info Insuficiente',
                                          'text-gray-700': postulant.validationStatus === 'IA no disponible',
                                          'text-gray-600': postulant.validationStatus === 'pendiente',
                                          'text-blue-600': currentProcessingPostulantId === postulant.id
                                        }">
                                    {{ currentProcessingPostulantId === postulant.id ? 'Validando CV' : getValidationStatusText(postulant) }}
                                    
                                    <span v-if="postulant.score !== undefined && postulant.score >= 0"
                                          class="ml-2 px-2 py-0.5 rounded-full text-xs"
                                          :class="{
                                            'bg-green-100 text-green-800': postulant.score >= 7,
                                            'bg-yellow-100 text-yellow-800': postulant.score >= 4 && postulant.score < 7,
                                            'bg-red-100 text-red-800': postulant.score >= 1 && postulant.score < 4
                                          }">
                                       {{ postulant.score }}/10
                                    </span>
                                  
                                  
                                  
                                  
                                  
                                  
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div class="flex items-center gap-2 !important">
                            <button @click="showPostulantDetails(postulant)" 
                                    class="!inline-flex !items-center !px-3 !py-1.5 !bg-blue-600 !text-white !text-sm !font-medium !rounded !hover:bg-blue-700">
                              Detalle del Postulante
                            </button>
                            <button 
                                @click="generarFichaCurricular(postulant, selectedVacante)"
                                class="!inline-flex !items-center !px-3 !py-1.5 !bg-orange-600 !text-white !text-sm !font-medium !rounded !hover:bg-purple-700">
                                Ficha Sooft
                            </button>
                            <button 
                                @click="generarFichaCurricularOneSelect(postulant, selectedVacante)"
                                class="!inline-flex !items-center !px-3 !py-1.5 !bg-purple-600 !text-white !text-sm !font-medium !rounded !hover:bg-purple-700">
                                Ficha One Select
                            </button>
                            
                          

                            <button @click="showBackendResponse(postulant)"
                                    class="!inline-flex !items-center !px-3 !py-1.5 !bg-gray-900 !text-white !text-sm !font-medium !rounded !hover:bg-gray-800">
                              Ver Análisis
                            </button>
                            <button @click="showEntrevista(postulant)"
                                    class="!hidden !inline-flex !items-center !px-3 !py-1.5 !bg-indigo-100 !text-indigo-700 !text-sm !font-medium !rounded !hover:bg-indigo-200">
                              Entrevista
                            </button>
                            <button @click="responderEntrevista(postulant)"
        :disabled="!hasInterview"
        :class="[
          '!inline-flex !items-center !px-3 !py-1.5 !rounded !text-sm !font-medium',
          !hasInterview ? 
            '!bg-gray-100 !text-gray-400 !cursor-not-allowed' : 
            '!bg-yellow-100 !text-gray-900 !hover:bg-yellow-200'
        ]">
                              Responder Entrevista 
                              {{ getEntrevistaStatus(postulant) }}
                            </button>
                             
                            <span v-if="entrevistados[postulant.id]" 
                                class="!inline-flex !items-center !px-3 !py-1.5 !bg-green-100 !text-green-700 !text-sm !font-medium !rounded">
                              Ya contactado en  Hiring
                          </span>
                          <span v-else 
                                class="!inline-flex !items-center !px-3 !py-1.5 !bg-red-100 !text-red-700 !text-sm !font-medium !rounded">
                              No contactado aun Hiring    
                          </span>
                          </div>
                        </div>
                      </div>
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
              <div v-if="activeModal === 'perfil'" class="space-y-6">
                <!-- Descripción del Trabajo -->
                <div class="bg-gray-50 p-6 rounded-lg">
                  <h4 class="text-lg font-bold text-gray-900 mb-4">Descripción del Trabajo</h4>
                  <div class="prose max-w-none text-gray-700" v-html="selectedVacante?.descripcionTrabajo || 'Sin descripción disponible'"></div>
                </div>

                <!-- Requisitos -->
                <div class="bg-gray-50 p-6 rounded-lg">
                  <h4 class="text-lg font-bold text-gray-900 mb-4">Requisitos</h4>
                  <div class="prose max-w-none text-gray-700" v-html="selectedVacante?.requisitos || 'Sin requisitos disponibles'"></div>
                </div>

                <!-- Condiciones -->
                <div class="bg-gray-50 p-6 rounded-lg">
                  <h4 class="text-lg font-bold text-gray-900 mb-4">Condiciones</h4>
                  <div class="prose max-w-none text-gray-700" v-html="selectedVacante?.condiciones || selectedVacante?.condicionesRol || selectedVacante?.condicionesTrabajo || 'Sin condiciones especificadas'"></div>
                </div>

                <!-- Beneficios -->
                <div class="bg-gray-50 p-6 rounded-lg">
                  <h4 class="text-lg font-bold text-gray-900 mb-4">Beneficios</h4>
                  <div class="prose max-w-none text-gray-700" v-html="selectedVacante?.beneficios || 'Sin beneficios especificados'"></div>
                </div>
              </div>
            </div>
          </div>
        </div>


 <!-- Modal de Búsqueda Proactiva -->
<div v-if="showBusquedaProactivaModal" 
     class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col">
!-- Header del modal -->
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

      <button 
  @click="showBusquedaProactivaModal = false"
  class="p-1.5 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transform hover:rotate-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ml-4"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
  </svg>
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

        <div 
          v-show="showInstrucciones"
          class="text-blue-700 text-sm space-y-2 mt-2 transition-all duration-200"
        >
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

      <!-- Botones de acción 
      <div class="sticky bottom-0 bg-white p-4 border-t flex justify-between items-center">
        <div class="space-x-4">
          <button
            @click="analizarPerfil- sin uso"
            :disabled="!perfilBuscado || procesandoPerfil"
            class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!procesandoPerfil">Analizar Perfil</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </span>
          </button>
          <button
            @click="buscarCandidatos"
            :disabled="!puedeRealizarBusqueda"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!buscandoCandidatos">Buscar Candidatos</span>
            <span v-else>Buscando... {{progresoPostulantes}}%</span>
          </button>
          <button
            @click="limpiarBusqueda"
            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Limpiar
          </button>
        </div>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileUpload"
          accept=".txt,.doc,.docx,.pdf"
          class="hidden"
        >
        <button
          @click="$refs.fileInput.click()"
          class="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
        >
          Cargar desde archivo
        </button>
      </div>  -->
    </div>
  </div>
</div>






       

    <!-- Loading overlay -->
    <div v-if="loadingVacancies" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div class="flex flex-col items-center">
          <div class="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Cargando Datos remotos desde Hiring Room</h3>
          <p class="text-gray-600 text-center">Por favor espere puede demorar varios segundos</p>
        </div>
      </div>
    </div>

    <!-- Agregar el nuevo modal al final del template, junto a los otros modales -->
    <div v-if="showEntrevistaModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" style="z-index: 100;">
      <div class="relative top-20 mx-auto p-5 border w-4/5 shadow-lg rounded-md bg-white">
        <div class="flex flex-col h-full">
          <!-- Header -->
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="text-xl font-semibold text-gray-900">
              Entrevista - {{ selectedVacante?.nombre }}
            </h3>
            <button @click="closeEntrevistaModal" class="text-gray-400 hover:text-gray-500">
              <span class="sr-only">Cerrar</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="mt-4 overflow-y-auto text-gray-900" style="max-height: 70vh">
            <!-- Preguntas Psicológicas -->
            <div class="mb-8">
              <h4 class="text-lg font-semibold mb-4 text-gray-800">Preguntas Psicológicas</h4>
              <!-- Agregar v-if para validar que cuestionario existe y tiene preguntas -->
              <div v-if="cuestionario && cuestionario.preguntas_psicologicas">
                <div v-for="pregunta in cuestionario.preguntas_psicologicas" :key="pregunta.numero" class="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p class="font-medium mb-3">{{ pregunta.numero }}. {{ pregunta.pregunta }}</p>
                  <div class="ml-4 space-y-2">
                    <div v-for="(opcion, letra) in pregunta.opciones" :key="letra" 
                         class="flex items-start">
                      <span class="font-medium mr-2">{{ letra }}:</span>
                      <span :class="letra === pregunta.respuesta_correcta ? 'text-green-600 font-medium' : 'text-gray-700'">
                        {{ opcion }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 text-gray-700">
                    <span class="font-medium">Explicación: </span>
                    {{ pregunta.explicacion }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Preguntas Técnicas -->
            <div class="mb-8">
              <h4 class="text-lg font-semibold mb-4 text-gray-800">Preguntas Técnicas</h4>
              <div v-for="pregunta in cuestionario.preguntas_tecnicas" :key="pregunta.numero" class="mb-6 p-4 bg-gray-50 rounded-lg">
                <p class="font-medium mb-3">{{ pregunta.numero }}. {{ pregunta.pregunta }}</p>
                <div class="ml-4 space-y-2">
                  <div v-for="(opcion, letra) in pregunta.opciones" :key="letra" 
                       class="flex items-start">
                    <span class="font-medium mr-2">{{ letra }}:</span>
                    <span :class="letra === pregunta.respuesta_correcta ? 'text-green-600 font-medium' : 'text-gray-700'">
                      {{ opcion }}
                    </span>
                  </div>
                </div>
                <div class="mt-3 text-gray-700">
                  <span class="font-medium">Explicación: </span>
                  {{ pregunta.explicacion }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Botón para iniciar/continuar entrevista 
    <button @click="showEntrevistaModal = true; iniciarEntrevista()"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
      <span class="mr-2">{{ entrevistaEnCurso ? 'Continuar Entrevista' : 'Iniciar Entrevista' }}</span>
      <span v-if="progresoEntrevista.total > 0" 
            class="bg-indigo-500 px-2 py-1 rounded-full text-xs">
        {{ progresoEntrevista.completadas }}/{{ progresoEntrevista.total }}
      </span>
    </button>-->

    <!-- Modal de Entrevista -->
    <div v-if="responderEntrevistaModal.show" 
         class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-[90%] shadow-lg rounded-md bg-white">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-4">
                  <div class="flex items-center space-x-4">
            <h3 class="text-lg font-medium text-gray-900">
              Responder Entrevista - {{ selectedVacante?.nombre }} - 
              <span class="text-blue-600">
                {{ selectedPostulant?.nombre }} {{ selectedPostulant?.apellido }}
              </span>
            </h3>
             <!-- Estado de la entrevista -->
    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm"
          :class="{
            'bg-gray-100 text-gray-600': responderEntrevistaModal.estado === 'sin_iniciar',
            'bg-blue-100 text-blue-600': responderEntrevistaModal.estado === 'en_curso',
            'bg-green-100 text-green-600': responderEntrevistaModal.estado === 'completada'
          }">
      <i class="fas mr-2"
         :class="{
           'fa-clock': responderEntrevistaModal.estado === 'sin_iniciar',
           'fa-spinner fa-spin': responderEntrevistaModal.estado === 'en_curso',
           'fa-check-circle': responderEntrevistaModal.estado === 'completada'
         }">
      </i>
      {{ responderEntrevistaModal.estado === 'sin_iniciar' ? 'Sin iniciar' : 
         responderEntrevistaModal.estado === 'en_curso' ? 'En curso' : 'Completada' }}
    </span>
                  </div>
          <button @click="responderEntrevistaModal.show = false" class="text-gray-400 hover:text-gray-500">
            <i class="fas fa-times"></i>
          </button>
                </div>

        <!-- Barra de progreso -->
        <div class="mt-4 mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-600">
              Progreso: {{ responderEntrevistaModal.progreso.completadas }}/{{ responderEntrevistaModal.progreso.total }} preguntas
            </span>
            <span class="text-sm font-medium text-gray-900">
              {{ responderEntrevistaModal.progreso.porcentaje }}%
            </span>
                </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                 :style="{ width: `${responderEntrevistaModal.progreso.porcentaje}%` }">
              </div>
            </div>
          </div>

        <!-- Pregunta actual -->
        <div v-if="responderEntrevistaModal.preguntaActual" class="mb-6">
          <div class="bg-white p-6 rounded-lg border">
            <!-- Tipo de pregunta -->
            <div class="text-sm text-gray-500 mb-2">
              {{ responderEntrevistaModal.preguntaActual.tipo === 'preguntas_psicologicas' ? 
                 'Pregunta Psicológica' : 'Pregunta Técnica' }}
        </div>
            
            <!-- Pregunta -->
            <h4 class="text-lg font-medium text-gray-900 mb-4">
              {{ responderEntrevistaModal.preguntaActual.pregunta }}
            </h4>

            <!-- Opciones de respuesta -->
            <div class="space-y-3 mb-4">
              <div v-for="(opcion, letra) in responderEntrevistaModal.preguntaActual.opciones" 
                   :key="letra"
                   class="flex items-center space-x-3">
                <input type="radio"
                       :id="`opcion_${letra}`"
                       :name="'respuesta'"
                       :value="letra"
                       v-model="respuestaActual"
                       @change="handleRespuesta(letra)"
                       class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                <label :for="`opcion_${letra}`" class="text-gray-700">
                  {{ letra }}: {{ opcion }}
                </label>
      </div>
    </div>

            <!-- Explicación (si hay respuesta) -->
            <div v-if="entrevistaRespuestas.respuestas[responderEntrevistaModal.preguntaActual.id]?.vioExplicacion"
                 class="mt-4 p-4 bg-green-50 rounded-lg">
              <p class="text-green-700">
                <span class="font-medium">Explicación: </span>
                {{ responderEntrevistaModal.preguntaActual.explicacion }}
              </p>
  </div>

            <!-- Campo de comentarios -->
            <div class="mt-4 relative">
              <textarea
                v-if="responderEntrevistaModal?.preguntaActual"
                :value="getComentario(responderEntrevistaModal.preguntaActual.tipo + '_' + responderEntrevistaModal.preguntaActual.numero)"
                @input="setComentario(responderEntrevistaModal.preguntaActual.tipo + '_' + responderEntrevistaModal.preguntaActual.numero, $event.target.value)"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Agregar comentario..."
                rows="3"
              ></textarea>
              
              <!-- Botón de micrófono -->
              <button
                @click="toggleVoiceRecording"
                class="absolute right-2 bottom-2 p-2 rounded-full hover:bg-gray-100"
                :class="{ 'text-red-500': responderEntrevistaModal.isRecording, 'text-gray-500': !responderEntrevistaModal.isRecording }">
                <i class="fas" :class="responderEntrevistaModal.isRecording ? 'fa-stop' : 'fa-microphone'"></i>
              </button>
            </div>

            <!-- Después de las opciones de respuesta -->
            <div class="mt-4 border-t pt-4">
              <button @click="mostrarRespuestaCorrecta = !mostrarRespuestaCorrecta"
                      class="text-blue-600 hover:text-blue-700 flex items-center">
                <i class="fas" :class="mostrarRespuestaCorrecta ? 'fa-eye-slash' : 'fa-eye'"></i>
                <span class="ml-2">{{ mostrarRespuestaCorrecta ? 'Ocultar' : 'Ver' }} respuesta correcta</span>
              </button>

              <div v-if="mostrarRespuestaCorrecta" class="mt-3 bg-green-50 p-4 rounded-lg">
                <div class="font-medium text-green-800 mb-2">
                  Respuesta correcta: Opción {{ responderEntrevistaModal.preguntaActual.respuesta_correcta }}
                </div>
                <div class="text-green-700">
                  <strong>Explicación:</strong> {{ responderEntrevistaModal.preguntaActual.explicacion }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navegación -->
        <div class="flex justify-between items-center">
          <button @click="preguntaAnterior"
                  :disabled="responderEntrevistaModal.preguntaActualIndex === 0"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">
            Anterior
          </button>
          
          <div class="flex space-x-2">
            <button @click="saltarPregunta"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Saltar
            </button>
            <button @click="siguientePregunta"
                    :disabled="!hasPreguntaSiguiente"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Controles de paginación 
     
    <div v-if="totalVacancies > 0" class="mt-6 flex justify-center items-center gap-4">
      <button 
        @click="changePage(pagination.currentPage - 1)"
        :disabled="pagination.currentPage === 1"
        class="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      
      <span class="text-gray-600">
        Página {{ pagination.currentPage }} de {{ pagination.totalPages }}
      </span>
      
      <button 
        @click="changePage(pagination.currentPage + 1)"
        :disabled="pagination.currentPage === pagination.totalPages"
        class="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>  -->

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

        <!-- Estadísticas en tiempo real 
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-sm">
            <span class="text-gray-500">Postulantes procesados:</span>
            <span class="font-semibold">
              {{estadisticasProceso.matchesEncontrados}} / {{estadisticasProceso.totalPostulantes}}
            </span>
          </div>
          <div class="text-sm">
            <span class="text-gray-500">Score promedio:</span>
            <span class="font-semibold">
              {{estadisticasProceso.scorePromedio.toFixed(2)}}%
            </span>
          </div>
        </div>-->

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

    <!-- Agregar después del modal de progreso -->
    <div v-if="showResultadosModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-[90%] max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-900">
            Resultados del Matching ({{candidatosEncontrados.length}} candidatos)
          </h3>
          <button @click="showResultadosModal = false" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Contenido -->
        <div class="p-6 overflow-y-auto">
          <!-- Tabla de resultados -->
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidato
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score Total
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico (40%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experiencia (25%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Educación (15%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Años (10%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación (5%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags (5%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="candidato in candidatosEncontrados" :key="candidato.postulantInfo.id">
                <!-- Información básica del candidato -->
                <td class="px-6 py-4">
                  <div @click="toggleCandidatoDetails(candidato.postulantInfo.id)" 
                       class="cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="text-sm font-medium text-gray-900">
                          {{candidato.postulantInfo.nombre}} {{candidato.postulantInfo.apellido}}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{candidato.postulantInfo.email}}
                        </div>
                      </div>
                      <i class="fas" :class="showCandidatoDetails[candidato.postulantInfo.id] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    </div>
                  </div>
                  
                  <!-- Detalles expandibles -->
                  <div v-if="showCandidatoDetails[candidato.postulantInfo.id]" 
                       class="mt-4 pl-4 border-l-2 border-gray-200 space-y-2">
                    <div class="grid grid-cols-2 gap-4">
                      <div v-if="candidato.postulantInfo.telefonoCelular">
                        <span class="text-xs text-gray-500">Teléfono:</span>
                        <p class="text-sm">{{candidato.postulantInfo.telefonoCelular}}</p>
                      </div>
                      <div v-if="candidato.postulantInfo.ubicacion">
                        <span class="text-xs text-gray-500">Ubicación:</span>
                        <p class="text-sm">{{candidato.postulantInfo.ubicacion}}</p>
                      </div>
                      <!-- Más información relevante -->
                    </div>
                  </div>
                </td>

                <!-- Scores -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium" 
                       :class="getScoreColorClass(candidato.analysis?.analysis?.totalScore)">
                    {{(candidato.analysis?.analysis?.totalScore || 0).toFixed(2)}}%
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm" :class="getScoreColorClass(candidato.analysis?.analysis?.scores?.technical)">
                    {{(candidato.analysis?.analysis?.scores?.technical || 0).toFixed(2)}}%
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm" :class="getScoreColorClass(candidato.analysis?.analysis?.scores?.experience)">
                    {{(candidato.analysis?.analysis?.scores?.experience || 0).toFixed(2)}}%
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm" :class="getScoreColorClass(candidato.analysis?.analysis?.scores?.education)">
                    {{(candidato.analysis?.analysis?.scores?.education || 0).toFixed(2)}}%
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm" :class="getScoreColorClass(candidato.analysis?.analysis?.scores?.years)">
                    {{(candidato.analysis?.analysis?.scores?.years || 0).toFixed(2)}}%
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm" :class="getScoreColorClass(candidato.analysis?.analysis?.scores?.location)">
                    {{(candidato.analysis?.analysis?.scores?.location || 0).toFixed(2)}}%
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm" :class="getScoreColorClass(candidato.analysis?.analysis?.scores?.tags)">
                    {{(candidato.analysis?.analysis?.scores?.tags || 0).toFixed(2)}}%
                  </div>
                </td>

                <!-- Acciones -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex flex-col space-y-2">
                  <button 
                      @click="showAnalysisModal(candidato)"
                       class="text-white bg-blue-500 hover:bg-blue-600"
                    >
                      Resultado
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t flex justify-end space-x-3">
          <button 
                        @click="verResultadosBP({ resultados: { matches: candidatosEncontrados, matches_encontrados: candidatosEncontrados.length } })"
                        class="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
                      >
                        <i class="fas fa-chart-bar mr-2"></i>
                        Ver resultados detallados
                      </button>
         <!-- <button
            @click="exportarTodosCV"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Exportar Todos
          </button>-->
          <button
            @click="showResultadosModal = false"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
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

<!-- Modal de Consultas Históricas -->
<div v-if="showConsultasHistoricasModal" 
     class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col">
    <!-- Header del modal -->
    <div class="p-4 border-b flex justify-between items-center">
      <h3 class="text-xl font-bold text-gray-900">
        Consulta de Búsquedas Proactivas Previas
      </h3>
      <button 
        @click="showConsultasHistoricasModal = false"
        class="text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <!-- Contenido del modal con scroll -->
    <div class="flex-1 p-6 overflow-y-auto">
      <div v-if="loadingConsultasHistoricas" class="flex flex-col items-center justify-center py-8">
        <div class="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
        <p class="text-lg text-gray-600 font-medium">Cargando datos...</p>
        <p class="text-sm text-gray-500">Por favor espere</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil Buscado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talentos</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ver información detallada</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(busqueda, index) in busquedasHistoricas" :key="index">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ new Date(busqueda.fecha).toLocaleString() }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ busqueda.requisitos_extraidos?.descripcion }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ busqueda.userEmail || 'No disponible' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ busqueda.resultados?.matches_encontrados || 0 }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  @click="verRequisitos(busqueda)"
                  class="text-white bg-blue-500 hover:bg-red-600 mr-4"
                >
                  Pefill Buscado
                </button>
                <button 
                  @click="verResultadosBP(busqueda)"
                  class="text-white bg-blue-500 hover:bg-red-600"
                >
                  Resultados
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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

   <!-- Modal de prueba simple 
   <div v-if="showRequisitosModal" class="modal-test">
    <div class="modal-content-test">
      <h2>Test Modal</h2>
      <p>Si puedes ver esto, el problema no es de z-index</p>
      <button @click="closeRequisitosModal">Cerrar</button>
    </div>
  </div>-->

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

        <!-- Modal de Progreso de Validación ANALISIS-->
        <div v-if="showValidationModal" 
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ isReprocessing ? 'Reprocesando todos los CVs' : 'Procesando CVs pendientes' }}
              </h3>
            </div>
            
            <!-- Barra de progreso -->
            <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div class="bg-blue-600 h-4 rounded-full transition-all duration-300"
                   :style="{ width: `${validationProgress}%` }">
              </div>
            </div>
            
            <!-- Información de progreso -->
            <div class="text-sm text-gray-600 mb-4">
              <p>Procesando CV {{ currentProcessingIndex + 1 }} de {{ selectedVacante?.postulants?.length }}</p>
              <p class="mt-2">
                Validados: {{ validationResults.validated }} |
                No aplican: {{ validationResults.notApplicable }}
              </p>
            </div>

            <!-- Botones de control -->
            <div class="flex justify-end gap-3">
              <button @click="stopValidationProcess"
                      :disabled="!processingValidation"
                      class="px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50">
                {{ showProcessingText ? 'Procesando...' : 'Detener proceso' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Modal para mostrar la respuesta del backend -->
        <div v-if="showBackendResponseModal" 
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg w-[90%] max-h-[90vh] overflow-y-auto scrollbar-thin text-gray-900">
            <!-- Header del modal -->
            <div class="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
              <h3 class="text-2xl font-bold">
                Análisis del Postulante
              </h3>
              <button @click="closeBackendResponseModal" 
                      class="text-gray-500 hover:text-gray-700">
                <span class="text-2xl">&times;</span>
              </button>
            </div>

            <!-- Contenido del modal -->
            <div class="p-6" v-if="selectedPostulantResponse">
              <!-- Grid principal -->
              <div class="space-y-6"> <!-- Agregamos un contenedor principal -->
                <!-- Grid de 2 columnas -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <!-- Columna izquierda: Análisis -->
                  <div class="space-y-6">
                    <!-- Calificación General -->
                    <!--<div class="bg-gray-50 p-6 rounded-lg">-->
                      <div class="mb-6">
                      <h5 class="text-lg font-semibold mb-2">⭐ Calificación General</h5>
                                       <div class="flex items-center gap-4">
                        <div class="text-4xl font-bold" 
                             :class="{
                               'text-red-600': getScore() < 4,
                               'text-yellow-600': getScore() >= 4 && getScore() < 7,
                               'text-green-600': getScore() >= 7
                             }">
                          {{ getScore() }}/10
                        </div>
                        <div class="text-gray-600 font-bold">
                          {{ getScoreText() }}
                        </div>
                      </div>
                    </div>
  <!-- Cumplimiento de requisitos -->
  <div class="mb-6">
                    <h5 class="text-lg font-semibold mb-2">📋 Cumplimiento de requisitos excluyentes</h5>
                    <div class="bg-white p-4 rounded border">
                      <div class="mb-2">
                        <span class="font-medium">Respuesta: </span>
                        <span :class="getCumplimientoClass()">{{ getAnalysisDetail('Cumplimiento de requisitos excluyentes.respuesta') }}</span>
                      </div>
                      <div>
                        <span class="font-medium">Justificación: </span>
                        <span class="text-gray-600">{{ getAnalysisDetail('Cumplimiento de requisitos excluyentes.justificación') }}</span>
                      </div>
                    </div>
                  </div>

                     <!-- Aptitud general -->
                     <div class="mb-6">
                    <h5 class="text-lg font-semibold mb-2">🎯 Aptitud general para el puesto</h5>
                    <div class="bg-white p-4 rounded border">
                      <p class="text-gray-600">{{ getAnalysisDetail('Aptitud general para el puesto') }}</p>
                    </div>
                  </div>
                    <!-- Cumplimiento de Requisitos 
                    <div class="bg-gray-50 p-6 rounded-lg">
                      <h4 class="text-xl font-bold mb-4">Cumplimiento de Requisitos</h4>
                      <div class="space-y-2">
                        <div class="flex items-center gap-2">
                          <span class="font-medium">Estado:</span>
                          <span :class="getCumplimientoClass()">
                            {{ getCumplimientoText() }}
                          </span>
                        </div>
                        <p class="text-gray-600">{{ getCumplimientoJustificacion() }}</p>
                      </div>
                    </div>-->

               
                  </div>

                  <!-- Columna derecha: Información -->
                  <div class="space-y-6">
                    <!-- Información del Puesto 
                    <div class="bg-gray-50 p-6 rounded-lg">
                      <h4 class="text-xl font-bold mb-4">Información del Puesto</h4>
                      <div class="space-y-4">
                        <div>
                          <span class="font-medium">Título:</span>
                          <p class="text-gray-600">{{ selectedPostulantResponse.jobInfo.titulo }}</p>
                        </div>
                        <div>
                          <span class="font-medium">Área:</span>
                          <p class="text-gray-600">{{ selectedPostulantResponse.jobInfo.area }}</p>
                        </div>
                        <div>
                          <span class="font-medium">Requisitos:</span>
                          <ul class="list-disc list-inside text-gray-600 mt-2">
                            <li v-for="(req, index) in formatRequisitos(selectedPostulantResponse.jobInfo.requisitos)" 
                                :key="index"
                                v-html="req"></li>
                          </ul>
                        </div>
                      </div>
                    </div>-->
 <!-- Fortalezas -->
 <div class="mb-6">
                    <h5 class="text-lg font-semibold mb-2">💪 Fortalezas identificadas</h5>
                    <div class="bg-white p-4 rounded border">
                      <ul class="list-disc list-inside space-y-2">
                        <li v-for="(fortaleza, index) in getFortalezas()" 
                            :key="index" 
                            class="text-gray-600">
                          {{ fortaleza }}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- Debilidades -->
                  <div class="mb-6">
                    <h5 class="text-lg font-semibold mb-2">🔍 Debilidades o áreas de mejora</h5>
                    <div class="bg-white p-4 rounded border">
                      <ul class="list-disc list-inside space-y-2">
                        <li v-for="(debilidad, index) in getDebilidades()" 
                            :key="index"
                            class="text-gray-600">
                          {{ debilidad }}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h5 class="text-lg font-semibold mb-2">⭐ Calificación de adecuación</h5>
                    <div class="bg-white p-4 rounded border">
                      <div class="mb-2">
                        <span class="font-medium">Calificación: </span>
                        <span class="text-gray-600">{{ getAnalysisDetail('Calificación de adecuación.calificación') }}/10</span>
                      </div>
                      <div>
                        <span class="font-medium">Justificación: </span>
                        <span class="text-gray-600">{{ getAnalysisDetail('Calificación de adecuación.justificación') }}</span>
                      </div>
                    </div>
                  </div>
                    <!-- Información del Candidato 
                    <div class="bg-gray-50 p-6 rounded-lg">
                      <h4 class="text-xl font-bold mb-4">Información del Candidato</h4>
                      <div class="space-y-4">
                        <div>
                          <span class="font-medium">Nombre:</span>
                          <p class="text-gray-600">
                            {{ selectedPostulantResponse.candidateInfo.datosPersonales.nombre }}
                            {{ selectedPostulantResponse.candidateInfo.datosPersonales.apellido }}
                          </p>
                        </div>
                        <div>
                          <span class="font-medium">Estudios:</span>
                          <ul class="list-disc list-inside text-gray-600 mt-2">
                            <li v-for="(estudio, index) in selectedPostulantResponse.candidateInfo.estudios" 
                                :key="index">
                              {{ estudio.titulo }} - {{ estudio.institucion }}
                              <span class="text-gray-500">({{ estudio.estado }})</span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <span class="font-medium">Experiencia:</span>
                          <ul class="list-disc list-inside text-gray-600 mt-2">
                            <li v-for="(exp, index) in selectedPostulantResponse.candidateInfo.experiencia" 
                                :key="index">
                              {{ exp.puesto }} en {{ exp.empresa }}
                              <span class="text-gray-500">({{ exp.periodo }})</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>-->
                       <!-- Fortalezas 
                       <div class="bg-gray-50 p-6 rounded-lg">
                      <h4 class="text-xl font-bold mb-4">Fortalezas</h4>
                      <ul class="list-disc list-inside space-y-2 text-gray-600">
                        <li v-for="(fortaleza, index) in getFortalezas()" :key="index">
                          {{ fortaleza }}
                        </li>
                      </ul>
                    </div>-->

                    <!-- Áreas de Mejora 
                    <div class="bg-gray-50 p-6 rounded-lg">
                      <h4 class="text-xl font-bold mb-4">Áreas de Mejora</h4>
                      <ul class="list-disc list-inside space-y-2 text-gray-600">
                        <li v-for="(debilidad, index) in getDebilidades()" :key="index">
                          {{ debilidad }}
                        </li>
                      </ul>
                    </div>-->
                  </div>
                </div>

                <!-- Análisis Detallado (fuera del grid de 2 columnas pero dentro del contenedor principal) -->
                <div class="bg-gray-50 p-6 rounded-lg">
                  <h4 class="text-xl font-bold mb-4">Curriculum Vitae convertido a texto</h4>
                  
                
                  <div v-if="selectedPostulantResponse?.result?.analysis?.cuestionario?.preguntas_psicologicas?.length > 0" 
                      class="bg-gray-50 p-6 rounded-lg">
                    <!--<h4 class="text-xl font-bold mb-4">Pregunta de Evaluación</h4>-->
                    
                    <div class="space-y-4">
                      <!-- Pregunta -->
                      <div class="bg-white p-4 rounded border">
                      <!--  <p class="font-medium mb-4">{{ selectedPostulantResponse.result.analysis.cuestionario.preguntas_psicologicas[0].pregunta }}</p>-->
                        
                        <!-- Opciones -->
                     
                        
                        <!-- Respuesta correcta y explicación -->
                        <div class="mt-4 pt-4 border-t">
                          
                          <p class="mt-2 text-gray-600">
                            {{ selectedPostulantResponse.result.analysis.cuestionario.preguntas_psicologicas[0].explicacion }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
               

                 

                 

                  <!-- Calificación -->
        
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

<!-- Modal de Progreso -->
<!--<div class="modal-content-test text-gray-900">
     <div class="flex justify-between mb-4">
        <h3 class="text-lg font-bold">Generando Documentos</h3>
        <button @click="showProgresoModal = false" class="text-gray-500 hover:text-gray-700">
            ×
        </button>
    </div> 
    <p>{{ estadoActualProceso }}</p>
</div>-->
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