# Estado de implementación Appwrite

Última revisión: 2026-11-15
Rama: `migration/appwrite-full`
Proyecto Vercel: `laruedita-club`

## Implementado en la rama

- Cliente REST Appwrite solo en servidor, compatible con las variables `APPWRITE_PROJECT` y `APPWRITE_PROJECT_ID`.
- Capa de acceso a Databases/Collections.
- Definición de las seis colecciones, atributos e índices.
- Endpoint protegido `POST /api/admin/appwrite-schema` para crear la base `clubrueditas` y las colecciones sin permisos públicos. Requiere `APPWRITE_SETUP_TOKEN`.
- API inicial `POST /api/fid`, manteniendo el contrato de acciones del frontend.
- Login interno de caja/panel con verificación bcrypt del hash migrado y token HMAC de 12 horas.
- Registro, consulta de cliente, búsqueda por código, saldo/historial y canje.
- Visitas, bonos, canjes y entrega implementados con transacciones de Appwrite para evitar escrituras parciales.
- Panel: estadísticas, clientes, exportaciones, premios, reglas y conexión WhatsApp con n8n.
- Automatizaciones: candidatos, registro de mensajes, estadísticas, vencimiento y baja.

## Despliegue de validación

Vercel compiló correctamente la rama en el deployment:
`dpl_ExXR8oaWgH9rVqcPk9fiidmi8U5J`
Commit: `b6bd1f516ca1bfce13af571e5ed934d691a80a3c`
Estado observado: `READY`.

El build confirma que Vercel acepta la estructura y el código Node.js. Todavía no prueba la conexión con Appwrite ni las operaciones contra una base real.

## Pendiente antes de activar Appwrite

1. Aprovisionar las colecciones en el proyecto Appwrite correcto.
2. Confirmar variables de entorno para el deployment de validación: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT` (o `APPWRITE_PROJECT_ID`), `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID` y `APPWRITE_SETUP_TOKEN`.
3. Migrar los documentos del Supabase preservando los UUID como IDs de documentos, hashes bcrypt, tokens, relaciones y saldos.
4. Probar registro, acceso de caja/panel, visitas, bonos, canjes, entrega, exportaciones, automatizaciones y WhatsApp.
5. Cambiar `js/config.js` para apuntar a `/api/fid` únicamente después de que las pruebas estén aprobadas.
6. Retirar la Edge Function y las credenciales Supabase solo después de validar producción.

## Estado del frontend y producción

El frontend todavía apunta a la Edge Function Supabase. Esto es intencional: no se debe cambiar la dirección de producción mientras la API Appwrite y los datos no hayan sido validados. La rama principal `main` no fue modificada.
