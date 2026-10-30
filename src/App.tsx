import { useEffect, useRef, useState } from 'react';
import { data, supported, weaponById } from './data/game';
import { ROLES, playstyleById, playstyleFor, playstylesFor, roleOf } from './engine';
import { metricIds } from './types';
import type { BuildResult, GearSlot, OptimizeResult, Settings, StreakStyle, Weights } from './types';
import { BuildView } from './views/BuildView';
import { GuideView } from './views/GuideView';
import { SavedView } from './views/SavedView';
import type { SavedClass } from './views/SavedView';
import { DataView } from './views/DataView';
import { CompareView } from './views/CompareView';
import type { CompareItem } from './views/CompareView';
import { Icon } from './components/Icon';

const STORAGE_KEY = 'mw4-armory-v2';
const GEAR_SLOT_IDS: GearSlot[] = ['tactical', 'lethal', 'field', 'perk1', 'perk2', 'perk3'];
type View = 'build' | 'compare' | 'guide' | 'saved' | 'data';
const views: { id: View; label: string; icon: string }[] = [
  { id: 'build', label: 'Build', icon: 'target' },
  { id: 'compare', label: 'Compare', icon: 'grid' },
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
  const weapon = weaponById(weaponId)!;
  const style = openingStyle(weaponId);
  return { weaponId, level: weapon.maxLevel ?? 1, preset: style.id, emphasis: neutralEmphasis(), distanceM: style.distanceM, apex: false, optic: false, locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [] };
}

// Stored and shared settings are untrusted. Read known fields only and fall back to defaults.
function normalize(input: unknown): Settings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  const weapon = typeof raw.weaponId === 'string' ? weaponById(raw.weaponId) : undefined;
  const next = defaultSettings(weapon && supported(weapon) ? weapon.id : undefined);
  const chosen = weaponById(next.weaponId)!, max = chosen.maxLevel ?? 1;
  if (typeof raw.level === 'number' && Number.isFinite(raw.level)) next.level = Math.max(1, Math.min(max, Math.round(raw.level)));
  // Playstyles belong to a weapon class. One saved for another class, or from before classes had their own, falls back to the default.
  const style = typeof raw.preset === 'string' ? playstyleById(raw.preset) : undefined;
  if (style && style.role === roleOf(chosen)) {
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

function encode(value: unknown) { return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replace(/=+$/, ''); }
function decode(value: string) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))); }

function readInitial(): { settings: Settings; saved: SavedClass[]; compare: CompareItem[]; toast: string | null } {
  let settings = defaultSettings(), saved: SavedClass[] = [], compare: CompareItem[] = [], toast: string | null = null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored) {
      settings = normalize(stored.settings);
      if (Array.isArray(stored.saved)) saved = stored.saved.filter((item: SavedClass) => item && typeof item.id === 'string' && weaponById(item.weaponId) && Array.isArray(item.attachments)).slice(0, 200);
      if (Array.isArray(stored.compare)) compare = stored.compare.filter((item: CompareItem) => item && typeof item.id === 'string' && supported(weaponById(item.weaponId) ?? data.weapons[0]) && Array.isArray(item.attachments)).slice(0, 3);
    }
  } catch { /* Private windows and cleared storage start from defaults. */ }
  if (location.hash.startsWith('#b=')) {
    try { settings = normalize(decode(decodeURIComponent(location.hash.slice(3)))); toast = 'Loaded the shared build settings.'; }
    catch { toast = 'That share link could not be read. Your own settings are loaded.'; }
  }
  return { settings, saved, compare, toast };
}

export default function App() {
  const initial = useRef<ReturnType<typeof readInitial>>(null);
  if (!initial.current) initial.current = readInitial();
  const [settings, setSettings] = useState(initial.current.settings);
  const [saved, setSaved] = useState<SavedClass[]>(initial.current.saved);
  const [toast, setToast] = useState<string | null>(initial.current.toast);
  const [compare, setCompare] = useState<CompareItem[]>(initial.current.compare);
  const [view, setView] = useState<View>('build');
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
      worker.postMessage({ id, settings });
    }, 90);
    return () => { window.clearTimeout(timer); worker?.terminate(); };
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, saved, compare })); } catch { /* Storage can be full or blocked. */ }
  }, [settings, saved, compare]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const change = (patch: Partial<Settings>) => setSettings(current => ({ ...current, ...patch }));
  const selectWeapon = (weaponId: string) => {
    const weapon = weaponById(weaponId);
    if (!weapon || !supported(weapon)) return;
    setSettings(current => {
      // A new gun opens on the playstyle its site builds fit best. The distance resets only when the playstyle changes.
      const style = openingStyle(weaponId);
      return { ...current, weaponId, level: weapon.maxLevel ?? 1, locked: [], excluded: [], preset: style.id, ...(style.id === current.preset ? {} : { distanceM: style.distanceM }) };
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
  const saveClass = (variant: 'standard' | 'apex', build: BuildResult) => {
    const weapon = weaponById(settings.weaponId)!;
    const label = variant === 'apex' ? weapon.apex?.name ?? 'Apex' : 'No Apex';
    const gear = result?.gear ? [...GEAR_SLOT_IDS.map(slot => result.gear!.picks[slot]?.id), ...result.gear.streaks.map(pick => pick.id)].filter((id): id is string => !!id) : [];
    setSaved(current => [{ id: crypto.randomUUID(), name: `${weapon.name} · ${label} · ${playstyleFor(weapon, settings.preset).name}`, weaponId: weapon.id, variant, attachments: build.attachments, gear, score: Math.round(build.score), createdAt: new Date().toISOString(), dataVersion: data.version, settings }, ...current]);
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
        {views.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}>
          <Icon name={item.icon} size={16}/><span>{item.label}</span>{item.id === 'saved' && saved.length > 0 && <i>{saved.length}</i>}{item.id === 'compare' && compare.length > 0 && <i>{compare.length}</i>}
        </button>)}
      </nav>
      <span className="data-stamp">Stats {data.statsUpdated.slice(5).replace('-', '/')} · unlocks {data.checkedAt.slice(5).replace('-', '/')}</span>
    </header>
    <main className="main">
      {/* The Build screen stays mounted so its before/after history survives a trip to another tab. */}
      <div hidden={view !== 'build'}><BuildView settings={settings} change={change} selectWeapon={selectWeapon} result={result} busy={busy} error={error} saved={saved} onSave={saveClass} onShare={share} onCopy={copyText} onCompare={addCompare} onReset={() => setSettings({ ...defaultSettings(settings.weaponId), playerLevel: settings.playerLevel })}/></div>
      {view === 'compare' && <CompareView items={compare} setItems={setCompare} settings={settings} onCopy={copyText} onBuild={() => setView('build')}/>}
      {view === 'guide' && <GuideView/>}
      {view === 'saved' && <SavedView saved={saved} onLoad={item => { setSettings(normalize(item.settings)); setView('build'); }} onDelete={id => setSaved(current => current.filter(item => item.id !== id))} onCopy={copyText} onBuild={() => setView('build')} onCompare={item => addCompare({ label: item.name, weaponId: item.weaponId, attachments: item.attachments, apex: item.variant === 'apex' })}/>}
      {view === 'data' && <DataView/>}
    </main>
    <footer className="footer"><span>MW4 Armory is a fan-made tool. Not affiliated with Activision or Infinity Ward.</span><span>Stats: CODMunity via COD Loadout. Guide builds: CODMunity, Game8, WZStats. Renders: COD Loadout.</span></footer>
    {toast && <div className="toast" role="status"><Icon name="check" size={15}/>{toast}</div>}
  </div>;
}
