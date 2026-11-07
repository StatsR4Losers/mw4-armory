import { useEffect, useMemo, useRef, useState } from 'react';
import { currentMode, data, hasWarzone, setMode, supported, weaponById } from './data/game';
import { ROLES, playstyleById, playstyleFor, playstylesFor } from './engine';
import { metricIds } from './types';
import type { Armory, BuildResult, GearSlot, Mode, OptimizeResult, Settings, StreakStyle, Weights } from './types';
import { BuildView } from './views/BuildView';
import { GuideView } from './views/GuideView';
import { SavedView } from './views/SavedView';
import type { SavedClass } from './views/SavedView';
import { DataView } from './views/DataView';
import { PatchView } from './views/PatchView';
import { CompareView } from './views/CompareView';
import type { CompareItem } from './views/CompareView';
import { Icon } from './components/Icon';

const STORAGE_KEY = 'mw4-armory-v2';
const GEAR_SLOT_IDS: GearSlot[] = ['tactical', 'lethal', 'field', 'perk1', 'perk2', 'perk3'];
type View = 'build' | 'compare' | 'patch' | 'guide' | 'saved' | 'data';
const views: { id: View; label: string; icon: string }[] = [
  { id: 'build', label: 'Build', icon: 'target' },
  { id: 'compare', label: 'Compare', icon: 'grid' },
  { id: 'patch', label: 'Patch notes', icon: 'patch' },
  { id: 'guide', label: 'Guide', icon: 'book' },
  { id: 'saved', label: 'Saved', icon: 'save' },
  { id: 'data', label: 'Data', icon: 'data' },
];

export const neutralEmphasis = () => Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;

/** Each gun opens on the playstyle its site builds clearly fit best, or its class's first playstyle. */
function openingStyle(weaponId: string) {
  const weapon = weaponById(weaponId)!;
  const consensus = data.consensus?.[weaponId];
  return playstyleFor(weapon, consensus?.clear ? consensus.style : playstylesFor(weapon)[0].id);
}

export function defaultSettings(weaponId = 'vel-46'): Settings {
  // A gun with no data in the current mode falls back to the VEL 46.
  const weapon = [weaponById(weaponId), weaponById('vel-46')!].find(item => item && supported(item))!;
  weaponId = weapon.id;
  const style = openingStyle(weaponId);
  return { mode: currentMode(), weaponId, level: weapon.maxLevel ?? 1, preset: style.id, emphasis: neutralEmphasis(), distanceM: style.distanceM, apex: false, optic: false, locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [] };
}

// Stored and shared settings are untrusted. Read known fields only and fall back to defaults.
function normalize(input: unknown): Settings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  // The mode comes first: it decides which guns have data and which playstyles exist.
  setMode(raw.mode === 'wz' ? 'wz' : 'mp');
  const weapon = typeof raw.weaponId === 'string' ? weaponById(raw.weaponId) : undefined;
  const next = defaultSettings(weapon && supported(weapon) ? weapon.id : undefined);
  const chosen = weaponById(next.weaponId)!, max = chosen.maxLevel ?? 1;
  if (typeof raw.level === 'number' && Number.isFinite(raw.level)) next.level = Math.max(1, Math.min(max, Math.round(raw.level)));
  // Playstyles belong to a weapon class. One saved for another class, or from before classes had their own, falls back to the default.
  const style = typeof raw.preset === 'string' ? playstyleById(raw.preset) : undefined;
  if (style && playstylesFor(chosen).includes(style)) {
    next.preset = style.id;
    const [min, top] = ROLES[style.role].distance;
    if (typeof raw.distanceM === 'number' && Number.isFinite(raw.distanceM)) next.distanceM = Math.max(min, Math.min(top, Math.round(raw.distanceM)));
  }
  if (typeof raw.optic === 'boolean') next.optic = raw.optic;
  if (typeof raw.apex === 'boolean') next.apex = raw.apex;
  if (raw.emphasis && typeof raw.emphasis === 'object') for (const id of metricIds) {
    const value = (raw.emphasis as Partial<Weights>)[id];
    if (typeof value === 'number' && Number.isFinite(value)) next.emphasis[id] = Math.max(0, Math.min(3, value));
  }
  const known = new Set((data.loadouts[next.weaponId] ?? []).map(entry => entry[0]));
  for (const key of ['locked', 'excluded'] as const) {
    const list = raw[key];
    if (Array.isArray(list)) next[key] = [...new Set(list.filter((id): id is string => typeof id === 'string' && known.has(id)))].slice(0, 20);
  }
  if (typeof raw.playerLevel === 'number' && Number.isFinite(raw.playerLevel)) next.playerLevel = Math.max(1, Math.min(55, Math.round(raw.playerLevel)));
  if (typeof raw.killBand === 'number' && Number.isFinite(raw.killBand)) next.killBand = Math.max(3, Math.min(13, Math.round(raw.killBand)));
  if (raw.streakStyle === 'support' || raw.streakStyle === 'lethal' || raw.streakStyle === 'mixed') next.streakStyle = raw.streakStyle as StreakStyle;
  const gear = new Map(data.gear.map(item => [item.id, item]));
  if (raw.gearLocks && typeof raw.gearLocks === 'object') for (const slot of GEAR_SLOT_IDS) {
    const id = (raw.gearLocks as Record<string, unknown>)[slot];
    const item = typeof id === 'string' ? gear.get(id) : undefined;
    if (item && (slot.startsWith('perk') ? item.kind === 'perk' && item.perkSlot === Number(slot.slice(-1)) : item.kind === slot)) next.gearLocks[slot] = item.id;
  }
  if (Array.isArray(raw.streakLocks)) next.streakLocks = [...new Set(raw.streakLocks.filter((id): id is string => typeof id === 'string' && gear.get(id)?.kind === 'streak'))].slice(0, 3);
  return next;
}

export const emptyArmory = (): Armory => ({ levels: {}, prestiged: [], have: [], missing: [] });

// The armory is stored apart from the settings: it describes the player, not a class, so links and saved classes leave it out.
function normalizeArmory(input: unknown): Armory {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Armory>;
  const next = emptyArmory();
  const guns = new Map(data.weapons.filter(supported).map(weapon => [weapon.id, weapon.maxLevel ?? 1]));
  if (raw.levels && typeof raw.levels === 'object') for (const [id, level] of Object.entries(raw.levels)) {
    if (guns.has(id) && typeof level === 'number' && Number.isFinite(level)) next.levels[id] = Math.max(0, Math.min(guns.get(id)!, Math.round(level)));
  }
  if (Array.isArray(raw.prestiged)) next.prestiged = [...new Set(raw.prestiged.filter((id): id is string => typeof id === 'string' && guns.has(id)))];
  // Marks are a part id, or "weaponId:partId" for a gun-specific part.
  const part = (key: unknown): key is string => typeof key === 'string' && !!data.attachments[key.includes(':') ? key.slice(key.indexOf(':') + 1) : key];
  for (const key of ['have', 'missing'] as const) if (Array.isArray(raw[key])) next[key] = [...new Set(raw[key]!.filter(part))].slice(0, 500);
  return next;
}

/** Your recorded level for a gun wins over the one stored with a class or a link, since it describes what you own now. */
const withLevel = (settings: Settings, armory: Armory): Settings => settings.weaponId in armory.levels ? { ...settings, level: Math.max(1, armory.levels[settings.weaponId]) } : settings;

function encode(value: unknown) { return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replace(/=+$/, ''); }
function decode(value: string) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))); }

function readInitial(): { settings: Settings; saved: SavedClass[]; compare: CompareItem[]; armory: Armory; toast: string | null } {
  let settings = defaultSettings(), saved: SavedClass[] = [], compare: CompareItem[] = [], armory = emptyArmory(), toast: string | null = null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored) {
      settings = normalize(stored.settings);
      armory = normalizeArmory(stored.armory);
      if (Array.isArray(stored.saved)) saved = stored.saved.filter((item: SavedClass) => item && typeof item.id === 'string' && weaponById(item.weaponId) && Array.isArray(item.attachments)).slice(0, 200);
      if (Array.isArray(stored.compare)) compare = stored.compare.filter((item: CompareItem) => item && typeof item.id === 'string' && supported(weaponById(item.weaponId) ?? data.weapons[0]) && Array.isArray(item.attachments)).slice(0, 3);
    }
  } catch { /* Private windows and cleared storage start from defaults. */ }
  if (location.hash.startsWith('#b=')) {
    try { settings = normalize(decode(decodeURIComponent(location.hash.slice(3)))); toast = 'Loaded the shared build settings.'; }
    catch { toast = 'That share link could not be read. Your own settings are loaded.'; }
  }
  return { settings: withLevel(settings, armory), saved, compare, armory, toast };
}

export default function App() {
  const initial = useRef<ReturnType<typeof readInitial>>(null);
  if (!initial.current) initial.current = readInitial();
  const [settings, setSettings] = useState(initial.current.settings);
  // Every screen reads the shared data object, so it must show this mode before anything renders.
  setMode(settings.mode);
  const [saved, setSaved] = useState<SavedClass[]>(initial.current.saved);
  const [toast, setToast] = useState<string | null>(initial.current.toast);
  const [compare, setCompare] = useState<CompareItem[]>(initial.current.compare);
  const [armory, setArmory] = useState<Armory>(initial.current.armory);
  // Searches run with your armory, so parts unlocked on other guns count.
  const run = useMemo(() => ({ ...settings, armory }), [settings, armory]);
  const [view, setView] = useState<View>('build');
  // The gun the Patch screen scrolls to when opened from the Build screen. The counter makes a repeat click scroll again.
  const [patchFocus, setPatchFocus] = useState<string | null>(null);
  const openPatch = (weaponId: string) => { setPatchFocus(`${weaponId}#${Date.now()}`); setView('patch'); };
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  // A new worker per request lets a slider change cancel an older search outright.
  useEffect(() => {
    const id = ++latest.current;
    setBusy(true);
    let worker: Worker | null = null;
    const timer = window.setTimeout(() => {
      worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = event => {
        if (event.data.id !== latest.current) return;
        setBusy(false);
        if (event.data.error) setError(event.data.error);
        else { setError(''); setResult(event.data.result); }
        worker?.terminate();
      };
      worker.onerror = () => { if (id === latest.current) { setBusy(false); setError('The optimizer could not start. Reload the page.'); } };
      worker.postMessage({ id, settings: run });
    }, 90);
    return () => { window.clearTimeout(timer); worker?.terminate(); };
  }, [run]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, saved, compare, armory })); } catch { /* Storage can be full or blocked. */ }
  }, [settings, saved, compare, armory]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const change = (patch: Partial<Settings>) => {
    setSettings(current => ({ ...current, ...patch }));
    // The level slider records this gun's level, which counts toward shared parts on every other gun.
    if (patch.level !== undefined) setArmory(current => ({ ...current, levels: { ...current.levels, [settings.weaponId]: patch.level! } }));
  };
  const selectWeapon = (weaponId: string) => {
    const weapon = weaponById(weaponId);
    if (!weapon || !supported(weapon)) return;
    setSettings(current => {
      // A new gun opens on the playstyle its site builds fit best. The distance resets only when the playstyle changes.
      const style = openingStyle(weaponId);
      return { ...current, weaponId, level: weaponId in armory.levels ? Math.max(1, armory.levels[weaponId]) : weapon.maxLevel ?? 1, locked: [], excluded: [], preset: style.id, ...(style.id === current.preset ? {} : { distanceM: style.distanceM }) };
    });
    setResult(null);
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}#b=${encodeURIComponent(encode(settings))}`;
    history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url); setToast('Share link copied.'); }
    catch { setToast('Share link is in the address bar.'); }
  };
  const copyText = async (text: string, message = 'Class copied. Paste it anywhere.') => {
    try { await navigator.clipboard.writeText(text); setToast(message); }
    catch { setToast('Copy failed. Your browser blocked clipboard access.'); }
  };
  // Switching mode keeps the gun and level. The playstyle moves to the new mode's opening one for this gun.
  const switchMode = (next: Mode) => {
    if (next === (settings.mode ?? 'mp')) return;
    setMode(next);
    const fresh = defaultSettings(settings.weaponId);
    setSettings(current => ({ ...current, mode: next, weaponId: fresh.weaponId, preset: fresh.preset, distanceM: fresh.distanceM, locked: [], excluded: [], apex: false }));
    setResult(null);
  };
  const saveClass = (variant: 'standard' | 'apex', build: BuildResult) => {
    const weapon = weaponById(settings.weaponId)!;
    const label = variant === 'apex' ? weapon.apex?.name ?? 'Apex' : 'No Apex';
    const gear = result?.gear ? [...GEAR_SLOT_IDS.map(slot => result.gear!.picks[slot]?.id), ...result.gear.streaks.map(pick => pick.id)].filter((id): id is string => !!id) : [];
    setSaved(current => [{ id: crypto.randomUUID(), name: `${weapon.name} · ${settings.mode === 'wz' ? 'Warzone · ' : ''}${label} · ${playstyleFor(weapon, settings.preset).name}`, weaponId: weapon.id, variant, attachments: build.attachments, gear, score: Math.round(build.score), createdAt: new Date().toISOString(), dataVersion: data.version, settings }, ...current]);
    setToast('Class saved on this device.');
  };
  const addCompare = (item: Omit<CompareItem, 'id'>) => {
    setCompare(current => [...current.slice(current.length >= 3 ? 1 : 0), { ...item, id: crypto.randomUUID() }]);
    setToast(compare.length >= 3 ? 'Added to Compare. The oldest build was dropped.' : 'Added to Compare.');
  };

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => setView('build')} aria-label="MW4 Armory home">
        <span className="brand-mark" aria-hidden="true"><Icon name="target" size={18}/></span>
        <span className="brand-name">MW4 <b>Armory</b></span>
      </button>
      <nav className="nav" aria-label="Sections">
        {views.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => { if (item.id === 'patch') setPatchFocus(null); setView(item.id); }}>
          <Icon name={item.icon} size={16}/><span>{item.label}</span>{item.id === 'saved' && saved.length > 0 && <i>{saved.length}</i>}{item.id === 'compare' && compare.length > 0 && <i>{compare.length}</i>}
        </button>)}
      </nav>
      <span className="data-stamp">Stats {data.statsUpdated.slice(5).replace('-', '/')} · unlocks {data.checkedAt.slice(5).replace('-', '/')}</span>
    </header>
    <main className="main">
      {/* The Build screen stays mounted so its before/after history survives a trip to another tab. */}
      <div hidden={view !== 'build'}><BuildView settings={run} change={change} armory={armory} setArmory={setArmory} selectWeapon={selectWeapon} result={result} busy={busy} error={error} saved={saved} onSave={saveClass} onShare={share} onCopy={copyText} onCompare={addCompare} onPatch={openPatch} onMode={hasWarzone ? switchMode : null} onReset={() => setSettings({ ...defaultSettings(settings.weaponId), level: settings.level, playerLevel: settings.playerLevel })}/></div>
      {view === 'compare' && <CompareView items={compare} setItems={setCompare} settings={settings} onCopy={copyText} onBuild={() => setView('build')}/>}
      {view === 'patch' && <PatchView focus={patchFocus?.split('#')[0] ?? null} key={patchFocus ?? 'patch'} onBuild={weaponId => { selectWeapon(weaponId); setView('build'); window.scrollTo(0, 0); }}/>}
      {view === 'guide' && <GuideView/>}
      {view === 'saved' && <SavedView saved={saved} onLoad={item => { setSettings(withLevel(normalize(item.settings), armory)); setView('build'); }} onDelete={id => setSaved(current => current.filter(item => item.id !== id))} onCopy={copyText} onBuild={() => setView('build')} onCompare={item => addCompare({ label: item.name, weaponId: item.weaponId, attachments: item.attachments, apex: item.variant === 'apex' })}/>}
      {view === 'data' && <DataView/>}
    </main>
    <footer className="footer"><span>MW4 Armory is a fan-made tool. Not affiliated with Activision or Infinity Ward.</span><span>Stats: CODMunity via COD Loadout. Guide builds: CODMunity, Game8, WZStats. Renders: COD Loadout.</span></footer>
    {toast && <div className="toast" role="status"><Icon name="check" size={15}/>{toast}</div>}
  </div>;
}
