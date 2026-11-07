import raw from './game.json';
import type { GameData, Mode, Mods, WeaponData } from '../types';
import { modeView } from './mode';
import { resetCaches, setPlaystyleMode } from '../engine';

const multiplayer = raw as unknown as GameData;
// Every screen reads this one object. setMode swaps its contents between the multiplayer and Warzone views.
export const data: GameData = { ...multiplayer };
let mode: Mode = 'mp';
export const currentMode = () => mode;
export const hasWarzone = !!multiplayer.warzone;
export function setMode(next: Mode = 'mp') {
  if (next === 'wz' && !hasWarzone) next = 'mp';
  if (next === mode) return;
  mode = next;
  Object.assign(data, modeView(multiplayer, next));
  setPlaystyleMode(next);
  resetCaches();
}
/** Multiplayer numbers, for the screens that only show multiplayer, like Patch notes. */
export const multiplayerData = multiplayer;

export const supported = (weapon: WeaponData) => !!weapon.base && !!data.loadouts[weapon.id]?.length;
export const weaponById = (id: string) => data.weapons.find(weapon => weapon.id === id);
export const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
export const weaponImage = (id: string) => asset(`weapons/${id}.webp`);
/** New guns can arrive before anyone publishes a render. Their image slot stays empty instead of a broken icon. */
export const hideMissing = (event: { currentTarget: HTMLImageElement }) => { event.currentTarget.style.visibility = 'hidden'; };
export const attachmentImage = (id: string) => data.attachments[id]?.image ? asset(`attachments/${id}.webp`) : null;

export function attachmentEntry(weaponId: string, attachmentId: string): { level: number; mods: Mods } | null {
  const entry = data.loadouts[weaponId]?.find(item => item[0] === attachmentId);
  return entry ? { level: entry[1], mods: entry[2] } : null;
}

const categoryOrder = ['Assault rifle', 'Submachine gun', 'Light machine gun', 'Shotgun', 'Marksman rifle', 'Sniper rifle', 'Pistol', 'Launcher', 'Melee'];
export const categories = categoryOrder.filter(category => data.weapons.some(weapon => weapon.category === category));
export const shortCategory: Record<string, string> = {
  'Assault rifle': 'AR', 'Submachine gun': 'SMG', 'Light machine gun': 'LMG', Shotgun: 'Shotgun',
  'Marksman rifle': 'Marksman', 'Sniper rifle': 'Sniper', Pistol: 'Pistol', Launcher: 'Launcher', Melee: 'Melee',
};

const SLOT_ORDER = ['optic', 'muzzle', 'barrel', 'laser', 'underbarrel', 'guard', 'magazine', 'ammunition', 'rear-grip', 'stock', 'comb', 'bolt', 'trigger-action', 'cylinder'];
export const slotName = (slot: string) => slot === 'rear-grip' ? 'Rear grip' : slot === 'trigger-action' ? 'Trigger action' : slot[0].toUpperCase() + slot.slice(1);
/** Gunsmith order, so lists read the way the game shows them. */
export const sortSlots = (ids: string[]) => ids.filter(id => data.attachments[id])
  .sort((a, b) => SLOT_ORDER.indexOf(data.attachments[a].slot) - SLOT_ORDER.indexOf(data.attachments[b].slot));
