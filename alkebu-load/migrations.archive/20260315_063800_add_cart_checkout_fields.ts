import { sql } from 'drizzle-orm'

type MigrationDB = {
  execute?: (query: unknown) => Promise<unknown>
  run?: (query: unknown) => Promise<unknown>
}

type MigrationArgs = {
  db: MigrationDB
}

const postgresUpStatements = [
  'ALTER TABLE "carts" ADD COLUMN "shipping_amount" numeric;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_address_first_name" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_address_last_name" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_address_company" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_address_street2" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_address_phone" text;',
  'ALTER TABLE "carts" ADD COLUMN "selected_shipping_rate_id" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_carrier" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_service" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_method" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_quote_source" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_quote_expires_at" timestamp with time zone;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_quote_fingerprint" text;',
  'ALTER TABLE "carts" ADD COLUMN "shipping_estimated_days" numeric;',
  'ALTER TABLE "carts" ADD COLUMN "provider" text;',
  'ALTER TABLE "carts" ADD COLUMN "provider_payment_id" text;',
  'ALTER TABLE "carts" ADD COLUMN "provider_order_id" text;',
]

const postgresDownStatements = [
  'ALTER TABLE "carts" DROP COLUMN "provider_order_id";',
  'ALTER TABLE "carts" DROP COLUMN "provider_payment_id";',
  'ALTER TABLE "carts" DROP COLUMN "provider";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_estimated_days";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_quote_fingerprint";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_quote_expires_at";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_quote_source";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_method";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_service";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_carrier";',
  'ALTER TABLE "carts" DROP COLUMN "selected_shipping_rate_id";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_address_phone";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_address_street2";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_address_company";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_address_last_name";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_address_first_name";',
  'ALTER TABLE "carts" DROP COLUMN "shipping_amount";',
]

const sqliteUpStatements = [
  'ALTER TABLE `carts` ADD `shipping_amount` numeric;',
  'ALTER TABLE `carts` ADD `shipping_address_first_name` text;',
  'ALTER TABLE `carts` ADD `shipping_address_last_name` text;',
  'ALTER TABLE `carts` ADD `shipping_address_company` text;',
  'ALTER TABLE `carts` ADD `shipping_address_street2` text;',
  'ALTER TABLE `carts` ADD `shipping_address_phone` text;',
  'ALTER TABLE `carts` ADD `selected_shipping_rate_id` text;',
  'ALTER TABLE `carts` ADD `shipping_carrier` text;',
  'ALTER TABLE `carts` ADD `shipping_service` text;',
  'ALTER TABLE `carts` ADD `shipping_method` text;',
  'ALTER TABLE `carts` ADD `shipping_quote_source` text;',
  'ALTER TABLE `carts` ADD `shipping_quote_expires_at` text;',
  'ALTER TABLE `carts` ADD `shipping_quote_fingerprint` text;',
  'ALTER TABLE `carts` ADD `shipping_estimated_days` numeric;',
  'ALTER TABLE `carts` ADD `provider` text;',
  'ALTER TABLE `carts` ADD `provider_payment_id` text;',
  'ALTER TABLE `carts` ADD `provider_order_id` text;',
]

const sqliteDownStatements = [
  'ALTER TABLE `carts` DROP COLUMN `provider_order_id`;',
  'ALTER TABLE `carts` DROP COLUMN `provider_payment_id`;',
  'ALTER TABLE `carts` DROP COLUMN `provider`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_estimated_days`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_quote_fingerprint`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_quote_expires_at`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_quote_source`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_method`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_service`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_carrier`;',
  'ALTER TABLE `carts` DROP COLUMN `selected_shipping_rate_id`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_address_phone`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_address_street2`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_address_company`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_address_last_name`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_address_first_name`;',
  'ALTER TABLE `carts` DROP COLUMN `shipping_amount`;',
]

async function runStatements(db: MigrationDB, statements: string[]): Promise<void> {
  for (const statement of statements) {
    const query = sql.raw(statement)

    if (typeof db.execute === 'function') {
      await db.execute(query)
      continue
    }

    if (typeof db.run === 'function') {
      await db.run(query)
      continue
    }

    throw new Error('Unsupported migration database client')
  }
}

function isPostgres(db: MigrationDB): boolean {
  return typeof db.execute === 'function'
}

export async function up({ db }: MigrationArgs): Promise<void> {
  await runStatements(db, isPostgres(db) ? postgresUpStatements : sqliteUpStatements)
}

export async function down({ db }: MigrationArgs): Promise<void> {
  await runStatements(db, isPostgres(db) ? postgresDownStatements : sqliteDownStatements)
}
