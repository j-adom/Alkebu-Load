// The only door to Ingram. Routes, jobs and components call a provider, never the Web
// Service or SFTP directly, so the engine can run against the mock until it goes live.
import { mockProvider } from './mockProvider';
import type { IngramStock } from './parseStockResponse';

export interface LongTailResult {
  ean: string;
  title: string;
  author?: string;
  binding?: string;
  price?: number;
  coverUrl?: string;
  onHand: number;
  available: boolean;
}

export type LongTailScope = 'title' | 'author' | 'topic';

export interface AvailabilityProvider {
  /** Keyed by EAN (ISBN-13). ISBNs Ingram doesn't know are absent from the map. */
  checkStock(isbns: string[]): Promise<Map<string, IngramStock>>;
  /** Live results for display only: never persisted or indexed. */
  searchLongTail(query: string, scope?: LongTailScope): Promise<LongTailResult[]>;
}

/** Returns the mock until the live client lands (plan Task 11). */
export function getAvailabilityProvider(): AvailabilityProvider {
  return mockProvider;
}
