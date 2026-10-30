import test from 'node:test';
import assert from 'node:assert/strict';
import { diffGames, parseUnlockTable } from '../scripts/fetch-sources.ts';

test('the unlock table parser reads CODMunity rows and skips other tables', () => {
  const html = `<table><tr><th>Name</th><th>Slot</th><th>Unlock</th></tr>
    <tr><td><span><strong>FSS Crackdown</strong></span></td><td>Muzzle</td><td>Level<!-- --> 4</td><td>Heavy Silencer</td><td>+18.0% range</td></tr>
    <tr><td>4.6x30mm Hollow Point</td><td>Ammunition</td><td>Level 30</td><td></td><td>—</td></tr>
    <tr><td>Bryson&#x27;s &amp; Co</td><td>Rear Grip</td><td>Level 9</td><td>Aim Grip</td></tr></table>
    <table><tr><td>Pro build</td><td>Versatile</td><td>Level up</td></tr></table>`;
  assert.deepEqual(parseUnlockTable(html), [
    ['FSS Crackdown', 'Muzzle', 4, 'Heavy Silencer'],
    ['4.6x30mm Hollow Point', 'Ammunition', 30, ''],
    ["Bryson's & Co", 'Rear Grip', 9, 'Aim Grip'],
  ]);
});

test('the change report names added, removed, moved and retuned parts', () => {
  const game = (loadout: [string, number, Record<string, number>][], apexMods: Record<string, number> | null, ads = 230) => ({
    weapons: [{ id: 'vel-46', name: 'VEL 46', base: { ads }, apex: { name: 'VEL 46 Snap', mods: apexMods } }],
    attachments: { a: { name: 'Alpha' }, b: { name: 'Bravo' }, c: { name: 'Charlie' } },
    loadouts: { 'vel-46': loadout },
  });
  const before = game([['a', 3, { ads: 1.1 }], ['b', 10, {}]], null);
  assert.deepEqual(diffGames(before, before), []);
  const [line] = diffGames(before, game([['a', 5, { ads: 1.05 }], ['c', 12, {}]], { stf: .5 }, 220));
  assert.match(line, /^VEL 46: /);
  for (const part of ['added Charlie', 'removed Bravo', 'Alpha 3→5', 'new stat changes for Alpha', 'base ads 230→220', 'VEL 46 Snap now has stats']) assert.ok(line.includes(part), `${part} missing from: ${line}`);
});
