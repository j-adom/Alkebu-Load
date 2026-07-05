import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_email_notifications_refund_notification_status" AS ENUM('pending', 'sent', 'failed', 'skipped');
  ALTER TYPE "public"."enum_orders_payment_payment_status" ADD VALUE 'partially_refunded' BEFORE 'refunded';
  ALTER TYPE "public"."enum_orders_fulfillment_carrier" ADD VALUE 'direct_to_home';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'quote-followups';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'recover-stripe-orders';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'quote-followups';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'recover-stripe-orders';
  CREATE TABLE "payload_mcp_api_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"label" varchar,
  	"description" varchar,
  	"orders_find" boolean DEFAULT false,
  	"orders_update" boolean DEFAULT false,
  	"books_find" boolean DEFAULT false,
  	"books_update" boolean DEFAULT false,
  	"wellness_lifestyle_find" boolean DEFAULT false,
  	"wellness_lifestyle_update" boolean DEFAULT false,
  	"fashion_jewelry_find" boolean DEFAULT false,
  	"fashion_jewelry_update" boolean DEFAULT false,
  	"oils_incense_find" boolean DEFAULT false,
  	"oils_incense_update" boolean DEFAULT false,
  	"blog_posts_find" boolean DEFAULT false,
  	"blog_posts_create" boolean DEFAULT false,
  	"blog_posts_update" boolean DEFAULT false,
  	"customers_find" boolean DEFAULT false,
  	"carts_find" boolean DEFAULT false,
  	"reviews_find" boolean DEFAULT false,
  	"search_analytics_find" boolean DEFAULT false,
  	"authors_find" boolean DEFAULT false,
  	"publishers_find" boolean DEFAULT false,
  	"vendors_find" boolean DEFAULT false,
  	"payload_mcp_tool_list_orders_needs_attention" boolean DEFAULT true,
  	"payload_mcp_tool_low_stock" boolean DEFAULT true,
  	"payload_mcp_tool_draft_refund" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  ALTER TABLE "orders_items" ADD COLUMN "refunded_quantity" numeric DEFAULT 0;
  ALTER TABLE "orders_items" ADD COLUMN "do_not_ship" boolean DEFAULT false;
  ALTER TABLE "orders_refunds" ADD COLUMN "note" varchar;
  ALTER TABLE "orders_refunds" ADD COLUMN "items" jsonb;
  ALTER TABLE "orders_refunds" ADD COLUMN "restock" boolean DEFAULT false;
  ALTER TABLE "orders" ADD COLUMN "email_notifications_refund_notification_status" "enum_orders_email_notifications_refund_notification_status";
  ALTER TABLE "orders" ADD COLUMN "email_notifications_refund_notification_recipient" varchar;
  ALTER TABLE "orders" ADD COLUMN "email_notifications_refund_notification_provider" varchar;
  ALTER TABLE "orders" ADD COLUMN "email_notifications_refund_notification_sent_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "email_notifications_refund_notification_error" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payload_mcp_api_keys_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "payload_mcp_api_keys_id" integer;
  ALTER TABLE "payload_mcp_api_keys" ADD CONSTRAINT "payload_mcp_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_mcp_api_keys_user_idx" ON "payload_mcp_api_keys" USING btree ("user_id");
  CREATE INDEX "payload_mcp_api_keys_updated_at_idx" ON "payload_mcp_api_keys" USING btree ("updated_at");
  CREATE INDEX "payload_mcp_api_keys_created_at_idx" ON "payload_mcp_api_keys" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payload_mcp_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX "payload_preferences_rels_payload_mcp_api_keys_id_idx" ON "payload_preferences_rels" USING btree ("payload_mcp_api_keys_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_mcp_api_keys" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload_mcp_api_keys" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk";
  
  ALTER TABLE "orders" ALTER COLUMN "payment_payment_status" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_payment_payment_status";
  CREATE TYPE "public"."enum_orders_payment_payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded');
  ALTER TABLE "orders" ALTER COLUMN "payment_payment_status" SET DATA TYPE "public"."enum_orders_payment_payment_status" USING "payment_payment_status"::"public"."enum_orders_payment_payment_status";
  ALTER TABLE "orders" ALTER COLUMN "fulfillment_carrier" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_fulfillment_carrier";
  CREATE TYPE "public"."enum_orders_fulfillment_carrier" AS ENUM('usps', 'ups', 'fedex', 'local');
  ALTER TABLE "orders" ALTER COLUMN "fulfillment_carrier" SET DATA TYPE "public"."enum_orders_fulfillment_carrier" USING "fulfillment_carrier"::"public"."enum_orders_fulfillment_carrier";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'cleanup-abandoned-carts', 'daily-order-digest');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'cleanup-abandoned-carts', 'daily-order-digest');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_payload_mcp_api_keys_id_idx";
  DROP INDEX "payload_preferences_rels_payload_mcp_api_keys_id_idx";
  ALTER TABLE "orders_items" DROP COLUMN "refunded_quantity";
  ALTER TABLE "orders_items" DROP COLUMN "do_not_ship";
  ALTER TABLE "orders_refunds" DROP COLUMN "note";
  ALTER TABLE "orders_refunds" DROP COLUMN "items";
  ALTER TABLE "orders_refunds" DROP COLUMN "restock";
  ALTER TABLE "orders" DROP COLUMN "email_notifications_refund_notification_status";
  ALTER TABLE "orders" DROP COLUMN "email_notifications_refund_notification_recipient";
  ALTER TABLE "orders" DROP COLUMN "email_notifications_refund_notification_provider";
  ALTER TABLE "orders" DROP COLUMN "email_notifications_refund_notification_sent_at";
  ALTER TABLE "orders" DROP COLUMN "email_notifications_refund_notification_error";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payload_mcp_api_keys_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "payload_mcp_api_keys_id";
  DROP TYPE "public"."enum_orders_email_notifications_refund_notification_status";`)
}
