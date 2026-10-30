# Verification

Checked October 30, 2026, after the rebuild from the ChatGPT version.

## Automated

`npm test` runs 18 checks, all passing:

- Attachment values in the bundled data match what CODMunity shows on the VEL 46 and Kastov 762 pages, read by hand.
- Every loadout entry points at a known attachment, no unlock sits above the gun's max level, and every Apex can unlock.
- Stacked changes multiply. VEL 46 time to kill follows its damage bands (252, 315, 378 ms) and a ×1.28 range multiplier moves the 10 m line to 12.8 m.
- The pruned search finds the same best score as a full brute-force search for six gun, preset and Apex cases.
- Every best build for all 28 guns has at most five attachments, one per slot, no optic with optics off, and nothing in an Apex-blocked slot.
- Weapon level gates attachments and the Apex. Locks, exclusions and the optic switch hold. Results are deterministic.
- Stability results are deterministic, stay between 0 and 1, and describe the best build's own parts.
- Under 24 nudged settings across three guns, rescoring the top 1,000 builds finds a winner within 5 ms of a full search every time, and the exact winner at least 90% of the time. A wider run before the test, 160 nudged settings over eight guns, matched exactly in 159 and missed by 0.7 ms in the other.
- The fetch script's table parser reads names, slots, levels and labels and ignores other tables. Its change report names added, removed, moved and retuned parts.
- All 17 streaks have a cost, and the UAV, Counter UAV, Advanced UAV, Gunship and Bomb Glider match the published values.
- For all 28 guns and four playstyles, every perk and equipment slot gets an item of the right kind, Overkill is never automatic, and three distinct streaks are picked.
- Player level, kills per life, Hardline and locks hold. A locked streak stays even above the band.
- The CODMunity VEL 46 Versatile Apex build keeps its code and its five parts. Across five guns, no fully matched, legal guide build without an optic outscores the optimizer's class at the same settings.
- Scoring a hand-made build reports Apex-blocked slots, two parts in one slot, and parts that do not fit the gun.

`npm run build` passes the TypeScript check and builds `dist/`.

## In the browser

Checked in the dev server at 1440 px and 390 px wide:

- Switching guns with the picker, playstyle presets, the distance slider, fine-tune sliders and the optic switch all recompute both classes.
- Excluding the XRK Tango 380 Barrel on the VEL 46 swapped in the VB-46 Series 11. Locking an attachment highlights it and keeps it in later builds. Clear all removes every pin.
- At weapon level 59 the VEL 46 Snap card shows it unlocks at 60, and its button sets the level back to 60.
- Saving both classes puts them on the Saved tab and in browser storage.
- A share link for the Kastov 762 restored the gun, level, preset, distance, optic setting, emphasis and exclusion, and dropped an invalid attachment ID.
- At 390 px there is no horizontal page scroll.

## Data refresh

- `npm run fetch -- --skip-levels` ran against COD Loadout on Oct 30. Both files downloaded, the rebuild reported no data changes, and the tests passed.
- The new Node parser was run on the 26 CODMunity pages saved during the first scrape. It produced exactly the stored unlock tables for all 26.
- The full CODMunity refresh was not run from this session. Claude's safety check blocked the first attempt, which sent a browser user agent. The script now identifies itself honestly. Whether CODMunity accepts that is untested.

## Not checked

- No build was tested in the game, and no stat was measured in a private match.
- Copy to clipboard was not confirmed, because the test browser blocks clipboard writes. The app shows a message when that happens.
- The slowest search plus stability check, the Rezi 12 with optics on and every stat weighted, takes about 2.1 s. The default VEL 46 search takes about 0.2 s. Both run off the main thread.
