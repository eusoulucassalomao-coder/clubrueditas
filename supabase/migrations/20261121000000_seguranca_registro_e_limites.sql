-- Segurança: registro de atividade, limite de tentativas persistente, sessões da equipe revogáveis e permissões fechadas.
-- (Já aplicada no banco de produção em 2026-11-20/21.)

-- 1) Registro de atividade (quem fez o quê, quando e de onde). Só o servidor escreve e lê.
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  at timestamptz not null default now(),
  actor_role text not null,
  actor_id text,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  ip text,
  ua text,
  ok boolean not null default true
);
alter table public.audit_log enable row level security;
create index if not exists audit_log_rest_at_idx on public.audit_log (restaurant_id, at desc);
create index if not exists audit_log_action_at_idx on public.audit_log (action, at desc);

-- 2) Limite de tentativas que vale para todas as instâncias do servidor
create table if not exists public.rate_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  at timestamptz not null default now()
);
alter table public.rate_hits enable row level security;
create index if not exists rate_hits_bk_idx on public.rate_hits (bucket, key, at desc);

create or replace function public.fid_rate_hit(p_bucket text, p_key text, p_window_s integer) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  insert into public.rate_hits (bucket, key) values (left(p_bucket, 40), left(p_key, 120));
  select count(*) into n from public.rate_hits where bucket = left(p_bucket, 40) and key = left(p_key, 120) and at > now() - make_interval(secs => p_window_s);
  if random() < 0.01 then delete from public.rate_hits where at < now() - interval '2 days'; end if;
  return n;
end $$;

create or replace function public.fid_rate_count(p_bucket text, p_key text, p_window_s integer) returns integer
language sql security definer set search_path to 'public' as $$
  select count(*)::integer from public.rate_hits where bucket = left(p_bucket, 40) and key = left(p_key, 120) and at > now() - make_interval(secs => p_window_s);
$$;

-- 3) Leitura do registro para o painel do dono
create or replace function public.fid_audit_list(p_slug text, p_limit integer, p_action text, p_only_bad boolean) returns jsonb
language plpgsql security definer set search_path to 'public','auth' as $$
declare r public.restaurants;
begin
  r := public.fid_rest(p_slug);
  return coalesce((
    select jsonb_agg(x order by x.at desc) from (
      select l.id, l.at, l.actor_role, l.action, l.target, l.detail, l.ip, l.ok,
             coalesce(u.email, l.actor_id) as actor
        from public.audit_log l
        left join auth.users u on l.actor_role in ('caja','panel','tablet') and l.actor_id ~ '^[0-9a-f-]{36}$' and u.id = l.actor_id::uuid
       where (l.restaurant_id = r.id or l.restaurant_id is null)
         and (p_action is null or p_action = '' or l.action = p_action)
         and (not coalesce(p_only_bad, false) or l.ok = false)
       order by l.at desc
       limit greatest(1, least(coalesce(p_limit, 100), 500))
    ) x
  ), '[]'::jsonb);
end $$;

create or replace function public.fid_audit_summary(p_slug text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r public.restaurants;
begin
  r := public.fid_rest(p_slug);
  return jsonb_build_object(
    'failed_logins_24h', (select count(*) from public.audit_log where action = 'login' and ok = false and at > now() - interval '24 hours'),
    'logins_24h',        (select count(*) from public.audit_log where action = 'login' and ok = true and at > now() - interval '24 hours'),
    'exports_24h',       (select count(*) from public.audit_log where action in ('export_customers','export_visits','customers_list') and at > now() - interval '24 hours'),
    'blocked_24h',       (select count(*) from public.audit_log where action = 'rate_limited' and at > now() - interval '24 hours'),
    'visits_24h',        (select count(*) from public.audit_log where action = 'visit' and at > now() - interval '24 hours'),
    'deliveries_24h',    (select count(*) from public.audit_log where action in ('deliver','delivery_done','kiosk_coupon_use') and at > now() - interval '24 hours')
  );
end $$;

create or replace function public.fid_audit_prune() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  delete from public.audit_log where at < now() - interval '400 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- 4) Fecha tudo para os papéis públicos (o servidor usa a chave de serviço)
revoke all on table public.audit_log, public.rate_hits, public.otp_codes, public.receipts, public.visit_requests from anon, authenticated;
revoke all on sequence public.audit_log_id_seq, public.rate_hits_id_seq from anon, authenticated;
revoke all on function public.fid_rate_hit(text, text, integer), public.fid_rate_count(text, text, integer), public.fid_audit_list(text, integer, text, boolean), public.fid_audit_summary(text), public.fid_audit_prune() from public, anon, authenticated;
grant execute on function public.fid_rate_hit(text, text, integer), public.fid_rate_count(text, text, integer), public.fid_audit_list(text, integer, text, boolean), public.fid_audit_summary(text), public.fid_audit_prune() to service_role;
grant all on table public.audit_log, public.rate_hits to service_role;
grant usage, select on sequence public.audit_log_id_seq, public.rate_hits_id_seq to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 5) Derrubar sessões da equipe (tablet roubado, senha trocada, funcionário desligado)
alter table public.staff_access add column if not exists tokens_valid_after timestamptz;
