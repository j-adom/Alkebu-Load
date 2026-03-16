import { sql } from 'drizzle-orm';
import {
  DISCONTINUED_BOOK_ISBNS,
  REQUEST_ONLY_BOOK_ISBNS,
} from '../app/utils/bookAvailabilityExceptions';

type MigrationDB = {
  execute?: (query: unknown) => Promise<unknown>;
  run?: (query: unknown) => Promise<unknown>;
};

type MigrationArgs = {
  db: MigrationDB;
};

const quoteValues = (values: readonly string[], quoteChar: "'" | '"' = "'") =>
  values.map((value) => `${quoteChar}${value.replaceAll(quoteChar, `${quoteChar}${quoteChar}`)}${quoteChar}`).join(', ');

const buildPostgresStatusUpdate = (status: 'request-only' | 'discontinued', isbns: readonly string[]) => {
  if (isbns.length === 0) return null;

  const isbnList = quoteValues(isbns);

  return `
    UPDATE "books" AS b
    SET "availability_status" = '${status}'
    WHERE b."id" IN (
      SELECT DISTINCT e."_parent_id"
      FROM "books_editions" AS e
      WHERE e."isbn" IN (${isbnList})
         OR e."isbn10" IN (${isbnList})
    );
  `;
};

const buildSqliteStatusUpdate = (status: 'request-only' | 'discontinued', isbns: readonly string[]) => {
  if (isbns.length === 0) return null;

  const isbnList = quoteValues(isbns);

  return `
    UPDATE \`books\`
    SET \`availability_status\` = '${status}'
    WHERE \`id\` IN (
      SELECT DISTINCT \`_parent_id\`
      FROM \`books_editions\`
      WHERE \`isbn\` IN (${isbnList})
         OR \`isbn10\` IN (${isbnList})
    );
  `;
};

const postgresUpStatements = [
  'ALTER TABLE "books" ADD COLUMN "availability_status" text DEFAULT \'available\' NOT NULL;',
  'CREATE INDEX "books_availability_status_idx" ON "books" ("availability_status");',
  'UPDATE "books" SET "availability_status" = \'available\' WHERE "availability_status" IS NULL;',
  buildPostgresStatusUpdate('request-only', REQUEST_ONLY_BOOK_ISBNS),
  buildPostgresStatusUpdate('discontinued', DISCONTINUED_BOOK_ISBNS),
].filter(Boolean) as string[];

const postgresDownStatements = [
  'DROP INDEX IF EXISTS "books_availability_status_idx";',
  'ALTER TABLE "books" DROP COLUMN "availability_status";',
];

const sqliteUpStatements = [
  'ALTER TABLE `books` ADD `availability_status` text DEFAULT \'available\' NOT NULL;',
  'CREATE INDEX `books_availability_status_idx` ON `books` (`availability_status`);',
  'UPDATE `books` SET `availability_status` = \'available\' WHERE `availability_status` IS NULL;',
  buildSqliteStatusUpdate('request-only', REQUEST_ONLY_BOOK_ISBNS),
  buildSqliteStatusUpdate('discontinued', DISCONTINUED_BOOK_ISBNS),
].filter(Boolean) as string[];

const sqliteDownStatements = [
  'DROP INDEX IF EXISTS `books_availability_status_idx`;',
  'ALTER TABLE `books` DROP COLUMN `availability_status`;',
];

async function runStatements(db: MigrationDB, statements: string[]): Promise<void> {
  for (const statement of statements) {
    const query = sql.raw(statement);

    if (typeof db.execute === 'function') {
      await db.execute(query);
      continue;
    }

    if (typeof db.run === 'function') {
      await db.run(query);
      continue;
    }

    throw new Error('Unsupported migration database client');
  }
}

function isPostgres(db: MigrationDB): boolean {
  return typeof db.execute === 'function';
}

export async function up({ db }: MigrationArgs): Promise<void> {
  await runStatements(db, isPostgres(db) ? postgresUpStatements : sqliteUpStatements);
}

export async function down({ db }: MigrationArgs): Promise<void> {
  await runStatements(db, isPostgres(db) ? postgresDownStatements : sqliteDownStatements);
}
