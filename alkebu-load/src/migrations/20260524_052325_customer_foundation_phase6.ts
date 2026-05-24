import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Phase 6 — Customer Foundation
//
// 1. Add `source` and `lifecycle_status` enums + columns to `customers`.
//    Existing rows backfill via NOT NULL DEFAULT.
// 2. Swap `orders.customer_id` foreign key from `users(id)` → `customers(id)`.
//    Defensively NULLs any existing customer_id values first, since pre-Phase 6
//    those pointed at User rows that won't satisfy the new constraint.
//    Backfill of historical orders → customer rows is handled separately by
//    the customer backfill script / admin route.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_customers_source" AS ENUM('ecom', 'pos', 'imported', 'manual');
    CREATE TYPE "public"."enum_customers_lifecycle_status" AS ENUM('ghost', 'invited', 'active');

    ALTER TABLE "customers"
      ADD COLUMN "source" "enum_customers_source" NOT NULL DEFAULT 'manual';
    ALTER TABLE "customers"
      ADD COLUMN "lifecycle_status" "enum_customers_lifecycle_status" NOT NULL DEFAULT 'ghost';

    UPDATE "orders" SET "customer_id" = NULL WHERE "customer_id" IS NOT NULL;
    ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_customer_id_users_id_fk";
    ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk"
      FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "orders" SET "customer_id" = NULL WHERE "customer_id" IS NOT NULL;
    ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_customer_id_customers_id_fk";
    ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk"
      FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "customers" DROP COLUMN IF EXISTS "lifecycle_status";
    ALTER TABLE "customers" DROP COLUMN IF EXISTS "source";

    DROP TYPE IF EXISTS "public"."enum_customers_lifecycle_status";
    DROP TYPE IF EXISTS "public"."enum_customers_source";
  `)
}
