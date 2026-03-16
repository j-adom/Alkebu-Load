ALTER TYPE enum_orders_fulfillment_shipping_method ADD VALUE IF NOT EXISTS 'media_mail';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider_payment_id character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider_customer_id character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_shipping_service character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_shipping_rate_id character varying;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_quote_source character varying;
