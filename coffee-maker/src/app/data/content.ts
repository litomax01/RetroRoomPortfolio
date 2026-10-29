// Fuente única de verdad del contenido (ES / EN).
// Datos tomados de CV_Leonardo_Torres_Harvard_Actualizado.docx y Profile.pdf.
// Todo lo marcado con TODO está pendiente de confirmar con Leonardo.

export type Lang = 'es' | 'en';

export interface Project {
  title: string;
  year: string;
  stack: string[];
  summary: string;
  /** Captura real del proyecto (ruta en public/, p. ej. "img/projects/tienda.jpg"). */
  image: string | null;
  /** Capturas adicionales (la primera suele repetir `image`). Si existe, la ficha muestra galería. */
  gallery?: string[];
  /** Problema que resuelve; solo se muestra si se completa. */
  problem: string | null;
  /** Contribución personal; solo se muestra si se completa. */
  contribution: string | null;
  demo: string | null; // TODO: enlace a la demo en vivo
  repo: string | null; // TODO: enlace al repositorio específico del proyecto
}

export interface Job {
  role: string;
  place: string;
  period: string;
  bullets: string[];
  /** Etiqueta corta de la tarjeta (FREELANCE, E-COMMERCE…). */
  badge?: string;
  /** Tecnologías usadas. */
  tags?: string[];
}

export interface SkillGroup {
  name: string;
  items: string[];
}

export interface Content {
  siteName: string;
  tagline: string;
  name: string;
  role: string;
  location: string;
  about: string;
  skills: SkillGroup[];
  languages: string;
  certification: string;
  /** Pestaña "Personal": quién soy fuera del código y qué aporto. */
  beyond: { intro: string; offerTitle: string; offer: string[]; items: Array<{ icon: string; title: string; text: string }> };
  experience: Job[];
  education: { school: string; title: string; period: string };
  projects: Project[];
  ui: Record<string, string>;
}

export const LINKS = {
  email: 'litomax01.lt@gmail.com',
  github: 'https://github.com/litomax01',
  linkedin: 'https://www.linkedin.com/in/leonardo-torres-quelal/',
  /** CV por idioma (archivos en public/cv/): el botón descarga el del idioma activo. */
  cv: { es: 'cv/Leonardo_Torres_CV_ES.pdf', en: 'cv/Leonardo_Torres_CV_EN.pdf' },
} as const;

export const SITE_NAME = 'ZONA RETRO GAMER';

const es: Content = {
  siteName: SITE_NAME,
  tagline: 'Código con alma, servido a su tiempo',
  name: 'Leonardo Torres',
  role: 'Desarrollador de Software',
  location: 'Ambato, Ecuador',
  about:
    'Desarrollador de software con experiencia freelance desde 2024 en soluciones web para negocios reales. Convierto los requerimientos del cliente en herramientas que ordenan su operación y le ayudan a vender más. Stack principal: Angular, TypeScript y Spring Boot. Responsable, comunicativo y puntual, tanto de forma independiente como en equipo.',
  skills: [
    {
      name: 'Desarrollo',
      items: ['Angular', 'TypeScript', 'Java', 'Spring Boot', 'API REST', 'React / Next.js', 'Python', 'React Native', 'JavaScript', 'HTML', 'CSS'],
    },
    {
      name: 'Bases de datos y herramientas',
      items: ['SQL', 'MySQL', 'MongoDB', 'Supabase', 'Git', 'GitHub', 'Vercel'],
    },
    {
      name: 'Soporte informático',
      items: ['Mantenimiento preventivo y correctivo', 'Diagnóstico de fallas', 'Instalación de software'],
    },
    {
      name: 'Habilidades blandas',
      items: ['Comunicación clara', 'Responsabilidad', 'Aprendizaje rápido', 'Trabajo en equipo', 'Cumplimiento de plazos'],
    },
  ],
  languages: 'Español: nativo · Inglés: intermedio',
  certification: 'Introducción a la IA',
  // TODO: Leonardo confirma/edita estos textos con detalles reales (lugar donde corre, platos favoritos, juegos favoritos).
  beyond: {
    intro:
      'Fuera del código me muevo entre tres cosas: videojuegos, correr y cocinar. Me gustan porque se parecen a mi trabajo: reglas claras, práctica constante y un resultado que otra persona disfruta.',
    offerTitle: 'Lo que aporto a un equipo',
    offer: [
      'Escucho al cliente y traduzco lo que necesita en una herramienta que funciona.',
      'Acompaño el proyecto completo: requerimiento, desarrollo, publicación y mejoras.',
      'Aprendo rápido, comunico con claridad y cumplo los plazos.',
    ],
    items: [
      { icon: '🎮', title: 'Videojuegos', text: 'Resolver problemas por intentos, leer cómo funciona un sistema y jugar en equipo. Esta sala retro es mi forma de mostrarlo.' },
      { icon: '🏃', title: 'Correr', text: 'Constancia y disciplina: se mejora un kilómetro a la vez, igual que un proyecto se termina una tarea a la vez.' },
      { icon: '🍳', title: 'Cocinar', text: 'Seguir la receta, improvisar cuando hace falta y cuidar los detalles para que quien se sienta a la mesa quede conforme.' },
    ],
  },
  experience: [
    {
      role: 'Desarrollador web freelance',
      place: 'Clientes en Ecuador',
      period: '2024 – Actualidad',
      badge: 'FREELANCE',
      tags: ['Angular', 'TypeScript', 'Spring Boot'],
      bullets: [
        'Desarrollé sitios y aplicaciones web a medida, del requerimiento a la publicación y el mantenimiento.',
        'Construí interfaces adaptables a computadora y móvil, con pruebas y corrección de errores.',
        'Desplegué en la nube y apliqué mejoras continuas según las necesidades del negocio.',
      ],
    },
    {
      role: 'Tienda en línea y control de inventario',
      place: 'Cliente: ElectroBodegón',
      period: '2026',
      badge: 'E-COMMERCE',
      tags: ['Angular', 'Supabase', 'Vercel'],
      bullets: [
        'Desarrollé una tienda en línea con catálogo y panel de administración: el negocio gestiona su inventario y vende por internet.',
        'Implementé autenticación y reglas de acceso a los datos con Supabase.',
        'Publiqué la tienda en la nube, lista para crecer con el catálogo.',
      ],
    },
    {
      role: 'Sistema de gestión para verdulería',
      place: 'Cliente: negocio de verduras',
      period: '2025',
      badge: 'GESTIÓN',
      tags: ['Angular', 'Spring Boot', 'MySQL'],
      bullets: [
        'Implementé la gestión de clientes, productos y facturación con operaciones CRUD y servicios REST.',
        'Centralicé los datos en una base MySQL en lugar de registros sueltos.',
      ],
    },
    {
      role: 'Mapa 3D interactivo de comunidades',
      place: 'Prueba técnica · MindfulTech',
      period: '2026',
      badge: 'PRUEBA TÉCNICA',
      tags: ['Next.js', 'React', 'Google Maps 3D'],
      bullets: [
        'Construí un mapa 3D de diez comunidades de Intag con cámara animada, buscador y fichas de cada comunidad.',
        'Agregué versión móvil, navegación con teclado y accesibilidad; publicado en Vercel.',
      ],
    },
    {
      role: 'Técnico de mantenimiento y soporte informático',
      place: 'Trabajo independiente · Ecuador',
      period: '2022 – Actualidad',
      badge: 'SOPORTE',
      tags: [],
      bullets: [
        'Realicé mantenimiento preventivo y correctivo de computadoras de escritorio y portátiles.',
        'Diagnostiqué y resolví problemas de hardware y software.',
        'Configuré, actualicé y optimicé equipos con atención directa a usuarios.',
      ],
    },
    {
      // TODO: texto redactado a partir de "hacía de todo"; confirmar cargo y funciones reales.
      role: 'Colaborador multifuncional (tecnología y soporte)',
      place: 'Simbiosis',
      period: '1 año',
      badge: 'EQUIPO',
      tags: [],
      bullets: [
        'Apoyé el desarrollo y la actualización de sitios y aplicaciones web.',
        'Brindé soporte técnico y mantenimiento de equipos y sistemas.',
        'Atendí a usuarios y apoyé tareas administrativas y operativas.',
      ],
    },
  ],
  education: {
    school: 'Instituto Tecnológico Superior Quito Metropolitano (ITSQMET)',
    title: 'Tecnólogo Superior en Desarrollo de Software',
    period: 'Julio 2024 – Septiembre 2026',
  },
  projects: [
    {
      title: 'GymFlow',
      year: '2026',
      stack: ['Angular 21', 'Spring Boot', 'Java 21', 'PostgreSQL', 'Docker'],
      summary:
        'Sistema de gestión para gimnasios: socios, membresías y pagos, control de entrada con aviso en verde o rojo y un radar de retención que detecta socios a punto de irse y prepara el mensaje de WhatsApp.',
      image: 'img/projects/gymflow.jpg',
      gallery: ['img/projects/gymflow.jpg', 'img/projects/gymflow-2.jpg', 'img/projects/gymflow-3.jpg', 'img/projects/gymflow-4.jpg'],
      problem: 'Recepción y administración necesitaban una sola herramienta para socios, cuotas, entradas y retención.',
      contribution: 'Desarrollo completo: API con roles y JWT, 27 pruebas de integración en el servidor, 11 en la interfaz y despliegue con Docker Compose.',
      demo: null,
      repo: 'https://github.com/litomax01/GymApp',
    },
    {
      title: 'Ecuadeals',
      year: '2026',
      stack: ['Angular 21', 'Spring Boot', 'Java 21', 'Firebase', 'PayPal'],
      summary:
        'Tienda en línea de perfumes y cosméticos para Ecuador: catálogo con filtros, carrito, pagos con PayPal, envío por zonas configurables y panel de administración. Acceso con Firebase y Google.',
      image: 'img/projects/ecuadeals.jpg',
      problem: 'Vender productos de belleza por internet en todo el país, con envío por zonas y pago seguro.',
      contribution: 'Interfaz y servidor: catálogo, pedidos, pagos con confirmación de PayPal y administración de productos, pedidos y usuarios.',
      demo: null,
      repo: 'https://github.com/litomax01/ProyectoEcuadealsAgosto2026',
    },
    {
      title: 'ElectroBodegón',
      year: '2026',
      stack: ['Angular 21', 'TypeScript', 'Supabase', 'Docker', 'Vercel'],
      summary:
        'Tienda de electrodomésticos, TV y línea blanca con catálogo, búsqueda y filtros por categoría y marca, sucursales y pedido por WhatsApp. Incluye panel de administración para gestionar el inventario.',
      image: 'img/projects/electrobodegon.jpg',
      gallery: ['img/projects/electrobodegon.jpg', 'img/projects/electrobodegon-2.jpg', 'img/projects/electrobodegon-3.jpg', 'img/projects/electrobodegon-4.jpg', 'img/projects/electrobodegon-5.jpg'],
      problem: 'El negocio necesitaba mostrar su catálogo en internet, controlar su inventario y vender más.',
      contribution: 'Diseño y desarrollo completo: interfaz, catálogo, panel de administración, autenticación y publicación.',
      demo: null,
      repo: 'https://github.com/litomax01/ElectroBodegonEcommerce',
    },
    {
      title: 'Gestión de Proyectos',
      year: '2026',
      stack: ['Node.js 22', 'Express 5', 'EJS', 'SQLite', 'bcrypt'],
      summary:
        'Gestor de proyectos en equipo: registro e inicio de sesión, proyectos con miembros, tablero de tareas en tres columnas (por hacer, en curso, hecha), detalle de tarea con responsable, fecha límite y comentarios, y barra de progreso.',
      image: 'img/projects/gestion.jpg',
      gallery: ['img/projects/gestion.jpg', 'img/projects/gestion-2.jpg', 'img/projects/gestion-3.jpg'],
      problem: 'Los equipos necesitaban ver en un solo lugar quién hace qué y cuánto falta de cada proyecto.',
      contribution: 'Desarrollo completo: renderizado en servidor con Express y EJS, base de datos SQLite, contraseñas cifradas y protección CSRF.',
      demo: null,
      repo: 'https://github.com/litomax01/projectManagementApp',
    },
    {
      title: 'La Esquina de la 24',
      year: '2026',
      stack: ['Angular 19', 'TypeScript', 'SCSS'],
      summary:
        'Sitio web bilingüe (español/inglés) para un emprendimiento familiar que une una cafetería artesanal y una florería: portada, nosotros, galería, vista previa del menú, contacto y una página de menú completo con categorías y precios.',
      image: 'img/projects/esquina24.jpg',
      gallery: ['img/projects/esquina24.jpg', 'img/projects/esquina24-2.jpg', 'img/projects/esquina24-3.jpg', 'img/projects/esquina24-4.jpg', 'img/projects/esquina24-5.jpg'],
      problem: 'Un negocio familiar quería presentar su cafetería y su florería en un solo sitio, en dos idiomas.',
      contribution: 'Diseño y desarrollo completo: componentes standalone de Angular, rutas con carga diferida y una configuración central del sitio.',
      demo: null,
      repo: 'https://github.com/litomax01/CoffeeShop',
    },
  ],
  ui: {
    tagline2: 'Tómate un respiro y luego programa.',
    enterBar: 'PRESS START',
    aboutTitle: 'Conoce al creador de la sala',
    aboutSub: 'Detrás de cada gran experiencia hay alguien que disfruta construirla.',
    projectsTitle: 'Colección de proyectos',
    projectsSub: 'Una colección de proyectos creados con código, creatividad y precisión.',
    vitrinaEyebrow: 'La estantería de cartuchos',
    viewProject: 'Ver proyecto',
    musicTitle: 'La Rockola',
    musicSub: 'Un poco de música hace que cada línea de código tenga su propio ritmo.',
    contactTitle2: 'Habla con el anfitrión',
    contactSub: 'Las mejores colaboraciones comienzan con una buena conversación.',
    viewNow: 'Ver contacto ahora',
    copyMail: 'Copiar correo',
    copied: '¡Correo copiado!',
    copyFail: 'No se pudo copiar; selecciónalo manualmente',
    cvDownload: 'Descargar currículum',
    problem: 'Problema que resuelve',
    contribution: 'Mi contribución',
    allProjects: '‹ Todos los proyectos',
    noImage: 'Captura próximamente',
    volume: 'Volumen',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    play: 'Reproducir',
    pause: 'Pausar',
    playing: 'Sonando',
    paused: 'En pausa',
    helpText: 'Explora la sala. Cada rincón guarda algo: los objetos que brillan al pasar el cursor son interactivos.',
    helpClose: 'Entendido',
    quickNav: 'Acceso directo',
    start: 'ENTRAR',
    loading: 'CARGANDO NIVEL…',
    pinballTitle: 'PINBALL',
    pinballHelp: 'Z: paleta izq. · M: paleta der. · Espacio: lanzar',
    pinballClose: 'Salir',
    arcadeTitle: 'PAC-MAN',
    arcadeHelp: 'Clic en el juego · Flechas: mover',
    arcadeFocus: 'Clic para jugar',
    games: 'JUEGOS',
    gamesList: 'Lista de juegos',
    snesTitle: 'SUPER NINTENDO',
    snesHelp: 'Teclado: flechas, Z/X/A/S, Enter = Start',
    snesPlay: 'CLIC PARA JUGAR',
    chessTitle: 'AJEDREZ',
    chessHelp: 'Clic en una pieza y luego en la casilla destino',
    poolTitle: 'BILLAR',
    poolHelp: 'Mouse: apuntar y disparar · W / S: fuerza',
    foosballTitle: 'FUTBOLÍN',
    foosballHelp: 'Rojo: flechas · Azul (2 jugadores): A y D',
    projects: 'Proyectos',
    about: 'Sobre mí',
    contact: 'Contacto',
    music: 'Música',
    back: 'Volver',
    tabAbout: 'Perfil',
    tabPersonal: 'Personal',
    mainStack: 'Stack principal',
    usedIn: 'Usado en',
    projectsWord: 'proyectos',
    factProjects: 'proyectos web',
    factSince: 'en tecnología desde',
    factStack: 'stack principal',
    tabSkills: 'Habilidades',
    tabExperience: 'Experiencia',
    education: 'Formación',
    languages: 'Idiomas',
    certification: 'Certificación',
    stack: 'Tecnologías',
    demo: 'Ver demo',
    repo: 'Ver código',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Escribirme',
    contactTitle: 'Hablemos',
    contactText: '¿Tienes un proyecto o una vacante? Escríbeme y charlamos.',
    soon: 'Enlace próximamente',
    selectProject: 'Elige un cartucho de la colección',
    credits: 'Créditos',
    creditsBody:
      'Diseño y desarrollo: Leonardo Torres. Hecho con Angular y Three.js. Inspirado en la experiencia interactiva de jesse-zhou.com. 3D Pinball: Space Cadet © Microsoft; motor de código abierto (MIT). Modelos: "2000 Pinball" de Brian Trepanier, "Pacman Arcade + animation" de Daniel Brück, "Junkebox (rocola)" de ImpTsuki, "Billard" de boui y "Foosball table" de 3D Content Online y "Evangelion Unit-01" de timedrfreeman, "Retro CRT TV With Videoplayer" de Ren Viro Store y "Super Nintendo Entertainment System | PS1 style" de Maxim Fringe, "GAME BOY" de rave-games, "Majora’s mask" de eggiscool6253 y "Little Nightmares - Mono (3D Model) + DL" de HiGuys920 (CC-BY 4.0). Futbolín de Prashant Baid (MIT), mejorado. Juego de billar de Chen Shmilovich (MIT), reglas de ajedrez con chess.js de Jeff Hlywa (BSD-2), música de Kevin MacLeod (CC-BY 3.0).',
    musicOn: 'Poner música',
    musicOff: 'Detener música',
    language: 'Idioma',
    skipToContent: 'Ir al contenido',
    reducedMotion: 'Movimiento reducido activado',
    noWebgl: 'Tu navegador no soporta WebGL. Aquí tienes la versión en texto.',
    prev: 'Anterior',
    next: 'Siguiente',
    seeAll: 'Ver toda la sala',
    menuCover: 'MENÚ',
    menuKicker: 'Pantalla de contacto',
    goBack: 'Volver',
    pickBottle: 'Elige un cartucho para empezar…',
    comingSoon: 'Próximamente',
    menuTitle: 'Contacto',
    menuLead: 'Formas de contactar a Leonardo:',
    menuMail: 'Correo',
    menuGit: 'Código en GitHub',
    menuIn: 'Perfil profesional',
    menuTip: 'Atiende: Leonardo Torres · Ambato, Ecuador',
    waiting: 'El anfitrión se acerca con el menú…',
    records: 'Discos',
    nowPlaying: 'Sonando',
    changing: 'Cambiando disco…',
    hint: 'Arrastra para mirar · Rueda para acercar · Doble clic en un objeto para verlo de cerca',
  },
};

const en: Content = {
  siteName: SITE_NAME,
  tagline: 'Code with soul, served in its own time',
  name: 'Leonardo Torres',
  role: 'Software Developer',
  location: 'Ambato, Ecuador',
  about:
    'Software developer with freelance experience since 2024 building web solutions for real businesses. I turn client requirements into tools that organize their operation and help them sell more. Main stack: Angular, TypeScript and Spring Boot. Responsible, communicative and punctual, both independently and in a team.',
  skills: [
    {
      name: 'Development',
      items: ['Angular', 'TypeScript', 'Java', 'Spring Boot', 'REST APIs', 'React / Next.js', 'Python', 'React Native', 'JavaScript', 'HTML', 'CSS'],
    },
    {
      name: 'Databases & tools',
      items: ['SQL', 'MySQL', 'MongoDB', 'Supabase', 'Git', 'GitHub', 'Vercel'],
    },
    {
      name: 'IT support',
      items: ['Preventive & corrective maintenance', 'Fault diagnosis', 'Software installation'],
    },
    {
      name: 'Soft skills',
      items: ['Clear communication', 'Responsibility', 'Fast learning', 'Teamwork', 'Meeting deadlines'],
    },
  ],
  languages: 'Spanish: native · English: intermediate',
  certification: 'Introduction to AI',
  // TODO: Leonardo to confirm/edit these with real details (where he runs, favorite dishes, favorite games).
  beyond: {
    intro:
      'Outside of code I move between three things: video games, running and cooking. I like them because they resemble my work: clear rules, steady practice and a result someone else enjoys.',
    offerTitle: 'What I bring to a team',
    offer: [
      'I listen to the client and turn what they need into a tool that works.',
      'I follow the whole project: requirements, development, launch and improvements.',
      'I learn fast, communicate clearly and meet deadlines.',
    ],
    items: [
      { icon: '🎮', title: 'Video games', text: 'Solving problems by trial, reading how a system works and playing as a team. This retro room is my way of showing it.' },
      { icon: '🏃', title: 'Running', text: 'Consistency and discipline: you improve one kilometer at a time, just as a project gets done one task at a time.' },
      { icon: '🍳', title: 'Cooking', text: 'Following the recipe, improvising when needed and caring about details so whoever sits at the table is satisfied.' },
    ],
  },
  experience: [
    {
      role: 'Freelance web developer',
      place: 'Clients in Ecuador',
      period: '2024 – Present',
      badge: 'FREELANCE',
      tags: ['Angular', 'TypeScript', 'Spring Boot'],
      bullets: [
        'Developed custom websites and web applications, from requirements to launch and maintenance.',
        'Built responsive desktop and mobile interfaces, with testing and bug fixing.',
        'Deployed to the cloud and shipped continuous improvements based on business needs.',
      ],
    },
    {
      role: 'Online store and inventory control',
      place: 'Client: ElectroBodegón',
      period: '2026',
      badge: 'E-COMMERCE',
      tags: ['Angular', 'Supabase', 'Vercel'],
      bullets: [
        'Developed an online store with catalog and admin panel: the business manages its inventory and sells online.',
        'Implemented authentication and data access rules with Supabase.',
        'Deployed the store to the cloud, ready to grow with the catalog.',
      ],
    },
    {
      role: 'Management system for a greengrocer',
      place: 'Client: vegetable shop',
      period: '2025',
      badge: 'MANAGEMENT',
      tags: ['Angular', 'Spring Boot', 'MySQL'],
      bullets: [
        'Implemented customer, product and invoicing management with CRUD operations and REST services.',
        'Centralized data in a MySQL database instead of loose records.',
      ],
    },
    {
      role: 'Interactive 3D map of communities',
      place: 'Technical test · MindfulTech',
      period: '2026',
      badge: 'TECH TEST',
      tags: ['Next.js', 'React', 'Google Maps 3D'],
      bullets: [
        'Built a 3D map of ten Intag communities with animated camera, search and detail cards.',
        'Added mobile layout, keyboard navigation and accessibility; deployed on Vercel.',
      ],
    },
    {
      role: 'IT maintenance & support technician',
      place: 'Self-employed · Ecuador',
      period: '2022 – Present',
      badge: 'SUPPORT',
      tags: [],
      bullets: [
        'Performed preventive and corrective maintenance of desktops and laptops.',
        'Diagnosed and solved hardware and software problems.',
        'Configured, updated and optimized equipment, with direct user support.',
      ],
    },
    {
      // TODO: drafted from "did a bit of everything"; confirm real title and duties.
      role: 'Multi-role team member (technology & support)',
      place: 'Simbiosis',
      period: '1 year',
      badge: 'TEAM',
      tags: [],
      bullets: [
        'Supported development and updates of websites and web applications.',
        'Provided technical support and maintenance of equipment and systems.',
        'Assisted users and supported administrative and operational tasks.',
      ],
    },
  ],
  education: {
    school: 'Instituto Tecnológico Superior Quito Metropolitano (ITSQMET)',
    title: 'Higher Technologist in Software Development',
    period: 'July 2024 – September 2026',
  },
  projects: [
    {
      title: 'GymFlow',
      year: '2026',
      stack: ['Angular 21', 'Spring Boot', 'Java 21', 'PostgreSQL', 'Docker'],
      summary:
        'Gym management system: members, memberships and payments, entry check-in with a green or red result, and a retention radar that spots members about to leave and prepares the WhatsApp message.',
      image: 'img/projects/gymflow.jpg',
      gallery: ['img/projects/gymflow.jpg', 'img/projects/gymflow-2.jpg', 'img/projects/gymflow-3.jpg', 'img/projects/gymflow-4.jpg'],
      problem: 'Reception and administration needed a single tool for members, dues, entries and retention.',
      contribution: 'Full development: API with roles and JWT, 27 backend integration tests, 11 frontend tests and Docker Compose deployment.',
      demo: null,
      repo: 'https://github.com/litomax01/GymApp',
    },
    {
      title: 'Ecuadeals',
      year: '2026',
      stack: ['Angular 21', 'Spring Boot', 'Java 21', 'Firebase', 'PayPal'],
      summary:
        'Online store for perfumes and cosmetics in Ecuador: filtered catalog, cart, PayPal payments, configurable shipping zones and an admin panel. Sign-in with Firebase and Google.',
      image: 'img/projects/ecuadeals.jpg',
      problem: 'Selling beauty products online across the country, with zone-based shipping and secure payment.',
      contribution: 'Frontend and backend: catalog, orders, payments with PayPal confirmation and management of products, orders and users.',
      demo: null,
      repo: 'https://github.com/litomax01/ProyectoEcuadealsAgosto2026',
    },
    {
      title: 'ElectroBodegón',
      year: '2026',
      stack: ['Angular 21', 'TypeScript', 'Supabase', 'Docker', 'Vercel'],
      summary:
        'Appliances, TV and white-goods store with catalog, search, category and brand filters, store locations and ordering via WhatsApp. Includes an admin panel to manage inventory.',
      image: 'img/projects/electrobodegon.jpg',
      gallery: ['img/projects/electrobodegon.jpg', 'img/projects/electrobodegon-2.jpg', 'img/projects/electrobodegon-3.jpg', 'img/projects/electrobodegon-4.jpg', 'img/projects/electrobodegon-5.jpg'],
      problem: 'The business needed to show its catalog online, control its inventory and sell more.',
      contribution: 'Full design and development: interface, catalog, admin panel, authentication and deployment.',
      demo: null,
      repo: 'https://github.com/litomax01/ElectroBodegonEcommerce',
    },
    {
      title: 'Project Management',
      year: '2026',
      stack: ['Node.js 22', 'Express 5', 'EJS', 'SQLite', 'bcrypt'],
      summary:
        'Team project manager: sign-up and login, projects with members, a three-column task board (to do, in progress, done), task detail with assignee, due date and comments, and a progress bar.',
      image: 'img/projects/gestion.jpg',
      gallery: ['img/projects/gestion.jpg', 'img/projects/gestion-2.jpg', 'img/projects/gestion-3.jpg'],
      problem: 'Teams needed one place to see who is doing what and how much is left in each project.',
      contribution: 'Full development: server-rendered with Express and EJS, SQLite storage, hashed passwords and CSRF protection.',
      demo: null,
      repo: 'https://github.com/litomax01/projectManagementApp',
    },
    {
      title: 'La Esquina de la 24',
      year: '2026',
      stack: ['Angular 19', 'TypeScript', 'SCSS'],
      summary:
        'Bilingual (Spanish/English) website for a family business that combines an artisanal coffee shop and a flower shop: hero, about, gallery, menu preview, contact and a full menu page with categories and prices.',
      image: 'img/projects/esquina24.jpg',
      gallery: ['img/projects/esquina24.jpg', 'img/projects/esquina24-2.jpg', 'img/projects/esquina24-3.jpg', 'img/projects/esquina24-4.jpg', 'img/projects/esquina24-5.jpg'],
      problem: 'A family business wanted to present its coffee shop and flower shop on a single site, in two languages.',
      contribution: 'Full design and development: Angular standalone components, lazy-loaded routes and a central site configuration.',
      demo: null,
      repo: 'https://github.com/litomax01/CoffeeShop',
    },
  ],
  ui: {
    tagline2: 'Take a breather, then code.',
    enterBar: 'PRESS START',
    aboutTitle: 'Meet the creator of the room',
    aboutSub: 'Behind every great experience is someone who enjoys building it.',
    projectsTitle: 'Project collection',
    projectsSub: 'A collection of projects crafted with code, creativity and precision.',
    vitrinaEyebrow: 'The cartridge shelf',
    viewProject: 'View project',
    musicTitle: 'The Jukebox',
    musicSub: 'A little music gives every line of code its own rhythm.',
    contactTitle2: 'Talk to the host',
    contactSub: 'The best collaborations start with a good conversation.',
    viewNow: 'View contact now',
    copyMail: 'Copy email',
    copied: 'Email copied!',
    copyFail: 'Could not copy; please select it manually',
    cvDownload: 'Download résumé',
    problem: 'Problem it solves',
    contribution: 'My contribution',
    allProjects: '‹ All projects',
    noImage: 'Screenshot coming soon',
    volume: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
    play: 'Play',
    pause: 'Pause',
    playing: 'Playing',
    paused: 'Paused',
    helpText: 'Explore the room. Every corner holds something: objects that glow when hovered are interactive.',
    helpClose: 'Got it',
    quickNav: 'Quick access',
    start: 'ENTER',
    loading: 'LOADING LEVEL…',
    pinballTitle: 'PINBALL',
    pinballHelp: 'Z: left flipper · M: right flipper · Space: launch',
    pinballClose: 'Exit',
    arcadeTitle: 'PAC-MAN',
    arcadeHelp: 'Click the game · Arrows: move',
    games: 'GAMES',
    gamesList: 'Game list',
    snesTitle: 'SUPER NINTENDO',
    snesHelp: 'Keyboard: arrows, Z/X/A/S, Enter = Start',
    snesPlay: 'CLICK TO PLAY',
    chessTitle: 'CHESS',
    chessHelp: 'Click a piece, then click its destination square',
    poolTitle: 'POOL',
    poolHelp: 'Mouse: aim and shoot · W / S: power',
    foosballTitle: 'FOOSBALL',
    foosballHelp: 'Red: arrow keys · Blue (2 players): A and D',
    arcadeFocus: 'Click to play',
    projects: 'Projects',
    about: 'About me',
    contact: 'Contact',
    music: 'Music',
    back: 'Back',
    tabAbout: 'Profile',
    tabPersonal: 'Personal',
    mainStack: 'Main stack',
    usedIn: 'Used in',
    projectsWord: 'projects',
    factProjects: 'web projects',
    factSince: 'in tech since',
    factStack: 'main stack',
    tabSkills: 'Skills',
    tabExperience: 'Experience',
    education: 'Education',
    languages: 'Languages',
    certification: 'Certification',
    stack: 'Tech stack',
    demo: 'Live demo',
    repo: 'View code',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email me',
    contactTitle: 'Let’s talk',
    contactText: 'Got a project or an opening? Write to me and let’s chat.',
    soon: 'Link coming soon',
    selectProject: 'Choose a cartridge from the collection',
    credits: 'Credits',
    creditsBody:
      'Design & development: Leonardo Torres. Built with Angular and Three.js. Inspired by the interactive experience of jesse-zhou.com. 3D Pinball: Space Cadet © Microsoft; open-source engine (MIT). Models: "2000 Pinball" by Brian Trepanier, "Pacman Arcade + animation" by Daniel Brück, "Junkebox (rocola)" by ImpTsuki, "Billard" by boui and "Foosball table" by 3D Content Online and "Evangelion Unit-01" by timedrfreeman, "Retro CRT TV With Videoplayer" by Ren Viro Store and "Super Nintendo Entertainment System | PS1 style" by Maxim Fringe, "GAME BOY" by rave-games, "Majora’s mask" by eggiscool6253 and "Little Nightmares - Mono (3D Model) + DL" by HiGuys920 (CC-BY 4.0). Foosball by Prashant Baid (MIT), improved. Pool game by Chen Shmilovich (MIT), chess rules with chess.js by Jeff Hlywa (BSD-2), music by Kevin MacLeod (CC-BY 3.0).',
    musicOn: 'Play music',
    musicOff: 'Stop music',
    language: 'Language',
    skipToContent: 'Skip to content',
    reducedMotion: 'Reduced motion enabled',
    noWebgl: 'Your browser does not support WebGL. Here is the text version.',
    prev: 'Previous',
    next: 'Next',
    seeAll: 'See the whole room',
    menuCover: 'MENU',
    menuKicker: 'Contact screen',
    goBack: 'Go back',
    pickBottle: 'Choose a cartridge to get started…',
    comingSoon: 'Coming soon',
    menuTitle: 'Contact',
    menuLead: 'Ways to reach Leonardo:',
    menuMail: 'Email',
    menuGit: 'Code on GitHub',
    menuIn: 'Professional profile',
    menuTip: 'Served by: Leonardo Torres · Ambato, Ecuador',
    waiting: 'The host is bringing the menu…',
    records: 'Records',
    nowPlaying: 'Now playing',
    changing: 'Changing record…',
    hint: 'Drag to look · Scroll to zoom · Double-click an object to see it up close',
  },
};

export const CONTENT: Record<Lang, Content> = { es, en };
