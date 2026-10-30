import type { GameData, GearItem, GearPick, GearResult, GearSlot, GearStyle, Settings, StreakStyle, WeaponData } from '../types.ts';
import { playstyleFor } from './playstyles.ts';

export const GEAR_SLOTS: { slot: GearSlot; label: string }[] = [
  { slot: 'tactical', label: 'Tactical' }, { slot: 'lethal', label: 'Lethal' }, { slot: 'field', label: 'Field upgrade' },
  { slot: 'perk1', label: 'Perk 1' }, { slot: 'perk2', label: 'Perk 2' }, { slot: 'perk3', label: 'Perk 3' },
];

// Small, stated playstyle rules on top of what the guides pick. 1 means the playstyle wants it.
const FIT: Record<GearStyle, Record<string, { value: number; why: string }>> = {
  allround: {
    'Quick Fix': { value: 1, why: 'heals right after each kill' }, Ninja: { value: .8, why: 'quiet footsteps' }, Ghost: { value: .8, why: 'hides you from UAVs' },
    'Battle Hardened': { value: .6, why: 'shrugs off flashes and stuns' }, Stim: { value: .8, why: 'instant heal and sprint reset' }, 'Sticky Grenade': { value: .6, why: 'reliable lethal' },
    'Frag Grenade': { value: .6, why: 'reliable lethal' }, 'Trophy System': { value: .6, why: 'stops grenades on objectives' }, 'Munitions Box': { value: .5, why: 'refills your team' },
  },
  close: {
    Ninja: { value: 1, why: 'rushing needs quiet footsteps' }, 'Blood Rush': { value: 1, why: 'more tactical sprint between fights' }, 'Quick Fix': { value: .8, why: 'chain fights without waiting to heal' },
    'Fast Hands': { value: .6, why: 'faster reloads mid-push' }, Stim: { value: .9, why: 'heal and reset sprint on the move' }, 'Flash Grenade': { value: .6, why: 'clears rooms before you enter' },
    'Sticky Grenade': { value: .6, why: 'flushes corners' }, DDOS: { value: .5, why: 'shuts off sensors on your route' },
  },
  long: {
    Ghost: { value: 1, why: 'holding lanes gets you spotted by UAVs' }, 'High Alert': { value: .7, why: 'warns you about flankers' }, Tracker: { value: .5, why: 'shows where enemies have walked' },
    'Cold-Blooded': { value: .6, why: 'hides you from drones and thermals' }, 'Battle Hardened': { value: .6, why: 'keeps your aim through flashes' }, Claymore: { value: .8, why: 'guards your flank' },
    'Trip Wire': { value: .6, why: 'guards your flank' }, 'Heartbeat Sensor': { value: .5, why: 'checks the flank' }, 'Portable Radar': { value: .6, why: 'keeps watch while you aim down a lane' },
  },
  control: {
    'Quick Fix': { value: .9, why: 'heals right after each kill' }, Ghost: { value: .8, why: 'hides you from UAVs' }, 'Battle Hardened': { value: .8, why: 'keeps your aim through flashes' },
    Stim: { value: .8, why: 'instant heal' }, 'Frag Grenade': { value: .6, why: 'reliable lethal' }, 'Trophy System': { value: .6, why: 'stops grenades' },
  },
};

// No site ranks killstreaks yet. These values follow the streak style and are shown as a stated rule.
const STREAK_VALUE: Record<StreakStyle, Record<string, number>> = {
  support: { UAV: 1, 'Counter UAV': .9, 'Advanced UAV': 1, 'Care Package': .4, 'Bomb Glider': .3, 'Impact Warhead': .3, 'Artillery Beacon': .4, Crossfire: .4, 'Combat Drone': .4, Wheelson: .4, 'Missile Salvo': .4, 'Railgun Sentry': .4, 'Attack Helicopter': .5, Deathstalker: .4, Argonaut: .3, Gunship: .5, 'Air Lockdown': .6 },
  lethal: { UAV: .6, 'Counter UAV': .3, 'Advanced UAV': .5, 'Care Package': .5, 'Bomb Glider': .6, 'Impact Warhead': .6, 'Artillery Beacon': .7, Crossfire: .8, 'Combat Drone': .7, Wheelson: .7, 'Missile Salvo': .9, 'Railgun Sentry': .7, 'Attack Helicopter': .9, Deathstalker: .9, Argonaut: .6, Gunship: 1, 'Air Lockdown': .9 },
  mixed: { UAV: 1, 'Counter UAV': .6, 'Advanced UAV': .8, 'Care Package': .5, 'Bomb Glider': .5, 'Impact Warhead': .5, 'Artillery Beacon': .7, Crossfire: .7, 'Combat Drone': .6, Wheelson: .6, 'Missile Salvo': .8, 'Railgun Sentry': .6, 'Attack Helicopter': .9, Deathstalker: .8, Argonaut: .6, Gunship: 1, 'Air Lockdown': .9 },
};

const slotKind = (slot: GearSlot) => slot.startsWith('perk') ? 'perk' : slot;
const perkSlot = (slot: GearSlot) => slot.startsWith('perk') ? Number(slot.slice(-1)) : null;

export function streakCost(item: GearItem, hardline: boolean) { return item.cost == null ? null : item.cost - (hardline ? 1 : 0); }

/** Share of guide gear picks that include an item, for one gun and across its class. */
function shares(data: GameData, weapon: WeaponData) {
  // Generic picks, the same on every gun page, count for the class but not for the gun itself.
  const count = (ids: string[], ownOnly = false) => {
    const picks = ids.flatMap(id => data.metaGear[id] ?? []).filter(pick => !ownOnly || !pick.generic);
    const map = new Map<string, number>();
    for (const pick of picks) for (const item of new Set(pick.items)) map.set(item, (map.get(item) ?? 0) + 1);
    return { map, total: picks.length };
  };
  const own = count([weapon.id], true);
  const cls = count(data.weapons.filter(item => item.category === weapon.category).map(item => item.id));
  const sources = new Map<string, string[]>(), general = new Map<string, string[]>();
  for (const pick of data.metaGear[weapon.id] ?? []) for (const item of pick.items) (pick.generic ? general : sources).set(item, [...(pick.generic ? general : sources).get(item) ?? [], pick.source]);
  return {
    own: (id: string) => own.total ? (own.map.get(id) ?? 0) / own.total : 0,
    cls: (id: string) => cls.total ? (cls.map.get(id) ?? 0) / cls.total : 0,
    sources: (id: string) => sources.get(id) ?? [],
    general: (id: string) => general.get(id) ?? [],
  };
}

function scoreItem(data: GameData, weapon: WeaponData, item: GearItem, style: GearStyle, share: ReturnType<typeof shares>): GearPick {
  const own = share.own(item.id), cls = share.cls(item.id), fit = FIT[style][item.name];
  const parts: [number, number][] = [[.45, own], [.25, cls], [.15, fit?.value ?? 0]];
  if (item.tier != null) parts.push([.15, item.tier]);
  const total = parts.reduce((sum, [w]) => sum + w, 0);
  const value = parts.reduce((sum, [w, v]) => sum + w * v, 0) / total;
  const reasons: string[] = [];
  const named = share.sources(item.id);
  if (named.length) reasons.push(`${[...new Set(named)].join(' and ')} pick${named.length === 1 ? 's' : ''} it for the ${weapon.name}`);
  else if (cls >= .2) reasons.push(`in ${Math.round(cls * 100)}% of guide setups for ${weapon.category.toLowerCase()}s`);
  for (const source of new Set(share.general(item.id))) reasons.push(`${source} lists it on every gun page`);
  if (item.tier != null && item.tier >= .67) reasons.push('top tier on the perk tier lists');
  if (fit) reasons.push(fit.why);
  return { id: item.id, value, reasons, locked: false };
}

export function recommendGear(data: GameData, weapon: WeaponData, settings: Settings): GearResult {
  const share = shares(data, weapon);
  const style = playstyleFor(weapon, settings.preset).gear;
  const unlocked = (item: GearItem) => item.unlock == null || item.unlock <= settings.playerLevel;
  const picks: Partial<Record<GearSlot, GearPick>> = {};
  const alternatives: Partial<Record<GearSlot, GearPick[]>> = {};
  for (const { slot } of GEAR_SLOTS) {
    const options = data.gear.filter(item => item.kind === slotKind(slot) && (perkSlot(slot) === null || item.perkSlot === perkSlot(slot)));
    const lockedId = settings.gearLocks[slot];
    const ranked = options.filter(item => unlocked(item) && item.name !== 'Overkill')
      .map(item => scoreItem(data, weapon, item, style, share)).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
    const locked = lockedId ? options.find(item => item.id === lockedId) : undefined;
    picks[slot] = locked ? { ...scoreItem(data, weapon, locked, style, share), locked: true } : ranked[0];
    alternatives[slot] = ranked.filter(pick => pick.id !== picks[slot]?.id).slice(0, 3);
  }
  const hardline = data.gear.find(item => item.id === picks.perk2?.id)?.name === 'Hardline';
  const values = STREAK_VALUE[settings.streakStyle];
  const lockedStreaks = settings.streakLocks.map(id => data.gear.find(item => item.id === id)).filter((item): item is GearItem => !!item && item.kind === 'streak');
  const pool = data.gear.filter(item => item.kind === 'streak' && unlocked(item) && (streakCost(item, hardline) ?? 99) <= settings.killBand);
  let best: GearItem[] = [], bestValue = -Infinity;
  const candidates = [...new Map([...lockedStreaks, ...pool].map(item => [item.id, item])).values()];
  for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) for (let k = j + 1; k < candidates.length; k++) {
    const set = [candidates[i], candidates[j], candidates[k]];
    if (!lockedStreaks.every(item => set.includes(item))) continue;
    const costs = new Set(set.map(item => item.cost));
    // Staggered costs pay out across a life instead of all at once.
    const value = set.reduce((sum, item) => sum + (values[item.name] ?? .3), 0) + (costs.size - 1) * .15;
    if (value > bestValue) { bestValue = value; best = set; }
  }
  const streaks = best.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0)).map(item => ({ id: item.id, value: values[item.name] ?? .3, reasons: [`${streakCost(item, hardline)} kills${hardline ? ' with Hardline' : ''}`], locked: settings.streakLocks.includes(item.id) }));
  return { picks, alternatives, streaks, hardline };
}
