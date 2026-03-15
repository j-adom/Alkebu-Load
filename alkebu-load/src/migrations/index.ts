import * as migration_20251004_033724 from './20251004_033724';
import * as migration_20251128_211551 from './20251128_211551';
import * as migration_20260315_063800_add_cart_checkout_fields from './20260315_063800_add_cart_checkout_fields';

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
];
