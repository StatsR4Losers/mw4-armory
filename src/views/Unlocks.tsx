import { useMemo } from 'react';
import { attachmentImage, categories, data, slotName, supported } from '../data/game';
import { sharedPart, unlockRoutes, unlockSites, unlockState } from '../engine';
import type { Route } from '../engine';
import { Icon } from '../components/Icon';
import type { Armory, BuildResult, Settings, WeaponData } from '../types';

const signedMs = (value: number) => { const rounded = Math.round(value); return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} ms`; };
const gunName = (id: string) => data.weapons.find(weapon => weapon.id === id)?.name ?? id;

/** Where a part comes from on this gun, for the small tag next to its name. */
export function unlockTag(weapon: WeaponData, id: string, settings: Settings): { text: string; title: string; shared: boolean } | null {
  const state = unlockState(data, weapon.id, id, settings);
  if (state.unlocked && state.via === 'shared') return { text: `${gunName(state.weaponId)} Lv ${state.level}`, title: `Unlocked on the ${gunName(state.weaponId)} at level ${state.level}. Shared parts work on every gun that takes them.`, shared: true };
  if (state.unlocked && state.via === 'marked') return { text: 'Marked', title: 'You marked this part as unlocked.', shared: true };
  const level = unlockSites(data, id).find(site => site.weaponId === weapon.id)?.level;
  return level ? { text: `Lv ${level}`, title: `Unlocks at level ${level} on the ${weapon.name}.`, shared: false } : null;
}

function routeText(weapon: WeaponData, route: Route) {
  const where = route.weaponId === weapon.id ? 'here' : `on the ${gunName(route.weaponId)}`;
  return `Level ${route.level} ${where}${route.at == null ? '' : `, ${route.left} to go`}`;
}

/** Levels on the player's other guns. Shared parts unlocked on any of them count on this one. */
export function OtherGuns({ weapon, armory, setArmory }: { weapon: WeaponData; armory: Armory; setArmory: (update: (current: Armory) => Armory) => void }) {
  const others = data.weapons.filter(item => supported(item) && item.id !== weapon.id);
  // How many of this gun's parts each other gun also unlocks.
  const shares = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [id] of data.loadouts[weapon.id] ?? []) {
      if (!sharedPart(data, id)) continue;
      for (const site of unlockSites(data, id)) if (site.weaponId !== weapon.id && site.level) counts.set(site.weaponId, (counts.get(site.weaponId) ?? 0) + 1);
    }
    return counts;
  }, [weapon.id]);
  const entered = others.filter(item => item.id in armory.levels || armory.prestiged.includes(item.id)).length;
  const marks = armory.have.length + armory.missing.length;
  const setLevel = (id: string, value: string) => setArmory(current => {
    const levels = { ...current.levels };
    const max = data.weapons.find(item => item.id === id)?.maxLevel ?? 1;
    if (value === '') delete levels[id];
    else levels[id] = Math.max(0, Math.min(max, Math.round(Number(value)) || 0));
    return { ...current, levels };
  });
  const togglePrestige = (id: string) => setArmory(current => ({ ...current, prestiged: current.prestiged.includes(id) ? current.prestiged.filter(item => item !== id) : [...current.prestiged, id] }));
  return <details className="armory">
    <summary><span>Your other guns</span><small>{entered ? `${entered} entered` : 'none entered'}</small><Icon name="chevron" size={14}/></summary>
    <p className="hint">MW4 unlocks a shared part once, for every gun that takes it. Enter the highest level you have reached on each gun, and its shared parts count on the {weapon.name} too. Tick P for a gun in Weapon Prestige: its earlier unlocks still count on your other guns.</p>
    <div className="armory-actions">
      <button className="link" onClick={() => setArmory(current => ({ ...current, levels: { ...current.levels, ...Object.fromEntries(others.map(item => [item.id, item.maxLevel ?? 1])) } }))}>Set all to max</button>
      {entered > 0 && <button className="link" onClick={() => setArmory(current => ({ ...current, levels: Object.fromEntries(Object.entries(current.levels).filter(([id]) => id === weapon.id)), prestiged: current.prestiged.filter(id => id === weapon.id) }))}>Clear</button>}
    </div>
    {categories.map(category => {
      const list = others.filter(item => item.category === category);
      if (!list.length) return null;
      return <div key={category} className="armory-group">
        <h4>{category}</h4>
        {list.map(item => {
          const prestiged = armory.prestiged.includes(item.id);
          const count = shares.get(item.id) ?? 0;
          return <div key={item.id} className={`armory-row ${count ? '' : 'dim'}`}>
            <label htmlFor={`gun-${item.id}`}><b>{item.name}</b><small>{count ? `${count} shared part${count > 1 ? 's' : ''}` : 'shares nothing'}</small></label>
            <input id={`gun-${item.id}`} type="number" inputMode="numeric" min={0} max={item.maxLevel ?? 1} placeholder="0" value={armory.levels[item.id] ?? ''} onChange={event => setLevel(item.id, event.target.value)}/>
            <button className="mini" onClick={() => setLevel(item.id, String(item.maxLevel ?? 1))} aria-label={`Set ${item.name} to level ${item.maxLevel}`} title={`Set to level ${item.maxLevel}`}>Max</button>
            <button className={`mini ${prestiged ? 'on' : ''}`} aria-pressed={prestiged} onClick={() => togglePrestige(item.id)} aria-label={`${item.name} in Weapon Prestige`} title="In Weapon Prestige">P</button>
          </div>;
        })}
      </div>;
    })}
    {marks > 0 && <p className="hint">{marks} part{marks > 1 ? 's' : ''} marked by hand. <button className="link" onClick={() => setArmory(current => ({ ...current, have: [], missing: [] }))}>Clear marks</button></p>}
  </details>;
}

/** The parts the best build would add if everything were unlocked, and the fastest place to unlock each. */
export function UnlockGap({ weapon, best, ceiling, settings, onMark }: { weapon: WeaponData; best: BuildResult; ceiling: BuildResult | null; settings: Settings; onMark: (id: string, state: 'have' | 'missing' | null) => void }) {
  if (!ceiling) return null;
  const missing = ceiling.attachments.filter(id => !unlockState(data, weapon.id, id, settings).unlocked);
  const gain = ceiling.score - best.score;
  if (!missing.length || gain < .5) return null;
  const value = new Map(ceiling.contributions.map(item => [item.id, item.score]));
  return <div className="unlock-gap">
    <p><b>{signedMs(gain)} with every part unlocked.</b> The best {ceiling.apex ? 'Apex ' : ''}build at these settings uses {missing.length === 1 ? 'a part' : `${missing.length} parts`} you have not unlocked. Each one's time is what it adds inside that build, so your current parts already cover some of it.</p>
    <ul>{missing.map(id => {
      const marked = unlockState(data, weapon.id, id, settings).via === 'marked';
      const routes = unlockRoutes(data, weapon.id, id, settings).filter(route => route.left > 0).slice(0, 2);
      const image = attachmentImage(id);
      return <li key={id}>
        <span className="part-name">{image ? <img src={image} alt=""/> : <Icon name="grid" size={14}/>}<b>{data.attachments[id].name}</b></span>
        <span className="gap-value" title="What this part adds in that build">{signedMs(value.get(id) ?? 0)}</span>
        <span className="gap-route">{[slotName(data.attachments[id].slot), ...(marked ? ['you marked it as not unlocked'] : routes.map(route => routeText(weapon, route)))].join(' · ')}</span>
        <button className="button ghost small" onClick={() => onMark(id, marked ? null : 'have')}>{marked ? 'Undo' : 'I have it'}</button>
      </li>;
    })}</ul>
  </div>;
}
