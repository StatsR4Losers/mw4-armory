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
export interface GameData {
  version: string; checkedAt: string;
  statNames: Record<string, { name: string; unit: string; better: 'higher' | 'lower' }>;
  weapons: WeaponData[];
  attachments: Record<string, AttachmentInfo>;
  loadouts: Record<string, [id: string, level: number, mods: Mods][]>;
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
}

export interface BuildResult {
  apex: boolean;
  attachments: string[];
  stats: Record<string, number>;
  metrics: Record<MetricId, number>;
  score: number;
  ttkMs: number | null;
  contributions: { id: string; score: number }[];
}
export interface ClassResult {
  variant: 'standard' | 'apex';
  available: boolean;
  reason: string | null;
  best: BuildResult | null;
  alternatives: BuildResult[];
  evaluated: number;
}
export interface OptimizeResult { stock: BuildResult | null; standard: ClassResult; apex: ClassResult; baseTtkMs: number | null; warnings: string[] }
