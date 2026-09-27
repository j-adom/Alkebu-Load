import type { GlobalConfig } from 'payload';

// Deliberately not a field on siteSettings: that global is staff-editable SEO
// content, and a sync watermark sitting in an editor's form is one accidental
// save away from re-importing or skipping months of catalog.
export const SquareSyncState: GlobalConfig = {
  slug: 'squareSyncState',
  admin: { hidden: true },
  access: {
    read: ({ req: { user } }) => {
      const role = (user as { role?: string } | undefined)?.role;
      return role === 'admin' || role === 'staff';
    },
    update: ({ req: { user } }) => (user as { role?: string } | undefined)?.role === 'admin',
  },
  fields: [
    {
      name: 'catalogSyncedThrough',
      type: 'date',
      admin: {
        description:
          'High-water mark: every Square item changed at or before this instant is written or staged. Empty means never synced.',
      },
    },
    { name: 'lastRunAt', type: 'date' },
    { name: 'lastRunCreated', type: 'number', defaultValue: 0 },
    { name: 'lastRunUpdated', type: 'number', defaultValue: 0 },
    { name: 'lastRunStaged', type: 'number', defaultValue: 0 },
    { name: 'lastRunUnresolved', type: 'number', defaultValue: 0 },
    { name: 'lastRunSkippedNonBook', type: 'number', defaultValue: 0 },
  ],
};
