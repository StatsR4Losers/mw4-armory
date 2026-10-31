import { useEffect, useMemo, useRef, useState } from 'react';
import { attachmentEntry, attachmentImage, categories, data, shortCategory, slotName, sortSlots, supported, weaponById, weaponImage } from '../data/game';
import { ATTACHMENT_LIMIT, METRICS, ROLES, STABILITY, TIE_MS, apexState, evaluateBuild, fullModel, markKey, playstyleById, shotInterval, playstyleFor, playstylesFor, roleOf, slugAmmo, weightsFor } from '../engine';
import type { Playstyle } from '../engine';
import { effects } from '../effects';
import { statRows, tone } from '../statRows';
import { Icon } from '../components/Icon';
import type { Armory, BuildResult, ClassResult, MetricId, OptimizeResult, Settings, Stability, StreakStyle, WeaponData } from '../types';
import type { CompareItem } from './CompareView';
import type { SavedClass } from './SavedView';
import { ClassSetup, SitePicks } from './BuildExtras';
import { OtherGuns, UnlockGap, unlockTag } from './Unlocks';

type Props = {
  settings: Settings; change: (patch: Partial<Settings>) => void; selectWeapon: (id: string) => void;
  armory: Armory; setArmory: (update: (current: Armory) => Armory) => void;
  result: OptimizeResult | null; busy: boolean; error: string; saved: SavedClass[];
  onSave: (variant: 'standard' | 'apex', build: BuildResult) => void; onShare: () => void; onCopy: (text: string, message?: string) => void; onReset: () => void;
  onCompare: (item: Omit<CompareItem, 'id'>) => void;
};
type Baseline = { label: string; attachments: string[]; apex: boolean; stock?: boolean };

const SLOT_ORDER = ['optic', 'muzzle', 'barrel', 'laser', 'underbarrel', 'guard', 'magazine', 'ammunition', 'rear-grip', 'stock', 'comb', 'bolt', 'trigger-action', 'cylinder'];
const TUNABLE: MetricId[] = ['ads', 'stf', 'ttk', 'fireRate', 'recoil', 'mobility', 'adsMove', 'flinch', 'hipfire', 'sway', 'steady', 'velocity', 'magazine', 'reload', 'swap'];
const emphasisLabel = (value: number) => value === 0 ? 'Off' : value < .75 ? 'Low' : value <= 1.25 ? 'Normal' : value <= 2 ? 'High' : 'Max';
const ms = (value: number | null | undefined) => value == null ? 'n/a' : `${Math.round(value)}`;
const window_ = (distance: number) => `${Math.round(distance * .5)}–${Math.round(distance * 1.5)} m`;
const signedMs = (value: number) => { const rounded = Math.round(value); return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} ms`; };

/** Names the settings that produced an earlier build, relative to the current ones. */
function describe(before: Settings, now: Settings) {
  const parts: string[] = [];
  if (before.preset !== now.preset) parts.push(playstyleById(before.preset)?.name ?? 'another playstyle');
  if (before.distanceM !== now.distanceM) parts.push(`${before.distanceM} m`);
  if (before.apex !== now.apex) parts.push(before.apex ? 'Apex on' : 'Apex off');
  if (before.optic !== now.optic && before.preset === now.preset) parts.push(before.optic ? 'optic on' : 'optic off');
  if (before.level !== now.level) parts.push(`level ${before.level}`);
  if (JSON.stringify(before.emphasis) !== JSON.stringify(now.emphasis)) parts.push('earlier fine-tune');
  if (before.locked.join() !== now.locked.join() || before.excluded.join() !== now.excluded.join()) parts.push('earlier locks');
  if (JSON.stringify(before.armory) !== JSON.stringify(now.armory) && before.level === now.level) parts.push('earlier unlocks');
  return parts.length ? parts.join(', ') : 'earlier settings';
}

/** The last build shown for this gun that differs from the current one. */
function usePreviousBuild(weapon: WeaponData, settings: Settings, best: BuildResult | null) {
  const last = useRef<{ key: string; attachments: string[]; apex: boolean; settings: Settings } | null>(null);
  const [previous, setPrevious] = useState<{ attachments: string[]; apex: boolean; settings: Settings } | null>(null);
  useEffect(() => {
    if (!best) return;
    const key = `${weapon.id}|${best.apex}|${[...best.attachments].sort().join()}`;
    const before = last.current;
    last.current = { key, attachments: best.attachments, apex: best.apex, settings };
    if (!before || before.settings.weaponId !== weapon.id) { setPrevious(null); return; }
    if (before.key !== key) setPrevious({ attachments: before.attachments, apex: before.apex, settings: before.settings });
  }, [best]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPrevious(null), [weapon.id]);
  return previous;
}

export function BuildView({ settings, change, armory, setArmory, selectWeapon, result, busy, error, saved, onSave, onShare, onCopy, onReset, onCompare }: Props) {
  const weapon = weaponById(settings.weaponId)!;
  const style = playstyleFor(weapon, settings.preset);
  const [minDistance, maxDistance] = ROLES[roleOf(weapon)].distance;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compareKey, setCompareKey] = useState('previous');
  const panel = useRef<HTMLElement>(null);
  const shown: ClassResult | undefined = settings.apex ? result?.apex : result?.standard;
  const other: ClassResult | undefined = settings.apex ? result?.standard : result?.apex;
  const best = shown?.best ?? null;
  const previous = usePreviousBuild(weapon, settings, best);
  useEffect(() => setCompareKey('previous'), [weapon.id]);

  const options = useMemo(() => {
    const list: { key: string; group: string; baseline: Baseline }[] = [];
    if (previous) list.push({ key: 'previous', group: 'Automatic', baseline: { label: `Previous build (${describe(previous.settings, settings)})`, attachments: previous.attachments, apex: previous.apex } });
    list.push({ key: 'stock', group: 'Automatic', baseline: { label: `Stock ${weapon.name}`, attachments: [], apex: false, stock: true } });
    if (other?.best) list.push({ key: 'other', group: 'Automatic', baseline: { label: settings.apex ? 'Best build without Apex' : `Best build with ${weapon.apex?.name}`, attachments: other.best.attachments, apex: !settings.apex } });
    (result?.meta ?? []).forEach((meta, index) => list.push({ key: `meta:${index}`, group: 'What the sites run', baseline: { label: `${meta.source}: ${meta.label}${meta.apex ? ' (Apex)' : ''}`, attachments: meta.attachments, apex: meta.apex } }));
    for (const item of saved.filter(entry => entry.weaponId === weapon.id)) list.push({ key: `saved:${item.id}`, group: 'Your saved classes', baseline: { label: item.name, attachments: item.attachments, apex: item.variant === 'apex' } });
    return list;
  }, [previous, other, result, saved, settings, weapon]);
  const chosen = options.find(option => option.key === compareKey) ?? options.find(option => option.key === 'stock')!;
  const baselineBuild = useMemo(() => {
    if (!result || !chosen) return null;
    if (chosen.baseline.stock) return result.stock;
    return evaluateBuild(data, weapon, settings, chosen.baseline.attachments, chosen.baseline.apex).build;
  }, [chosen, result, settings, weapon]);

  const toggle = (key: 'locked' | 'excluded', id: string) => {
    const opposite = key === 'locked' ? 'excluded' : 'locked';
    change({ [key]: settings[key].includes(id) ? settings[key].filter(item => item !== id) : [...settings[key], id], [opposite]: settings[opposite].filter(item => item !== id) });
  };
  const variantName = settings.apex ? weapon.apex?.name ?? 'Apex' : 'No Apex';
  const copyBuild = (build: BuildResult) => onCopy([`${weapon.name} · ${variantName}`, ...sortSlots(build.attachments).map(id => `${slotName(data.attachments[id].slot)}: ${data.attachments[id].name}`)].join('\n'));
  const compareWith = (key: string) => { setCompareKey(key); panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const apexNeeded = weapon.apex?.level ?? weapon.maxLevel ?? 0;
  const apexLocked = !!weapon.apex && !apexState(weapon, settings).available;
  const prestiged = armory.prestiged.includes(weapon.id);
  // A mark on a shared part applies to every gun that takes it. A part marked missing also drops out of the locks.
  const mark = (id: string, state: 'have' | 'missing' | null) => {
    const key = markKey(data, weapon.id, id);
    setArmory(current => ({ ...current, have: [...current.have.filter(item => item !== key), ...(state === 'have' ? [key] : [])], missing: [...current.missing.filter(item => item !== key), ...(state === 'missing' ? [key] : [])] }));
    if (state === 'missing' && settings.locked.includes(id)) change({ locked: settings.locked.filter(item => item !== id) });
  };
  const marked = (list: string[]) => (data.loadouts[weapon.id] ?? []).map(entry => entry[0]).filter(id => list.includes(markKey(data, weapon.id, id)));
  const markedMissing = marked(armory.missing), markedHave = marked(armory.have);

  return <div className="build-layout">
    <aside className="controls" aria-label="Build settings">
      <WeaponPicker weapon={weapon} open={pickerOpen} setOpen={setPickerOpen} onSelect={id => { selectWeapon(id); setPickerOpen(false); }}/>
      <section className="control">
        <div className="control-head"><label htmlFor="level">Weapon level</label><output>{settings.level}<small> / {weapon.maxLevel}</small></output></div>
        <input id="level" type="range" min={1} max={weapon.maxLevel ?? 1} value={settings.level} onChange={event => change({ level: Number(event.target.value) })}/>
        <label className="check-row"><input type="checkbox" checked={prestiged} onChange={() => setArmory(current => ({ ...current, prestiged: prestiged ? current.prestiged.filter(id => id !== weapon.id) : [...current.prestiged, weapon.id] }))}/>In Weapon Prestige</label>
        <p className="hint">{prestiged
          ? `Prestige relocked this gun's parts, so only its own unlocks up to level ${settings.level} count. Its Apex stays.`
          : 'Parts unlocked by this level count, plus shared parts you unlocked on your other guns.'}</p>
        <OtherGuns weapon={weapon} armory={armory} setArmory={setArmory}/>
      </section>
      <section className="control">
        <div className="control-head"><span>{ROLES[style.role].name} playstyle</span></div>
        <div className="presets">{playstylesFor(weapon).map(item => <button key={item.id} className={style.id === item.id ? 'active' : ''} aria-pressed={style.id === item.id} onClick={() => change({ preset: item.id, distanceM: item.distanceM })}>
          <strong>{item.name}{data.consensus?.[weapon.id]?.clear && data.consensus[weapon.id].style === item.id && <i className="sites-tag" title="The playstyle the guide sites' builds for this gun fit best">Sites' pick</i>}</strong><span>{item.blurb}</span>
        </button>)}</div>
      </section>
      <section className="control">
        <div className="control-head"><label htmlFor="distance">Typical fight distance</label><output>{settings.distanceM}<small> m</small></output></div>
        <input id="distance" type="range" min={minDistance} max={maxDistance} value={Math.max(minDistance, Math.min(maxDistance, settings.distanceM))} onChange={event => change({ distanceM: Number(event.target.value) })}/>
        <p className="hint">{distanceHint(weapon, style, settings.distanceM)}</p>
      </section>
      <section className="control">
        <div className="control-head"><span>Perks and streaks</span></div>
        <div className="setup-row"><label htmlFor="player-level">Player level</label><input id="player-level" type="number" min={1} max={55} value={settings.playerLevel} onChange={event => change({ playerLevel: Math.max(1, Math.min(55, Number(event.target.value) || 1)) })}/></div>
        <div className="control-head small"><label htmlFor="kill-band">Kills per life</label><output>{settings.killBand}</output></div>
        <input id="kill-band" type="range" min={3} max={13} value={settings.killBand} onChange={event => change({ killBand: Number(event.target.value) })}/>
        <div className="seg full" role="group" aria-label="Streak style">{(['mixed', 'support', 'lethal'] as StreakStyle[]).map(style => <button key={style} aria-pressed={settings.streakStyle === style} className={settings.streakStyle === style ? 'active' : ''} onClick={() => change({ streakStyle: style })}>{style[0].toUpperCase() + style.slice(1)}</button>)}</div>
      </section>
      <details className="control tune">
        <summary><Icon name="sliders" size={15}/>Fine-tune what matters<Icon name="chevron" size={14}/></summary>
        {/* Sliders scale the playstyle's own weights, so a stat the playstyle ignores has no slider. */}
        <div className="tune-list">{TUNABLE.filter(id => style.weights[id] > 0).map(id => <div key={id} className="tune-row">
          <label htmlFor={`e-${id}`} title={METRICS[id].help}>{METRICS[id].name}</label>
          <output>{emphasisLabel(settings.emphasis[id])}</output>
          <input id={`e-${id}`} type="range" min={0} max={3} step={.25} value={settings.emphasis[id]} onChange={event => change({ emphasis: { ...settings.emphasis, [id]: Number(event.target.value) } })}/>
        </div>)}</div>
        <button className="link" onClick={onReset}>Reset all settings for this gun</button>
      </details>
    </aside>

    <section className="workspace" aria-busy={busy}>
      <Hero weapon={weapon} result={result} settings={settings} busy={busy}/>
      {!fullModel(weapon) && <div className="callout"><Icon name="info" size={16}/><p>{weapon.fireMode === 'burst'
        ? <><b>No burst time-to-kill model.</b> The data has no burst delay, so damage range counts one millisecond per percent and the rest is handling and recoil.</>
        : <><b>Handling-only scoring.</b> The data has no pellet damage, spread or one-shot range for shotguns, and no slug damage. The pick covers aim speed, recoil, movement and pump speed. Treat it as a starting point.</>}</p></div>}
      {error && <div className="callout bad"><Icon name="info" size={16}/><p>{error}</p></div>}

      <section className={`build-panel ${busy ? 'is-busy' : ''}`} ref={panel}>
        <header className="build-head">
          <div className="build-title">
            <span className="eyebrow">Best build · {style.name} · {settings.distanceM} m</span>
            <h2>{settings.apex && weapon.apex ? <><Icon name="bolt" size={18}/>{weapon.apex.name}</> : 'No Apex'}</h2>
          </div>
          {best && <div className="build-score" title="Estimated milliseconds of fight time saved against the stock gun"><strong>{signedMs(best.score)}</strong><span>vs stock</span></div>}
        </header>

        <div className="build-switches">
          <label className={`switch ${!weapon.apex || apexLocked ? 'disabled' : ''}`}>
            <input type="checkbox" checked={settings.apex} disabled={!weapon.apex} onChange={event => change({ apex: event.target.checked })}/><span/>
            <b>Apex</b>{weapon.apex ? <em>{weapon.apex.name}{weapon.apex.blocks.length ? `, blocks ${weapon.apex.blocks.map(slotName).map(name => name.toLowerCase()).join(', ')}` : ''}</em> : <em>none for this gun</em>}
          </label>
          {style.optic === 'choice' ? <label className="switch">
            <input type="checkbox" checked={settings.optic} onChange={event => change({ optic: event.target.checked })}/><span/>
            <b>Optic</b><em>{settings.optic ? 'takes a slot, no stat change' : 'iron sights'}</em>
          </label> : <span className="switch-note"><b>{style.optic === 'scope' ? 'Stock scope' : 'No optic'}</b><em>{style.optic === 'scope' ? 'optics list no stat changes, so none takes a slot' : 'hip fire, so no slot goes to an optic'}</em></span>}
          <label className="compare-pick">
            <span>Compared with</span>
            <select value={chosen.key} onChange={event => setCompareKey(event.target.value)}>
              {[...new Set(options.map(option => option.group))].map(group => <optgroup key={group} label={group}>
                {options.filter(option => option.group === group).map(option => <option key={option.key} value={option.key}>{option.baseline.label}</option>)}
              </optgroup>)}
            </select>
          </label>
        </div>

        {result?.warnings.map(text => <p className="note" key={text}><Icon name="info" size={14}/>{text}</p>)}
        {settings.apex && apexLocked && <div className="locked-note"><Icon name="lock" size={16}/><p>{apexState(weapon, settings).reason}</p><button className="button ghost small" onClick={() => change({ level: apexNeeded })}>Set level to {apexNeeded}</button></div>}
        {shown && !shown.available && !(settings.apex && apexLocked) && <div className="locked-note"><Icon name="lock" size={16}/><p>{shown.reason}</p></div>}
        {!result && <div className="loading"><i className="spinner"/>Finding the best build</div>}

        {best && shown && <>
          {shown.stability && <StabilityLine stability={shown.stability}/>}
          <PartsDiff weapon={weapon} after={best} before={chosen.baseline} beforeLabel={chosen.baseline.label} result={shown} settings={settings} toggle={toggle} onMissing={id => mark(id, 'missing')}/>
          {baselineBuild && <StatsDiff weapon={weapon} after={best} before={baselineBuild} settings={settings}/>}
          <UnlockGap weapon={weapon} best={best} ceiling={shown.ceiling} settings={settings} onMark={mark}/>
          {(settings.locked.length > 0 || settings.excluded.length > 0 || markedMissing.length > 0 || markedHave.length > 0) && <div className="pins">
            {settings.locked.map(id => <button key={id} className="pin locked" onClick={() => toggle('locked', id)}><Icon name="lock" size={12}/>{data.attachments[id]?.name}<Icon name="close" size={12}/></button>)}
            {settings.excluded.map(id => <button key={id} className="pin excluded" onClick={() => toggle('excluded', id)}><Icon name="ban" size={12}/>{data.attachments[id]?.name}<Icon name="close" size={12}/></button>)}
            {markedMissing.map(id => <button key={id} className="pin missing" onClick={() => mark(id, null)} title="Marked as not unlocked. Press to undo."><Icon name="lock" size={12}/>{data.attachments[id]?.name}: not unlocked<Icon name="close" size={12}/></button>)}
            {markedHave.map(id => <button key={id} className="pin have" onClick={() => mark(id, null)} title="Marked as unlocked. Press to undo."><Icon name="unlock" size={12}/>{data.attachments[id]?.name}: unlocked<Icon name="close" size={12}/></button>)}
            {(settings.locked.length > 0 || settings.excluded.length > 0) && <button className="link" onClick={() => change({ locked: [], excluded: [] })}>Clear locks</button>}
          </div>}
          <footer className="build-actions">
            <button className="button" onClick={() => onSave(settings.apex ? 'apex' : 'standard', best)}><Icon name="save" size={15}/>Save class</button>
            <button className="button ghost" onClick={() => copyBuild(best)}><Icon name="copy" size={15}/>Copy list</button>
            <button className="button ghost" onClick={() => { onCompare({ label: chosen.baseline.label, weaponId: weapon.id, attachments: chosen.baseline.attachments, apex: chosen.baseline.apex }); onCompare({ label: `Best build, ${variantName}`, weaponId: weapon.id, attachments: best.attachments, apex: settings.apex }); }}><Icon name="grid" size={15}/>Edit in Compare</button>
            <button className="button ghost" onClick={onShare}><Icon name="share" size={15}/>Share</button>
          </footer>
          {shown.alternatives.length > 0 && <details className="alternatives">
            <summary>Close runners-up<Icon name="chevron" size={14}/></summary>
            <ol>{shown.alternatives.map(alt => {
              const swapIn = alt.attachments.filter(id => !best.attachments.includes(id));
              const swapOut = best.attachments.filter(id => !alt.attachments.includes(id));
              return <li key={alt.attachments.join()}><span className="alt-diff">−{Math.max(0, Math.round(best.score - alt.score))} ms</span>
                <span>{swapOut.map(id => data.attachments[id].name).join(', ') || 'nothing'} <Icon name="arrow" size={12}/> {swapIn.map(id => data.attachments[id].name).join(', ') || 'nothing'}</span></li>;
            })}</ol>
          </details>}
        </>}
      </section>

      {result && <SitePicks weapon={weapon} result={result} settings={settings} activeKey={chosen.key} style={style} onStyle={id => change({ preset: id, distanceM: playstyleById(id)!.distanceM })} onCompare={compareWith} onCopy={onCopy}/>}
      {result?.gear && <ClassSetup gear={result.gear} settings={settings} change={change} weapon={weapon}/>}

      <details className="method">
        <summary>How builds are scored<Icon name="chevron" size={14}/></summary>
        <ul>
          <li>Every legal combination of up to {ATTACHMENT_LIMIT} attachments is checked. Attachments that are worse in every scored stat than another in the same slot are skipped first, which cannot change the winner.</li>
          <li>Attachment changes multiply, the way CODMunity combines them: a +18% range muzzle and a +28% range barrel give 1.18 × 1.28 = +51%.</li>
          <li>The score is milliseconds of fight time saved against the stock gun. ADS, sprint-to-fire, weapon swap, bullet travel time and time to kill count in real milliseconds. {style.weights.recoil > 0 ? <>One percent of recoil counts as {+(style.weights.recoil).toFixed(1)}% of the time a missed shot costs.</> : <>Recoil is not scored in this playstyle.</>}</li>
          {weapon.fireMode === 'auto' && <li>Time to kill assumes chest hits with every bullet. Range attachments stretch every damage band by their multiplier.</li>}
          {style.aim && fullModel(weapon) && weapon.fireMode !== 'auto' && <li>{aimText(style)} A missed shot or a hit that does not kill costs one more shot interval, so rechamber speed and one-shot range both count in milliseconds. These hit rates are this site's assumptions, not measurements.</li>}
          {style.ammo === 'slug' && <li>Slug builds always run {slugAmmo(data, weapon) ? data.attachments[slugAmmo(data, weapon)![0]].name : 'slugs'}. The data does not list what slugs do to damage or range, so builds are compared on aim speed, recoil and handling around it.</li>}
          {style.ammo === 'pellets' && slugAmmo(data, weapon) && <li>Slugs are left out of this playstyle. The data shows only their recoil and velocity changes, not that they turn hip fire into a single projectile.</li>}
          {style.followUps != null && <li>A faster pump or fire rate counts on {Math.round(style.followUps * 100)}% of fights, the share assumed to need a second shot.</li>}
          <li>The stability line rescores the top {STABILITY.pool.toLocaleString()} builds {STABILITY.samples} times with every priority scaled by up to {STABILITY.weightSpread}x and the fight distance moved by up to {STABILITY.distanceSpread * 100}%. Builds within {TIE_MS} ms count as a tie.</li>
          <li>Import codes come from the game. Site builds show the site's code where it published one. For the optimizer's pick, build it once in Gunsmith and the game gives you a code.</li>
        </ul>
      </details>
    </section>
  </div>;
}

const REGION_NAMES: Record<string, string> = { head: 'head', neck: 'neck', chest: 'chest', stomach: 'stomach', upperarm: 'upper arms', lowerarm: 'lower arms', upperleg: 'upper legs', lowerleg: 'lower legs' };

/** Plain description of a playstyle's assumed hit spread. */
function aimText(style: Playstyle) {
  const aim = style.aim!;
  const top = Object.entries(aim.regions).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([region, share]) => `${Math.round(share * 100)}% ${REGION_NAMES[region]}`);
  return `${style.name} assumes ${Math.round(aim.miss * 100)}% of shots miss, and hits land ${top.join(', ')} and the rest lower.`;
}

function distanceHint(weapon: WeaponData, style: Playstyle, distance: number) {
  if (!fullModel(weapon)) return weapon.fireMode === 'burst' ? 'Used for bullet travel time.' : 'Shotgun damage is not in the data, so distance only changes bullet travel time.';
  if (weapon.fireMode === 'auto') return `Range is scored by time to kill across fights from ${window_(distance)}.`;
  return `One-shot range is scored across fights from ${window_(distance)}${style.aim ? ` with ${style.aim.name} aim` : ''}.`;
}

function WeaponPicker({ weapon, open, setOpen, onSelect }: { weapon: WeaponData; open: boolean; setOpen: (open: boolean) => void; onSelect: (id: string) => void }) {
  const [category, setCategory] = useState(weapon.category);
  const list = data.weapons.filter(item => item.category === category);
  return <section className="picker">
    <button className="picker-current" onClick={() => setOpen(!open)} aria-expanded={open}>
      <img src={weaponImage(weapon.id)} alt=""/>
      <span><small>{weapon.category}</small><strong>{weapon.name}</strong></span>
      <Icon name="chevron" size={16}/>
    </button>
    {open && <div className="picker-panel">
      <div className="picker-cats" role="tablist">{categories.map(item => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{shortCategory[item]}</button>)}</div>
      <div className="picker-list">{list.map(item => {
        const ok = supported(item);
        return <button key={item.id} disabled={!ok} className={item.id === weapon.id ? 'active' : ''} onClick={() => onSelect(item.id)}>
          <img src={weaponImage(item.id)} alt="" loading="lazy"/>
          <span><strong>{item.name}</strong><small>{ok ? `${item.rpm ?? '?'} rpm · ${item.magazine ?? '?'} rds${item.apex ? ' · Apex' : ''}` : 'No Gunsmith data'}</small></span>
        </button>;
      })}</div>
    </div>}
  </section>;
}

function Hero({ weapon, result, settings, busy }: { weapon: WeaponData; result: OptimizeResult | null; settings: Settings; busy: boolean }) {
  const base = weapon.base!;
  const facts = [
    { label: 'Fire rate', value: weapon.rpm ? `${weapon.rpm}` : 'n/a', unit: 'rpm' },
    { label: 'Magazine', value: `${weapon.magazine ?? Math.round(base.mag_size)}`, unit: 'rds' },
    { label: 'ADS', value: ms(base.ads), unit: 'ms' },
    { label: 'Sprint to fire', value: ms(base.stf), unit: 'ms' },
    ...(weapon.fireMode === 'auto' && fullModel(weapon)
      ? [{ label: `TTK ${window_(settings.distanceM)}`, value: ms(result?.baseTtkMs), unit: result?.baseTtkMs ? 'ms' : '' }]
      : [{ label: 'Between shots', value: ms(shotInterval(weapon, base)), unit: 'ms' },
        ...(fullModel(weapon) ? [{ label: `One-shot hits ${window_(settings.distanceM)}`, value: result?.stock?.oneShot == null ? 'n/a' : `${Math.round(result.stock.oneShot * 100)}`, unit: result?.stock?.oneShot == null ? '' : '%' }] : [])]),
  ];
  return <section className="hero">
    <div className="hero-copy">
      <span className="eyebrow">{weapon.category}{busy && <i className="spinner" aria-label="Calculating"/>}</span>
      <h1>{weapon.name}</h1>
      <dl className="facts">{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}<small>{fact.unit}</small></dd></div>)}</dl>
    </div>
    <div className="hero-art"><img src={weaponImage(weapon.id)} alt={`${weapon.name} render`}/></div>
  </section>;
}

function StabilityLine({ stability }: { stability: Stability }) {
  const near = stability.nearBest;
  const tone = near >= .7 ? 'solid' : near >= .4 ? 'mixed' : 'shaky';
  const label = tone === 'solid' ? 'Solid pick' : tone === 'mixed' ? 'Depends on the details' : 'Close call';
  return <p className={`stability ${tone}`} title={`Priorities nudged up to ${STABILITY.weightSpread}x and fight distance up to ${STABILITY.distanceSpread * 100}%, ${stability.samples} times.`}>
    <b>{label}.</b> Within {TIE_MS} ms of the best in {Math.round(near * 100)}% of nearby settings.
    {stability.contenders.length > 0 && <> Often wins instead: {stability.contenders.slice(0, 2).map(item => data.attachments[item.id].name).join(', ')}.</>}
  </p>;
}

function PartsDiff({ weapon, after, before, beforeLabel, result, settings, toggle, onMissing }: {
  weapon: WeaponData; after: BuildResult; before: Baseline; beforeLabel: string; result: ClassResult; settings: Settings; toggle: (key: 'locked' | 'excluded', id: string) => void; onMissing: (id: string) => void;
}) {
  const contributions = new Map(after.contributions.map(item => [item.id, item.score]));
  const holds = new Map(result.stability?.parts.map(item => [item.id, item.share]) ?? []);
  const inSlot = (list: string[], slot: string) => list.find(id => data.attachments[id]?.slot === slot) ?? null;
  const slots = SLOT_ORDER.filter(slot => inSlot(after.attachments, slot) || inSlot(before.attachments, slot));
  const showApex = !!weapon.apex && (after.apex || before.apex);
  const changed = slots.filter(slot => inSlot(after.attachments, slot) !== inSlot(before.attachments, slot)).length + (showApex && after.apex !== before.apex ? 1 : 0);
  const name = (id: string | null) => id ? data.attachments[id]?.name ?? id : 'None';
  return <div className="diff">
    <div className="diff-head"><span>Slot</span><span className="before-col">{beforeLabel}</span><span/><span>This build</span><em>{changed ? `${changed} change${changed > 1 ? 's' : ''}` : 'Same parts'}</em></div>
    {showApex && <div className={`diff-row apex ${after.apex !== before.apex ? 'changed' : ''}`}>
      <span className="diff-slot">Apex</span>
      <span className="diff-before">{before.apex ? <span className="was-name">{weapon.apex!.name}</span> : <i>None</i>}</span>
      <span className="diff-arrow">{after.apex !== before.apex && <Icon name="arrow" size={14}/>}</span>
      <span className="diff-after"><span className="part-name"><Icon name="bolt" size={14}/>{after.apex ? weapon.apex!.name : 'None'}</span></span>
    </div>}
    {slots.map(slot => {
      const now = inSlot(after.attachments, slot), was = inSlot(before.attachments, slot);
      const same = now === was;
      const entry = now ? attachmentEntry(weapon.id, now) : null;
      const tag = now ? unlockTag(weapon, now, settings) : null;
      const image = now ? attachmentImage(now) : null;
      const locked = !!now && settings.locked.includes(now);
      const hold = now ? holds.get(now) : undefined;
      return <div key={slot} className={`diff-row ${same ? '' : 'changed'} ${locked ? 'is-locked' : ''}`}>
        <span className="diff-slot">{slotName(slot)}</span>
        <span className="diff-before">{was ? <>{attachmentImage(was) && <img src={attachmentImage(was)!} alt=""/>}<span className="was-name">{name(was)}</span></> : <i>None</i>}</span>
        <span className="diff-arrow">{!same && <Icon name="arrow" size={14}/>}</span>
        <span className="diff-after">
          {now ? <>
            <span className="part-name">{image ? <img src={image} alt=""/> : <Icon name="grid" size={14}/>}<b>{name(now)}</b>{tag && <small className={tag.shared ? 'shared' : ''} title={tag.title}>{tag.text}</small>}</span>
            <span className="part-meta">
              {effects(entry?.mods ?? {}, 2).map(effect => <em key={effect.label} className={effect.good ? 'good' : 'bad'}>{effect.label} {effect.text}</em>)}
              {hold !== undefined && <em className={`hold ${hold >= .75 ? 'core' : hold < .4 ? 'flex' : ''}`} title={`In ${Math.round(hold * 100)}% of the winning builds when settings are nudged`}>{hold >= .75 ? 'Core' : hold < .4 ? 'Flex' : 'Likely'}</em>}
              <span className="part-value" title="What removing this part would cost">{signedMs(contributions.get(now) ?? 0)}</span>
              <button className={`icon-btn ${locked ? 'on' : ''}`} onClick={() => toggle('locked', now)} aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${name(now)}`} title={locked ? 'Locked' : 'Lock into every build'}><Icon name="lock" size={12}/></button>
              <button className="icon-btn" onClick={() => toggle('excluded', now)} aria-label={`Exclude ${name(now)}`} title="Never use this part on this gun"><Icon name="ban" size={12}/></button>
              <button className="own-btn" onClick={() => onMissing(now)} title="Mark as not unlocked. The build is redone without it, on every gun that takes it.">Don't have it</button>
            </span>
          </> : <i>None</i>}
        </span>
      </div>;
    })}
    {after.attachments.length < ATTACHMENT_LIMIT && <p className="diff-foot">{ATTACHMENT_LIMIT - after.attachments.length} slot{after.attachments.length === ATTACHMENT_LIMIT - 1 ? '' : 's'} left open. Nothing else unlocked improves this build.</p>}
  </div>;
}

function StatsDiff({ weapon, after, before, settings }: { weapon: WeaponData; after: BuildResult; before: BuildResult; settings: Settings }) {
  const weights = weightsFor(settings, playstyleFor(weapon, settings.preset));
  const rows = statRows(window_(settings.distanceM), metric => weights[metric] > 0).filter(row => !row.optional || row.get(after, weapon) != null);
  const scoreDiff = after.score - before.score;
  return <div className="stats-diff">
    <div className="stats-row total"><span>Fight-time edge vs stock</span><span className="stat-before">{signedMs(before.score)}</span><span className="diff-arrow">{Math.abs(scoreDiff) >= .5 && <Icon name="arrow" size={13}/>}</span><span className={`stat-after ${scoreDiff >= .5 ? 'good' : scoreDiff <= -.5 ? 'bad' : ''}`}>{signedMs(after.score)}</span></div>
    {rows.map(row => {
      const a = row.get(after, weapon), b = row.get(before, weapon);
      const moved = a != null && b != null && row.fmt(a) !== row.fmt(b);
      return <div key={row.label} className="stats-row">
        <span>{row.label}</span>
        <span className="stat-before">{b == null ? 'n/a' : row.fmt(b)}</span>
        <span className="diff-arrow">{moved && <Icon name="arrow" size={13}/>}</span>
        <span className={`stat-after ${tone(row, a, b)}`}>{a == null ? 'n/a' : row.fmt(a)}{moved && <small>{row.delta(a! - b!)}</small>}</span>
      </div>;
    })}
  </div>;
}
