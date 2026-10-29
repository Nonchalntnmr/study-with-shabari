-- Deny-by-default for Supabase's auto-generated Data API (PostgREST).
--
-- The application never talks to PostgREST: it connects through Prisma as the
-- table owner, and owners bypass RLS. Enabling RLS with no policies means the
-- `anon` and `authenticated` roles (whose keys can end up in a browser) read
-- and write nothing. tests/integration/rls.test.ts fails if a table is added
-- later without this.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Belt and braces on Supabase: also drop the default table grants.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
  END IF;
END
$$;
