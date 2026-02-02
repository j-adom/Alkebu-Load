import * as migration_20251004_033724 from './20251004_033724';
import * as migration_20251128_211551 from './20251128_211551';

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
];
