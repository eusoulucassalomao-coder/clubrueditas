-- Make visit, points, referral bonus and survey-token creation one transaction.
CREATE OR REPLACE FUNCTION public.fid_add_visit(
  p_slug text, p_customer uuid, p_amount numeric, p_staff text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r public.restaurants;
  c public.customers;
  rf public.customers;
  ts timestamptz := now();
  tz text;
  dow integer;
  m numeric;
  per numeric;
  pp numeric;
  pts integer;
  b integer;
  bon jsonb := '[]'::jsonb;
  v_visit_id uuid;
  v_survey_token text;
BEGIN
  r := public.fid_rest(p_slug);
  SELECT * INTO c FROM public.customers
   WHERE id = p_customer AND restaurant_id = r.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'E|customer|Cliente no encontrado'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000000 THEN
    RAISE EXCEPTION 'E|amount|Ingresá el valor de la cuenta';
  END IF;

  tz := coalesce(r.config->>'tz', 'America/Argentina/Buenos_Aires');
  dow := extract(dow FROM (ts AT TIME ZONE tz))::integer;
  m := coalesce((r.config->'multipliers'->>(dow::text))::numeric, 1);
  per := greatest(coalesce((r.config->'earn'->>'perAmount')::numeric, 100), 1);
  pp := coalesce((r.config->'earn'->>'points')::numeric, 1);
  pts := floor(floor(p_amount / per) * pp * m)::integer;

  UPDATE public.customers
     SET points = points + pts, lifetime = lifetime + pts,
         visits = visits + 1, last_visit = ts
   WHERE id = c.id RETURNING * INTO c;

  INSERT INTO public.visits (restaurant_id, customer_id, amount, points, multiplier, staff)
  VALUES (r.id, c.id, p_amount, pts, m, left(coalesce(p_staff, 'caja'), 40))
  RETURNING id INTO v_visit_id;

  INSERT INTO public.ledger (restaurant_id, customer_id, points, type, note)
  VALUES (
    r.id, c.id, pts, 'visita',
    'Cuenta $' || to_char(p_amount, 'FM999G999G999G990') ||
    CASE WHEN m > 1 THEN ' (x' || m::text || ')' ELSE '' END
  );

  IF c.visits = 1 AND c.referred_by IS NOT NULL THEN
    b := coalesce((r.config->'bonus'->>'referral')::integer, 0);
    IF b > 0 THEN
      SELECT * INTO rf FROM public.customers WHERE id = c.referred_by FOR UPDATE;
      IF FOUND THEN
        UPDATE public.customers SET points = points + b, lifetime = lifetime + b
         WHERE id = c.id RETURNING * INTO c;
        UPDATE public.customers SET points = points + b, lifetime = lifetime + b
         WHERE id = rf.id;
        INSERT INTO public.ledger (restaurant_id, customer_id, points, type, note)
        VALUES
          (r.id, c.id, b, 'indicación', 'Bono por venir invitado'),
          (r.id, rf.id, b, 'indicación', 'Tu amigo ' || c.name || ' ya visitó el local');
        bon := jsonb_build_array(
          jsonb_build_object('to', c.name, 'pts', b, 'why', 'viene invitado'),
          jsonb_build_object(
            'to', rf.name, 'pts', b, 'why', 'su amigo ya visitó',
            'phone', CASE WHEN rf.consent AND rf.wa_confirmed_at IS NOT NULL AND NOT rf.opted_out
              THEN rf.phone ELSE NULL END
          )
        );
      END IF;
    END IF;
  END IF;

  v_survey_token := encode(extensions.gen_random_bytes(18), 'hex');
  INSERT INTO public.surveys (restaurant_id, customer_id, visit_id, token)
  VALUES (r.id, c.id, v_visit_id, v_survey_token);

  RETURN jsonb_build_object(
    'customer', public.fid_cjson(c), 'pts', pts, 'mult', m,
    'bonuses', bon, 'visitId', v_visit_id, 'surveyToken', v_survey_token
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.fid_register(
  p_slug text, p_name text, p_phone text, p_birthday date, p_ref text, p_consent boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r public.restaurants;
  ph text;
  k text;
  ref public.customers;
  c public.customers;
  w integer;
  nm text;
BEGIN
  r := public.fid_rest(p_slug);
  nm := btrim(coalesce(p_name, ''));
  ph := public.fid_digits(p_phone);
  IF length(nm) < 2 OR length(nm) > 80 THEN
    RAISE EXCEPTION 'E|name|Escribí tu nombre';
  END IF;
  IF length(ph) < 8 OR length(ph) > 15 THEN
    RAISE EXCEPTION 'E|phone|Revisá tu número de celular con código de área';
  END IF;
  IF NOT coalesce(p_consent, false) THEN
    RAISE EXCEPTION 'E|consent|Necesitamos tu autorización para gestionar tu membresía y tus puntos';
  END IF;
  k := right(ph, 8);
  IF EXISTS (SELECT 1 FROM public.customers WHERE restaurant_id = r.id AND phone_key = k) THEN
    RAISE EXCEPTION 'E|exists|Este número de celular ya está registrado';
  END IF;
  IF p_ref IS NOT NULL AND btrim(p_ref) <> '' THEN
    SELECT * INTO ref FROM public.customers
     WHERE restaurant_id = r.id AND code = upper(btrim(p_ref));
  END IF;
  w := coalesce((r.config->'bonus'->>'welcome')::integer, 0);
  INSERT INTO public.customers (
    restaurant_id, name, phone, phone_key, birthday, code, referred_by,
    points, lifetime, consent, consent_at, wa_confirmed_at
  )
  VALUES (
    r.id, nm, ph, k, p_birthday, public.fid_new_code(r.id, nm), ref.id,
    w, w, true, now(), now()
  )
  RETURNING * INTO c;
  IF w > 0 THEN
    INSERT INTO public.ledger (restaurant_id, customer_id, points, type, note)
    VALUES (r.id, c.id, w, 'bienvenida', 'Bienvenida al club');
  END IF;
  RETURN public.fid_cjson(c) || jsonb_build_object('accessToken', c.access_token);
END
$function$;

REVOKE ALL ON FUNCTION public.fid_add_visit(text, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fid_add_visit(text, uuid, numeric, text) TO service_role;
REVOKE ALL ON FUNCTION public.fid_register(text, text, text, date, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fid_register(text, text, text, date, text, boolean) TO service_role;
