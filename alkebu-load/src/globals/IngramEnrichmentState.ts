import type { GlobalConfig } from 'payload';

import { isAdminUser, isStaffUser } from '../access/roles';

// Which Ingram files the enrichment job has already applied (by sha256), so a weekly run
// against an unchanged file is skipped. Written only by the job; hidden from editors.
export const IngramEnrichmentState: GlobalConfig = {
  slug: 'ingramEnrichmentState',
  admin: { hidden: true },
  access: {
    read: ({ req: { user } }) => isStaffUser(user),
    update: ({ req: { user } }) => isAdminUser(user),
  },
  fields: [
    {
      name: 'processedFiles',
      type: 'json',
      admin: { description: 'remotePath -> { checksum, processedAt } of the last successful apply' },
    },
    { name: 'lastRunAt', type: 'date' },
    {
      name: 'lastRunSummary',
      type: 'json',
      admin: { description: 'Counts-only summary of the last applied run (no Ingram titles or values)' },
    },
  ],
};
