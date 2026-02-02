import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`fashion_jewelry_scraped_image_urls\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_scraped_image_urls_order_idx\` ON \`fashion_jewelry_scraped_image_urls\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_scraped_image_urls_parent_id_idx\` ON \`fashion_jewelry_scraped_image_urls\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`carts_id\` integer,
  	\`cart_items_id\` integer,
  	\`orders_id\` integer,
  	\`customers_id\` integer,
  	\`institutional_accounts_id\` integer,
  	\`authors_id\` integer,
  	\`publishers_id\` integer,
  	\`vendors_id\` integer,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	\`blog_posts_id\` integer,
  	\`events_id\` integer,
  	\`businesses_id\` integer,
  	\`comments_id\` integer,
  	\`reviews_id\` integer,
  	\`search_analytics_id\` integer,
  	\`book_quotes_id\` integer,
  	\`external_books_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`carts_id\`) REFERENCES \`carts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`cart_items_id\`) REFERENCES \`cart_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`orders_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`institutional_accounts_id\`) REFERENCES \`institutional_accounts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`authors_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`publishers_id\`) REFERENCES \`publishers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`vendors_id\`) REFERENCES \`vendors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_posts_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`businesses_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`reviews_id\`) REFERENCES \`reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`search_analytics_id\`) REFERENCES \`search_analytics\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`book_quotes_id\`) REFERENCES \`book_quotes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`external_books_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "carts_id", "cart_items_id", "orders_id", "customers_id", "institutional_accounts_id", "authors_id", "publishers_id", "vendors_id", "books_id", "wellness_lifestyle_id", "fashion_jewelry_id", "oils_incense_id", "blog_posts_id", "events_id", "businesses_id", "comments_id", "reviews_id", "search_analytics_id", "book_quotes_id", "external_books_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "carts_id", "cart_items_id", "orders_id", "customers_id", "institutional_accounts_id", "authors_id", "publishers_id", "vendors_id", "books_id", "wellness_lifestyle_id", "fashion_jewelry_id", "oils_incense_id", "blog_posts_id", "events_id", "businesses_id", "comments_id", "reviews_id", "search_analytics_id", "book_quotes_id", "external_books_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_carts_id_idx\` ON \`payload_locked_documents_rels\` (\`carts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_cart_items_id_idx\` ON \`payload_locked_documents_rels\` (\`cart_items_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_orders_id_idx\` ON \`payload_locked_documents_rels\` (\`orders_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customers_id_idx\` ON \`payload_locked_documents_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_institutional_accounts_id_idx\` ON \`payload_locked_documents_rels\` (\`institutional_accounts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_authors_id_idx\` ON \`payload_locked_documents_rels\` (\`authors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_publishers_id_idx\` ON \`payload_locked_documents_rels\` (\`publishers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_vendors_id_idx\` ON \`payload_locked_documents_rels\` (\`vendors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_books_id_idx\` ON \`payload_locked_documents_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_wellness_lifestyle_id_idx\` ON \`payload_locked_documents_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_fashion_jewelry_id_idx\` ON \`payload_locked_documents_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_oils_incense_id_idx\` ON \`payload_locked_documents_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_posts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_businesses_id_idx\` ON \`payload_locked_documents_rels\` (\`businesses_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_reviews_id_idx\` ON \`payload_locked_documents_rels\` (\`reviews_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_search_analytics_id_idx\` ON \`payload_locked_documents_rels\` (\`search_analytics_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_book_quotes_id_idx\` ON \`payload_locked_documents_rels\` (\`book_quotes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_external_books_id_idx\` ON \`payload_locked_documents_rels\` (\`external_books_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text NOT NULL,
  	\`cloudflare_image_id\` text,
  	\`r2_object_key\` text,
  	\`dimensions_width\` numeric,
  	\`dimensions_height\` numeric,
  	\`file_size\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric
  );
  `)
  await db.run(sql`INSERT INTO \`__new_media\`("id", "alt", "cloudflare_image_id", "r2_object_key", "dimensions_width", "dimensions_height", "file_size", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y") SELECT "id", "alt", "cloudflare_image_id", "r2_object_key", "dimensions_width", "dimensions_height", "file_size", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y" FROM \`media\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`ALTER TABLE \`__new_media\` RENAME TO \`media\`;`)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`ALTER TABLE \`books\` ADD \`is_featured\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`books\` DROP COLUMN \`average_rating\`;`)
  await db.run(sql`ALTER TABLE \`books\` DROP COLUMN \`review_count\`;`)
  await db.run(sql`ALTER TABLE \`fashion_jewelry\` ADD \`slug\` text;`)
  await db.run(sql`ALTER TABLE \`fashion_jewelry\` ADD \`price\` numeric;`)
  await db.run(sql`CREATE UNIQUE INDEX \`fashion_jewelry_slug_idx\` ON \`fashion_jewelry\` (\`slug\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`fashion_jewelry_scraped_image_urls\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP INDEX \`fashion_jewelry_slug_idx\`;`)
  await db.run(sql`ALTER TABLE \`fashion_jewelry\` DROP COLUMN \`slug\`;`)
  await db.run(sql`ALTER TABLE \`fashion_jewelry\` DROP COLUMN \`price\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumbnail_url\` text,
  	\`sizes_thumbnail_width\` numeric,
  	\`sizes_thumbnail_height\` numeric,
  	\`sizes_thumbnail_mime_type\` text,
  	\`sizes_thumbnail_filesize\` numeric,
  	\`sizes_thumbnail_filename\` text,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_media\`("id", "alt", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y", "sizes_thumbnail_url", "sizes_thumbnail_width", "sizes_thumbnail_height", "sizes_thumbnail_mime_type", "sizes_thumbnail_filesize", "sizes_thumbnail_filename", "sizes_card_url", "sizes_card_width", "sizes_card_height", "sizes_card_mime_type", "sizes_card_filesize", "sizes_card_filename") SELECT "id", "alt", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y", "sizes_thumbnail_url", "sizes_thumbnail_width", "sizes_thumbnail_height", "sizes_thumbnail_mime_type", "sizes_thumbnail_filesize", "sizes_thumbnail_filename", "sizes_card_url", "sizes_card_width", "sizes_card_height", "sizes_card_mime_type", "sizes_card_filesize", "sizes_card_filename" FROM \`media\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`ALTER TABLE \`__new_media\` RENAME TO \`media\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`media\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`ALTER TABLE \`books\` ADD \`average_rating\` numeric;`)
  await db.run(sql`ALTER TABLE \`books\` ADD \`review_count\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`books\` DROP COLUMN \`is_featured\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`payload_jobs_id\` integer REFERENCES payload_jobs(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_jobs_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_jobs_id\`);`)
}
