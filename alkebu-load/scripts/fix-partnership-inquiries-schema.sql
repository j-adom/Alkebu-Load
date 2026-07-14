-- Restore the PartnershipInquiries tables missing from production (2026-07-14)
--
-- THIS IS A LIVE OUTAGE FIX, NOT A NEW FEATURE.
-- The PartnershipInquiries collection has been registered in the running app since the
-- July 8 deploy, but its tables were never created in Postgres. The storefront's B2B form
-- (alkebu-web/src/lib/server/partnershipInquiry.ts) POSTs to /api/partnership-inquiries,
-- Payload tries to insert, and there is nowhere to put it. EVERY wholesale, institutional,
-- and non-profit inquiry since July 8 has been lost.
--
-- Root cause: the July 11 patch was almost certainly pasted into a psql session sitting in
-- the `postgres` maintenance database rather than `alkebulan`. It reported success against
-- nothing. Always run SELECT current_database(); before applying DDL.
--
-- Not hand-written: extracted verbatim from the schema Payload's own Postgres adapter
-- generates, then verified by replaying it against a copy of production's actual schema
-- and confirming the result matches Payload's expectation exactly.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- 1. Enums ------------------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partnership_inquiries_acknowledgement_email_status') THEN
    CREATE TYPE public.enum_partnership_inquiries_acknowledgement_email_status AS ENUM (
        'pending',
        'sent',
        'failed',
        'skipped'
    );
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partnership_inquiries_crm_sync_status') THEN
    CREATE TYPE public.enum_partnership_inquiries_crm_sync_status AS ENUM (
        'not_configured',
        'pending',
        'synced',
        'failed'
    );
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partnership_inquiries_inquiry_type') THEN
    CREATE TYPE public.enum_partnership_inquiries_inquiry_type AS ENUM (
        'wholesale',
        'institutional',
        'nonprofit'
    );
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partnership_inquiries_staff_email_status') THEN
    CREATE TYPE public.enum_partnership_inquiries_staff_email_status AS ENUM (
        'pending',
        'sent',
        'failed',
        'skipped'
    );
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partnership_inquiries_status') THEN
    CREATE TYPE public.enum_partnership_inquiries_status AS ENUM (
        'new',
        'contacted',
        'qualified',
        'won',
        'lost'
    );
  END IF;
END$do$;

-- 2. Tables -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partnership_inquiries (
    id integer NOT NULL,
    inquiry_type public.enum_partnership_inquiries_inquiry_type NOT NULL,
    status public.enum_partnership_inquiries_status DEFAULT 'new'::public.enum_partnership_inquiries_status,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    organization_name character varying NOT NULL,
    organization_type character varying NOT NULL,
    message character varying NOT NULL,
    source_path character varying NOT NULL,
    submitted_at timestamp(3) with time zone NOT NULL,
    wholesale_details_expected_order_volume character varying,
    wholesale_details_resale_or_distribution_needs character varying,
    institutional_details_institution_type character varying,
    institutional_details_purchasing_method character varying,
    institutional_details_tax_exempt_status character varying,
    institutional_details_audience_or_student_group character varying,
    institutional_details_target_timeline character varying,
    nonprofit_details_project_type character varying,
    nonprofit_details_mission_or_program_context character varying,
    nonprofit_details_target_timeline character varying,
    nonprofit_details_budget_range character varying,
    nonprofit_details_support_requested character varying,
    follow_up_date timestamp(3) with time zone,
    internal_notes character varying,
    assigned_to_id integer,
    staff_email_status public.enum_partnership_inquiries_staff_email_status DEFAULT 'pending'::public.enum_partnership_inquiries_staff_email_status,
    staff_email_sent_at timestamp(3) with time zone,
    staff_email_error character varying,
    acknowledgement_email_status public.enum_partnership_inquiries_acknowledgement_email_status DEFAULT 'pending'::public.enum_partnership_inquiries_acknowledgement_email_status,
    acknowledgement_email_sent_at timestamp(3) with time zone,
    acknowledgement_email_error character varying,
    crm_external_id character varying,
    crm_sync_status public.enum_partnership_inquiries_crm_sync_status DEFAULT 'not_configured'::public.enum_partnership_inquiries_crm_sync_status,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.partnership_inquiries_wholesale_details_product_interests (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    interest character varying
);

-- 3. Sequence ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.partnership_inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.partnership_inquiries_id_seq OWNED BY public.partnership_inquiries.id;

ALTER TABLE ONLY public.partnership_inquiries ALTER COLUMN id SET DEFAULT nextval('public.partnership_inquiries_id_seq'::regclass);

-- 4. Primary keys -----------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnership_inquiries_pkey') THEN
    ALTER TABLE ONLY public.partnership_inquiries
        ADD CONSTRAINT partnership_inquiries_pkey PRIMARY KEY (id);
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnership_inquiries_wholesale_details_product_interests_pkey') THEN
    ALTER TABLE ONLY public.partnership_inquiries_wholesale_details_product_interests
        ADD CONSTRAINT partnership_inquiries_wholesale_details_product_interests_pkey PRIMARY KEY (id);
  END IF;
END$do$;

-- 5. The rels column on the (already existing) locked-documents table --------------------
ALTER TABLE public.payload_locked_documents_rels
  ADD COLUMN IF NOT EXISTS partnership_inquiries_id integer;

-- 6. Foreign keys -----------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnership_inquiries_assigned_to_id_users_id_fk') THEN
    ALTER TABLE ONLY public.partnership_inquiries
        ADD CONSTRAINT partnership_inquiries_assigned_to_id_users_id_fk FOREIGN KEY (assigned_to_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnership_inquiries_wholesale_details_product_interests_paren') THEN
    ALTER TABLE ONLY public.partnership_inquiries_wholesale_details_product_interests
        ADD CONSTRAINT partnership_inquiries_wholesale_details_product_interests_paren FOREIGN KEY (_parent_id) REFERENCES public.partnership_inquiries(id) ON DELETE CASCADE;
  END IF;
END$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_partnership_inquiries_fk') THEN
    ALTER TABLE ONLY public.payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_partnership_inquiries_fk FOREIGN KEY (partnership_inquiries_id) REFERENCES public.partnership_inquiries(id) ON DELETE CASCADE;
  END IF;
END$do$;

-- 7. Indexes ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS partnership_inquiries_assigned_to_idx ON public.partnership_inquiries USING btree (assigned_to_id);
CREATE INDEX IF NOT EXISTS partnership_inquiries_created_at_idx ON public.partnership_inquiries USING btree (created_at);
CREATE INDEX IF NOT EXISTS partnership_inquiries_updated_at_idx ON public.partnership_inquiries USING btree (updated_at);
CREATE INDEX IF NOT EXISTS partnership_inquiries_wholesale_details_product_interests_order ON public.partnership_inquiries_wholesale_details_product_interests USING btree (_order);
CREATE INDEX IF NOT EXISTS partnership_inquiries_wholesale_details_product_interests_paren ON public.partnership_inquiries_wholesale_details_product_interests USING btree (_parent_id);
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_partnership_inquiries_id_idx ON public.payload_locked_documents_rels USING btree (partnership_inquiries_id);

COMMIT;

-- Verify (expect 0 rows):
--   SELECT t FROM unnest(ARRAY['partnership_inquiries',
--     'partnership_inquiries_wholesale_details_product_interests']) AS t
--   WHERE to_regclass('public.' || t) IS NULL;
