import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_shipping_addresses\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`is_default\` integer DEFAULT false,
  	\`first_name\` text,
  	\`last_name\` text,
  	\`street\` text,
  	\`apartment\` text,
  	\`city\` text,
  	\`state\` text,
  	\`zip\` text,
  	\`country\` text DEFAULT 'US',
  	\`phone\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_shipping_addresses_order_idx\` ON \`users_shipping_addresses\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_shipping_addresses_parent_id_idx\` ON \`users_shipping_addresses\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users_preferences_favorite_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_preferences_favorite_categories_order_idx\` ON \`users_preferences_favorite_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_preferences_favorite_categories_parent_idx\` ON \`users_preferences_favorite_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`first_name\` text,
  	\`last_name\` text,
  	\`phone\` text,
  	\`role\` text DEFAULT 'customer' NOT NULL,
  	\`email_verified\` integer DEFAULT false,
  	\`oauth_accounts_google_id\` text,
  	\`oauth_accounts_google_profile\` text,
  	\`oauth_accounts_facebook_id\` text,
  	\`oauth_accounts_facebook_profile\` text,
  	\`square_customer_id\` text,
  	\`square_loyalty_id\` text,
  	\`square_last_sync\` text,
  	\`loyalty_points\` numeric DEFAULT 0,
  	\`stats_total_spent\` numeric DEFAULT 0,
  	\`stats_order_count\` numeric DEFAULT 0,
  	\`stats_last_order_date\` text,
  	\`stats_average_order_value\` numeric DEFAULT 0,
  	\`tax_exempt\` integer DEFAULT false,
  	\`institution_id\` integer,
  	\`preferences_email_opt_in\` integer DEFAULT true,
  	\`preferences_sms_opt_in\` integer DEFAULT false,
  	\`source\` text DEFAULT 'online',
  	\`customer_notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`institution_id\`) REFERENCES \`institutional_accounts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`users_square_square_customer_id_idx\` ON \`users\` (\`square_customer_id\`);`)
  await db.run(sql`CREATE INDEX \`users_institution_idx\` ON \`users\` (\`institution_id\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`users_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`orders_id\` integer,
  	\`comments_id\` integer,
  	\`reviews_id\` integer,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`orders_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`reviews_id\`) REFERENCES \`reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_rels_order_idx\` ON \`users_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_parent_idx\` ON \`users_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_path_idx\` ON \`users_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_orders_id_idx\` ON \`users_rels\` (\`orders_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_comments_id_idx\` ON \`users_rels\` (\`comments_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_reviews_id_idx\` ON \`users_rels\` (\`reviews_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_books_id_idx\` ON \`users_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_wellness_lifestyle_id_idx\` ON \`users_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_fashion_jewelry_id_idx\` ON \`users_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_oils_incense_id_idx\` ON \`users_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
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
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`media\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE TABLE \`carts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer,
  	\`session_id\` text NOT NULL,
  	\`status\` text DEFAULT 'active' NOT NULL,
  	\`total_amount\` numeric,
  	\`total_tax\` numeric,
  	\`shipping_address_street\` text,
  	\`shipping_address_city\` text,
  	\`shipping_address_state\` text,
  	\`shipping_address_zip\` text,
  	\`shipping_address_country\` text DEFAULT 'US',
  	\`tax_exempt\` integer DEFAULT false,
  	\`last_activity\` text,
  	\`abandoned_email_sent\` integer DEFAULT false,
  	\`abandoned_email_sent_at\` text,
  	\`guest_email\` text,
  	\`stripe_session_id\` text,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`carts_user_idx\` ON \`carts\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`carts_updated_at_idx\` ON \`carts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`carts_created_at_idx\` ON \`carts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`carts_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`cart_items_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`carts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`cart_items_id\`) REFERENCES \`cart_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`carts_rels_order_idx\` ON \`carts_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`carts_rels_parent_idx\` ON \`carts_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`carts_rels_path_idx\` ON \`carts_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`carts_rels_cart_items_id_idx\` ON \`carts_rels\` (\`cart_items_id\`);`)
  await db.run(sql`CREATE TABLE \`cart_items\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`cart_id\` integer NOT NULL,
  	\`product_type\` text NOT NULL,
  	\`product_title\` text NOT NULL,
  	\`quantity\` numeric DEFAULT 1 NOT NULL,
  	\`unit_price\` numeric NOT NULL,
  	\`total_price\` numeric NOT NULL,
  	\`discount_applied\` numeric,
  	\`stripe_price_id\` text,
  	\`customization_gift_wrap\` integer,
  	\`customization_gift_message\` text,
  	\`customization_personal_note\` text,
  	\`availability_in_stock\` integer DEFAULT true,
  	\`availability_stock_level\` numeric,
  	\`availability_estimated_ship_date\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`cart_id\`) REFERENCES \`carts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`cart_items_cart_idx\` ON \`cart_items\` (\`cart_id\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_updated_at_idx\` ON \`cart_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_created_at_idx\` ON \`cart_items\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`cart_items_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`cart_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cart_items_rels_order_idx\` ON \`cart_items_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_rels_parent_idx\` ON \`cart_items_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_rels_path_idx\` ON \`cart_items_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_rels_books_id_idx\` ON \`cart_items_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_rels_wellness_lifestyle_id_idx\` ON \`cart_items_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_rels_fashion_jewelry_id_idx\` ON \`cart_items_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`cart_items_rels_oils_incense_id_idx\` ON \`cart_items_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE TABLE \`orders_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`product_type\` text NOT NULL,
  	\`product_title\` text NOT NULL,
  	\`quantity\` numeric NOT NULL,
  	\`unit_price\` numeric NOT NULL,
  	\`total_price\` numeric NOT NULL,
  	\`stripe_price_id\` text,
  	\`customization_gift_wrap\` integer,
  	\`customization_gift_message\` text,
  	\`customization_personal_note\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`orders_items_order_idx\` ON \`orders_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`orders_items_parent_id_idx\` ON \`orders_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`orders_refunds\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`amount\` numeric NOT NULL,
  	\`reason\` text NOT NULL,
  	\`stripe_refund_id\` text,
  	\`processed_at\` text,
  	\`processed_by_id\` integer,
  	FOREIGN KEY (\`processed_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`orders_refunds_order_idx\` ON \`orders_refunds\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`orders_refunds_parent_id_idx\` ON \`orders_refunds\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_refunds_processed_by_idx\` ON \`orders_refunds\` (\`processed_by_id\`);`)
  await db.run(sql`CREATE TABLE \`orders\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order_number\` text NOT NULL,
  	\`customer_id\` integer,
  	\`guest_email\` text,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`subtotal_amount\` numeric NOT NULL,
  	\`tax_amount\` numeric NOT NULL,
  	\`shipping_amount\` numeric DEFAULT 0,
  	\`total_amount\` numeric NOT NULL,
  	\`tax_rate\` numeric,
  	\`shipping_address_first_name\` text NOT NULL,
  	\`shipping_address_last_name\` text NOT NULL,
  	\`shipping_address_company\` text,
  	\`shipping_address_street\` text NOT NULL,
  	\`shipping_address_street2\` text,
  	\`shipping_address_city\` text NOT NULL,
  	\`shipping_address_state\` text NOT NULL,
  	\`shipping_address_zip\` text NOT NULL,
  	\`shipping_address_country\` text DEFAULT 'US',
  	\`shipping_address_phone\` text,
  	\`billing_address_same_as_shipping\` integer DEFAULT true,
  	\`billing_address_first_name\` text,
  	\`billing_address_last_name\` text,
  	\`billing_address_company\` text,
  	\`billing_address_street\` text,
  	\`billing_address_street2\` text,
  	\`billing_address_city\` text,
  	\`billing_address_state\` text,
  	\`billing_address_zip\` text,
  	\`billing_address_country\` text,
  	\`payment_stripe_payment_intent_id\` text,
  	\`payment_stripe_session_id\` text,
  	\`payment_payment_status\` text,
  	\`payment_payment_method\` text,
  	\`fulfillment_shipping_method\` text,
  	\`fulfillment_tracking_number\` text,
  	\`fulfillment_carrier\` text,
  	\`fulfillment_estimated_delivery\` text,
  	\`fulfillment_shipped_at\` text,
  	\`fulfillment_delivered_at\` text,
  	\`source\` text DEFAULT 'website' NOT NULL,
  	\`square_order_id\` text,
  	\`institutional_order_is_institutional\` integer DEFAULT false,
  	\`institutional_order_institution_id\` integer,
  	\`institutional_order_purchase_order_number\` text,
  	\`institutional_order_invoice_required\` integer,
  	\`customer_notes\` text,
  	\`internal_notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`institutional_order_institution_id\`) REFERENCES \`institutional_accounts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`orders_order_number_idx\` ON \`orders\` (\`order_number\`);`)
  await db.run(sql`CREATE INDEX \`orders_customer_idx\` ON \`orders\` (\`customer_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_institutional_order_institutional_order_instituti_idx\` ON \`orders\` (\`institutional_order_institution_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_updated_at_idx\` ON \`orders\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`orders_created_at_idx\` ON \`orders\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`orders_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`orders_rels_order_idx\` ON \`orders_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`orders_rels_parent_idx\` ON \`orders_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_rels_path_idx\` ON \`orders_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`orders_rels_books_id_idx\` ON \`orders_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_rels_wellness_lifestyle_id_idx\` ON \`orders_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_rels_fashion_jewelry_id_idx\` ON \`orders_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`orders_rels_oils_incense_id_idx\` ON \`orders_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE TABLE \`customers_shipping_addresses\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`is_default\` integer DEFAULT false,
  	\`first_name\` text NOT NULL,
  	\`last_name\` text NOT NULL,
  	\`company\` text,
  	\`street\` text NOT NULL,
  	\`street2\` text,
  	\`city\` text NOT NULL,
  	\`state\` text NOT NULL,
  	\`zip\` text NOT NULL,
  	\`country\` text DEFAULT 'US',
  	\`phone\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_shipping_addresses_order_idx\` ON \`customers_shipping_addresses\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`customers_shipping_addresses_parent_id_idx\` ON \`customers_shipping_addresses\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`customers_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_sessions_order_idx\` ON \`customers_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`customers_sessions_parent_id_idx\` ON \`customers_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`customers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`first_name\` text NOT NULL,
  	\`last_name\` text NOT NULL,
  	\`display_name\` text,
  	\`phone\` text,
  	\`date_of_birth\` text,
  	\`preferences_marketing_emails\` integer DEFAULT true,
  	\`preferences_newsletter_subscribed\` integer DEFAULT false,
  	\`preferences_sms_notifications\` integer DEFAULT false,
  	\`preferences_language\` text DEFAULT 'en',
  	\`loyalty_status_points\` numeric DEFAULT 0,
  	\`loyalty_status_tier\` text DEFAULT 'bronze',
  	\`loyalty_status_square_customer_id\` text,
  	\`account_status_is_active\` integer DEFAULT true,
  	\`account_status_tax_exempt\` integer DEFAULT false,
  	\`account_status_tax_exempt_number\` text,
  	\`account_status_institution_id\` integer,
  	\`order_history_total_orders\` numeric DEFAULT 0,
  	\`order_history_total_spent\` numeric DEFAULT 0,
  	\`order_history_first_order_date\` text,
  	\`order_history_last_order_date\` text,
  	\`order_history_average_order_value\` numeric,
  	\`social_auth_google_id\` text,
  	\`social_auth_facebook_id\` text,
  	\`social_auth_profile_image_id\` integer,
  	\`cart\` text,
  	\`wishlist\` text,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`_verified\` integer,
  	\`_verificationtoken\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`account_status_institution_id\`) REFERENCES \`institutional_accounts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`social_auth_profile_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_account_status_account_status_institution_idx\` ON \`customers\` (\`account_status_institution_id\`);`)
  await db.run(sql`CREATE INDEX \`customers_social_auth_social_auth_profile_image_idx\` ON \`customers\` (\`social_auth_profile_image_id\`);`)
  await db.run(sql`CREATE INDEX \`customers_updated_at_idx\` ON \`customers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`customers_created_at_idx\` ON \`customers\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`customers_email_idx\` ON \`customers\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`customers_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_rels_order_idx\` ON \`customers_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`customers_rels_parent_idx\` ON \`customers_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`customers_rels_path_idx\` ON \`customers_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`customers_rels_books_id_idx\` ON \`customers_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE TABLE \`institutional_accounts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`organization_name\` text NOT NULL,
  	\`type\` text NOT NULL,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`contact_info_primary_contact_first_name\` text NOT NULL,
  	\`contact_info_primary_contact_last_name\` text NOT NULL,
  	\`contact_info_primary_contact_title\` text,
  	\`contact_info_primary_contact_email\` text NOT NULL,
  	\`contact_info_primary_contact_phone\` text NOT NULL,
  	\`contact_info_billing_contact_same_as_primary\` integer DEFAULT true,
  	\`contact_info_billing_contact_first_name\` text,
  	\`contact_info_billing_contact_last_name\` text,
  	\`contact_info_billing_contact_title\` text,
  	\`contact_info_billing_contact_email\` text,
  	\`contact_info_billing_contact_phone\` text,
  	\`addresses_billing_street\` text NOT NULL,
  	\`addresses_billing_street2\` text,
  	\`addresses_billing_city\` text NOT NULL,
  	\`addresses_billing_state\` text NOT NULL,
  	\`addresses_billing_zip\` text NOT NULL,
  	\`addresses_billing_country\` text DEFAULT 'US',
  	\`addresses_shipping_same_as_billing\` integer DEFAULT true,
  	\`addresses_shipping_street\` text,
  	\`addresses_shipping_street2\` text,
  	\`addresses_shipping_city\` text,
  	\`addresses_shipping_state\` text,
  	\`addresses_shipping_zip\` text,
  	\`addresses_shipping_country\` text,
  	\`tax_info_tax_exempt\` integer DEFAULT false,
  	\`tax_info_tax_exempt_number\` text,
  	\`tax_info_exempt_certificate_file_id\` integer,
  	\`tax_info_exemption_valid_until\` text,
  	\`payment_terms_preferred_method\` text DEFAULT 'card',
  	\`payment_terms_net_terms\` text,
  	\`payment_terms_credit_limit\` numeric,
  	\`payment_terms_current_balance\` numeric DEFAULT 0,
  	\`discounting_discount_tier\` text DEFAULT 'none',
  	\`discounting_custom_discount_rate\` numeric,
  	\`discounting_minimum_order_for_discount\` numeric,
  	\`order_history_total_orders\` numeric DEFAULT 0,
  	\`order_history_total_spent\` numeric DEFAULT 0,
  	\`order_history_first_order_date\` text,
  	\`order_history_last_order_date\` text,
  	\`order_history_average_order_value\` numeric,
  	\`verification_business_license_id\` integer,
  	\`verification_verification_status\` text DEFAULT 'pending',
  	\`verification_verified_by_id\` integer,
  	\`verification_verified_at\` text,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`tax_info_exempt_certificate_file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`verification_business_license_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`verification_verified_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`institutional_accounts_tax_info_tax_info_exempt_certific_idx\` ON \`institutional_accounts\` (\`tax_info_exempt_certificate_file_id\`);`)
  await db.run(sql`CREATE INDEX \`institutional_accounts_verification_verification_busines_idx\` ON \`institutional_accounts\` (\`verification_business_license_id\`);`)
  await db.run(sql`CREATE INDEX \`institutional_accounts_verification_verification_verifie_idx\` ON \`institutional_accounts\` (\`verification_verified_by_id\`);`)
  await db.run(sql`CREATE INDEX \`institutional_accounts_updated_at_idx\` ON \`institutional_accounts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`institutional_accounts_created_at_idx\` ON \`institutional_accounts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`authors_genres\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`authors_genres_order_idx\` ON \`authors_genres\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`authors_genres_parent_idx\` ON \`authors_genres\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`authors_notable_works\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`year\` numeric,
  	\`description\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`authors_notable_works_order_idx\` ON \`authors_notable_works\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`authors_notable_works_parent_id_idx\` ON \`authors_notable_works\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`authors_awards\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`award\` text NOT NULL,
  	\`year\` numeric,
  	\`work\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`authors_awards_order_idx\` ON \`authors_awards\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`authors_awards_parent_id_idx\` ON \`authors_awards\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`authors\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text,
  	\`biography\` text,
  	\`birth_date\` text,
  	\`death_date\` text,
  	\`nationality\` text,
  	\`image_id\` integer,
  	\`website\` text,
  	\`social_media_twitter\` text,
  	\`social_media_instagram\` text,
  	\`social_media_facebook\` text,
  	\`social_media_goodreads\` text,
  	\`is_active\` integer DEFAULT true,
  	\`featured\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`authors_name_idx\` ON \`authors\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`authors_image_idx\` ON \`authors\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`authors_updated_at_idx\` ON \`authors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`authors_created_at_idx\` ON \`authors\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`authors_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`authors_rels_order_idx\` ON \`authors_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`authors_rels_parent_idx\` ON \`authors_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`authors_rels_path_idx\` ON \`authors_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`authors_rels_books_id_idx\` ON \`authors_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE TABLE \`publishers_specialties\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`publishers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`publishers_specialties_order_idx\` ON \`publishers_specialties\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`publishers_specialties_parent_idx\` ON \`publishers_specialties\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`publishers_notable_authors\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`author_id\` integer,
  	\`note\` text,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`publishers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`publishers_notable_authors_order_idx\` ON \`publishers_notable_authors\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`publishers_notable_authors_parent_id_idx\` ON \`publishers_notable_authors\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`publishers_notable_authors_author_idx\` ON \`publishers_notable_authors\` (\`author_id\`);`)
  await db.run(sql`CREATE TABLE \`publishers_awards\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`award\` text NOT NULL,
  	\`year\` numeric,
  	\`description\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`publishers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`publishers_awards_order_idx\` ON \`publishers_awards\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`publishers_awards_parent_id_idx\` ON \`publishers_awards\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`publishers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text,
  	\`type\` text,
  	\`founded_year\` numeric,
  	\`location_city\` text,
  	\`location_state\` text,
  	\`location_country\` text DEFAULT 'United States',
  	\`contact_website\` text,
  	\`contact_email\` text,
  	\`contact_phone\` text,
  	\`description\` text,
  	\`logo_id\` integer,
  	\`social_media_twitter\` text,
  	\`social_media_instagram\` text,
  	\`social_media_facebook\` text,
  	\`social_media_linkedin\` text,
  	\`is_active\` integer DEFAULT true,
  	\`book_count\` numeric,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`publishers_name_idx\` ON \`publishers\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`publishers_logo_idx\` ON \`publishers\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`publishers_updated_at_idx\` ON \`publishers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`publishers_created_at_idx\` ON \`publishers\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`vendors_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`vendors\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`vendors_categories_order_idx\` ON \`vendors_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`vendors_categories_parent_idx\` ON \`vendors_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`vendors\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text,
  	\`type\` text,
  	\`contact_email\` text,
  	\`contact_phone\` text,
  	\`contact_website\` text,
  	\`contact_contact_person\` text,
  	\`address_street\` text,
  	\`address_city\` text,
  	\`address_state\` text,
  	\`address_postal_code\` text,
  	\`address_country\` text DEFAULT 'United States',
  	\`terms_payment_terms\` text,
  	\`terms_minimum_order\` numeric,
  	\`terms_shipping_terms\` text,
  	\`terms_lead_time\` text,
  	\`metrics_rating\` numeric,
  	\`metrics_on_time_delivery\` numeric,
  	\`metrics_quality_rating\` numeric,
  	\`notes\` text,
  	\`is_active\` integer DEFAULT true,
  	\`is_primary\` integer DEFAULT false,
  	\`product_count\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`vendors_name_idx\` ON \`vendors\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`vendors_updated_at_idx\` ON \`vendors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`vendors_created_at_idx\` ON \`vendors\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`books_authors_text\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_authors_text_order_idx\` ON \`books_authors_text\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_authors_text_parent_id_idx\` ON \`books_authors_text\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_editions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`isbn\` text NOT NULL,
  	\`isbn10\` text,
  	\`publisher_id\` integer,
  	\`publisher_text\` text,
  	\`date_published\` text,
  	\`binding\` text,
  	\`edition\` text,
  	\`pages\` numeric,
  	\`language\` text DEFAULT 'en',
  	\`dimensions\` text,
  	\`square_variation_id\` text,
  	\`stripe_price_id\` text,
  	\`pricing_retail_price\` numeric,
  	\`pricing_wholesale_price\` numeric,
  	\`pricing_shipping_weight\` numeric,
  	\`inventory_stock_level\` numeric DEFAULT 0,
  	\`inventory_allow_backorders\` integer DEFAULT false,
  	\`is_available\` integer DEFAULT true,
  	FOREIGN KEY (\`publisher_id\`) REFERENCES \`publishers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_editions_order_idx\` ON \`books_editions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_editions_parent_id_idx\` ON \`books_editions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`books_editions_publisher_idx\` ON \`books_editions\` (\`publisher_id\`);`)
  await db.run(sql`CREATE TABLE \`books_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_categories_order_idx\` ON \`books_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`books_categories_parent_idx\` ON \`books_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_raw_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`category\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_raw_categories_order_idx\` ON \`books_raw_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_raw_categories_parent_id_idx\` ON \`books_raw_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_subjects\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`subject\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_subjects_order_idx\` ON \`books_subjects\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_subjects_parent_id_idx\` ON \`books_subjects\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_dewey_decimal\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`code\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_dewey_decimal_order_idx\` ON \`books_dewey_decimal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_dewey_decimal_parent_id_idx\` ON \`books_dewey_decimal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_tags_order_idx\` ON \`books_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_tags_parent_id_idx\` ON \`books_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_collections\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`collection_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_collections_order_idx\` ON \`books_collections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_collections_parent_id_idx\` ON \`books_collections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`is_primary\` integer DEFAULT false,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_images_order_idx\` ON \`books_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_images_parent_id_idx\` ON \`books_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`books_images_image_idx\` ON \`books_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`books_scraped_image_urls\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_scraped_image_urls_order_idx\` ON \`books_scraped_image_urls\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_scraped_image_urls_parent_id_idx\` ON \`books_scraped_image_urls\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books_reviews\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`review\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_reviews_order_idx\` ON \`books_reviews\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`books_reviews_parent_id_idx\` ON \`books_reviews\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`books\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`title_long\` text,
  	\`publisher_id\` integer,
  	\`publisher_text\` text,
  	\`vendor_id\` integer,
  	\`description\` text,
  	\`synopsis\` text,
  	\`excerpt\` text,
  	\`average_rating\` numeric,
  	\`review_count\` numeric DEFAULT 0,
  	\`square_item_id\` text,
  	\`import_source\` text,
  	\`import_date\` text,
  	\`last_updated\` text,
  	\`is_active\` integer DEFAULT true,
  	\`pricing_retail_price\` numeric NOT NULL,
  	\`pricing_wholesale_price\` numeric,
  	\`pricing_compare_at_price\` numeric,
  	\`pricing_tax_code\` text DEFAULT 'books_tax_free',
  	\`pricing_requires_shipping\` integer DEFAULT true,
  	\`pricing_shipping_weight\` numeric,
  	\`inventory_track_quantity\` integer DEFAULT true,
  	\`inventory_stock_level\` numeric DEFAULT 0,
  	\`inventory_low_stock_threshold\` numeric DEFAULT 5,
  	\`inventory_allow_backorders\` integer DEFAULT false,
  	\`inventory_location\` text DEFAULT 'main_store',
  	\`inventory_is_consignment\` integer DEFAULT false,
  	\`inventory_date_added\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`publisher_id\`) REFERENCES \`publishers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`books_publisher_idx\` ON \`books\` (\`publisher_id\`);`)
  await db.run(sql`CREATE INDEX \`books_vendor_idx\` ON \`books\` (\`vendor_id\`);`)
  await db.run(sql`CREATE INDEX \`books_updated_at_idx\` ON \`books\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`books_created_at_idx\` ON \`books\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`books_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`authors_id\` integer,
  	\`books_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`authors_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`books_rels_order_idx\` ON \`books_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`books_rels_parent_idx\` ON \`books_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`books_rels_path_idx\` ON \`books_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`books_rels_authors_id_idx\` ON \`books_rels\` (\`authors_id\`);`)
  await db.run(sql`CREATE INDEX \`books_rels_books_id_idx\` ON \`books_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_ingredients\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`ingredient\` text NOT NULL,
  	\`percentage\` numeric,
  	\`purpose\` text,
  	\`is_organic\` integer DEFAULT false,
  	\`origin\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_ingredients_order_idx\` ON \`wellness_lifestyle_ingredients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_ingredients_parent_id_idx\` ON \`wellness_lifestyle_ingredients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_scent_profile_scent_family\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_scent_profile_scent_family_order_idx\` ON \`wellness_lifestyle_scent_profile_scent_family\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_scent_profile_scent_family_parent_idx\` ON \`wellness_lifestyle_scent_profile_scent_family\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_scent_profile_scent_notes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`note\` text,
  	\`scent\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_scent_profile_scent_notes_order_idx\` ON \`wellness_lifestyle_scent_profile_scent_notes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_scent_profile_scent_notes_parent_id_idx\` ON \`wellness_lifestyle_scent_profile_scent_notes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_uses\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_uses_order_idx\` ON \`wellness_lifestyle_uses\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_uses_parent_idx\` ON \`wellness_lifestyle_uses\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_benefits\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`benefit\` text NOT NULL,
  	\`description\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_benefits_order_idx\` ON \`wellness_lifestyle_benefits\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_benefits_parent_id_idx\` ON \`wellness_lifestyle_benefits\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_variations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`sku\` text NOT NULL,
  	\`size_volume\` numeric,
  	\`size_unit\` text,
  	\`packaging\` text,
  	\`concentration\` text,
  	\`scent\` text,
  	\`color\` text,
  	\`square_variation_id\` text,
  	\`square_item_id\` text,
  	\`medusa_variant_id\` text,
  	\`is_available\` integer DEFAULT true,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_variations_order_idx\` ON \`wellness_lifestyle_variations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_variations_parent_id_idx\` ON \`wellness_lifestyle_variations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_certifications\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_certifications_order_idx\` ON \`wellness_lifestyle_certifications\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_certifications_parent_idx\` ON \`wellness_lifestyle_certifications\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_sage_blend\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`ingredient\` text,
  	\`custom_ingredient\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_sage_blend_order_idx\` ON \`wellness_lifestyle_sage_blend\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_sage_blend_parent_id_idx\` ON \`wellness_lifestyle_sage_blend\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_categories_order_idx\` ON \`wellness_lifestyle_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_categories_parent_idx\` ON \`wellness_lifestyle_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_tags_order_idx\` ON \`wellness_lifestyle_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_tags_parent_id_idx\` ON \`wellness_lifestyle_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_collections\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`collection_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_collections_order_idx\` ON \`wellness_lifestyle_collections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_collections_parent_id_idx\` ON \`wellness_lifestyle_collections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_target_audience\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_target_audience_order_idx\` ON \`wellness_lifestyle_target_audience\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_target_audience_parent_idx\` ON \`wellness_lifestyle_target_audience\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`is_primary\` integer DEFAULT false,
  	\`shows_variation\` text,
  	\`image_type\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_images_order_idx\` ON \`wellness_lifestyle_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_images_parent_id_idx\` ON \`wellness_lifestyle_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_images_image_idx\` ON \`wellness_lifestyle_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`product_type\` text NOT NULL,
  	\`description\` text,
  	\`short_description\` text,
  	\`brand\` text,
  	\`vendor_id\` integer,
  	\`primary_ingredient\` text NOT NULL,
  	\`scent_profile_scent_strength\` text,
  	\`origin_country\` text,
  	\`origin_region\` text,
  	\`origin_cultural_background\` text,
  	\`safety_information\` text,
  	\`usage_instructions\` text,
  	\`storage_instructions\` text,
  	\`shelf_life\` text,
  	\`square_item_id\` text,
  	\`import_source\` text,
  	\`import_date\` text,
  	\`last_updated\` text,
  	\`average_rating\` numeric,
  	\`review_count\` numeric DEFAULT 0,
  	\`is_active\` integer DEFAULT true,
  	\`is_featured\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_vendor_idx\` ON \`wellness_lifestyle\` (\`vendor_id\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_updated_at_idx\` ON \`wellness_lifestyle\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_created_at_idx\` ON \`wellness_lifestyle\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`wellness_lifestyle_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`books_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_rels_order_idx\` ON \`wellness_lifestyle_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_rels_parent_idx\` ON \`wellness_lifestyle_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_rels_path_idx\` ON \`wellness_lifestyle_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_rels_wellness_lifestyle_id_idx\` ON \`wellness_lifestyle_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_rels_fashion_jewelry_id_idx\` ON \`wellness_lifestyle_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`wellness_lifestyle_rels_books_id_idx\` ON \`wellness_lifestyle_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_available_product_types\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_available_product_types_order_idx\` ON \`fashion_jewelry_available_product_types\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_available_product_types_parent_idx\` ON \`fashion_jewelry_available_product_types\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_available_colors\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`color_name\` text NOT NULL,
  	\`color_code\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_available_colors_order_idx\` ON \`fashion_jewelry_available_colors\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_available_colors_parent_id_idx\` ON \`fashion_jewelry_available_colors\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_available_sizes\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_available_sizes_order_idx\` ON \`fashion_jewelry_available_sizes\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_available_sizes_parent_idx\` ON \`fashion_jewelry_available_sizes\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_materials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`material\` text,
  	\`custom_material\` text,
  	\`percentage\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_materials_order_idx\` ON \`fashion_jewelry_materials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_materials_parent_id_idx\` ON \`fashion_jewelry_materials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_crystals\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`crystal\` text,
  	\`properties\` text,
  	\`chakra\` text,
  	\`origin\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_crystals_order_idx\` ON \`fashion_jewelry_crystals\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_crystals_parent_id_idx\` ON \`fashion_jewelry_crystals\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_print_details_print_location\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_print_details_print_location_order_idx\` ON \`fashion_jewelry_print_details_print_location\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_print_details_print_location_parent_idx\` ON \`fashion_jewelry_print_details_print_location\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_print_details_print_colors\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`color\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_print_details_print_colors_order_idx\` ON \`fashion_jewelry_print_details_print_colors\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_print_details_print_colors_parent_id_idx\` ON \`fashion_jewelry_print_details_print_colors\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_variations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`sku\` text NOT NULL,
  	\`product_type\` text NOT NULL,
  	\`size\` text NOT NULL,
  	\`color\` text NOT NULL,
  	\`material_variation\` text,
  	\`crystal_variation\` text,
  	\`custom_variation_name\` text,
  	\`square_variation_id\` text,
  	\`square_item_id\` text,
  	\`medusa_variant_id\` text,
  	\`is_available\` integer DEFAULT true,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_variations_order_idx\` ON \`fashion_jewelry_variations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_variations_parent_id_idx\` ON \`fashion_jewelry_variations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_categories_order_idx\` ON \`fashion_jewelry_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_categories_parent_idx\` ON \`fashion_jewelry_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_tags_order_idx\` ON \`fashion_jewelry_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_tags_parent_id_idx\` ON \`fashion_jewelry_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_collections\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`collection_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_collections_order_idx\` ON \`fashion_jewelry_collections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_collections_parent_id_idx\` ON \`fashion_jewelry_collections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_target_audience\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_target_audience_order_idx\` ON \`fashion_jewelry_target_audience\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_target_audience_parent_idx\` ON \`fashion_jewelry_target_audience\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`is_primary\` integer DEFAULT false,
  	\`shows_variation\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_images_order_idx\` ON \`fashion_jewelry_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_images_parent_id_idx\` ON \`fashion_jewelry_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_images_image_idx\` ON \`fashion_jewelry_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`primary_type\` text NOT NULL,
  	\`style\` text,
  	\`description\` text,
  	\`short_description\` text,
  	\`vendor_id\` integer,
  	\`print_details_message\` text,
  	\`african_print_details_print_name\` text,
  	\`african_print_details_origin\` text,
  	\`african_print_details_cultural_significance\` text,
  	\`african_print_details_traditional_use\` text,
  	\`jewelry_details_is_handmade\` integer DEFAULT true,
  	\`jewelry_details_is_one_off\` integer DEFAULT false,
  	\`jewelry_details_artisan\` text,
  	\`jewelry_details_length\` text,
  	\`jewelry_details_weight\` text,
  	\`jewelry_details_chain_type\` text,
  	\`jewelry_details_clasp_type\` text,
  	\`care_instructions\` text,
  	\`sizing_notes\` text,
  	\`brand\` text,
  	\`square_item_id\` text,
  	\`import_source\` text,
  	\`import_date\` text,
  	\`last_updated\` text,
  	\`average_rating\` numeric,
  	\`review_count\` numeric DEFAULT 0,
  	\`is_active\` integer DEFAULT true,
  	\`is_featured\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_vendor_idx\` ON \`fashion_jewelry\` (\`vendor_id\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_updated_at_idx\` ON \`fashion_jewelry\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_created_at_idx\` ON \`fashion_jewelry\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`fashion_jewelry_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`fashion_jewelry_id\` integer,
  	\`books_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_rels_order_idx\` ON \`fashion_jewelry_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_rels_parent_idx\` ON \`fashion_jewelry_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_rels_path_idx\` ON \`fashion_jewelry_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_rels_fashion_jewelry_id_idx\` ON \`fashion_jewelry_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`fashion_jewelry_rels_books_id_idx\` ON \`fashion_jewelry_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_variations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`sku\` text NOT NULL,
  	\`size\` text NOT NULL,
  	\`packaging\` text,
  	\`square_variation_id\` text,
  	\`medusa_variant_id\` text,
  	\`is_available\` integer DEFAULT true,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_variations_order_idx\` ON \`oils_incense_variations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_variations_parent_id_idx\` ON \`oils_incense_variations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_sage_blend\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`ingredient\` text,
  	\`custom_ingredient\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_sage_blend_order_idx\` ON \`oils_incense_sage_blend\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_sage_blend_parent_id_idx\` ON \`oils_incense_sage_blend\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_uses\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_uses_order_idx\` ON \`oils_incense_uses\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_uses_parent_idx\` ON \`oils_incense_uses\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_categories_order_idx\` ON \`oils_incense_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_categories_parent_idx\` ON \`oils_incense_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_tags_order_idx\` ON \`oils_incense_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_tags_parent_id_idx\` ON \`oils_incense_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_collections\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`collection_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_collections_order_idx\` ON \`oils_incense_collections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_collections_parent_id_idx\` ON \`oils_incense_collections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`is_primary\` integer DEFAULT false,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_images_order_idx\` ON \`oils_incense_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_images_parent_id_idx\` ON \`oils_incense_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_images_image_idx\` ON \`oils_incense_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`product_type\` text NOT NULL,
  	\`description\` text,
  	\`short_description\` text,
  	\`base_scent\` text NOT NULL,
  	\`scent_family\` text,
  	\`import_source\` text,
  	\`import_date\` text,
  	\`last_updated\` text,
  	\`average_rating\` numeric,
  	\`review_count\` numeric DEFAULT 0,
  	\`is_active\` integer DEFAULT true,
  	\`is_featured\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_updated_at_idx\` ON \`oils_incense\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_created_at_idx\` ON \`oils_incense\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`oils_incense_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`oils_incense_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`oils_incense_rels_order_idx\` ON \`oils_incense_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_rels_parent_idx\` ON \`oils_incense_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_rels_path_idx\` ON \`oils_incense_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`oils_incense_rels_oils_incense_id_idx\` ON \`oils_incense_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE TABLE \`blog_posts_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_posts_tags_order_idx\` ON \`blog_posts_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_tags_parent_id_idx\` ON \`blog_posts_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`blog_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`excerpt\` text,
  	\`content\` text NOT NULL,
  	\`author_id\` integer,
  	\`guest_author\` text,
  	\`author_bio\` text,
  	\`category\` text NOT NULL,
  	\`featured_image_id\` integer,
  	\`featured_image_alt\` text,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`publish_date\` text,
  	\`featured\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`allow_comments\` integer DEFAULT true,
  	\`comments_count\` numeric DEFAULT 0,
  	\`view_count\` numeric DEFAULT 0,
  	\`share_count\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`featured_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_posts_slug_idx\` ON \`blog_posts\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_author_idx\` ON \`blog_posts\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_featured_image_idx\` ON \`blog_posts\` (\`featured_image_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_updated_at_idx\` ON \`blog_posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_created_at_idx\` ON \`blog_posts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`blog_posts_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	\`events_id\` integer,
  	\`businesses_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`businesses_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_order_idx\` ON \`blog_posts_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_parent_idx\` ON \`blog_posts_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_path_idx\` ON \`blog_posts_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_books_id_idx\` ON \`blog_posts_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_wellness_lifestyle_id_idx\` ON \`blog_posts_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_fashion_jewelry_id_idx\` ON \`blog_posts_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_oils_incense_id_idx\` ON \`blog_posts_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_events_id_idx\` ON \`blog_posts_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_rels_businesses_id_idx\` ON \`blog_posts_rels\` (\`businesses_id\`);`)
  await db.run(sql`CREATE TABLE \`events_registered_users\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`user_id\` integer,
  	\`guest_email\` text,
  	\`guest_name\` text,
  	\`registration_date\` text,
  	\`attendee_count\` numeric DEFAULT 1,
  	\`special_requests\` text,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_registered_users_order_idx\` ON \`events_registered_users\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`events_registered_users_parent_id_idx\` ON \`events_registered_users\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`events_registered_users_user_idx\` ON \`events_registered_users\` (\`user_id\`);`)
  await db.run(sql`CREATE TABLE \`events_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_categories_order_idx\` ON \`events_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`events_categories_parent_idx\` ON \`events_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`events_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_tags_order_idx\` ON \`events_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`events_tags_parent_id_idx\` ON \`events_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`description\` text NOT NULL,
  	\`short_description\` text,
  	\`event_type\` text NOT NULL,
  	\`start_date\` text NOT NULL,
  	\`end_date\` text,
  	\`is_recurring\` integer DEFAULT false,
  	\`recurring_pattern_frequency\` text,
  	\`recurring_pattern_end_recurring_date\` text,
  	\`venue_name\` text DEFAULT 'Alkebulanimages Bookstore',
  	\`venue_address\` text,
  	\`venue_is_virtual\` integer DEFAULT false,
  	\`venue_virtual_link\` text,
  	\`venue_access_instructions\` text,
  	\`registration_required\` integer DEFAULT false,
  	\`registration_details_max_attendees\` numeric,
  	\`registration_details_registration_deadline\` text,
  	\`registration_details_price\` numeric DEFAULT 0,
  	\`registration_details_payment_required\` integer DEFAULT false,
  	\`registration_details_registration_instructions\` text,
  	\`current_attendees\` numeric DEFAULT 0,
  	\`organizer_id\` integer,
  	\`guest_organizer\` text,
  	\`contact_info_email\` text,
  	\`contact_info_phone\` text,
  	\`featured_image_id\` integer,
  	\`featured_image_alt\` text,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`featured\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`allow_comments\` integer DEFAULT true,
  	\`comments_count\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`organizer_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`featured_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_organizer_idx\` ON \`events\` (\`organizer_id\`);`)
  await db.run(sql`CREATE INDEX \`events_featured_image_idx\` ON \`events\` (\`featured_image_id\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`events_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	\`businesses_id\` integer,
  	\`blog_posts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`businesses_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_posts_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_rels_order_idx\` ON \`events_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_parent_idx\` ON \`events_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_path_idx\` ON \`events_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_books_id_idx\` ON \`events_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_wellness_lifestyle_id_idx\` ON \`events_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_fashion_jewelry_id_idx\` ON \`events_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_oils_incense_id_idx\` ON \`events_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_businesses_id_idx\` ON \`events_rels\` (\`businesses_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_blog_posts_id_idx\` ON \`events_rels\` (\`blog_posts_id\`);`)
  await db.run(sql`CREATE TABLE \`businesses_subcategories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`subcategory\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_subcategories_order_idx\` ON \`businesses_subcategories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`businesses_subcategories_parent_id_idx\` ON \`businesses_subcategories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`businesses_services\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`service\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_services_order_idx\` ON \`businesses_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`businesses_services_parent_id_idx\` ON \`businesses_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`businesses_specialties\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`specialty\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_specialties_order_idx\` ON \`businesses_specialties\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`businesses_specialties_parent_id_idx\` ON \`businesses_specialties\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`businesses_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`caption\` text,
  	\`is_primary\` integer DEFAULT false,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_images_order_idx\` ON \`businesses_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`businesses_images_parent_id_idx\` ON \`businesses_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_images_image_idx\` ON \`businesses_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`businesses_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_tags_order_idx\` ON \`businesses_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`businesses_tags_parent_id_idx\` ON \`businesses_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`businesses\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`business_type\` text DEFAULT 'directory-listing' NOT NULL,
  	\`in_directory\` integer DEFAULT true,
  	\`directory_category\` text,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`description\` text NOT NULL,
  	\`short_description\` text,
  	\`category\` text NOT NULL,
  	\`contact_phone\` text,
  	\`contact_email\` text,
  	\`contact_website\` text,
  	\`contact_social_media_facebook\` text,
  	\`contact_social_media_instagram\` text,
  	\`contact_social_media_twitter\` text,
  	\`contact_social_media_linkedin\` text,
  	\`contact_social_media_tiktok\` text,
  	\`address_street\` text NOT NULL,
  	\`address_city\` text DEFAULT 'Nashville' NOT NULL,
  	\`address_state\` text DEFAULT 'TN' NOT NULL,
  	\`address_zip_code\` text NOT NULL,
  	\`address_neighborhood\` text,
  	\`address_coordinates_latitude\` numeric,
  	\`address_coordinates_longitude\` numeric,
  	\`hours_monday\` text,
  	\`hours_tuesday\` text,
  	\`hours_wednesday\` text,
  	\`hours_thursday\` text,
  	\`hours_friday\` text,
  	\`hours_saturday\` text,
  	\`hours_sunday\` text,
  	\`hours_special_hours\` text,
  	\`price_range\` text,
  	\`owner_name\` text,
  	\`owner_bio\` text,
  	\`owner_photo_id\` integer,
  	\`average_rating\` numeric DEFAULT 0,
  	\`review_count\` numeric DEFAULT 0,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`featured\` integer DEFAULT false,
  	\`verified\` integer DEFAULT false,
  	\`submitted_by_id\` integer,
  	\`submission_date\` text,
  	\`last_updated\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`allow_comments\` integer DEFAULT true,
  	\`comments_count\` numeric DEFAULT 0,
  	\`view_count\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`owner_photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`submitted_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`businesses_slug_idx\` ON \`businesses\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`businesses_owner_owner_photo_idx\` ON \`businesses\` (\`owner_photo_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_submitted_by_idx\` ON \`businesses\` (\`submitted_by_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_updated_at_idx\` ON \`businesses\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`businesses_created_at_idx\` ON \`businesses\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`businesses_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`events_id\` integer,
  	\`blog_posts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_posts_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_rels_order_idx\` ON \`businesses_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`businesses_rels_parent_idx\` ON \`businesses_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_rels_path_idx\` ON \`businesses_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`businesses_rels_events_id_idx\` ON \`businesses_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_rels_blog_posts_id_idx\` ON \`businesses_rels\` (\`blog_posts_id\`);`)
  await db.run(sql`CREATE TABLE \`comments_flag_reasons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`reason\` text,
  	\`flagged_by_id\` integer,
  	\`flagged_at\` text,
  	FOREIGN KEY (\`flagged_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`comments_flag_reasons_order_idx\` ON \`comments_flag_reasons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`comments_flag_reasons_parent_id_idx\` ON \`comments_flag_reasons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_flag_reasons_flagged_by_idx\` ON \`comments_flag_reasons\` (\`flagged_by_id\`);`)
  await db.run(sql`CREATE TABLE \`comments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`content\` text NOT NULL,
  	\`author_id\` integer,
  	\`guest_author_name\` text,
  	\`guest_author_email\` text,
  	\`commentable_type\` text NOT NULL,
  	\`parent_comment_id\` integer,
  	\`thread_level\` numeric DEFAULT 0,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`moderated_by_id\` integer,
  	\`moderation_reason\` text,
  	\`toxicity_score\` numeric DEFAULT 0,
  	\`helpful_votes\` numeric DEFAULT 0,
  	\`unhelpful_votes\` numeric DEFAULT 0,
  	\`spam_score\` numeric DEFAULT 0,
  	\`ip_address\` text,
  	\`user_agent\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`edited_at\` text,
  	\`flagged\` integer DEFAULT false,
  	\`flag_count\` numeric DEFAULT 0,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`parent_comment_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`moderated_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`comments_author_idx\` ON \`comments\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_parent_comment_idx\` ON \`comments\` (\`parent_comment_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_moderated_by_idx\` ON \`comments\` (\`moderated_by_id\`);`)
  await db.run(sql`CREATE TABLE \`comments_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`blog_posts_id\` integer,
  	\`events_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_posts_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`comments_rels_order_idx\` ON \`comments_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`comments_rels_parent_idx\` ON \`comments_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_rels_path_idx\` ON \`comments_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`comments_rels_blog_posts_id_idx\` ON \`comments_rels\` (\`blog_posts_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_rels_events_id_idx\` ON \`comments_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE TABLE \`reviews_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`caption\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`reviews_images_order_idx\` ON \`reviews_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`reviews_images_parent_id_idx\` ON \`reviews_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_images_image_idx\` ON \`reviews_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`reviews_voters\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`user_id\` integer,
  	\`vote\` text,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`reviews_voters_order_idx\` ON \`reviews_voters\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`reviews_voters_parent_id_idx\` ON \`reviews_voters\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_voters_user_idx\` ON \`reviews_voters\` (\`user_id\`);`)
  await db.run(sql`CREATE TABLE \`reviews\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`reviewable_type\` text NOT NULL,
  	\`title\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`rating\` numeric NOT NULL,
  	\`would_recommend\` integer DEFAULT true,
  	\`verified\` integer DEFAULT false,
  	\`verified_order_id\` integer,
  	\`author_id\` integer NOT NULL,
  	\`author_name\` text,
  	\`helpful_votes\` numeric DEFAULT 0,
  	\`not_helpful_votes\` numeric DEFAULT 0,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`moderator_notes\` text,
  	\`flag_reason\` text,
  	\`is_edited\` integer DEFAULT false,
  	\`edited_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`verified_order_id\`) REFERENCES \`orders\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`reviews_verified_order_idx\` ON \`reviews\` (\`verified_order_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_author_idx\` ON \`reviews\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_updated_at_idx\` ON \`reviews\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`reviews_created_at_idx\` ON \`reviews\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`reviews_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`books_id\` integer,
  	\`wellness_lifestyle_id\` integer,
  	\`fashion_jewelry_id\` integer,
  	\`oils_incense_id\` integer,
  	\`businesses_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`books_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`wellness_lifestyle_id\`) REFERENCES \`wellness_lifestyle\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_jewelry_id\`) REFERENCES \`fashion_jewelry\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`oils_incense_id\`) REFERENCES \`oils_incense\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`businesses_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`reviews_rels_order_idx\` ON \`reviews_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_parent_idx\` ON \`reviews_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_path_idx\` ON \`reviews_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_books_id_idx\` ON \`reviews_rels\` (\`books_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_wellness_lifestyle_id_idx\` ON \`reviews_rels\` (\`wellness_lifestyle_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_fashion_jewelry_id_idx\` ON \`reviews_rels\` (\`fashion_jewelry_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_oils_incense_id_idx\` ON \`reviews_rels\` (\`oils_incense_id\`);`)
  await db.run(sql`CREATE INDEX \`reviews_rels_businesses_id_idx\` ON \`reviews_rels\` (\`businesses_id\`);`)
  await db.run(sql`CREATE TABLE \`search_analytics_filters_used\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`filter_type\` text,
  	\`filter_value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`search_analytics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`search_analytics_filters_used_order_idx\` ON \`search_analytics_filters_used\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_filters_used_parent_id_idx\` ON \`search_analytics_filters_used\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`search_analytics\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`query\` text NOT NULL,
  	\`normalized_query\` text NOT NULL,
  	\`query_type\` text NOT NULL,
  	\`search_source\` text NOT NULL,
  	\`user_type\` text,
  	\`user_id_id\` integer,
  	\`result_count\` numeric DEFAULT 0 NOT NULL,
  	\`internal_result_count\` numeric DEFAULT 0,
  	\`external_result_count\` numeric DEFAULT 0,
  	\`search_time\` numeric,
  	\`clickthrough\` integer DEFAULT false,
  	\`clicked_result_result_type\` text,
  	\`clicked_result_result_id\` text,
  	\`clicked_result_result_position\` numeric,
  	\`clicked_result_click_time\` text,
  	\`conversion\` integer DEFAULT false,
  	\`conversion_type\` text,
  	\`external_book_search_isbndb_used\` integer DEFAULT false,
  	\`external_book_search_google_books_used\` integer DEFAULT false,
  	\`external_book_search_open_library_used\` integer DEFAULT false,
  	\`external_book_search_bookshop_checked\` integer DEFAULT false,
  	\`external_book_search_quote_requested\` integer DEFAULT false,
  	\`refined_search\` integer DEFAULT false,
  	\`refined_query\` text,
  	\`search_date\` text NOT NULL,
  	\`session_id\` text,
  	\`ip_address\` text,
  	\`user_agent\` text,
  	\`device_type\` text,
  	\`search_engine\` text NOT NULL,
  	\`cache_hit\` integer DEFAULT false,
  	\`popular_query\` integer DEFAULT false,
  	\`query_frequency\` numeric DEFAULT 1,
  	\`zero_results_query\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`search_analytics_query_idx\` ON \`search_analytics\` (\`query\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_normalized_query_idx\` ON \`search_analytics\` (\`normalized_query\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_user_id_idx\` ON \`search_analytics\` (\`user_id_id\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_search_date_idx\` ON \`search_analytics\` (\`search_date\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_session_id_idx\` ON \`search_analytics\` (\`session_id\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_updated_at_idx\` ON \`search_analytics\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`search_analytics_created_at_idx\` ON \`search_analytics\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`book_quotes_external_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`source\` text,
  	\`available\` integer DEFAULT false,
  	\`estimated_price\` numeric,
  	\`estimated_delivery\` text,
  	\`source_url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`book_quotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`book_quotes_external_sources_order_idx\` ON \`book_quotes_external_sources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_external_sources_parent_id_idx\` ON \`book_quotes_external_sources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`book_quotes_communications\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`date\` text NOT NULL,
  	\`type\` text,
  	\`subject\` text,
  	\`content\` text,
  	\`sent_by_id\` integer,
  	FOREIGN KEY (\`sent_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`book_quotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`book_quotes_communications_order_idx\` ON \`book_quotes_communications\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_communications_parent_id_idx\` ON \`book_quotes_communications\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_communications_sent_by_idx\` ON \`book_quotes_communications\` (\`sent_by_id\`);`)
  await db.run(sql`CREATE TABLE \`book_quotes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`book_title\` text NOT NULL,
  	\`author\` text,
  	\`isbn\` text,
  	\`publisher\` text,
  	\`publication_year\` text,
  	\`edition\` text,
  	\`format\` text DEFAULT 'any',
  	\`customer_id\` integer,
  	\`customer_name\` text NOT NULL,
  	\`customer_email\` text NOT NULL,
  	\`customer_phone\` text,
  	\`preferred_contact\` text DEFAULT 'email',
  	\`quantity\` numeric DEFAULT 1 NOT NULL,
  	\`urgency\` text DEFAULT 'normal',
  	\`max_budget\` numeric,
  	\`special_instructions\` text,
  	\`request_source\` text NOT NULL,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`assigned_to_id\` integer,
  	\`internal_notes\` text,
  	\`quote_price_per_book\` numeric,
  	\`quote_total_price\` numeric,
  	\`quote_supplier_cost\` numeric,
  	\`quote_markup\` numeric,
  	\`quote_estimated_arrival\` text,
  	\`quote_valid_until\` text,
  	\`quote_terms\` text,
  	\`supplier_name\` text,
  	\`supplier_contact\` text,
  	\`supplier_order_number\` text,
  	\`supplier_tracking_number\` text,
  	\`request_date\` text NOT NULL,
  	\`quote_date\` text,
  	\`response_date\` text,
  	\`completion_date\` text,
  	\`last_followup\` text,
  	\`search_analytics_id_id\` integer,
  	\`conversion_value\` numeric,
  	\`profit_margin\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`customer_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`assigned_to_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`search_analytics_id_id\`) REFERENCES \`search_analytics\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`book_quotes_customer_idx\` ON \`book_quotes\` (\`customer_id\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_assigned_to_idx\` ON \`book_quotes\` (\`assigned_to_id\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_request_date_idx\` ON \`book_quotes\` (\`request_date\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_search_analytics_id_idx\` ON \`book_quotes\` (\`search_analytics_id_id\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_updated_at_idx\` ON \`book_quotes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`book_quotes_created_at_idx\` ON \`book_quotes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`external_books_authors\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_authors_order_idx\` ON \`external_books_authors\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_authors_parent_id_idx\` ON \`external_books_authors\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`category\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_categories_order_idx\` ON \`external_books_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_categories_parent_id_idx\` ON \`external_books_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books_subjects\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`subject\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_subjects_order_idx\` ON \`external_books_subjects\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_subjects_parent_id_idx\` ON \`external_books_subjects\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books_dewey_decimal\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`code\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_dewey_decimal_order_idx\` ON \`external_books_dewey_decimal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_dewey_decimal_parent_id_idx\` ON \`external_books_dewey_decimal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books_image_urls\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	\`type\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_image_urls_order_idx\` ON \`external_books_image_urls\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_image_urls_parent_id_idx\` ON \`external_books_image_urls\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books_pricing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`source\` text,
  	\`price\` numeric,
  	\`currency\` text DEFAULT 'USD',
  	\`price_type\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_pricing_order_idx\` ON \`external_books_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_pricing_parent_id_idx\` ON \`external_books_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_tags_order_idx\` ON \`external_books_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`external_books_tags_parent_id_idx\` ON \`external_books_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`external_books\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`title_long\` text,
  	\`author\` text,
  	\`isbn\` text NOT NULL,
  	\`isbn10\` text,
  	\`publisher\` text,
  	\`published_date\` text,
  	\`edition\` text,
  	\`binding\` text,
  	\`pages\` numeric,
  	\`language\` text DEFAULT 'en',
  	\`dimensions\` text,
  	\`description\` text,
  	\`synopsis\` text,
  	\`excerpt\` text,
  	\`source\` text NOT NULL,
  	\`source_id\` text,
  	\`source_url\` text,
  	\`source_data\` text,
  	\`available\` integer DEFAULT false,
  	\`availability_details_in_stock\` integer DEFAULT false,
  	\`availability_details_estimated_delivery\` text,
  	\`availability_details_stock_quantity\` text,
  	\`last_updated\` text NOT NULL,
  	\`cache_expiry\` text,
  	\`refresh_count\` numeric DEFAULT 1,
  	\`is_stale\` integer DEFAULT false,
  	\`search_count\` numeric DEFAULT 1,
  	\`quote_request_count\` numeric DEFAULT 0,
  	\`last_searched\` text,
  	\`imported\` integer DEFAULT false,
  	\`imported_book_id_id\` integer,
  	\`import_reason\` text,
  	\`relevance_score\` numeric DEFAULT 0,
  	\`quality_score\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`imported_book_id_id\`) REFERENCES \`books\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`external_books_title_idx\` ON \`external_books\` (\`title\`);`)
  await db.run(sql`CREATE INDEX \`external_books_author_idx\` ON \`external_books\` (\`author\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`external_books_isbn_idx\` ON \`external_books\` (\`isbn\`);`)
  await db.run(sql`CREATE INDEX \`external_books_isbn10_idx\` ON \`external_books\` (\`isbn10\`);`)
  await db.run(sql`CREATE INDEX \`external_books_source_idx\` ON \`external_books\` (\`source\`);`)
  await db.run(sql`CREATE INDEX \`external_books_available_idx\` ON \`external_books\` (\`available\`);`)
  await db.run(sql`CREATE INDEX \`external_books_last_updated_idx\` ON \`external_books\` (\`last_updated\`);`)
  await db.run(sql`CREATE INDEX \`external_books_imported_book_id_idx\` ON \`external_books\` (\`imported_book_id_id\`);`)
  await db.run(sql`CREATE INDEX \`external_books_updated_at_idx\` ON \`external_books\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`external_books_created_at_idx\` ON \`external_books\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs_log\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`executed_at\` text NOT NULL,
  	\`completed_at\` text NOT NULL,
  	\`task_slug\` text NOT NULL,
  	\`task_i_d\` text NOT NULL,
  	\`input\` text,
  	\`output\` text,
  	\`state\` text NOT NULL,
  	\`error\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`payload_jobs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_jobs_log_order_idx\` ON \`payload_jobs_log\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_log_parent_id_idx\` ON \`payload_jobs_log\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`input\` text,
  	\`completed_at\` text,
  	\`total_tried\` numeric DEFAULT 0,
  	\`has_error\` integer DEFAULT false,
  	\`error\` text,
  	\`task_slug\` text,
  	\`queue\` text DEFAULT 'default',
  	\`wait_until\` text,
  	\`processing\` integer DEFAULT false,
  	\`meta\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_jobs_completed_at_idx\` ON \`payload_jobs\` (\`completed_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_total_tried_idx\` ON \`payload_jobs\` (\`total_tried\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_has_error_idx\` ON \`payload_jobs\` (\`has_error\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_task_slug_idx\` ON \`payload_jobs\` (\`task_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_queue_idx\` ON \`payload_jobs\` (\`queue\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_wait_until_idx\` ON \`payload_jobs\` (\`wait_until\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_processing_idx\` ON \`payload_jobs\` (\`processing\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_updated_at_idx\` ON \`payload_jobs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_created_at_idx\` ON \`payload_jobs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
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
  	\`payload_jobs_id\` integer,
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
  	FOREIGN KEY (\`external_books_id\`) REFERENCES \`external_books\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_jobs_id\`) REFERENCES \`payload_jobs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_jobs_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_jobs_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`customers_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_customers_id_idx\` ON \`payload_preferences_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`home_page_banner_banner_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_page\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_page_banner_banner_images_order_idx\` ON \`home_page_banner_banner_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_page_banner_banner_images_parent_id_idx\` ON \`home_page_banner_banner_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`home_page_banner_banner_images_image_idx\` ON \`home_page_banner_banner_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`home_page_section2_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_page\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_page_section2_images_order_idx\` ON \`home_page_section2_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_page_section2_images_parent_id_idx\` ON \`home_page_section2_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`home_page_section2_images_image_idx\` ON \`home_page_section2_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`home_page_section3_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_page\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_page_section3_images_order_idx\` ON \`home_page_section3_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_page_section3_images_parent_id_idx\` ON \`home_page_section3_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`home_page_section3_images_image_idx\` ON \`home_page_section3_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`home_page_section4_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_page\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_page_section4_images_order_idx\` ON \`home_page_section4_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_page_section4_images_parent_id_idx\` ON \`home_page_section4_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`home_page_section4_images_image_idx\` ON \`home_page_section4_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`home_page\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`description\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`about_page_section1_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`about_page\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`about_page_section1_images_order_idx\` ON \`about_page_section1_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`about_page_section1_images_parent_id_idx\` ON \`about_page_section1_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`about_page_section1_images_image_idx\` ON \`about_page_section1_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`about_page\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`description\` text,
  	\`section2_section2image_id\` integer,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`section2_section2image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`about_page_section2_section2_section2image_idx\` ON \`about_page\` (\`section2_section2image_id\`);`)
  await db.run(sql`CREATE TABLE \`contact_page\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`description\` text,
  	\`section1_section1image_id\` integer,
  	\`section2_section2image_id\` integer,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`section1_section1image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`section2_section2image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`contact_page_section1_section1_section1image_idx\` ON \`contact_page\` (\`section1_section1image_id\`);`)
  await db.run(sql`CREATE INDEX \`contact_page_section2_section2_section2image_idx\` ON \`contact_page\` (\`section2_section2image_id\`);`)
  await db.run(sql`CREATE TABLE \`shop_page_section1_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`shop_page\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shop_page_section1_images_order_idx\` ON \`shop_page_section1_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shop_page_section1_images_parent_id_idx\` ON \`shop_page_section1_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shop_page_section1_images_image_idx\` ON \`shop_page_section1_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`shop_page\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`description\` text,
  	\`banner_banner_image_id\` integer,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`banner_banner_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`shop_page_banner_banner_banner_image_idx\` ON \`shop_page\` (\`banner_banner_image_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_keywords\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`keyword\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_keywords_order_idx\` ON \`site_settings_keywords\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_keywords_parent_id_idx\` ON \`site_settings_keywords\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`logo_id\` integer,
  	\`banner_id\` integer,
  	\`author_id\` integer,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`banner_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_logo_idx\` ON \`site_settings\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_banner_idx\` ON \`site_settings\` (\`banner_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_author_idx\` ON \`site_settings\` (\`author_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs_stats\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`stats\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_shipping_addresses\`;`)
  await db.run(sql`DROP TABLE \`users_preferences_favorite_categories\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`users_rels\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`carts\`;`)
  await db.run(sql`DROP TABLE \`carts_rels\`;`)
  await db.run(sql`DROP TABLE \`cart_items\`;`)
  await db.run(sql`DROP TABLE \`cart_items_rels\`;`)
  await db.run(sql`DROP TABLE \`orders_items\`;`)
  await db.run(sql`DROP TABLE \`orders_refunds\`;`)
  await db.run(sql`DROP TABLE \`orders\`;`)
  await db.run(sql`DROP TABLE \`orders_rels\`;`)
  await db.run(sql`DROP TABLE \`customers_shipping_addresses\`;`)
  await db.run(sql`DROP TABLE \`customers_sessions\`;`)
  await db.run(sql`DROP TABLE \`customers\`;`)
  await db.run(sql`DROP TABLE \`customers_rels\`;`)
  await db.run(sql`DROP TABLE \`institutional_accounts\`;`)
  await db.run(sql`DROP TABLE \`authors_genres\`;`)
  await db.run(sql`DROP TABLE \`authors_notable_works\`;`)
  await db.run(sql`DROP TABLE \`authors_awards\`;`)
  await db.run(sql`DROP TABLE \`authors\`;`)
  await db.run(sql`DROP TABLE \`authors_rels\`;`)
  await db.run(sql`DROP TABLE \`publishers_specialties\`;`)
  await db.run(sql`DROP TABLE \`publishers_notable_authors\`;`)
  await db.run(sql`DROP TABLE \`publishers_awards\`;`)
  await db.run(sql`DROP TABLE \`publishers\`;`)
  await db.run(sql`DROP TABLE \`vendors_categories\`;`)
  await db.run(sql`DROP TABLE \`vendors\`;`)
  await db.run(sql`DROP TABLE \`books_authors_text\`;`)
  await db.run(sql`DROP TABLE \`books_editions\`;`)
  await db.run(sql`DROP TABLE \`books_categories\`;`)
  await db.run(sql`DROP TABLE \`books_raw_categories\`;`)
  await db.run(sql`DROP TABLE \`books_subjects\`;`)
  await db.run(sql`DROP TABLE \`books_dewey_decimal\`;`)
  await db.run(sql`DROP TABLE \`books_tags\`;`)
  await db.run(sql`DROP TABLE \`books_collections\`;`)
  await db.run(sql`DROP TABLE \`books_images\`;`)
  await db.run(sql`DROP TABLE \`books_scraped_image_urls\`;`)
  await db.run(sql`DROP TABLE \`books_reviews\`;`)
  await db.run(sql`DROP TABLE \`books\`;`)
  await db.run(sql`DROP TABLE \`books_rels\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_ingredients\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_scent_profile_scent_family\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_scent_profile_scent_notes\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_uses\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_benefits\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_variations\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_certifications\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_sage_blend\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_categories\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_tags\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_collections\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_target_audience\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_images\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle\`;`)
  await db.run(sql`DROP TABLE \`wellness_lifestyle_rels\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_available_product_types\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_available_colors\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_available_sizes\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_materials\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_crystals\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_print_details_print_location\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_print_details_print_colors\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_variations\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_categories\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_tags\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_collections\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_target_audience\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_images\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry\`;`)
  await db.run(sql`DROP TABLE \`fashion_jewelry_rels\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_variations\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_sage_blend\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_uses\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_categories\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_tags\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_collections\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_images\`;`)
  await db.run(sql`DROP TABLE \`oils_incense\`;`)
  await db.run(sql`DROP TABLE \`oils_incense_rels\`;`)
  await db.run(sql`DROP TABLE \`blog_posts_tags\`;`)
  await db.run(sql`DROP TABLE \`blog_posts\`;`)
  await db.run(sql`DROP TABLE \`blog_posts_rels\`;`)
  await db.run(sql`DROP TABLE \`events_registered_users\`;`)
  await db.run(sql`DROP TABLE \`events_categories\`;`)
  await db.run(sql`DROP TABLE \`events_tags\`;`)
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`DROP TABLE \`events_rels\`;`)
  await db.run(sql`DROP TABLE \`businesses_subcategories\`;`)
  await db.run(sql`DROP TABLE \`businesses_services\`;`)
  await db.run(sql`DROP TABLE \`businesses_specialties\`;`)
  await db.run(sql`DROP TABLE \`businesses_images\`;`)
  await db.run(sql`DROP TABLE \`businesses_tags\`;`)
  await db.run(sql`DROP TABLE \`businesses\`;`)
  await db.run(sql`DROP TABLE \`businesses_rels\`;`)
  await db.run(sql`DROP TABLE \`comments_flag_reasons\`;`)
  await db.run(sql`DROP TABLE \`comments\`;`)
  await db.run(sql`DROP TABLE \`comments_rels\`;`)
  await db.run(sql`DROP TABLE \`reviews_images\`;`)
  await db.run(sql`DROP TABLE \`reviews_voters\`;`)
  await db.run(sql`DROP TABLE \`reviews\`;`)
  await db.run(sql`DROP TABLE \`reviews_rels\`;`)
  await db.run(sql`DROP TABLE \`search_analytics_filters_used\`;`)
  await db.run(sql`DROP TABLE \`search_analytics\`;`)
  await db.run(sql`DROP TABLE \`book_quotes_external_sources\`;`)
  await db.run(sql`DROP TABLE \`book_quotes_communications\`;`)
  await db.run(sql`DROP TABLE \`book_quotes\`;`)
  await db.run(sql`DROP TABLE \`external_books_authors\`;`)
  await db.run(sql`DROP TABLE \`external_books_categories\`;`)
  await db.run(sql`DROP TABLE \`external_books_subjects\`;`)
  await db.run(sql`DROP TABLE \`external_books_dewey_decimal\`;`)
  await db.run(sql`DROP TABLE \`external_books_image_urls\`;`)
  await db.run(sql`DROP TABLE \`external_books_pricing\`;`)
  await db.run(sql`DROP TABLE \`external_books_tags\`;`)
  await db.run(sql`DROP TABLE \`external_books\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs_log\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`home_page_banner_banner_images\`;`)
  await db.run(sql`DROP TABLE \`home_page_section2_images\`;`)
  await db.run(sql`DROP TABLE \`home_page_section3_images\`;`)
  await db.run(sql`DROP TABLE \`home_page_section4_images\`;`)
  await db.run(sql`DROP TABLE \`home_page\`;`)
  await db.run(sql`DROP TABLE \`about_page_section1_images\`;`)
  await db.run(sql`DROP TABLE \`about_page\`;`)
  await db.run(sql`DROP TABLE \`contact_page\`;`)
  await db.run(sql`DROP TABLE \`shop_page_section1_images\`;`)
  await db.run(sql`DROP TABLE \`shop_page\`;`)
  await db.run(sql`DROP TABLE \`site_settings_keywords\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs_stats\`;`)
}
