import * as migration_20251004_033724 from './20251004_033724';
import * as migration_20251128_211551 from './20251128_211551';
import * as migration_20260315_063800_add_cart_checkout_fields from './20260315_063800_add_cart_checkout_fields';
import * as migration_20260315_154500_add_book_availability_status from './20260315_154500_add_book_availability_status';
import * as migration_20260315_233500_add_order_checkout_fields from './20260315_233500_add_order_checkout_fields';
import * as migration_20260421_180000_add_order_email_notifications from './20260421_180000_add_order_email_notifications';
import * as migration_20260503_161800_add_line_item_identifiers from './20260503_161800_add_line_item_identifiers';

export const migrations = [
  {
    up: migration_20251004_033724.up,
    down: migration_20251004_033724.down,
    name: '20251004_033724',
  },
  {
    up: migration_20251128_211551.up,
    down: migration_20251128_211551.down,
    name: '20251128_211551'
  },
  {
    up: migration_20260315_063800_add_cart_checkout_fields.up,
    down: migration_20260315_063800_add_cart_checkout_fields.down,
    name: '20260315_063800_add_cart_checkout_fields',
  },
  {
    up: migration_20260315_154500_add_book_availability_status.up,
    down: migration_20260315_154500_add_book_availability_status.down,
    name: '20260315_154500_add_book_availability_status',
  },
  {
    up: migration_20260315_233500_add_order_checkout_fields.up,
    down: migration_20260315_233500_add_order_checkout_fields.down,
    name: '20260315_233500_add_order_checkout_fields',
  },
  {
    up: migration_20260421_180000_add_order_email_notifications.up,
    down: migration_20260421_180000_add_order_email_notifications.down,
    name: '20260421_180000_add_order_email_notifications',
  },
  {
    up: migration_20260503_161800_add_line_item_identifiers.up,
    down: migration_20260503_161800_add_line_item_identifiers.down,
    name: '20260503_161800_add_line_item_identifiers',
  },
];
