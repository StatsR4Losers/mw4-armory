import type { Catalog } from '../types';
import { baseCatalog } from './base-catalog.ts';
import { attachments, attachmentSources, attachmentNotes } from './attachments.ts';
import { weaponStatOverrides, statSources, statNotes } from './stat-overrides.ts';

// Merge independently sourced observations while retaining the official catalog identity.
export const catalog: Catalog = {
  ...baseCatalog,
  attachmentLimit: 5,
  weapons: baseCatalog.weapons.map(weapon => ({
    ...weapon,
    ...weaponStatOverrides[weapon.id],
    sourceIds: [...new Set([...weapon.sourceIds, ...(weaponStatOverrides[weapon.id]?.sourceIds ?? [])])],
  })),
  attachments,
  sources: [...new Map([...baseCatalog.sources, ...attachmentSources, ...statSources].map(source => [source.id, source])).values()],
  notes: [...baseCatalog.notes, ...attachmentNotes, ...statNotes],
};
