import { metricIds } from '../types.ts';
import type { GearStyle, MetricId, Mode, WeaponData, Weights } from '../types.ts';

export type Role = 'smg' | 'ar' | 'lmg' | 'dmr' | 'bolt' | 'sniper' | 'shotgun' | 'pistol';

/** Where hits land and how often a shot misses, for guns scored by shots to kill. Assumptions, shown on the Build screen. */
export interface Aim { name: string; regions: Record<string, number>; miss: number }

export interface Playstyle {
  id: string;
  role: Role;
  // Warzone playstyles carry wz. The rest are multiplayer.
  mode?: Mode;
  name: string;
  blurb: string;
  distanceM: number;
  weights: Weights;
  gear: GearStyle;
  // choice shows the optic switch. scope keeps a sniper's own scope. none means hip fire, so no optic.
  optic: 'choice' | 'scope' | 'none';
  // Slug playstyles always run the slug. Pellet playstyles never do, because the data has no pellet or slug damage.
  ammo?: 'slug' | 'pellets';
  aim?: Aim;
  // For guns with no damage data: the share of fights that need a second shot, so fire rate can count in milliseconds.
  followUps?: number;
}

const weights = (partial: Partial<Weights>): Weights => Object.fromEntries(metricIds.map(id => [id, partial[id] ?? 0])) as Weights;

export const AIMS = {
  // Aimed shots from a settled scope: mostly upper body.
  aimed: { name: 'aimed', regions: { head: .2, neck: .06, chest: .4, stomach: .18, upperarm: .08, lowerarm: .03, upperleg: .04, lowerleg: .01 }, miss: .15 },
  // Quickscopes and snap shots land lower and wider, and miss more.
  snap: { name: 'snap', regions: { head: .1, neck: .05, chest: .33, stomach: .25, upperarm: .12, lowerarm: .05, upperleg: .07, lowerleg: .03 }, miss: .3 },
  // Semi-auto rifles and pistols shooting at a moving target.
  paced: { name: 'paced', regions: { head: .15, neck: .05, chest: .4, stomach: .22, upperarm: .08, lowerarm: .03, upperleg: .05, lowerleg: .02 }, miss: .2 },
} satisfies Record<string, Aim>;

export const ROLES: Record<Role, { name: string; distance: [number, number] }> = {
  smg: { name: 'SMG', distance: [4, 35] },
  ar: { name: 'Assault rifle', distance: [5, 50] },
  lmg: { name: 'LMG', distance: [8, 55] },
  dmr: { name: 'Marksman rifle', distance: [8, 60] },
  bolt: { name: 'Bolt-action marksman', distance: [5, 70] },
  sniper: { name: 'Sniper', distance: [8, 90] },
  shotgun: { name: 'Shotgun', distance: [3, 25] },
  pistol: { name: 'Pistol', distance: [3, 25] },
};

// Weights per playstyle. Millisecond metrics (ADS, sprint-to-fire, damage range, fire rate, bullet velocity, swap)
// count at 1 for real time saved, and above 1 where that time decides who shoots first. Recoil counts as a share of
// one missed shot. The rest are percent changes with small weights. Sources for each ranking are in the Guide tab.
export const PLAYSTYLES: Playstyle[] = [
  {
    id: 'smg-rush', role: 'smg', name: 'Rush', distanceM: 7, gear: 'close', optic: 'choice',
    blurb: 'Corners and short lanes. Sprint-to-fire, hip fire and strafe speed first.',
    weights: weights({ ads: .7, stf: 1.3, ttk: 1, fireRate: 1, recoil: 1.5, mobility: 1.5, adsMove: .8, flinch: .1, hipfire: .8, magazine: .3, reload: .05, velocity: .5 }),
  },
  {
    id: 'smg-mid', role: 'smg', name: 'Mid-range', distanceM: 13, gear: 'allround', optic: 'choice',
    blurb: 'Push the damage drop out and aim fast. Recoil you can hold past 15 m.',
    weights: weights({ ads: 1, stf: .8, ttk: 1, fireRate: 1, recoil: 2.5, mobility: .8, adsMove: .5, flinch: .1, hipfire: .2, magazine: .4, reload: .05, velocity: 1 }),
  },
  {
    id: 'ar-allround', role: 'ar', name: 'All-around', distanceM: 18, gear: 'allround', optic: 'choice',
    blurb: 'Recoil first, then aim speed and damage range for mid lanes.',
    weights: weights({ ads: 1, stf: .6, ttk: 1, fireRate: 1, recoil: 3, mobility: .6, adsMove: .4, flinch: .2, hipfire: .05, magazine: .4, reload: .1, velocity: 1, sway: .05 }),
  },
  {
    id: 'ar-aggressive', role: 'ar', name: 'Aggressive', distanceM: 10, gear: 'close', optic: 'choice',
    blurb: 'An AR played like an SMG. ADS, sprint-to-fire and recoil.',
    weights: weights({ ads: 1.1, stf: 1, ttk: 1, fireRate: 1, recoil: 2.5, mobility: 1, adsMove: .6, flinch: .1, hipfire: .2, magazine: .3, reload: .05, velocity: 1 }),
  },
  {
    id: 'ar-long', role: 'ar', name: 'Anchor', distanceM: 32, gear: 'long', optic: 'choice',
    blurb: 'Hold long lanes. Recoil, flinch and damage range decide these fights.',
    weights: weights({ ads: .6, stf: .2, ttk: 1, fireRate: 1, recoil: 3.5, mobility: .2, adsMove: .2, flinch: .4, magazine: .4, reload: .1, velocity: 1.2, sway: .2 }),
  },
  {
    id: 'ar-control', role: 'ar', name: 'Low recoil', distanceM: 20, gear: 'control', optic: 'choice',
    blurb: 'For a rifle that kicks too hard for you. Recoil reduction above all.',
    weights: weights({ ads: .7, stf: .4, ttk: 1, fireRate: 1, recoil: 6, mobility: .4, adsMove: .2, flinch: .3, magazine: .3, reload: .05, velocity: 1, sway: .1 }),
  },
  {
    id: 'lmg-anchor', role: 'lmg', name: 'Anchor', distanceM: 28, gear: 'long', optic: 'choice',
    blurb: 'Lock down a lane or objective. ADS, recoil and range, and a reload you can live with.',
    weights: weights({ ads: 1, stf: .4, ttk: 1, fireRate: 1, recoil: 3.5, mobility: .2, adsMove: .2, flinch: .5, magazine: .3, reload: .4, velocity: 1, sway: .1 }),
  },
  {
    id: 'lmg-mobile', role: 'lmg', name: 'Mobile', distanceM: 18, gear: 'allround', optic: 'choice',
    blurb: 'An LMG that moves with the team. ADS, sprint-to-fire and ADS movement.',
    weights: weights({ ads: 1.2, stf: 1, ttk: 1, fireRate: 1, recoil: 2.5, mobility: .8, adsMove: .8, flinch: .2, magazine: .3, reload: .2, velocity: 1 }),
  },
  {
    id: 'dmr-lanes', role: 'dmr', name: 'Lanes', distanceM: 30, gear: 'long', optic: 'choice', aim: AIMS.paced,
    blurb: 'Two-tap rifle for long lanes. Recoil between shots, flinch and range.',
    weights: weights({ ads: 1, stf: .3, ttk: 1, fireRate: 1, recoil: 2.5, mobility: .3, adsMove: .3, flinch: .6, magazine: .1, reload: .05, velocity: 1.2, sway: .3 }),
  },
  {
    id: 'dmr-aggressive', role: 'dmr', name: 'Aggressive', distanceM: 15, gear: 'close', optic: 'choice', aim: AIMS.paced,
    blurb: 'Played like an assault rifle. ADS, sprint-to-fire and fire rate.',
    weights: weights({ ads: 1.2, stf: 1, ttk: 1, fireRate: 1, recoil: 2, mobility: 1, adsMove: .6, flinch: .2, hipfire: .1, magazine: .1, reload: .05, velocity: 1 }),
  },
  {
    id: 'bolt-quickscope', role: 'bolt', name: 'Quickscope', distanceM: 15, gear: 'close', optic: 'choice', aim: AIMS.snap,
    blurb: 'Aim in and fire at once. ADS, sprint-to-fire and rechamber decide it. Sway never kicks in.',
    weights: weights({ ads: 1.3, stf: 1, ttk: 1, fireRate: 1, recoil: .2, mobility: 1, adsMove: .6, flinch: .3, magazine: .2, velocity: 1 }),
  },
  {
    id: 'bolt-hardscope', role: 'bolt', name: 'Hardscope', distanceM: 35, gear: 'long', optic: 'choice', aim: AIMS.aimed,
    blurb: 'Hold an angle scoped in. Sway, flinch, one-shot range and bullet travel.',
    weights: weights({ ads: .6, stf: .3, ttk: 1, fireRate: 1, recoil: .3, mobility: .3, adsMove: .3, flinch: 1.2, magazine: .2, velocity: 1.5, sway: 1, steady: .3 }),
  },
  {
    id: 'sniper-quickscope', role: 'sniper', name: 'Quickscope', distanceM: 20, gear: 'close', optic: 'scope', aim: AIMS.snap,
    blurb: 'Aim in and fire at once. ADS, sprint-to-fire and rechamber decide it. Sway never kicks in.',
    weights: weights({ ads: 1.3, stf: 1, ttk: 1, fireRate: 1, recoil: .2, mobility: 1, adsMove: .6, flinch: .6, velocity: 1 }),
  },
  {
    id: 'sniper-hardscope', role: 'sniper', name: 'Hardscope', distanceM: 45, gear: 'long', optic: 'scope', aim: AIMS.aimed,
    blurb: 'Hold a lane scoped in. Sway, flinch, bullet travel and one-shot range.',
    weights: weights({ ads: .6, stf: .3, ttk: 1, fireRate: 1, recoil: .3, mobility: .3, adsMove: .3, flinch: 1.5, velocity: 1.5, sway: 1.2, steady: .3 }),
  },
  {
    id: 'shotgun-hip', role: 'shotgun', name: 'Hip fire', distanceM: 5, gear: 'close', optic: 'none', ammo: 'pellets', followUps: .4,
    blurb: 'Buckshot from the hip around corners. Sprint-to-fire, movement and hip fire.',
    weights: weights({ ads: .3, stf: 1.3, ttk: .5, fireRate: 1, recoil: .3, mobility: 1.5, adsMove: .3, hipfire: 1, magazine: .3, reload: .2 }),
  },
  {
    id: 'shotgun-ads', role: 'shotgun', name: 'Close ADS', distanceM: 8, gear: 'close', optic: 'choice', ammo: 'pellets', followUps: .4,
    blurb: 'Buckshot, aimed in at doorways. Fast ADS and sprint-to-fire, with some hip fire.',
    weights: weights({ ads: 1, stf: 1, ttk: .7, fireRate: 1, recoil: .6, mobility: 1, adsMove: .5, hipfire: .4, magazine: .3, reload: .2, sway: .1 }),
  },
  {
    id: 'shotgun-slug', role: 'shotgun', name: 'Slugs', distanceM: 15, gear: 'allround', optic: 'choice', ammo: 'slug', followUps: .35,
    blurb: 'One slug, aimed, out to mid range. ADS, recoil, range and a steady sight.',
    weights: weights({ ads: 1.2, stf: .6, ttk: 2, fireRate: 1, recoil: 2, mobility: .4, adsMove: .3, flinch: .3, magazine: .1, reload: .1, velocity: 1, sway: .4 }),
  },
  {
    id: 'pistol-sidearm', role: 'pistol', name: 'Sidearm', distanceM: 8, gear: 'allround', optic: 'choice', aim: AIMS.paced,
    blurb: 'Swap to it when the primary runs dry. Swap speed, sprint-to-fire and ADS.',
    weights: weights({ ads: 1, stf: 1.2, ttk: 1, fireRate: 1, recoil: 1, mobility: .5, adsMove: .3, hipfire: .5, magazine: .3, reload: .05, velocity: .5, swap: 1 }),
  },
  {
    id: 'pistol-rush', role: 'pistol', name: 'Run and gun', distanceM: 6, gear: 'close', optic: 'choice', aim: AIMS.snap,
    blurb: 'A pistol as your main gun, from the hip. The Mojave and .50 GS Apex builds live here.',
    weights: weights({ ads: .4, stf: 1.3, ttk: 1, fireRate: 1, recoil: .8, mobility: 1.5, adsMove: .5, hipfire: 1, magazine: .4, reload: .1, swap: .2 }),
  },
  {
    id: 'pistol-precision', role: 'pistol', name: 'Precision', distanceM: 14, gear: 'allround', optic: 'choice', aim: AIMS.paced,
    blurb: 'Heavy pistols aimed in. ADS, recoil between shots and damage range.',
    weights: weights({ ads: 1.1, stf: .6, ttk: 1, fireRate: 1, recoil: 2, mobility: .3, adsMove: .3, flinch: .2, magazine: .1, reload: .05, velocity: 1, sway: .1, swap: .4 }),
  },
  // Warzone, after CODMunity's Warzone playstyles: long range, close range, sniper support and sniper. A full kill takes
  // 300 damage through plates, so magazine size counts for far more than in multiplayer, and fights run longer.
  {
    id: 'wz-ar-long', role: 'ar', mode: 'wz', name: 'Long range', distanceM: 40, gear: 'long', optic: 'choice',
    blurb: 'The main gun for 30 to 60 m fights. Recoil, bullet velocity and a magazine that kills through plates.',
    weights: weights({ ads: .5, stf: .2, ttk: 1, fireRate: 1, recoil: 4, mobility: .2, adsMove: .2, flinch: .5, magazine: 1.2, reload: .3, velocity: 1.5, sway: .3 }),
  },
  {
    id: 'wz-ar-close', role: 'ar', mode: 'wz', name: 'Close range', distanceM: 15, gear: 'close', optic: 'choice',
    blurb: 'A rifle built to push buildings. ADS, sprint-to-fire and recoil, with a big magazine.',
    weights: weights({ ads: 1, stf: 1, ttk: 1, fireRate: 1, recoil: 2.5, mobility: 1, adsMove: .6, flinch: .2, hipfire: .2, magazine: 1, reload: .2, velocity: 1 }),
  },
  {
    id: 'wz-smg-close', role: 'smg', mode: 'wz', name: 'Close range', distanceM: 10, gear: 'close', optic: 'choice',
    blurb: 'The close-range half of a Warzone loadout. Movement, sprint-to-fire and enough bullets for a full kill.',
    weights: weights({ ads: .9, stf: 1.3, ttk: 1, fireRate: 1, recoil: 2, mobility: 1.5, adsMove: .8, flinch: .1, hipfire: .4, magazine: 1.2, reload: .2, velocity: .6 }),
  },
  {
    id: 'wz-smg-support', role: 'smg', mode: 'wz', name: 'Sniper support', distanceM: 8, gear: 'close', optic: 'choice',
    blurb: 'The secondary behind a sniper. Swap speed, sprint-to-fire and movement come first.',
    weights: weights({ ads: 1, stf: 1.5, ttk: 1, fireRate: 1, recoil: 1.2, mobility: 2, adsMove: 1, hipfire: .6, magazine: .8, reload: .2, velocity: .4, swap: 1 }),
  },
  {
    id: 'wz-lmg-long', role: 'lmg', mode: 'wz', name: 'Long range', distanceM: 45, gear: 'long', optic: 'choice',
    blurb: 'Hold a ridge or a roof. Recoil and bullet velocity, with ADS you can live with.',
    weights: weights({ ads: .5, stf: .2, ttk: 1, fireRate: 1, recoil: 4, mobility: .1, adsMove: .1, flinch: .5, magazine: .6, reload: .4, velocity: 1.5, sway: .3 }),
  },
  {
    id: 'wz-dmr-long', role: 'dmr', mode: 'wz', name: 'Long range', distanceM: 50, gear: 'long', optic: 'choice', aim: AIMS.paced,
    blurb: 'Semi-auto shots at range. Recoil between shots, bullet velocity and flinch.',
    weights: weights({ ads: .7, stf: .3, ttk: 1, fireRate: 1, recoil: 3, mobility: .2, adsMove: .2, flinch: .6, magazine: .5, reload: .1, velocity: 1.5, sway: .4 }),
  },
  {
    id: 'wz-bolt-long', role: 'bolt', mode: 'wz', name: 'Long range', distanceM: 55, gear: 'long', optic: 'choice', aim: AIMS.aimed,
    blurb: 'Bolt-action shots at range. Bullet travel, sway, flinch and how many hits a kill takes.',
    weights: weights({ ads: .6, stf: .3, ttk: 1, fireRate: 1, recoil: .3, mobility: .3, adsMove: .3, flinch: 1.2, magazine: .3, velocity: 2, sway: 1, steady: .3 }),
  },
  {
    id: 'wz-sniper-long', role: 'sniper', mode: 'wz', name: 'Sniper', distanceM: 80, gear: 'long', optic: 'scope', aim: AIMS.aimed,
    blurb: 'Long sight lines. Bullet velocity matters most, then sway, flinch and headshot kills.',
    weights: weights({ ads: .5, stf: .3, ttk: 1, fireRate: 1, recoil: .3, mobility: .2, adsMove: .2, flinch: 1.5, velocity: 2, sway: 1.2, steady: .3 }),
  },
  {
    id: 'wz-shotgun-close', role: 'shotgun', mode: 'wz', name: 'Close range', distanceM: 5, gear: 'close', optic: 'none', ammo: 'pellets', followUps: .5,
    blurb: 'Buildings and stairwells. Sprint-to-fire, movement and hip fire.',
    weights: weights({ ads: .3, stf: 1.3, ttk: .5, fireRate: 1, recoil: .3, mobility: 1.5, adsMove: .3, hipfire: 1, magazine: .5, reload: .3 }),
  },
  {
    id: 'wz-pistol-secondary', role: 'pistol', mode: 'wz', name: 'Secondary', distanceM: 8, gear: 'allround', optic: 'choice', aim: AIMS.paced,
    blurb: 'A backup for when the primary runs dry. Swap speed, sprint-to-fire and ADS.',
    weights: weights({ ads: 1, stf: 1.2, ttk: 1, fireRate: 1, recoil: 1, mobility: .5, adsMove: .3, hipfire: .5, magazine: .5, reload: .1, velocity: .5, swap: 1 }),
  },
];

// The mode playstyle lists follow. data/game.ts sets it with the rest of the mode switch.
let currentMode: Mode = 'mp';
export function setPlaystyleMode(mode: Mode) { currentMode = mode; }
export const playstyleMode = () => currentMode;

export function roleOf(weapon: WeaponData): Role {
  switch (weapon.category) {
    case 'Submachine gun': return 'smg';
    case 'Light machine gun': return 'lmg';
    case 'Shotgun': return 'shotgun';
    case 'Sniper rifle': return 'sniper';
    case 'Pistol': return 'pistol';
    case 'Marksman rifle': return weapon.fireMode === 'single' ? 'bolt' : 'dmr';
    default: return 'ar';
  }
}

const byId = new Map(PLAYSTYLES.map(style => [style.id, style]));
export const playstyleById = (id: string) => byId.get(id);
export const playstylesFor = (weapon: WeaponData, mode: Mode = currentMode) => PLAYSTYLES.filter(style => style.role === roleOf(weapon) && (style.mode ?? 'mp') === mode);
/** The weapon's playstyle with this id, or its class default when the id belongs to another class or mode. */
export function playstyleFor(weapon: WeaponData, id: string): Playstyle {
  const style = byId.get(id);
  return style && playstylesFor(weapon).includes(style) ? style : playstylesFor(weapon)[0];
}

export type { MetricId };
