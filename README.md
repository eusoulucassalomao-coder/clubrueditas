# Club Ruedita

## Migración a Appwrite

La migración se está realizando en la rama `migration/appwrite-full`. La rama de producción y el proyecto Supabase se mantienen sin cambios mientras se implementan y verifican las nuevas operaciones.

### Variables de entorno del servidor Vercel

Configurar únicamente en el entorno del servidor (nunca en archivos públicos):

- `APPWRITE_ENDPOINT`: URL base de la instalación Appwrite, por ejemplo `https://TU-HOST/v1` no; debe ser la URL base sin `/v1`.
- `APPWRITE_PROJECT_ID`: ID del proyecto Appwrite.
- `APPWRITE_API_KEY`: API Key del servidor, con permisos mínimos necesarios para las operaciones de backend.
- `APPWRITE_DATABASE_ID`: ID de la base de datos Appwrite (por defecto `clubrueditas`).
- `APPWRITE_SETUP_TOKEN`: token secreto para ejecutar una sola vez el aprovisionamiento inicial de colecciones e índices mediante `POST /api/admin/appwrite-schema` (cabecera `x-setup-token`).
- `APPWRITE_COLLECTION_RESTAURANTS`: ID de la colección de restaurantes (por defecto `restaurants`).
- `APPWRITE_COLLECTION_CUSTOMERS`: ID de la colección de clientes (por defecto `customers`).
- `APPWRITE_COLLECTION_VISITS`: ID de la colección de visitas (por defecto `visits`).
- `APPWRITE_COLLECTION_LEDGER`: ID de la colección de movimientos de puntos (por defecto `ledger`).
- `APPWRITE_COLLECTION_REDEMPTIONS`: ID de la colección de canjes (por defecto `redemptions`).
- `APPWRITE_COLLECTION_MESSAGE_LOG`: ID de la colección de registro de mensajes (por defecto `message_log`).
- `APPWRITE_OWNER_USER_ID`: ID del usuario propietario creado en Appwrite. Es preferible a autorizar por correo.
- `APPWRITE_OWNER_EMAIL`: alternativa temporal para identificar al propietario si aún no se conoce el ID.

El login de caja requiere que el usuario tenga la etiqueta Appwrite `caja`. El usuario propietario debe coincidir con `APPWRITE_OWNER_USER_ID` (o con `APPWRITE_OWNER_EMAIL` mientras se configura el ID).

### Estado técnico

- [x] Rama aislada para la migración.
- [x] Cliente REST Appwrite de uso exclusivo en servidor: `api/_lib/appwrite.js`.
- [x] Capa de acceso a Appwrite Databases: `api/_lib/appwrite-db.js`.
- [x] Auditoría de tablas, reglas, funciones SQL y datos reales del Supabase: `docs/supabase-source-audit.md`.
- [x] Endpoint inicial de autenticación Appwrite: `api/auth/login.js`.
- [ ] Configurar y validar las variables de entorno de Appwrite.
- [ ] Migrar todas las operaciones de negocio y sustituir la API Supabase.
- [ ] Crear y validar las colecciones y permisos en Appwrite Databases.
- [ ] Migrar y verificar los datos existentes.
- [ ] Conectar los paneles `/panel` y `/caja` a la nueva API.
- [ ] Adaptar n8n/Evolution API y ejecutar pruebas completas.

**Importante:** los paneles todavía usan la API anterior. No desplegar esta rama en producción ni retirar Supabase hasta terminar las etapas pendientes y validar los flujos completos.
