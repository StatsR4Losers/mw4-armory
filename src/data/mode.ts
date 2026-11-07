import type { GameData, Mode } from '../types.ts';

const views = new WeakMap<GameData, GameData>();

/**
 * The game data as one mode sees it. Warzone keeps every gun, part and unlock level, and swaps in the Warzone base stats,
 * damage, health, attachment changes, Apex changes and site builds. A gun with no Warzone record has no stats there.
 */
export function modeView(data: GameData, mode: Mode): GameData {
  if (mode === 'mp' || !data.warzone) return data;
  const cached = views.get(data);
  if (cached) return cached;
  const wz = data.warzone;
  const view: GameData = {
    ...data,
    weapons: data.weapons.map(weapon => {
      const found = wz.weapons[weapon.id];
      if (!found || !wz.loadouts[weapon.id]) return { ...weapon, base: null };
      return { ...weapon, base: found.base, damage: found.damage, health: wz.rules.health, apex: weapon.apex && { ...weapon.apex, mods: found.apex } };
    }),
    loadouts: wz.loadouts,
    meta: wz.meta,
    // Game8 and WZStats perk picks are multiplayer picks, and Warzone runs its own perks, so none carry over.
    metaGear: {},
    consensus: wz.consensus,
  };
  views.set(data, view);
  return view;
}
