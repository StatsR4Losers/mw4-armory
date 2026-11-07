import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/game.json' with { type: 'json' };
import { averageTtk, optimize, playstylesFor, resetCaches, setPlaystyleMode } from '../src/engine/index.ts';
import { modeView } from '../src/data/mode.ts';
import { parsePageExtras, parseWarzoneBuilds, parseWarzoneRules } from '../scripts/fetch-sources.ts';
import { metricIds } from '../src/types.ts';
import type { GameData, Mode, Settings, Weights } from '../src/types.ts';

const mp = raw as unknown as GameData;
const wz = modeView(mp, 'wz');
const neutral = () => Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;
function inMode<T>(mode: Mode, run: () => T): T {
  setPlaystyleMode(mode); resetCaches();
  try { return run(); } finally { setPlaystyleMode('mp'); resetCaches(); }
}

// A page holds a multiplayer record and a Warzone record for the same part, both tagged sourceGame mw4.
const page = `
{__v:0,_id:"a",ads:240,game:"mw4",gun:"M4",hitscan_range:29.5,rpm:811,sourceGame:"mw4",simple_damage:$R[1]=[$R[2]={chest:23,dropoff:0,head:29,lowerarm:23,lowerleg:23,multipliers:$R[3]={chest:1},neck:23,stomach:23,upperarm:23,upperleg:23},$R[4]={chest:19,dropoff:28,head:24,lowerarm:19,lowerleg:19,multipliers:$R[5]={chest:1},neck:19,stomach:19,upperarm:19,upperleg:19}]}
{__v:0,_id:"b",ads:235,game:"warzone-2",gun:"M4",hitscan_range:45,rpm:811,sourceGame:"mw4",simple_damage:$R[6]=[$R[7]={chest:34,dropoff:0,head:41,lowerarm:34,lowerleg:30,multipliers:$R[8]={chest:1},neck:34,stomach:30,upperarm:34,upperleg:30}]}
{__v:0,_id:"c",ads_mod:1.07,ads_out_mod:1.05,attachment:"XRK Mil-Tac Suppressor",game:"mw4",slot:"Muzzle"}
{__v:0,_id:"d",ads_mod:1.07,ads_out_mod:1.08,attachment:"XRK Mil-Tac Suppressor",game:"warzone-2",slot:"Muzzle",sourceGame:"mw4"}
{__v:0,_id:"e",ads_mod:1.2,attachment:"XRK Mil-Tac Suppressor",game:"warzone-2",slot:"Muzzle",sourceGame:"mw2"}
{Ammunition:"5.56 NATO High Velocity",Apex:0,Barrel:"18\\" LE Crosswind",LoadoutCode:"A05-3KB4J",Magazine:"45 Round Mag",Optic:"Cronen R808","Rear Grip":0,Playstyle:"Long Range",_id:"f",active:!0,appGame:"warzone-2",collec:"wz",isPremium:!1,updated:1793885416257,stats:$R[9]={}}
{Ammunition:0,Apex:0,Barrel:"Hidden",Playstyle:"Close Range",_id:"g",active:!0,appGame:"warzone-2",collec:"wz",isPremium:!0,stats:$R[10]={}}
health:300,healthPerPlate:50,icon:"x.svg",maxAttachments:5,maxPlates:3,name:"Warzone"`;

test('the page parser keeps multiplayer and Warzone records apart', () => {
  const multi = parsePageExtras(page, true, 'mp')!, war = parsePageExtras(page, true, 'wz')!;
  assert.equal(multi.stats!.ads, 240);
  assert.equal(war.stats!.ads, 235);
  assert.deepEqual(multi.mods!['XRK Mil-Tac Suppressor'], { ads: 1.07, ads_out: 1.05 });
  assert.deepEqual(war.mods!['XRK Mil-Tac Suppressor'], { ads: 1.07, ads_out: 1.08 });
  assert.deepEqual(multi.damage, [
    { minM: 0, maxM: 28, regions: { head: 29, neck: 23, chest: 23, stomach: 23, upperarm: 23, lowerarm: 23, upperleg: 23, lowerleg: 23 } },
    { minM: 28, maxM: null, regions: { head: 24, neck: 19, chest: 19, stomach: 19, upperarm: 19, lowerarm: 19, upperleg: 19, lowerleg: 19 } },
  ]);
  assert.equal(war.damage![0].regions.chest, 34);
});

test('Warzone build cards and rules are read, premium cards are skipped', () => {
  assert.deepEqual(parseWarzoneBuilds(page), [['Long Range', 'A05-3KB4J', ['Cronen R808', '18" LE Crosswind', '45 Round Mag', '5.56 NATO High Velocity'], null, '2026-11-05']]);
  assert.deepEqual(parseWarzoneRules(page), { health: 300, plate: 50, attachments: 5, plates: 3 });
});

test('multiplayer attachment numbers still match COD Loadout after the parser fix', () => {
  // CODMunity's multiplayer record for this suppressor on the M4, which COD Loadout mirrors.
  assert.deepEqual(mp.loadouts.m4.find(entry => entry[0] === 'xrk-mil-tac-suppressor')![2], { ads: 1.07, ads_out: 1.05 });
});

test('the Warzone view swaps stats, health and parts but keeps guns, parts and unlock levels', () => {
  assert.ok(mp.warzone, 'game.json has a Warzone section');
  assert.equal(wz.weapons.length, mp.weapons.length);
  const m4 = wz.weapons.find(item => item.id === 'm4')!, mpM4 = mp.weapons.find(item => item.id === 'm4')!;
  assert.equal(m4.health, 300);
  assert.equal(mpM4.health, 100);
  assert.notEqual(m4.base!.bv, mpM4.base!.bv);
  for (const [id, list] of Object.entries(wz.loadouts)) {
    assert.deepEqual(list.map(entry => [entry[0], entry[1]]), mp.loadouts[id].map(entry => [entry[0], entry[1]]), `${id} keeps its parts and levels`);
  }
  // Shotguns have no damage model in either mode.
  assert.equal(wz.weapons.find(item => item.id === 'rezi-12')!.damage, null);
});

test('Warzone has its own playstyles for every class, and the cache reset keeps modes apart', () => {
  for (const weapon of wz.weapons.filter(item => wz.loadouts[item.id] && item.base)) {
    const styles = inMode('wz', () => playstylesFor(weapon));
    assert.ok(styles.length > 0 && styles.every(style => style.mode === 'wz'), `${weapon.id} has Warzone playstyles`);
  }
  const mpM4 = mp.weapons.find(item => item.id === 'm4')!, wzM4 = wz.weapons.find(item => item.id === 'm4')!;
  const before = averageTtk(mpM4, 20);
  const plated = inMode('wz', () => averageTtk(wzM4, 20));
  assert.ok(plated! > before! * 1.5, `a plated kill takes longer: ${plated} against ${before}`);
  assert.equal(averageTtk(mpM4, 20), before);
});

test('the optimizer finds a legal Warzone build within the 5-part limit', () => {
  const result = inMode('wz', () => {
    const style = playstylesFor(wz.weapons.find(item => item.id === 'm4')!)[0];
    const settings: Settings = { mode: 'wz', weaponId: 'm4', level: 72, preset: style.id, emphasis: neutral(), distanceM: style.distanceM, apex: false, optic: false, locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [] };
    return optimize(wz, settings);
  });
  const best = result.standard.best!;
  assert.ok(best && best.attachments.length <= mp.warzone!.rules.attachments);
  assert.ok(best.score > 0);
  assert.equal(new Set(best.attachments.map(id => wz.attachments[id].slot)).size, best.attachments.length);
});

test('stored Warzone builds follow the Apex and part rules', () => {
  for (const [kind, apexOn] of [['builds', false], ['apexBuilds', true]] as const) {
    for (const [id, byStyle] of Object.entries(mp.warzone![kind] ?? {})) {
      const gun = mp.weapons.find(item => item.id === id)!;
      for (const [style, parts] of Object.entries(byStyle)) {
        const slots = parts.map(part => mp.attachments[part].slot);
        if (!apexOn) for (const part of gun.apex?.parts ?? []) assert.ok(!parts.includes(part), `${id} ${style} runs ${part} without its Apex`);
        if (apexOn) for (const closed of gun.apex!.blocks) assert.ok(!slots.includes(closed), `${id} ${style} uses blocked ${closed}`);
        for (const part of parts) for (const closed of gun.partBlocks?.[part] ?? []) assert.ok(!slots.includes(closed), `${id} ${style}: ${part} closes ${closed}`);
      }
    }
  }
});

test('silenced barrels close the muzzle slot in every playstyle and mode', () => {
  const silenced = Object.entries(mp.attachments).filter(([, part]) => part.kind === 'Silenced Barrel').map(([id]) => id);
  const guns = mp.weapons.filter(gun => mp.loadouts[gun.id]?.some(([id]) => silenced.includes(id)));
  assert.deepEqual(guns.map(gun => gun.id).sort(), ['axion', 'han-86', 'kastov-762', 'mar-9', 'oris-8-6', 'ppsh-41']);
  for (const gun of guns) for (const id of silenced) if (mp.loadouts[gun.id].some(entry => entry[0] === id)) assert.deepEqual(gun.partBlocks?.[id], ['muzzle'], `${gun.id}: ${id}`);
  let paired = 0;
  for (const mode of ['mp', 'wz'] as const) inMode(mode, () => {
    const data = mode === 'mp' ? mp : wz;
    for (const gun of guns) {
      const view = data.weapons.find(item => item.id === gun.id)!;
      if (!view.base) continue;
      for (const style of playstylesFor(view)) for (const optic of [false, true]) {
        const settings: Settings = { mode, weaponId: gun.id, level: gun.maxLevel!, preset: style.id, emphasis: neutral(), distanceM: style.distanceM, apex: false, optic, locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [] };
        const result = optimize(data, settings);
        for (const build of [result.standard.best, result.apex.best]) {
          if (!build?.attachments.some(id => silenced.includes(id))) continue;
          paired++;
          assert.ok(!build.attachments.some(id => data.attachments[id].slot === 'muzzle'), `${mode} ${gun.id} ${style.id}: ${build.attachments}`);
        }
      }
    }
  });
  // Before the rule, nine builds here ran a silenced barrel with a muzzle. Eight still pick the barrel. If too few did,
  // the check above would pass without testing anything.
  assert.ok(paired >= 5, `only ${paired} builds ran a silenced barrel`);
});
