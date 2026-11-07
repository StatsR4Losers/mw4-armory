// Terminal pieces shared by every screen: text that types out, numbers that roll, the boot log and the patch ticker.
// Motion is stepped on a clock, never eased. Everything settles at once when the system asks for reduced motion.
import { useEffect, useRef, useState } from 'react';
import { multiplayerData } from '../data/game';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Types text out a character per tick behind a block cursor. Screen readers get the whole text at once. */
export function Typed({ text, delay = 0, speed = 40 }: { text: string; delay?: number; speed?: number }) {
  const [count, setCount] = useState(() => reduced() ? text.length : 0);
  useEffect(() => {
    if (reduced()) { setCount(text.length); return; }
    setCount(0);
    let i = 0, timer = 0;
    const step = () => { setCount(++i); if (i < text.length) timer = window.setTimeout(step, speed); };
    timer = window.setTimeout(step, delay);
    return () => window.clearTimeout(timer);
  }, [text, delay, speed]);
  const done = count >= text.length;
  return <span aria-label={text} role="text">
    <span aria-hidden="true">{text.slice(0, count)}</span>
    {!done && <span className="cursor" aria-hidden="true"/>}
  </span>;
}

/** Shows random digits for a moment whenever the value changes, then locks on it, like a readout recomputing. */
export function Roll({ value, ms = 600 }: { value: string; ms?: number }) {
  const [shown, setShown] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (reduced()) { setShown(value); return; }
    const end = Date.now() + (first.current ? ms * 1.6 : ms);
    first.current = false;
    const timer = window.setInterval(() => {
      if (Date.now() >= end) { window.clearInterval(timer); setShown(value); return; }
      setShown(value.replace(/\d/g, () => String(Math.floor(Math.random() * 10))));
    }, 60);
    return () => window.clearInterval(timer);
  }, [value, ms]);
  return <span aria-label={value} role="text"><span aria-hidden="true">{shown}</span></span>;
}

/** The small signal trace in the top bar. */
export function Wave() {
  return <svg className="wave" viewBox="0 0 120 26" aria-hidden="true"><polyline points="0,13 10,13 14,4 18,22 22,13 40,13 44,8 48,18 52,13 70,13 74,2 78,24 82,13 100,13 104,9 108,17 112,13 120,13"/></svg>;
}

const BOOT_KEY = 'mw4-armory-booted';
/** A short system log on the first visit of a browser session. Any click or key skips it. */
export function Boot() {
  const [show, setShow] = useState(() => {
    if (reduced()) return false;
    try { return !sessionStorage.getItem(BOOT_KEY); } catch { return false; }
  });
  const [lines, setLines] = useState(0);
  const [gone, setGone] = useState(false);
  const data = multiplayerData;
  const patch = data.patches[0];
  const log = [
    'ARMORY TERMINAL · MW4',
    `LOAD ${data.weapons.length} WEAPONS · ${Object.keys(data.attachments).length} PARTS .. <b>OK</b>`,
    `STATS ${data.statsUpdated} ............... <b>OK</b>`,
    ...(patch ? [`APPLY PATCH ${patch.title.toUpperCase()} ${patch.date} .. <b>OK</b>`] : []),
    ...(data.warzone ? [`LINK WARZONE ${data.warzone.retrieved} ......... <b>OK</b>`] : []),
    'READY',
  ];
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem(BOOT_KEY, '1'); } catch { /* Blocked storage only means the log shows again. */ }
    const timers = log.map((_, i) => window.setTimeout(() => setLines(i + 1), 150 + i * 180));
    timers.push(window.setTimeout(() => setGone(true), 150 + log.length * 180 + 300));
    const skip = () => setGone(true);
    window.addEventListener('keydown', skip);
    return () => { timers.forEach(window.clearTimeout); window.removeEventListener('keydown', skip); };
  }, [show]);
  useEffect(() => {
    if (!gone) return;
    const timer = window.setTimeout(() => setShow(false), 300);
    return () => window.clearTimeout(timer);
  }, [gone]);
  if (!show) return null;
  return <button className={`boot ${gone ? 'gone' : ''}`} onClick={() => setGone(true)} aria-label="Skip the start-up screen">
    <span className="boot-mark" aria-hidden="true">ARMORY</span>
    <pre dangerouslySetInnerHTML={{ __html: log.slice(0, lines).join('\n') }}/>
    <span className="boot-bar"><i style={{ width: `${lines / log.length * 100}%` }}/></span>
    <small>CLICK OR PRESS ANY KEY TO SKIP</small>
  </button>;
}

/** The latest patch's changes, crawling along the bottom a character width per tick. Hover pauses it. */
export function Ticker({ onOpen }: { onOpen: () => void }) {
  const patch = multiplayerData.patches[0];
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  useEffect(() => {
    if (reduced() || !track.current) return;
    let x = 0;
    const el = track.current;
    const timer = window.setInterval(() => {
      if (paused.current) return;
      x = (x + 7.2) % (el.scrollWidth / 2 || 1);
      el.style.transform = `translateX(${-x}px)`;
    }, 90);
    return () => window.clearInterval(timer);
  }, []);
  if (!patch) return null;
  const name = (id: string) => multiplayerData.weapons.find(weapon => weapon.id === id)?.name ?? id;
  const items = [
    ...patch.newWeapons.map(item => <span key={`new-${item.id}`}><b>NEW</b> {name(item.id)}</span>),
    ...patch.weapons.map(weapon => {
      const [stat, before, after, direction] = weapon.groups[0]?.rows[0] ?? [];
      return <span key={weapon.id}><b>{name(weapon.id)}</b> {weapon.verdict.toUpperCase()} · {stat} <span className={direction === 'up' ? 'good' : direction === 'down' ? 'bad' : ''}>{before} → {after}</span></span>;
    }),
  ];
  return <div className="ticker" onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
    <button className="ticker-label" onClick={onOpen} title="Open the patch notes">PATCH {patch.title.replace('Season ', 'S')}</button>
    <div className="ticker-track" aria-hidden="true"><div className="ticker-run" ref={track}>{items}{items.map(item => <span key={`again-${item.key}`}>{item.props.children}</span>)}</div></div>
  </div>;
}
