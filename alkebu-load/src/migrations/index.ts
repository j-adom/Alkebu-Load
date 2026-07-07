import * as migration_20260524_052325_customer_foundation_phase6 from './20260524_052325_customer_foundation_phase6';
import * as migration_20260705_174837_add_mcp_api_keys from './20260705_174837_add_mcp_api_keys';

export const migrations = [
  {
    up: migration_20260524_052325_customer_foundation_phase6.up,
    down: migration_20260524_052325_customer_foundation_phase6.down,
    name: '20260524_052325_customer_foundation_phase6',
  },
  {
    up: migration_20260705_174837_add_mcp_api_keys.up,
    down: migration_20260705_174837_add_mcp_api_keys.down,
    name: '20260705_174837_add_mcp_api_keys'
  },
];
