-- Prevent a second manual review bonus after the private survey bonus and expire survey tokens after 30 days.
CREATE OR REPLACE FUNCTION public.fid_add_bonus(p_slug text, p_customer uuid, p_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r public.restaurants;
  c public.customers;
  b integer;
  tz text;
  lt text;
BEGIN
  r := public.fid_rest(p_slug);
  IF p_type NOT IN ('birthday', 'review') THEN
    RAISE EXCEPTION 'E|bonus|Bono no disponible';
  END IF;
  SELECT * INTO c FROM public.customers
   WHERE id = p_customer AND restaurant_id = r.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'E|customer|Cliente no encontrado'; END IF;
  b := coalesce((r.config->'bonus'->>p_type)::integer, 0);
  IF b <= 0 THEN RAISE EXCEPTION 'E|bonus|Bono no disponible'; END IF;
  tz := coalesce(r.config->>'tz', 'America/Argentina/Buenos_Aires');
  lt := CASE WHEN p_type = 'birthday' THEN 'cumpleaños' ELSE 'reseña' END;
  IF p_type = 'birthday' AND EXISTS (
    SELECT 1 FROM public.ledger WHERE customer_id = c.id AND type = lt
      AND extract(year FROM (created_at AT TIME ZONE tz)) =
          extract(year FROM (now() AT TIME ZONE tz))
  ) THEN
    RAISE EXCEPTION 'E|bonus|Ya recibió el regalo de cumpleaños de este año';
  END IF;
  IF p_type = 'review' AND EXISTS (
    SELECT 1 FROM public.ledger WHERE customer_id = c.id AND type IN ('reseña', 'encuesta')
  ) THEN
    RAISE EXCEPTION 'E|bonus|Ya recibió el bono por responder la encuesta';
  END IF;
  UPDATE public.customers SET points = points + b, lifetime = lifetime + b
   WHERE id = c.id RETURNING * INTO c;
  INSERT INTO public.ledger (restaurant_id, customer_id, points, type, note)
  VALUES (r.id, c.id, b, lt,
    CASE WHEN p_type = 'birthday' THEN 'Regalo de cumpleaños' ELSE 'Bono por reseña' END);
  RETURN jsonb_build_object('customer', public.fid_cjson(c), 'pts', b);
END
$function$;

CREATE OR REPLACE FUNCTION public.fid_submit_survey(
  p_slug text, p_token text, p_rating integer, p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r public.restaurants;
  s public.surveys;
  c public.customers;
  comment_text text;
  bonus_points integer;
  low_rating boolean;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'E|rating|Calificación inválida';
  END IF;
  IF length(coalesce(p_token, '')) < 20 OR length(p_token) > 100 THEN
    RAISE EXCEPTION 'E|survey|Encuesta no válida o expirada';
  END IF;
  r := public.fid_rest(p_slug);
  SELECT * INTO s FROM public.surveys
   WHERE restaurant_id = r.id AND token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'E|survey|Encuesta no válida o expirada'; END IF;
  IF s.created_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'E|survey|El plazo para responder esta encuesta venció';
  END IF;
  IF s.reviewed_at IS NOT NULL OR s.response IS NOT NULL THEN
    RAISE EXCEPTION 'E|survey|Encuesta ya respondida';
  END IF;
  SELECT * INTO c FROM public.customers
   WHERE id = s.customer_id AND restaurant_id = r.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'E|customer|Cliente no encontrado'; END IF;
  comment_text := nullif(left(btrim(coalesce(p_comment, '')), 500), '');
  low_rating := p_rating <= 3;
  bonus_points := greatest(0, coalesce(nullif(r.config->'bonus'->>'review', '')::integer, 100));
  UPDATE public.surveys SET response = comment_text, rating = p_rating, reviewed_at = now()
   WHERE id = s.id;
  IF bonus_points > 0 THEN
    UPDATE public.customers SET points = points + bonus_points, lifetime = lifetime + bonus_points
     WHERE id = c.id;
    INSERT INTO public.ledger (restaurant_id, customer_id, points, type, note)
    VALUES (r.id, c.id, bonus_points, 'encuesta', 'Bono por completar la encuesta privada');
  END IF;
  INSERT INTO public.message_log (restaurant_id, customer_id, kind, meta)
  VALUES (
    r.id, c.id,
    CASE WHEN low_rating THEN 'survey_low_rating' ELSE 'survey_submitted' END,
    jsonb_build_object('rating', p_rating, 'comment', comment_text, 'survey_id', s.id)
  );
  RETURN jsonb_build_object(
    'message', CASE WHEN low_rating
      THEN 'Gracias por contarnos. Queremos mejorar tu experiencia.'
      ELSE '¡Gracias por tu opinión!' END,
    'rating', p_rating,
    'reviewUrl', r.config->>'reviewUrl',
    'pointsAwarded', bonus_points,
    'benefit', CASE WHEN low_rating
      THEN jsonb_build_object('percent', 10, 'code', 'DESCUENTO10')
      ELSE NULL END
  );
END
$function$;

REVOKE ALL ON FUNCTION public.fid_add_bonus(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fid_add_bonus(text, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.fid_submit_survey(text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fid_submit_survey(text, text, integer, text) TO service_role;
