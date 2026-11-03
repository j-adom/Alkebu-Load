-- audit-orphaned-media.sql — READ-ONLY dry run. Changes nothing.
--
-- Finds Media rows that nothing in the database points at. Run in psql (Coolify
-- PG terminal) connected to the Payload database:
--   psql -U <user> -d <db> -f audit-orphaned-media.sql      (or paste it in)
--
-- A media row counts as REFERENCED if any of these point at it:
--   1. fk   — any foreign-key column referencing media(id), discovered from
--              pg_constraint (upload/relationship fields, arrays, globals).
--              payload_locked_documents_rels is ignored (edit locks, not usage).
--   2. json — any json/jsonb column containing {"relationTo":"media","value":…}
--              (Lexical upload nodes in rich text).
--   3. url  — any text/varchar/json column containing a /api/media/file/<name>
--              or media.alkebulanimages.com/<key> URL that resolves to the row's
--              filename, r2_object_key or url (e.g. books.scrapedImageUrls).
-- Job queue/log tables are skipped for 2 and 3 (they mention URLs, not use them).
--
-- Everything runs in a READ ONLY transaction that is rolled back at the end.

\set ON_ERROR_STOP on
\pset pager off
BEGIN TRANSACTION READ ONLY;
-- The generated query has ~250 UNION branches; JIT-compiling it costs ~30 s
-- per statement vs ~0.3 s to just run it.
SET LOCAL jit = off;

-- Build the "every reference" query once, keep it in :refs_sql, reuse below.
WITH
fk AS (
  SELECT format(
           'SELECT %L::text AS src, %I::int AS media_id FROM %I.%I WHERE %I IS NOT NULL',
           'fk:' || c.relname || '.' || a.attname, a.attname, n.nspname, c.relname, a.attname) AS q
  FROM pg_constraint k
  JOIN pg_class c      ON c.oid = k.conrelid
  JOIN pg_namespace n  ON n.oid = c.relnamespace
  JOIN pg_attribute a  ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
  WHERE k.contype = 'f'
    AND k.confrelid = 'public.media'::regclass
    AND c.relname <> 'payload_locked_documents_rels'
),
scan_cols AS (
  SELECT table_schema, table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name NOT IN ('media', 'payload_locked_documents_rels', 'payload_migrations',
                           'payload_preferences', 'payload_preferences_rels')
    AND table_name NOT LIKE 'payload_jobs%'
    AND data_type IN ('json', 'jsonb', 'text', 'character varying')
),
js AS (
  SELECT format(
           $f$SELECT %L::text AS src,
                     CASE jsonb_typeof(v)
                       WHEN 'number' THEN (v #>> '{}')::numeric::int
                       WHEN 'string' THEN NULLIF(regexp_replace(v #>> '{}', '\D', '', 'g'), '')::int
                       WHEN 'object' THEN NULLIF(regexp_replace(COALESCE(v ->> 'id', ''), '\D', '', 'g'), '')::int
                     END AS media_id
              FROM %I.%I t,
                   LATERAL jsonb_path_query(t.%I::jsonb, 'strict $.**?(@.relationTo == "media").value') v
              WHERE t.%I::text LIKE '%%"media"%%'$f$,
           'json:' || table_name || '.' || column_name, table_schema, table_name,
           column_name, column_name) AS q
  FROM scan_cols WHERE data_type IN ('json', 'jsonb')
),
url AS (
  SELECT format(
           $f$SELECT %L::text AS src, k.m[1] AS key
              FROM %I.%I t,
                   LATERAL regexp_matches(t.%I::text,
                     '(?:/api/media/file/|media\.alkebulanimages\.com/)([^"''\s?#<>)\\]+)', 'g') AS k(m)
              WHERE t.%I::text ~ '(/api/media/file/|media\.alkebulanimages\.com/)'$f$,
           'url:' || table_name || '.' || column_name, table_schema, table_name,
           column_name, column_name) AS q
  FROM scan_cols
)
SELECT
  'SELECT src, media_id FROM ('
  || COALESCE((SELECT string_agg(q, E'\nUNION ALL\n') FROM fk), 'SELECT NULL::text, NULL::int WHERE false')
  || E'\nUNION ALL\n'
  || COALESCE((SELECT string_agg(q, E'\nUNION ALL\n') FROM js), 'SELECT NULL::text, NULL::int WHERE false')
  || ') direct WHERE media_id IS NOT NULL'
  || E'\nUNION ALL\n'
  || 'SELECT u.src, mk.media_id FROM ('
  || COALESCE((SELECT string_agg(q, E'\nUNION ALL\n') FROM url), 'SELECT NULL::text, NULL::text WHERE false')
  || ') u(src, key)
     CROSS JOIN LATERAL unnest(ARRAY[u.key, replace(u.key, ''%20'', '' ''), regexp_replace(u.key, ''^.*/'', '''')]) AS uk(key)
     JOIN (SELECT id AS media_id, filename AS key FROM public.media
           UNION SELECT id, r2_object_key FROM public.media
           UNION SELECT id, regexp_replace(url, ''^https?://[^/]+/(api/media/file/)?'', '''') FROM public.media
          ) mk ON mk.key = uk.key'
  AS refs_sql
\gset

\echo
\echo '== 1. Summary ======================================================'
WITH refs AS MATERIALIZED (:refs_sql), used AS (SELECT DISTINCT media_id FROM refs),
m AS (
  SELECT id, COALESCE(filesize, file_size, 0) AS bytes, created_at,
         id IN (SELECT media_id FROM used) AS used
  FROM public.media
)
SELECT count(*)                                                  AS media_rows,
       count(*) FILTER (WHERE used)                              AS referenced,
       count(*) FILTER (WHERE NOT used)                          AS orphaned,
       count(*) FILTER (WHERE NOT used AND created_at > now() - interval '14 days')
                                                                 AS orphaned_last_14d_keep,
       pg_size_pretty(sum(bytes)::bigint)                        AS total_size,
       pg_size_pretty(sum(bytes) FILTER (WHERE NOT used)::bigint) AS orphaned_size
FROM m;

\echo
\echo '== 2. Where references come from (distinct media per source) ======'
WITH refs AS MATERIALIZED (:refs_sql), used AS (SELECT DISTINCT media_id FROM refs)
SELECT src, count(DISTINCT media_id) AS media_rows
FROM refs GROUP BY src ORDER BY media_rows DESC;

\echo
\echo '== 3. Orphans by filename pattern ==================================='
WITH refs AS MATERIALIZED (:refs_sql), used AS (SELECT DISTINCT media_id FROM refs)
SELECT CASE
         WHEN filename ~ '^product-[0-9]+\.'       THEN 'product-N (old Square webhook)'
         WHEN filename ~ '-square-[0-9]+\.[a-z]+$' THEN '<title>-square-N (old Square webhook)'
         WHEN filename ~ '^isbn-'                  THEN 'isbn-* (ISBNdb enrich)'
         WHEN filename ~ '^97[89][0-9]{10}'        THEN '<isbn>.jpg'
         ELSE 'other'
       END AS pattern,
       count(*) AS rows,
       pg_size_pretty(sum(COALESCE(filesize, file_size, 0))::bigint) AS size
FROM public.media
WHERE media.id NOT IN (SELECT media_id FROM used)
GROUP BY 1 ORDER BY 2 DESC;

\echo
\echo '== 4. Orphans by month created ======================================'
WITH refs AS MATERIALIZED (:refs_sql), used AS (SELECT DISTINCT media_id FROM refs)
SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
       count(*) AS rows,
       pg_size_pretty(sum(COALESCE(filesize, file_size, 0))::bigint) AS size
FROM public.media
WHERE media.id NOT IN (SELECT media_id FROM used)
GROUP BY 1 ORDER BY 1;

\echo
\echo '== 5. Orphans from the last 14 days (would be KEPT — may be mid-edit)'
WITH refs AS MATERIALIZED (:refs_sql), used AS (SELECT DISTINCT media_id FROM refs)
SELECT id, created_at::date AS created, filename, alt
FROM public.media
WHERE media.id NOT IN (SELECT media_id FROM used)
  AND created_at > now() - interval '14 days'
  AND filename !~ '^product-[0-9]+\.' AND filename !~ '-square-[0-9]+\.[a-z]+$'
ORDER BY id DESC LIMIT 40;

\echo
\echo '== 6. Orphan id ranges (copy this whole line back) ================='
WITH refs AS MATERIALIZED (:refs_sql), used AS (SELECT DISTINCT media_id FROM refs),
o AS (
  SELECT id, id - row_number() OVER (ORDER BY id) AS grp
  FROM public.media
  WHERE media.id NOT IN (SELECT media_id FROM used)
)
SELECT 'ORPHANS:' || (SELECT count(*) FROM o) || ':'
       || COALESCE(string_agg(CASE WHEN lo = hi THEN lo::text ELSE lo || '-' || hi END, ',' ORDER BY lo), '')
FROM (SELECT min(id) AS lo, max(id) AS hi FROM o GROUP BY grp) r;

ROLLBACK;
