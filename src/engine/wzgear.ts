// Warzone perks and equipment. Each slot takes the item with the most support across three sources: WZStats' Season 1
// Warzone tier lists, TimeSaver's perk combos per playstyle, and Activision's default loadouts. A short rule per
// playstyle, this site's own, breaks ties toward items that suit it. Every pick lists its reasons.
import type { WarzoneGear } from '../types.ts';

export type GearStyle = 'aggressive' | 'sniper' | 'support' | 'stealth' | 'resurgence';
export const GEAR_STYLES: Record<GearStyle, { name: string; blurb: string }> = {
  aggressive: { name: 'Aggressive', blurb: 'Push fights and take them first.' },
  sniper: { name: 'Sniper', blurb: 'Hold an angle and stay hidden from recon.' },
  support: { name: 'Squad support', blurb: 'Revive, resupply and keep the squad alive.' },
  stealth: { name: 'Stealth', blurb: 'Rotate unseen and stay off radar.' },
  resurgence: { name: 'Resurgence', blurb: 'Fast respawn fights on small maps.' },
};
// Which TimeSaver combo and which Activision defaults speak for each playstyle. TimeSaver has no sniper combo, so the
// sniper takes its anti-recon one.
const COMBO: Record<GearStyle, string> = { aggressive: 'aggressive', sniper: 'stealth', support: 'support', stealth: 'stealth', resurgence: 'resurgence' };
const DEFAULTS: Record<GearStyle, string[]> = { aggressive: ['assault', 'stalker'], sniper: ['sniper'], support: ['demolition'], stealth: ['sniper'], resurgence: ['stalker'] };
// This site's rules: equipment that suits each playstyle.
const RULES: Record<GearStyle, Record<string, string>> = {
  aggressive: { stim: 'Heals mid-push and refreshes Tactical Sprint', semtex: 'Sticks and kills on a push' },
  sniper: { claymore: 'Guards your back while you are scoped in', tripwire: 'Guards your back while you are scoped in', snapshot: 'Finds the squad pushing you', heartbeat: 'Finds the squad pushing you' },
  support: { smoke: 'Covers revives and plates' },
  stealth: { heartbeat: 'Finds enemies before they find you' },
  resurgence: { stim: 'Heals mid-fight between respawns' },
};

export interface GearPick { id: string; name: string; effect: string; reasons: string[]; runnerUp: string | null }
export interface WarzoneGearResult { style: GearStyle; perks: GearPick[]; elite: GearPick | null; lethal: GearPick; tactical: GearPick }

export function recommendWarzoneGear(gear: WarzoneGear, style: GearStyle): WarzoneGearResult {
  const { wzstats, timesaver, activision } = gear.sources;
  const combo = timesaver.combos[COMBO[style]] ?? [];
  const defaults = DEFAULTS[style].map(key => [key, activision.loadouts[key]] as const).filter(([, loadout]) => loadout);
  const score = (id: string) => {
    const reasons: string[] = [];
    let value = 0;
    if (wzstats.meta.includes(id)) { value += 2; reasons.push('WZStats meta tier'); }
    else if (wzstats.a.includes(id)) { value += 1; reasons.push('WZStats A tier'); }
    if (combo.includes(id)) { value += 1.5; reasons.push(`TimeSaver's ${COMBO[style] === 'stealth' && style === 'sniper' ? 'anti-recon' : COMBO[style]} combo`); }
    for (const [key, loadout] of defaults) if (loadout.items.includes(id)) { value += 1; reasons.push(`Activision's ${key[0].toUpperCase()}${key.slice(1)} default`); }
    const rule = RULES[style][id];
    if (rule) { value += 1; reasons.push(rule); }
    return { value, reasons };
  };
  const pick = (items: [string, string, string][]): GearPick => {
    // On a tie, the item that suits the playstyle wins.
    const ranked = items.map(([id, name, effect]) => ({ id, name, effect, ...score(id), fits: RULES[style][id] ? 1 : 0 })).sort((a, b) => b.value - a.value || b.fits - a.fits);
    const [best, next] = ranked;
    return { id: best.id, name: best.name, effect: best.effect, reasons: best.reasons, runnerUp: next && next.value > 0 ? next.name : null };
  };
  const perks = [1, 2, 3].map(slot => pick(gear.perks.filter(perk => perk[2] === slot).map(([id, name, , effect]) => [id, name, effect])));
  // Elite perks are bought or found in a match, so only TimeSaver's combo names one.
  const eliteId = combo.find(id => gear.elite.some(item => item[0] === id));
  const eliteItem = gear.elite.find(item => item[0] === eliteId);
  const elite = eliteItem ? { id: eliteItem[0], name: eliteItem[1], effect: eliteItem[2], reasons: [`TimeSaver's ${COMBO[style] === 'stealth' && style === 'sniper' ? 'anti-recon' : COMBO[style]} combo`], runnerUp: null } : null;
  return { style, perks, elite, lethal: pick(gear.lethal), tactical: pick(gear.tactical) };
}
