import type { CSSProperties } from 'react';

// Small line icons keep controls identifiable without implying unavailable game artwork.
export function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>,
    weapon: <><path d="M3 9h13l2-2h3v6h-8l-2 3H7l1-3H3zM5 9V6m11 7v5h-3v-5"/></>,
    save: <><path d="M5 3h13l3 3v15H3V3h2z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></>,
    data: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/></>,
    unlock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0m-4 8v3"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4m-6 6 6 4"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 7a7 7 0 0 1 12-2l2.5 7M4 12l2.5 7a7 7 0 0 0 12-2"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    bolt: <path d="m13 2-8 12h6l-1 8 9-13h-7z"/>,
    shield: <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    flag: <><path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/></>,
    range: <><path d="M3 19h18M5 16V7m7 9V3m7 13V9"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6"/></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    scope: <><circle cx="12" cy="12" r="7"/><path d="M12 1v7m0 8v7M1 12h7m8 0h7"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name] ?? paths.grid}</svg>;
}
