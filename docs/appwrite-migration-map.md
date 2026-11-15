# Appwrite migration map

Target: remove every runtime dependency on Supabase. Keep this branch isolated until migration and verification are complete.

## Source inventory

The current production branch contains:
- `js/config.js`: points the public client to the Supabase Edge Function `/functions/v1/fid`.
- `supabase/functions/fid/index.ts`: complete HTTP API entry point, uses Supabase service-role access, database queries and PostgreSQL RPC functions.
- `js/api.js`, `js/landing.js`, `js/panel.js`, `js/caja.js`: browser-side consumers of the API.
- `panel.html` and `caja.html`: owner and cashier interfaces.
- The repository does not currently contain Supabase SQL migrations, table definitions, RPC function definitions, triggers, or RLS policies. These must be exported from the source Supabase project before data/schema parity can be certified.

## Supabase data model inferred from API usage

Collections to create in Appwrite (final attributes and indexes must be reconciled against the live Supabase schema before import):
- `restaurants`: slug, name, config, n8n_webhook, n8n_secret, n8n_wa_webhook.
- `customers`: restaurant relation, name, phone, birthday, code, points, visits, lifetime, last_visit, access_token, consent, opted_out, phone_key, wa_confirmed_at.
- `visits`: restaurant/customer relations, amount, points, multiplier, created_at.
- `ledger`: customer relation, points, type, note, created_at.
- `redemptions`: customer relation, name, points, code, status, created_at, used_at.
- Any additional tables discovered in the Supabase export must also be migrated.

## Existing API actions to preserve

Public/customer:
- `config`, `register`, `me`, `lookup_code`, `claim`, `login`.

Cashier:
- `auth`, `search`, `visit`, `bonus`, `find_code`, `deliver`, `new_customer`, `recent`.

Owner/admin:
- `wa_status`, `wa_connect`, `wa_logout`, `stats`, `customers`, `export_customers`, `export_visits`, `redemptions`, `save_config`.

Automation:
- `auto_candidates`, `auto_log`, `auto_stats`, `auto_expire`, `auto_optout`.

## PostgreSQL RPC functions that require exact behavioral replacements

- `fid_register`
- `fid_claim`
- `fid_check_secret`
- `fid_search`
- `fid_add_visit`
- `fid_add_bonus`
- `fid_find_redemption`
- `fid_deliver`
- `fid_stats`
- `fid_candidates`
- `fid_log_message`
- `fid_expire`

Do not approximate these functions: export their SQL definitions and reproduce their validation, transaction boundaries, concurrency behavior, and return shapes in server-side Appwrite endpoints.

## Migration order

1. Export the complete Supabase schema, RPC definitions, policies, triggers, and data.
2. Create Appwrite collections, attributes, indexes, relationships, and permissions.
3. Implement server-only Appwrite data access and all API actions.
4. Implement Appwrite Auth owner/cashier sessions and server-side role checks.
5. Import data preserving stable IDs/relationships where feasible; verify counts and checksums.
6. Switch browser clients and n8n webhooks to the Appwrite-backed API.
7. Run regression tests for registration, visits, points, bonuses, claims, redemption delivery, exports, stats, and automations.
8. Remove Supabase SDK, environment variables, URLs, functions, and deployment references only after successful cutover.

## Safety

- Never expose the Appwrite API key in browser code.
- Never disable or delete the Supabase project before data parity and production verification.
- Keep all migration work on `migration/appwrite-full`; do not deploy this branch until the cutover checklist is complete.
