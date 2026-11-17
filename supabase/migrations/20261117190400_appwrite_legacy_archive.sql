CREATE TABLE IF NOT EXISTS public.appwrite_legacy_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_collection text NOT NULL,
  source_id text NOT NULL,
  payload jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appwrite_legacy_archive_source_unique UNIQUE (source_collection, source_id)
);
ALTER TABLE public.appwrite_legacy_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.appwrite_legacy_archive FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.appwrite_legacy_archive TO service_role;
