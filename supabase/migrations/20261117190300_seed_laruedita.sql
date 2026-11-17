-- Initial non-secret configuration for the La Ruedita loyalty program.
-- Authentication hashes are intentionally provisioned separately.
INSERT INTO public.restaurants (slug, name, config)
VALUES (
  'laruedita',
  'La Ruedita',
  '{
    "tz":"America/Argentina/Buenos_Aires",
    "siteUrl":"https://laruedita-club.vercel.app",
    "reviewUrl":"https://search.google.com/local/writereview?placeid=ChIJu9Hcy9K_V5QRCTuWbK0bmfU",
    "earn":{"perAmount":100,"points":1},
    "multipliers":{"2":2,"3":2},
    "bonus":{"welcome":50,"referral":150,"birthday":200,"review":100},
    "inactiveDays":30,
    "expireMonths":12,
    "rewards":[
      {"id":"postre","name":"Postre de la casa","pts":300,"img":"assets/r-postre.jpg","note":"Flan, queso y dulce o el postre del día"},
      {"id":"entrada","name":"Entrada para compartir","pts":600,"img":"assets/r-entrada.jpg","note":"Provoleta a la plancha"},
      {"id":"desc15","name":"15% de descuento","pts":1000,"img":"assets/r-bife.jpg","note":"En toda tu cuenta, una vez por mes"},
      {"id":"molleja","name":"Mollejas de la casa","pts":1500,"img":"assets/r-molleja.jpg","note":"Porción para compartir en la mesa"}
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
