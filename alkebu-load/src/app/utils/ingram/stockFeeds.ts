// Which Ingram inventory file the refresh reads. StockV2 is the full fixed-width feed the
// parser already understands; the trimmed Catalog Stock CSV (~195 MB zipped vs ~4 GB
// unzipped StockV2) becomes the default once its column layout is wired in.
import { stockV2Format, type FeedFormat } from './catalogStockSnapshot';

export interface StockFeed {
  name: string;
  remotePath: string;
  format: FeedFormat;
  /** Sanity floor: fewer lines than this means a truncated or wrong file. */
  minLines: number;
}

const FEEDS: Record<string, StockFeed> = {
  stockv2: {
    name: 'stockv2',
    remotePath: 'Inventory/stockv2@ingram.zip',
    format: stockV2Format,
    minLines: 500_000,
  },
};

export function stockFeedFromEnv(env: Record<string, string | undefined> = process.env): StockFeed {
  const name = env.INGRAM_STOCK_FEED || 'stockv2';
  const feed = FEEDS[name];
  if (!feed) throw new Error(`Unknown INGRAM_STOCK_FEED "${name}" (known: ${Object.keys(FEEDS).join(', ')})`);
  return { ...feed, remotePath: env.INGRAM_STOCK_REMOTE_PATH || feed.remotePath };
}
