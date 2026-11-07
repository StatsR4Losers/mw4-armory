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

/** votes is what each source says, in SOURCE_NAMES order, or null where it does not pick the item. rule is this site's own reason. */
export interface GearPick { id: string; name: string; effect: string; reasons: string[]; votes: (string | null)[]; rule: string | null; runnerUp: string | null }
export const SOURCE_NAMES = ['WZStats', 'TimeSaver', 'Activision'] as const;
export interface WarzoneGearResult { style: GearStyle; perks: GearPick[]; elite: GearPick | null; lethal: GearPick; tactical: GearPick }

export function recommendWarzoneGear(gear: WarzoneGear, style: GearStyle): WarzoneGearResult {
  const { wzstats, timesaver, activision } = gear.sources;
  const combo = timesaver.combos[COMBO[style]] ?? [];
  const defaults = DEFAULTS[style].map(key => [key, activision.loadouts[key]] as const).filter(([, loadout]) => loadout);
  const comboName = COMBO[style] === 'stealth' && style === 'sniper' ? 'anti-recon' : COMBO[style];
  const score = (id: string) => {
    const reasons: string[] = [];
    const votes: (string | null)[] = [null, null, null];
    let value = 0;
    if (wzstats.meta.includes(id)) { value += 2; reasons.push('WZStats meta tier'); votes[0] = 'Meta'; }
    else if (wzstats.a.includes(id)) { value += 1; reasons.push('WZStats A tier'); votes[0] = 'A tier'; }
    if (combo.includes(id)) { value += 1.5; reasons.push(`TimeSaver's ${comboName} combo`); votes[1] = 'Combo'; }
    for (const [key, loadout] of defaults) if (loadout.items.includes(id)) {
      const name = `${key[0].toUpperCase()}${key.slice(1)}`;
      value += 1; reasons.push(`Activision's ${name} default`); votes[2] ??= name;
    }
    const rule = RULES[style][id] ?? null;
    if (rule) { value += 1; reasons.push(rule); }
    return { value, reasons, votes, rule };
  };
  const pick = (items: [string, string, string][]): GearPick => {
    // On a tie, the item that suits the playstyle wins.
    const ranked = items.map(([id, name, effect]) => ({ id, name, effect, ...score(id), fits: RULES[style][id] ? 1 : 0 })).sort((a, b) => b.value - a.value || b.fits - a.fits);
    const [best, next] = ranked;
    return { id: best.id, name: best.name, effect: best.effect, reasons: best.reasons, votes: best.votes, rule: best.rule, runnerUp: next && next.value > 0 ? next.name : null };
  };
  const perks = [1, 2, 3].map(slot => pick(gear.perks.filter(perk => perk[2] === slot).map(([id, name, , effect]) => [id, name, effect])));
  // Elite perks are bought or found in a match, so only TimeSaver's combo names one.
  const eliteId = combo.find(id => gear.elite.some(item => item[0] === id));
  const eliteItem = gear.elite.find(item => item[0] === eliteId);
  const elite = eliteItem ? { id: eliteItem[0], name: eliteItem[1], effect: eliteItem[2], reasons: [`TimeSaver's ${comboName} combo`], votes: [null, 'Combo', null], rule: null, runnerUp: null } : null;
  return { style, perks, elite, lethal: pick(gear.lethal), tactical: pick(gear.tactical) };
}
