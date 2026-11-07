// Gunsmith rules the stat sources do not carry: parts the game only offers with the gun's Apex on, and slots a part
// closes when you equip it. scripts/build-data.ts copies them onto each weapon, and the engine never builds past them.
//
// M4. Hurricane Stock and Hurricane Grip only appear with the M4 Hurricane Apex: both unlock at level 72 with it, only
// the M4 lists them, and every site build that runs one also runs the Apex (CODMunity, Game8 and WZStats, October 2026).
// Hurricane Stock closes the rear grip and barrel slots, from play reports. WZStats' Apex build runs it with neither.
// Hurricane Grip closes nothing extra: Game8's Apex build runs it with a rear grip and a stock.
//
// Silenced barrels have the suppressor built in, so they close the muzzle slot. No source states it, but all 11 site
// builds that run one (CODMunity, Game8 and WZStats, October 2026) leave the muzzle empty. The Oris 8.6's EXP Shadow-70
// is in no site build and follows the other five.
export interface PartRules {
  apexOnly?: string[];
  blocks?: Record<string, string[]>;
}

const silenced = (id: string): Record<string, string[]> => ({ [id]: ['muzzle'] });

export const partRules: Record<string, PartRules> = {
  m4: {
    apexOnly: ['hurricane-stock', 'hurricane-grip'],
    blocks: { 'hurricane-stock': ['rear-grip', 'barrel'] },
  },
  'han-86': { blocks: silenced('han-86-silenced-413mm') },
  'kastov-762': { blocks: silenced('fjx-ghostfire-16-3') },
  axion: { blocks: silenced('matuzek-s5-brace') },
  'ppsh-41': { blocks: silenced('hanbit-chimmuk-intr') },
  'mar-9': { blocks: silenced('bruen-reaper-x') },
  'oris-8-6': { blocks: silenced('exp-shadow-70-14') },
};
