# Club Ruedita

## Migración a Appwrite

La migración se está realizando en la rama `migration/appwrite-full`. La rama de producción y el proyecto Supabase se mantienen sin cambios mientras se implementan y verifican las nuevas operaciones.

### Variables de entorno del servidor Vercel

Configurar únicamente en el entorno del servidor (nunca en archivos públicos):

- `APPWRITE_ENDPOINT`: URL base de la instalación Appwrite, por ejemplo `https://TU-HOST/v1` no; debe ser la URL base sin `/v1`.
- `APPWRITE_PROJECT_ID`: ID del proyecto Appwrite.
- `APPWRITE_API_KEY`: API Key del servidor, con permisos mínimos necesarios para las operaciones de backend.
- `APPWRITE_OWNER_USER_ID`: ID del usuario propietario creado en Appwrite. Es preferible a autorizar por correo.
- `APPWRITE_OWNER_EMAIL`: alternativa temporal para identificar al propietario si aún no se conoce el ID.

El login de caja requiere que el usuario tenga la etiqueta Appwrite `caja`. El usuario propietario debe coincidir con `APPWRITE_OWNER_USER_ID` (o con `APPWRITE_OWNER_EMAIL` mientras se configura el ID).

### Estado técnico

- [x] Rama aislada para la migración.
- [x] Cliente REST Appwrite de uso exclusivo en servidor: `api/_lib/appwrite.js`.
- [x] Endpoint inicial de autenticación Appwrite: `api/auth/login.js`.
- [ ] Configurar y validar las variables de entorno de Appwrite.
- [ ] Migrar todas las operaciones de negocio y sustituir la API Supabase.
- [ ] Crear y validar las colecciones y permisos en Appwrite Databases.
- [ ] Migrar y verificar los datos existentes.
- [ ] Conectar los paneles `/panel` y `/caja` a la nueva API.
- [ ] Adaptar n8n/Evolution API y ejecutar pruebas completas.

**Importante:** los paneles todavía usan la API anterior. No desplegar esta rama en producción ni retirar Supabase hasta terminar las etapas pendientes y validar los flujos completos.
