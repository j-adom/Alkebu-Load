ALTER TYPE enum_orders_fulfillment_shipping_method ADD VALUE IF NOT EXISTS 'media_mail';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider_payment_id character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider_customer_id character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_shipping_service character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_shipping_rate_id character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_quote_source character varying;

-- Per-item dashboard refunds (2026-06) -----------------------------------------
-- Partial-refund payment status.
ALTER TYPE enum_orders_payment_payment_status ADD VALUE IF NOT EXISTS 'partially_refunded';

-- Per-line refund tracking on the order items array table.
ALTER TABLE orders_items ADD COLUMN IF NOT EXISTS refunded_quantity numeric DEFAULT 0;
ALTER TABLE orders_items ADD COLUMN IF NOT EXISTS do_not_ship boolean DEFAULT false;

-- Refund detail on the refunds array table (items stored as JSON to avoid a child table).
ALTER TABLE orders_refunds ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE orders_refunds ADD COLUMN IF NOT EXISTS items jsonb;
ALTER TABLE orders_refunds ADD COLUMN IF NOT EXISTS restock boolean DEFAULT false;

-- Refund customer-email delivery tracking (emailNotifications.refundNotification group).
DO $$ BEGIN
  CREATE TYPE enum_orders_email_notifications_refund_notification_status AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_notifications_refund_notification_status enum_orders_email_notifications_refund_notification_status;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_notifications_refund_notification_recipient character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_notifications_refund_notification_provider character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_notifications_refund_notification_sent_at timestamp(3) with time zone;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_notifications_refund_notification_error text;
