import { sql } from 'drizzle-orm'

type MigrationDB = {
  execute?: (query: unknown) => Promise<unknown>
  run?: (query: unknown) => Promise<unknown>
}

type MigrationArgs = {
  db: MigrationDB
}

const postgresUpStatements = [
  'ALTER TYPE "enum_orders_fulfillment_shipping_method" ADD VALUE IF NOT EXISTS \'media_mail\';',
  'ALTER TABLE "orders" ADD COLUMN "payment_provider" text;',
  'ALTER TABLE "orders" ADD COLUMN "payment_provider_payment_id" text;',
  'ALTER TABLE "orders" ADD COLUMN "payment_provider_customer_id" text;',
  'ALTER TABLE "orders" ADD COLUMN "fulfillment_shipping_service" text;',
  'ALTER TABLE "orders" ADD COLUMN "fulfillment_shipping_rate_id" text;',
  'ALTER TABLE "orders" ADD COLUMN "fulfillment_quote_source" text;',
]

const postgresDownStatements = [
  'ALTER TABLE "orders" DROP COLUMN "fulfillment_quote_source";',
  'ALTER TABLE "orders" DROP COLUMN "fulfillment_shipping_rate_id";',
  'ALTER TABLE "orders" DROP COLUMN "fulfillment_shipping_service";',
  'ALTER TABLE "orders" DROP COLUMN "payment_provider_customer_id";',
  'ALTER TABLE "orders" DROP COLUMN "payment_provider_payment_id";',
  'ALTER TABLE "orders" DROP COLUMN "payment_provider";',
]

const sqliteUpStatements = [
  'ALTER TABLE `orders` ADD `payment_provider` text;',
  'ALTER TABLE `orders` ADD `payment_provider_payment_id` text;',
  'ALTER TABLE `orders` ADD `payment_provider_customer_id` text;',
  'ALTER TABLE `orders` ADD `fulfillment_shipping_service` text;',
  'ALTER TABLE `orders` ADD `fulfillment_shipping_rate_id` text;',
  'ALTER TABLE `orders` ADD `fulfillment_quote_source` text;',
]

const sqliteDownStatements = [
  'ALTER TABLE `orders` DROP COLUMN `fulfillment_quote_source`;',
  'ALTER TABLE `orders` DROP COLUMN `fulfillment_shipping_rate_id`;',
  'ALTER TABLE `orders` DROP COLUMN `fulfillment_shipping_service`;',
  'ALTER TABLE `orders` DROP COLUMN `payment_provider_customer_id`;',
  'ALTER TABLE `orders` DROP COLUMN `payment_provider_payment_id`;',
  'ALTER TABLE `orders` DROP COLUMN `payment_provider`;',
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
