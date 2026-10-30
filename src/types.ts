// Shared data contract. Game data comes from research/raw through scripts/build-data.ts.
export type Mods = Record<string, number>;
export interface DamageBand { minM: number; maxM: number | null; regions: Record<string, number> }
export interface ApexData { id: string; name: string; description: string; level: number | null; blocks: string[]; mods: Mods | null }
export interface WeaponData {
  id: string; name: string; category: string; slot: 'primary' | 'secondary' | 'melee'; description: string;
  unlockLevel: number; maxLevel: number | null; fireMode: 'auto' | 'semi' | 'burst' | 'single' | null;
  rpm: number | null; magazine: number | null; health: number;
  base: Record<string, number> | null; damage: DamageBand[] | null; apex: ApexData | null;
}
export interface AttachmentInfo { name: string; slot: string; kind: string; image: boolean }
export type GearSlot = 'tactical' | 'lethal' | 'field' | 'perk1' | 'perk2' | 'perk3';
export type StreakStyle = 'mixed' | 'support' | 'lethal';
export interface GearItem {
  id: string; name: string; kind: 'tactical' | 'lethal' | 'field' | 'perk' | 'streak'; perkSlot: number | null;
  unlock: number | null; description: string;
  // Kill cost for streaks. Tier is the mean perk tier-list score, 0 to 1.
  cost: number | null; tier: number | null;
}
/** A build a guide site publishes. Parts that do not match this gun's data are kept in unmatched. */
export interface MetaBuild { source: string; label: string; apex: boolean; code: string | null; attachments: string[]; unmatched: string[]; url: string; updated: string | null; note: string | null }
export interface MetaGear { source: string; url: string; items: string[]; unmatched: string[]; generic: boolean }
export interface GameData {
  version: string; checkedAt: string; statsUpdated: string;
  statNames: Record<string, { name: string; unit: string; better: 'higher' | 'lower' }>;
  weapons: WeaponData[];
  attachments: Record<string, AttachmentInfo>;
  loadouts: Record<string, [id: string, level: number, mods: Mods][]>;
  gear: GearItem[];
  meta: Record<string, MetaBuild[]>;
  metaGear: Record<string, MetaGear[]>;
  metaSources: Record<string, { name: string; url: string; retrieved: string }>;
}

export const metricIds = ['ads', 'stf', 'recoil', 'ttk', 'mobility', 'adsMove', 'flinch', 'hipfire', 'magazine', 'reload', 'velocity', 'sway'] as const;
export type MetricId = typeof metricIds[number];
export type Weights = Record<MetricId, number>;
export type PresetId = 'allround' | 'close' | 'long' | 'control';

export interface Settings {
  weaponId: string;
  level: number;
  preset: PresetId;
  // Multiplies the preset weight for each metric. 1 keeps the preset, 0 ignores the metric.
  emphasis: Weights;
  distanceM: number;
  optic: boolean;
  locked: string[];
  excluded: string[];
  playerLevel: number;
  // Kills you usually get in one life. Streaks above it are left out.
  killBand: number;
  streakStyle: StreakStyle;
  gearLocks: Partial<Record<GearSlot, string>>;
  streakLocks: string[];
}

export interface GearPick { id: string; value: number; reasons: string[]; locked: boolean }
export interface GearResult { picks: Partial<Record<GearSlot, GearPick>>; alternatives: Partial<Record<GearSlot, GearPick[]>>; streaks: GearPick[]; hardline: boolean }
export interface ScoredMeta extends MetaBuild { build: BuildResult | null; issues: string[] }

export interface BuildResult {
  apex: boolean;
  attachments: string[];
  stats: Record<string, number>;
  metrics: Record<MetricId, number>;
  score: number;
  ttkMs: number | null;
  contributions: { id: string; score: number }[];
}
/** How the best build holds up when priorities and fight distance move a little. Shares are 0 to 1. */
export interface Stability {
  samples: number;
  // Share of nudged settings where this build scores within TIE_MS of that setting's winner.
  nearBest: number;
  // Share where it is the exact winner. Low when several builds tie.
  wins: number;
  // Score lead over the runner-up at your exact settings.
  gapMs: number;
  // For each part of this build, the share of winners that use it.
  parts: { id: string; share: number }[];
  // Parts not in this build that appear in at least a quarter of winners.
  contenders: { id: string; share: number }[];
}
export interface ClassResult {
  variant: 'standard' | 'apex';
  available: boolean;
  reason: string | null;
  best: BuildResult | null;
  alternatives: BuildResult[];
  evaluated: number;
  stability: Stability | null;
}
export interface OptimizeResult { stock: BuildResult | null; standard: ClassResult; apex: ClassResult; baseTtkMs: number | null; warnings: string[]; gear: GearResult | null; meta: ScoredMeta[] }
