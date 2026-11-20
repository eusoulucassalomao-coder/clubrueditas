-- QR do tablet: cupom com validade, pedidos de visita para o caixa confirmar.

-- 1) Cupom pode vencer (só os gerados pelo tablet têm validade)
alter table public.redemptions add column if not exists expires_at timestamptz;
alter table public.redemptions drop constraint if exists redemptions_status_check;
alter table public.redemptions add constraint redemptions_status_check
  check (status = any (array['pendiente','canjeado','cancelado','vencido']));

-- 2) Pedidos de visita feitos pelo cliente no tablet (o caixa aprova)
create table if not exists public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  ticket text not null,
  amount numeric not null check (amount > 0 and amount <= 100000000),
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.visit_requests enable row level security;
-- um número de ticket só pode ser usado uma vez (a menos que o caixa o rejeite)
create unique index if not exists visit_requests_ticket_uq
  on public.visit_requests (restaurant_id, upper(ticket)) where status <> 'rechazada';
create index if not exists visit_requests_status_idx
  on public.visit_requests (restaurant_id, status, created_at desc);

-- 3) Vence cupons e devolve os pontos
create or replace function public.fid_expire_coupons(p_slug text) returns integer
language plpgsql security definer set search_path to 'public','extensions' as $$
declare r public.restaurants; x public.redemptions; n integer := 0;
begin
  r := public.fid_rest(p_slug);
  for x in
    select * from public.redemptions
     where restaurant_id = r.id and status = 'pendiente' and expires_at is not null and expires_at < now()
     for update skip locked
  loop
    update public.redemptions set status = 'vencido' where id = x.id;
    update public.customers set points = points + x.points where id = x.customer_id;
    insert into public.ledger (restaurant_id, customer_id, points, type, note)
      values (r.id, x.customer_id, x.points, 'reembolso', 'Cupón vencido: ' || x.name);
    n := n + 1;
  end loop;
  return n;
end $$;

-- 4) Resgate pelo tablet: igual ao fid_claim, mas o cupom tem validade e código aleatório mais longo
create or replace function public.fid_kiosk_claim(p_slug text, p_customer uuid, p_reward text) returns jsonb
language plpgsql security definer set search_path to 'public','extensions' as $$
declare r public.restaurants; c public.customers; rw jsonb; red public.redemptions; v_code text; v_min integer;
begin
  r := public.fid_rest(p_slug);
  perform public.fid_expire_coupons(p_slug);
  select * into c from public.customers where id = p_customer and restaurant_id = r.id for update;
  if not found then raise exception 'E|customer|Cliente no encontrado'; end if;
  if exists (select 1 from public.redemptions where customer_id = c.id and status = 'pendiente' and expires_at is not null and expires_at > now()) then
    raise exception 'E|active|Ya tenés un cupón activo. Mostralo en la caja o esperá a que venza.';
  end if;
  select x into rw from jsonb_array_elements(coalesce(r.config->'rewards', '[]'::jsonb)) x where x->>'id' = p_reward limit 1;
  if rw is null then raise exception 'E|reward|Premio no disponible'; end if;
  if c.points < (rw->>'pts')::int then raise exception 'E|points|Te faltan % puntos', (rw->>'pts')::int - c.points; end if;
  v_min := greatest(5, least(1440, coalesce((r.config->>'couponMinutes')::int, 30)));
  loop
    v_code := 'P' || (100000 + (('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint & 2147483647) % 900000)::text;
    exit when not exists (select 1 from public.redemptions rd where rd.restaurant_id = r.id and rd.code = v_code);
  end loop;
  update public.customers set points = points - (rw->>'pts')::int where id = c.id;
  insert into public.redemptions (restaurant_id, customer_id, reward_id, name, points, code, expires_at)
    values (r.id, c.id, p_reward, rw->>'name', (rw->>'pts')::int, v_code, now() + make_interval(mins => v_min))
    returning * into red;
  insert into public.ledger (restaurant_id, customer_id, points, type, note)
    values (r.id, c.id, -(rw->>'pts')::int, 'canje', rw->>'name');
  return jsonb_build_object('id', red.id, 'code', red.code, 'name', red.name, 'pts', red.points,
                            'status', red.status, 'createdAt', red.created_at, 'expiresAt', red.expires_at,
                            'points', c.points - (rw->>'pts')::int);
end $$;

-- 5) Entrega: cupom vencido não vale
create or replace function public.fid_deliver(p_slug text, p_code text) returns jsonb
language plpgsql security definer set search_path to 'public','extensions' as $$
declare r public.restaurants; x public.redemptions; cu public.customers;
begin
  r := public.fid_rest(p_slug);
  select * into x from public.redemptions where restaurant_id = r.id and code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then raise exception 'E|code|Código no encontrado'; end if;
  if x.status = 'canjeado' then raise exception 'E|code|Este premio ya fue entregado'; end if;
  if x.status = 'vencido' or (x.status = 'pendiente' and x.expires_at is not null and x.expires_at < now()) then
    raise exception 'E|code|Este cupón venció';
  end if;
  if x.status <> 'pendiente' then raise exception 'E|code|Código no válido'; end if;
  update public.redemptions set status = 'canjeado', used_at = now() where id = x.id returning * into x;
  select * into cu from public.customers where id = x.customer_id;
  return jsonb_build_object('code', x.code, 'name', x.name, 'pts', x.points, 'status', x.status, 'customer', cu.name, 'phone', cu.phone,
                            'confirmed', cu.wa_confirmed_at is not null and not cu.opted_out);
end $$;

-- 6) Pedido de visita
create or replace function public.fid_visit_request(p_slug text, p_customer uuid, p_ticket text, p_amount numeric) returns jsonb
language plpgsql security definer set search_path to 'public','extensions' as $$
declare r public.restaurants; c public.customers; t text; v public.visit_requests;
begin
  r := public.fid_rest(p_slug);
  select * into c from public.customers where id = p_customer and restaurant_id = r.id for update;
  if not found then raise exception 'E|customer|Cliente no encontrado'; end if;
  t := upper(regexp_replace(coalesce(p_ticket, ''), '[^A-Za-z0-9-]', '', 'g'));
  if length(t) < 3 or length(t) > 30 then raise exception 'E|ticket|Revisá el número del ticket'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'E|amount|Ingresá el valor de la cuenta'; end if;
  if exists (select 1 from public.visit_requests where customer_id = c.id and status = 'pendiente') then
    raise exception 'E|pending|Ya tenés una visita esperando la confirmación de la caja.';
  end if;
  begin
    insert into public.visit_requests (restaurant_id, customer_id, ticket, amount)
      values (r.id, c.id, t, p_amount) returning * into v;
  exception when unique_violation then
    raise exception 'E|ticket|Ese ticket ya fue registrado.';
  end;
  return jsonb_build_object('id', v.id, 'status', v.status);
end $$;

-- 7) Caixa decide: vira "aprobada"/"rechazada" de forma atômica e devolve o pedido
create or replace function public.fid_visit_take(p_slug text, p_id uuid, p_approve boolean) returns jsonb
language plpgsql security definer set search_path to 'public','extensions' as $$
declare r public.restaurants; v public.visit_requests;
begin
  r := public.fid_rest(p_slug);
  select * into v from public.visit_requests where id = p_id and restaurant_id = r.id for update;
  if not found then raise exception 'E|request|Pedido no encontrado'; end if;
  if v.status <> 'pendiente' then raise exception 'E|request|Este pedido ya fue resuelto'; end if;
  update public.visit_requests
     set status = case when p_approve then 'aprobada' else 'rechazada' end, decided_at = now()
   where id = v.id returning * into v;
  return jsonb_build_object('id', v.id, 'customerId', v.customer_id, 'amount', v.amount, 'ticket', v.ticket, 'status', v.status);
end $$;

-- Só o servidor (service role) executa
revoke all on function public.fid_expire_coupons(text) from public, anon, authenticated;
revoke all on function public.fid_kiosk_claim(text, uuid, text) from public, anon, authenticated;
revoke all on function public.fid_deliver(text, text) from public, anon, authenticated;
revoke all on function public.fid_visit_request(text, uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.fid_visit_take(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.fid_expire_coupons(text) to service_role;
grant execute on function public.fid_kiosk_claim(text, uuid, text) to service_role;
grant execute on function public.fid_deliver(text, text) to service_role;
grant execute on function public.fid_visit_request(text, uuid, text, numeric) to service_role;
grant execute on function public.fid_visit_take(text, uuid, boolean) to service_role;
