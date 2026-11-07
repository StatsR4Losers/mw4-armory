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
  // What the guide sites' builds are tuned for, per gun. Computed by scripts/build-data.ts with engine/consensus.ts.
  consensus: Record<string, Consensus>;
  // Official patch notes, newest first, transcribed in research/raw/patch-notes.json.
  patches: Patch[];
  // Warzone numbers for the same guns and parts. data/mode.ts swaps them in when the Warzone mode is on.
  warzone?: WarzoneData;
}
/** Multiplayer, or the same guns tuned for Warzone. */
export type Mode = 'mp' | 'wz';
export interface WarzoneData {
  retrieved: string;
  // Health counts plates: 150 base and three plates of 50 make 300.
  rules: { health: number; plate: number; attachments: number; plates: number };
  weapons: Record<string, { base: Record<string, number>; damage: DamageBand[] | null; apex: Mods | null }>;
  loadouts: Record<string, [id: string, level: number, mods: Mods][]>;
  // Parts with no Warzone record on CODMunity. They keep their multiplayer changes.
  fallback: Record<string, string[]>;
  meta: Record<string, MetaBuild[]>;
  consensus: Record<string, Consensus>;
}
/** One row of a patch note: stat, before, after, and whether the change helps the player ('up'), hurts ('down') or neither (''). */
export type PatchRow = [stat: string, before: string, after: string, direction: 'up' | 'down' | ''];
export interface PatchWeapon {
  id: string; verdict: 'buff' | 'nerf';
  groups: { label: string; rows: PatchRow[] }[];
  // Base stats the patch set, by stat id. Applied by build-data.ts over an older stat snapshot.
  base?: Mods;
  // The damage profile before the patch, so the Patch screen can show time to kill before and now.
  damageBefore?: DamageBand[];
  // Where the community data disagrees with the notes.
  flag?: string;
}
export interface Patch {
  id: string; title: string; date: string; url: string; read: string;
  newWeapons: { id: string; note: string }[];
  weapons: PatchWeapon[];
  other: { name: string; rows: PatchRow[]; notes?: string[] }[];
  notes: string[];
}
export interface Consensus {
  // The playstyle whose best build the site builds come closest to.
  style: string;
  // False when another playstyle fits within CLEAR_MARGIN, so the lean is too small to call.
  clear: boolean;
  // For each playstyle, the mean share of that playstyle's best gain the site builds reach, and how many builds counted.
  fit: Record<string, { capture: number; builds: number }>;
  builds: number;
  // Average stat changes across the site builds, largest first. good is true when the change helps.
  profile: { label: string; change: number; good: boolean }[];
  // Parts at least half the site builds run.
  shared: { id: string; count: number }[];
}

export const metricIds = ['ads', 'stf', 'recoil', 'ttk', 'mobility', 'adsMove', 'flinch', 'hipfire', 'magazine', 'reload', 'velocity', 'sway', 'fireRate', 'swap', 'steady'] as const;
export type MetricId = typeof metricIds[number];
export type Weights = Record<MetricId, number>;
// Playstyle ids are per weapon class, such as smg-rush or sniper-quickscope. See engine/playstyles.ts.
export type PresetId = string;
// The perk and equipment rules a playstyle uses.
export type GearStyle = 'allround' | 'close' | 'long' | 'control';

export interface Settings {
  // Multiplayer or Warzone. Older saved classes and links have none and mean multiplayer.
  mode?: Mode;
  weaponId: string;
  level: number;
  preset: PresetId;
  // Multiplies the preset weight for each metric. 1 keeps the preset, 0 ignores the metric.
  emphasis: Weights;
  distanceM: number;
  // Show the build with the gun's Apex attachment. Both are always computed.
  apex: boolean;
  optic: boolean;
  locked: string[];
  excluded: string[];
  playerLevel: number;
  // Kills you usually get in one life. Streaks above it are left out.
  killBand: number;
  streakStyle: StreakStyle;
  gearLocks: Partial<Record<GearSlot, string>>;
  streakLocks: string[];
  // What the player has unlocked on their other guns. The app adds it to each search from the device. It is not part
  // of a saved class or a share link. Without it, only parts up to this gun's level count.
  armory?: Armory;
}

/** The player's unlocks across guns. MW4 unlocks each shared part once, for every gun that takes it. See engine/unlocks.ts. */
export interface Armory {
  // Highest level reached on each gun. A gun with no entry counts as level 0.
  levels: Record<string, number>;
  // Guns in Weapon Prestige. Their level is the current one, and their earlier unlocks still count on other guns.
  prestiged: string[];
  // Parts marked by hand. Shared parts use the part id, gun-specific ones "weaponId:partId".
  have: string[];
  missing: string[];
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
  // Share of hits that kill in one shot, for guns scored by shots to kill.
  oneShot: number | null;
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
  // The best build with every part unlocked, when your unlocks leave some out. Null when nothing is missing.
  ceiling: BuildResult | null;
}
export interface OptimizeResult { stock: BuildResult | null; standard: ClassResult; apex: ClassResult; baseTtkMs: number | null; warnings: string[]; gear: GearResult | null; meta: ScoredMeta[] }
