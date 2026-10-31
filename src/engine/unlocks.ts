import type { Armory, GameData, Settings } from '../types.ts';

// MW4 unlocks each attachment once. After that it works on every gun that takes it, and a weapon level that would
// hand out a part you already own is skipped with a Bonus Level Up (Activision's launch and progression posts, Oct 2026).
// The data has no flag for which parts are shared. A part counts as shared when CODMunity lists it under the same name
// on more than one gun. Magazines and No Stock reuse generic names across calibers, such as the 60 Round Drum on the M4
// and the VEL 46, so they stay gun-specific.

type Site = { weaponId: string; level: number };
type Owner = Pick<Settings, 'level' | 'armory'>;
const index = new WeakMap<GameData, Map<string, Site[]>>();

/** Every gun that lists the part, with the weapon level it unlocks at there. Level 0 means the source lists no level. */
export function unlockSites(data: GameData, id: string): Site[] {
  let map = index.get(data);
  if (!map) {
    map = new Map();
    for (const [weaponId, list] of Object.entries(data.loadouts)) for (const [part, level] of list) {
      const sites = map.get(part) ?? [];
      sites.push({ weaponId, level });
      map.set(part, sites);
    }
    index.set(data, map);
  }
  return map.get(id) ?? [];
}

export function sharedPart(data: GameData, id: string) {
  return data.attachments[id]?.slot !== 'magazine' && id !== 'no-stock' && unlockSites(data, id).length > 1;
}

/** The key a hand-set mark is stored under. A mark on a shared part applies to every gun that takes it. */
export const markKey = (data: GameData, weaponId: string, id: string) => sharedPart(data, id) ? id : `${weaponId}:${id}`;

/** The level a gun's unlocks count at on other guns. A prestiged gun reached its max before it reset. */
export function reachedLevel(data: GameData, weaponId: string, armory: Armory) {
  if (armory.prestiged.includes(weaponId)) return data.weapons.find(weapon => weapon.id === weaponId)?.maxLevel ?? 0;
  return armory.levels[weaponId] ?? 0;
}

export type Unlock =
  | { unlocked: true; via: 'level' | 'marked' }
  | { unlocked: true; via: 'shared'; weaponId: string; level: number }
  | { unlocked: false; via: 'level' | 'marked' };

/** Whether a part is unlocked on this gun, and how. Without an armory only this gun's level counts. */
export function unlockState(data: GameData, weaponId: string, id: string, owner: Owner): Unlock {
  const armory = owner.armory;
  if (armory) {
    const key = markKey(data, weaponId, id);
    if (armory.missing.includes(key)) return { unlocked: false, via: 'marked' };
    if (armory.have.includes(key)) return { unlocked: true, via: 'marked' };
  }
  const own = unlockSites(data, id).find(site => site.weaponId === weaponId);
  if (own && own.level <= owner.level) return { unlocked: true, via: 'level' };
  // Weapon Prestige relocks every part on the prestiged gun, shared ones included. Other guns keep theirs.
  if (armory && sharedPart(data, id) && !armory.prestiged.includes(weaponId)) {
    for (const site of unlockSites(data, id)) {
      if (site.weaponId === weaponId || !site.level) continue;
      if (reachedLevel(data, site.weaponId, armory) >= site.level) return { unlocked: true, via: 'shared', weaponId: site.weaponId, level: site.level };
    }
  }
  return { unlocked: false, via: 'level' };
}

export type Route = { weaponId: string; level: number; at: number | null; left: number };

/** Where a part unlocks, fewest levels to go first: on this gun, or for a shared part on any gun that takes it. */
export function unlockRoutes(data: GameData, weaponId: string, id: string, owner: Owner): Route[] {
  const armory = owner.armory;
  const shared = sharedPart(data, id) && !armory?.prestiged.includes(weaponId);
  const known = (other: string) => !!armory && (other in armory.levels || armory.prestiged.includes(other));
  return unlockSites(data, id)
    .filter(site => site.level > 0 && (site.weaponId === weaponId || shared))
    .map(site => {
      const at = site.weaponId === weaponId ? owner.level : known(site.weaponId) ? reachedLevel(data, site.weaponId, armory!) : null;
      return { ...site, at, left: site.level - (at ?? 0) };
    })
    .sort((a, b) => a.left - b.left || Number(b.weaponId === weaponId) - Number(a.weaponId === weaponId));
}

/** Plain text for the closest routes, such as "level 33 here, or level 21 on the Warlord". */
export function unlockHint(data: GameData, weaponId: string, id: string, owner: Owner) {
  const routes = unlockRoutes(data, weaponId, id, owner).slice(0, 2);
  const where = (route: Route) => route.weaponId === weaponId ? `level ${route.level} here` : `level ${route.level} on the ${data.weapons.find(weapon => weapon.id === route.weaponId)?.name ?? route.weaponId}`;
  return routes.map(where).join(', or ');
}
