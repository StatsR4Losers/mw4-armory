import { useEffect, useRef, useState } from 'react';
import { data, supported, weaponById } from './data/game';
import { PRESETS } from './engine';
import { metricIds } from './types';
import type { BuildResult, OptimizeResult, PresetId, Settings, Weights } from './types';
import { BuildView } from './views/BuildView';
import { GuideView } from './views/GuideView';
import { SavedView } from './views/SavedView';
import type { SavedClass } from './views/SavedView';
import { DataView } from './views/DataView';
import { Icon } from './components/Icon';

const STORAGE_KEY = 'mw4-armory-v2';
type View = 'build' | 'guide' | 'saved' | 'data';
const views: { id: View; label: string; icon: string }[] = [
  { id: 'build', label: 'Build', icon: 'target' },
  { id: 'guide', label: 'Guide', icon: 'book' },
  { id: 'saved', label: 'Saved', icon: 'save' },
  { id: 'data', label: 'Data', icon: 'data' },
];

export const neutralEmphasis = () => Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;

export function defaultSettings(weaponId = 'vel-46'): Settings {
  const weapon = weaponById(weaponId)!;
  return { weaponId, level: weapon.maxLevel ?? 1, preset: 'allround', emphasis: neutralEmphasis(), distanceM: PRESETS.allround.distanceM, optic: false, locked: [], excluded: [] };
}

// Stored and shared settings are untrusted. Read known fields only and fall back to defaults.
function normalize(input: unknown): Settings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  const weapon = typeof raw.weaponId === 'string' ? weaponById(raw.weaponId) : undefined;
  const next = defaultSettings(weapon && supported(weapon) ? weapon.id : undefined);
  const max = weaponById(next.weaponId)!.maxLevel ?? 1;
  if (typeof raw.level === 'number' && Number.isFinite(raw.level)) next.level = Math.max(1, Math.min(max, Math.round(raw.level)));
  if (typeof raw.preset === 'string' && raw.preset in PRESETS) next.preset = raw.preset as PresetId;
  if (typeof raw.distanceM === 'number' && Number.isFinite(raw.distanceM)) next.distanceM = Math.max(2, Math.min(60, Math.round(raw.distanceM)));
  if (typeof raw.optic === 'boolean') next.optic = raw.optic;
  if (raw.emphasis && typeof raw.emphasis === 'object') for (const id of metricIds) {
    const value = (raw.emphasis as Partial<Weights>)[id];
    if (typeof value === 'number' && Number.isFinite(value)) next.emphasis[id] = Math.max(0, Math.min(3, value));
  }
  const known = new Set((data.loadouts[next.weaponId] ?? []).map(entry => entry[0]));
  for (const key of ['locked', 'excluded'] as const) {
    const list = raw[key];
    if (Array.isArray(list)) next[key] = [...new Set(list.filter((id): id is string => typeof id === 'string' && known.has(id)))].slice(0, 20);
  }
  return next;
}

function encode(value: unknown) { return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replace(/=+$/, ''); }
function decode(value: string) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))); }

function readInitial(): { settings: Settings; saved: SavedClass[]; toast: string | null } {
  let settings = defaultSettings(), saved: SavedClass[] = [], toast: string | null = null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored) {
      settings = normalize(stored.settings);
      if (Array.isArray(stored.saved)) saved = stored.saved.filter((item: SavedClass) => item && typeof item.id === 'string' && weaponById(item.weaponId) && Array.isArray(item.attachments)).slice(0, 200);
    }
  } catch { /* Private windows and cleared storage start from defaults. */ }
  if (location.hash.startsWith('#b=')) {
    try { settings = normalize(decode(decodeURIComponent(location.hash.slice(3)))); toast = 'Loaded the shared build settings.'; }
    catch { toast = 'That share link could not be read. Your own settings are loaded.'; }
  }
  return { settings, saved, toast };
}

export default function App() {
  const initial = useRef<ReturnType<typeof readInitial>>(null);
  if (!initial.current) initial.current = readInitial();
  const [settings, setSettings] = useState(initial.current.settings);
  const [saved, setSaved] = useState<SavedClass[]>(initial.current.saved);
  const [toast, setToast] = useState<string | null>(initial.current.toast);
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, saved })); } catch { /* Storage can be full or blocked. */ }
  }, [settings, saved]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const change = (patch: Partial<Settings>) => setSettings(current => ({ ...current, ...patch }));
  const selectWeapon = (weaponId: string) => {
    const weapon = weaponById(weaponId);
    if (!weapon || !supported(weapon)) return;
    setSettings(current => ({ ...current, weaponId, level: weapon.maxLevel ?? 1, locked: [], excluded: [] }));
    setResult(null);
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}#b=${encodeURIComponent(encode(settings))}`;
    history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url); setToast('Share link copied.'); }
    catch { setToast('Share link is in the address bar.'); }
  };
  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setToast('Class copied. Paste it anywhere.'); }
    catch { setToast('Copy failed. Your browser blocked clipboard access.'); }
  };
  const saveClass = (variant: 'standard' | 'apex', build: BuildResult) => {
    const weapon = weaponById(settings.weaponId)!;
    const label = variant === 'apex' ? weapon.apex?.name ?? 'Apex' : 'No Apex';
    setSaved(current => [{ id: crypto.randomUUID(), name: `${weapon.name} · ${label} · ${PRESETS[settings.preset].name}`, weaponId: weapon.id, variant, attachments: build.attachments, score: Math.round(build.score), createdAt: new Date().toISOString(), dataVersion: data.version, settings }, ...current]);
    setToast('Class saved on this device.');
  };

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => setView('build')} aria-label="MW4 Armory home">
        <span className="brand-mark" aria-hidden="true"><Icon name="target" size={18}/></span>
        <span className="brand-name">MW4 <b>Armory</b></span>
      </button>
      <nav className="nav" aria-label="Sections">
        {views.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}>
          <Icon name={item.icon} size={16}/><span>{item.label}</span>{item.id === 'saved' && saved.length > 0 && <i>{saved.length}</i>}
        </button>)}
      </nav>
      <span className="data-stamp">Stats {data.statsUpdated.slice(5).replace('-', '/')} · unlocks {data.checkedAt.slice(5).replace('-', '/')}</span>
    </header>
    <main className="main">
      {view === 'build' && <BuildView settings={settings} change={change} selectWeapon={selectWeapon} result={result} busy={busy} error={error} onSave={saveClass} onShare={share} onCopy={copyText} onReset={() => setSettings(defaultSettings(settings.weaponId))}/>}
      {view === 'guide' && <GuideView/>}
      {view === 'saved' && <SavedView saved={saved} onLoad={item => { setSettings(normalize(item.settings)); setView('build'); }} onDelete={id => setSaved(current => current.filter(item => item.id !== id))} onCopy={copyText} onBuild={() => setView('build')}/>}
      {view === 'data' && <DataView/>}
    </main>
    <footer className="footer"><span>MW4 Armory is a fan-made tool. Not affiliated with Activision or Infinity Ward.</span><span>Stats: CODMunity via COD Loadout. Renders: COD Loadout.</span></footer>
    {toast && <div className="toast" role="status"><Icon name="check" size={15}/>{toast}</div>}
  </div>;
}
