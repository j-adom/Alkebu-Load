// Which Ingram inventory file the refresh reads. The trimmed Catalog Stock CSV (~195 MB
// zipped, header-driven) is the default; StockV2 (multi-GB fixed-width) stays available
// via INGRAM_STOCK_FEED=stockv2.
import { stockV2Format, type FeedFormat } from './catalogStockSnapshot';
import { createCatalogCsvFormat } from './parseCatalogStockCsv';

export interface StockFeed {
  name: string;
  remotePath: string;
  /** A new format instance per run (CSV formats hold the header they read). */
  createFormat: () => FeedFormat;
  /** Sanity floor: fewer lines than this means a truncated or wrong file. */
  minLines: number;
}

const FEEDS: Record<string, StockFeed> = {
  'catalog-csv': {
    name: 'catalog-csv',
    remotePath: 'Inventory/Catalog_Stock/cat_ing_stock.zip',
    createFormat: createCatalogCsvFormat,
    minLines: 500_000,
  },
  stockv2: {
    name: 'stockv2',
    remotePath: 'Inventory/stockv2@ingram.zip',
    createFormat: () => stockV2Format,
    minLines: 500_000,
  },
};

export function stockFeedFromEnv(env: Record<string, string | undefined> = process.env): StockFeed {
  const name = env.INGRAM_STOCK_FEED || 'catalog-csv';
  const feed = FEEDS[name];
  if (!feed) throw new Error(`Unknown INGRAM_STOCK_FEED "${name}" (known: ${Object.keys(FEEDS).join(', ')})`);
  return { ...feed, remotePath: env.INGRAM_STOCK_REMOTE_PATH || feed.remotePath };
}
