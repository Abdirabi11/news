-- =============================================================
-- Full-text search for article_translations
--
-- 1. locale_to_regconfig(): maps our "Locale" enum to a PG text
--    search configuration. Arabic uses the built-in snowball
--    config when available (PG 11+); Somali has no stemmer in
--    core PostgreSQL, so it falls back to 'simple' (exact-token
--    matching, still fully functional for search).
-- 2. Trigger keeps "searchVector" in sync on INSERT/UPDATE,
--    weighting title (A) > excerpt (B) > body text (C).
-- 3. Backfill for any pre-existing rows.
-- 4. GIN index for fast @@ queries.
-- =============================================================
 
-- 1. Locale -> regconfig mapping.
--    Built inside a DO block so we can detect whether the
--    'arabic' configuration exists on this server and fall back
--    to 'simple' if it does not (older PG builds / stripped
--    installs). The generated function is IMMUTABLE either way.
DO $$
DECLARE
  arabic_cfg text;
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'arabic')
    THEN 'arabic'
    ELSE 'simple'
  END INTO arabic_cfg;
 
  EXECUTE format($fn$
    CREATE OR REPLACE FUNCTION locale_to_regconfig(loc "Locale")
    RETURNS regconfig
    IMMUTABLE
    PARALLEL SAFE
    LANGUAGE sql
    AS $body$
      SELECT CASE loc
        WHEN 'en' THEN 'english'::regconfig
        WHEN 'ar' THEN %L::regconfig
        ELSE 'simple'::regconfig  -- 'so' (Somali) and any future default
      END;
    $body$;
  $fn$, arabic_cfg);
END
$$;
 
-- 2. Trigger function: recompute the weighted vector.
CREATE OR REPLACE FUNCTION article_translations_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cfg regconfig := locale_to_regconfig(NEW.locale);
BEGIN
  NEW."searchVector" :=
      setweight(to_tsvector(cfg, coalesce(NEW.title, '')),         'A')
   || setweight(to_tsvector(cfg, coalesce(NEW.excerpt, '')),       'B')
   || setweight(to_tsvector(cfg, coalesce(NEW."contentText", '')), 'C');
  RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_article_translations_search_vector
  ON "article_translations";
 
CREATE TRIGGER trg_article_translations_search_vector
BEFORE INSERT OR UPDATE OF title, excerpt, "contentText", locale
ON "article_translations"
FOR EACH ROW
EXECUTE FUNCTION article_translations_search_vector_update();
 
-- 3. Backfill existing rows (no-op on a fresh database).
UPDATE "article_translations"
SET "searchVector" =
      setweight(to_tsvector(locale_to_regconfig(locale), coalesce(title, '')),         'A')
   || setweight(to_tsvector(locale_to_regconfig(locale), coalesce(excerpt, '')),       'B')
   || setweight(to_tsvector(locale_to_regconfig(locale), coalesce("contentText", '')), 'C');
 
-- 4. GIN index for fast full-text queries.
CREATE INDEX IF NOT EXISTS article_translations_search_vector_idx
ON "article_translations"
USING GIN ("searchVector");
 
