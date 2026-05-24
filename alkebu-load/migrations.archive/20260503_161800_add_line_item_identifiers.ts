import { sql } from 'drizzle-orm'

type MigrationDB = {
  execute?: (query: unknown) => Promise<unknown>
  run?: (query: unknown) => Promise<unknown>
}

type MigrationArgs = {
  db: MigrationDB
}

const identifierColumns = [
  'identifiers_isbn',
  'identifiers_isbn10',
  'identifiers_gtin',
  'identifiers_sku',
  'identifiers_square_variation_id',
  'identifiers_stripe_price_id',
  'identifiers_edition',
  'identifiers_publisher',
  'identifiers_published_date',
]

const postgresUpStatements = [
  ...identifierColumns.map((column) => (
    column === 'identifiers_published_date'
      ? `ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "${column}" timestamp(3) with time zone;`
      : `ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "${column}" text;`
  )),
  ...identifierColumns.map((column) => (
    column === 'identifiers_published_date'
      ? `ALTER TABLE "orders_items" ADD COLUMN IF NOT EXISTS "${column}" timestamp(3) with time zone;`
      : `ALTER TABLE "orders_items" ADD COLUMN IF NOT EXISTS "${column}" text;`
  )),
]

const postgresDownStatements = [
  ...identifierColumns.map((column) => `ALTER TABLE "orders_items" DROP COLUMN IF EXISTS "${column}";`),
  ...identifierColumns.map((column) => `ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "${column}";`),
]

const sqliteUpStatements = [
  ...identifierColumns.map((column) => `ALTER TABLE \`cart_items\` ADD \`${column}\` text;`),
  ...identifierColumns.map((column) => `ALTER TABLE \`orders_items\` ADD \`${column}\` text;`),
]

const sqliteDownStatements = [
  ...identifierColumns.map((column) => `ALTER TABLE \`orders_items\` DROP COLUMN \`${column}\`;`),
  ...identifierColumns.map((column) => `ALTER TABLE \`cart_items\` DROP COLUMN \`${column}\`;`),
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
