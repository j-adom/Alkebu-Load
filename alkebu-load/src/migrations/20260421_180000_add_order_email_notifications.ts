import { sql } from 'drizzle-orm'

type MigrationDB = {
  execute?: (query: unknown) => Promise<unknown>
  run?: (query: unknown) => Promise<unknown>
}

type MigrationArgs = {
  db: MigrationDB
}

const postgresUpStatements = [
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_customer_confirmation_status" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_customer_confirmation_recipient" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_customer_confirmation_provider" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_customer_confirmation_sent_at" timestamp(3) with time zone;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_customer_confirmation_error" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_staff_notification_status" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_staff_notification_recipient" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_staff_notification_provider" text;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_staff_notification_sent_at" timestamp(3) with time zone;',
  'ALTER TABLE "orders" ADD COLUMN "email_notifications_staff_notification_error" text;',
]

const postgresDownStatements = [
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_staff_notification_error";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_staff_notification_sent_at";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_staff_notification_provider";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_staff_notification_recipient";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_staff_notification_status";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_customer_confirmation_error";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_customer_confirmation_sent_at";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_customer_confirmation_provider";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_customer_confirmation_recipient";',
  'ALTER TABLE "orders" DROP COLUMN "email_notifications_customer_confirmation_status";',
]

const sqliteUpStatements = [
  'ALTER TABLE `orders` ADD `email_notifications_customer_confirmation_status` text;',
  'ALTER TABLE `orders` ADD `email_notifications_customer_confirmation_recipient` text;',
  'ALTER TABLE `orders` ADD `email_notifications_customer_confirmation_provider` text;',
  'ALTER TABLE `orders` ADD `email_notifications_customer_confirmation_sent_at` text;',
  'ALTER TABLE `orders` ADD `email_notifications_customer_confirmation_error` text;',
  'ALTER TABLE `orders` ADD `email_notifications_staff_notification_status` text;',
  'ALTER TABLE `orders` ADD `email_notifications_staff_notification_recipient` text;',
  'ALTER TABLE `orders` ADD `email_notifications_staff_notification_provider` text;',
  'ALTER TABLE `orders` ADD `email_notifications_staff_notification_sent_at` text;',
  'ALTER TABLE `orders` ADD `email_notifications_staff_notification_error` text;',
]

const sqliteDownStatements = [
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_staff_notification_error`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_staff_notification_sent_at`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_staff_notification_provider`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_staff_notification_recipient`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_staff_notification_status`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_customer_confirmation_error`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_customer_confirmation_sent_at`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_customer_confirmation_provider`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_customer_confirmation_recipient`;',
  'ALTER TABLE `orders` DROP COLUMN `email_notifications_customer_confirmation_status`;',
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
