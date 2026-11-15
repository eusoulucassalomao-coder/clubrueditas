# Auditoría del Supabase de origen — Club Ruedita

Fecha de inspección: 2026-11-15
Proyecto inspeccionado: `mk-fidelidade` (`kwgrsliviyjweluvrkow`)
Restaurante: `La Ruedita` (`laruedita`)

## Estado real de los datos

| Tabla | Registros |
|---|---:|
| restaurants | 1 |
| customers | 1 |
| visits | 0 |
| ledger | 1 |
| redemptions | 0 |
| message_log | 0 |

Hay datos reales. No borrar ni pausar Supabase hasta completar la copia y las pruebas.

## Estructura de las colecciones

### restaurants
`id uuid`, `slug text UNIQUE`, `name text`, `config jsonb`, `caja_pin_hash text nullable`, `panel_pass_hash text nullable`, `created_at timestamptz`, `auto_key_hash text nullable`, `n8n_webhook text nullable`, `n8n_secret text nullable`, `n8n_wa_webhook text nullable`.

### customers
`id uuid`, `restaurant_id uuid -> restaurants.id`, `name text`, `phone text`, `phone_key text`, `birthday date nullable`, `code text`, `referred_by uuid nullable -> customers.id`, `points int default 0`, `lifetime int default 0`, `visits int default 0`, `last_visit timestamptz nullable`, `consent bool default false`, `consent_at timestamptz nullable`, `opted_out bool default false`, `access_token text UNIQUE`, `created_at timestamptz`, `wa_confirmed_at timestamptz nullable`.

### visits
`id uuid`, `restaurant_id uuid -> restaurants.id`, `customer_id uuid -> customers.id`, `amount numeric CHECK amount > 0`, `points int`, `multiplier numeric default 1`, `staff text nullable`, `created_at timestamptz`.

### ledger
`id uuid`, `restaurant_id uuid -> restaurants.id`, `customer_id uuid -> customers.id`, `points int`, `type text`, `note text nullable`, `created_at timestamptz`.

### redemptions
`id uuid`, `restaurant_id uuid -> restaurants.id`, `customer_id uuid -> customers.id`, `reward_id text`, `name text`, `points int`, `code text`, `status text CHECK status IN ('pendiente','canjeado','cancelado') default 'pendiente'`, `created_at timestamptz`, `used_at timestamptz nullable`.

### message_log
`id uuid`, `restaurant_id uuid -> restaurants.id`, `customer_id uuid -> customers.id`, `kind text`, `meta jsonb nullable`, `created_at timestamptz`.

Todas las tablas tienen RLS activado. No se encontraron políticas RLS ni triggers de usuario en el esquema public. Las claves e índices únicos y de búsqueda también deben reproducirse en Appwrite mediante índices equivalentes y validaciones del servidor.

## Reglas de negocio verificadas en SQL

- Alta: nombre de 2–80 caracteres; teléfono normalizado de 8–15 dígitos; consentimiento obligatorio; teléfono único por restaurante; código generado a partir del nombre; bono de bienvenida; referencia opcional.
- Visita: importe mayor que cero; puntos = floor(floor(importe / importe_por_punto) × puntos_base × multiplicador del día); incrementa puntos, histórico y visitas; registra visita y movimiento contable.
- Invitación: en la primera visita del invitado, el invitado y quien invitó reciben el bono configurado.
- Bonos: cumpleaños una vez por año y reseña una sola vez por cliente.
- Canje: valida premio y saldo; descuenta puntos; crea código de canje pendiente y movimiento negativo en ledger.
- Entrega: solo permite entregar un canje pendiente; guarda fecha de entrega.
- Vencimiento: tras los meses configurados desde la última visita, deja el saldo en cero y registra el débito en ledger.
- Automatizaciones: candidatos de reactivación, cumpleaños y puntos por vencer; respeta consentimiento, confirmación WhatsApp, baja y ventanas anti-repetición.
- Autenticación de caja/panel/automatización: secretos almacenados como hash bcrypt mediante pgcrypto; sesiones internas HMAC de 12 horas.
- WhatsApp del local: se conecta a n8n mediante `n8n_wa_webhook`; el secreto viaja solo en cabecera servidor-servidor.

## Configuración actual de La Ruedita

Zona horaria: `America/Argentina/Buenos_Aires`.
Puntos: 1 punto por cada 100 pesos.
Bonos: bienvenida 50, invitación 150 para cada persona, cumpleaños 200, reseña 100.
Multiplicadores: domingo y lunes (índices 0 y 1 según JavaScript; revisar mapeo de día PostgreSQL antes de implementar).
Vencimiento: 12 meses.
Inactividad: 30 días.
Premios actuales: Postre de la casa (300), Entrada para compartir (600), 15% de descuento (1000), Mollejas de la casa (1500).

## Funciones SQL encontradas

`fid_rest`, `fid_digits`, `fid_new_code`, `fid_cjson`, `fid_register`, `fid_claim`, `fid_check_secret`, `fid_set_secret`, `fid_search`, `fid_add_visit`, `fid_add_bonus`, `fid_find_redemption`, `fid_deliver`, `fid_stats`, `fid_candidates`, `fid_log_message`, `fid_expire`, `fid_inbound`.

La función HTTP `fid` también usa lecturas directas para historial, clientes, exportaciones, configuración, QR de WhatsApp y baja de mensajes. Todas esas rutas forman parte del alcance de la migración.

## Hallazgos que requieren atención

1. La API HTTP actual usa una clave de servicio de Supabase exclusivamente en servidor. La clave Appwrite debe permanecer igualmente en variables de entorno de Vercel.
2. La función `fid_inbound` confirma WhatsApp y reactiva consentimiento al recibir un mensaje entrante; debe conservarse con controles explícitos y revisión de privacidad antes de migrar.
3. El login de la interfaz actual es por contraseña/PIN del restaurante, no por email. El endpoint Appwrite Auth por email que ya existe en la rama no sustituye por sí solo el flujo actual de caja y panel.
4. Appwrite no ofrece equivalencia directa a las transacciones SQL usadas para puntos/canjes. Las operaciones de saldo, ledger, referidos y redenciones deben implementarse con protección contra concurrencia e idempotencia.
5. El usuario actual de Appwrite y los IDs de proyecto/base/colecciones no están disponibles mediante las herramientas conectadas en esta sesión. No se debe inventar esa configuración.

## Próxima secuencia

1. Crear colecciones Appwrite y sus índices/permisos.
2. Implementar toda la API servidor manteniendo los contratos JSON que usa el frontend.
3. Migrar el registro existente preservando IDs, tokens, puntos y relaciones.
4. Cambiar frontend y webhooks n8n a la nueva API.
5. Probar todos los flujos y comparar conteos/saldos.
6. Solo entonces retirar la dependencia Supabase.
