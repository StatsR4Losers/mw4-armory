# Verification

Checked October 30, 2026, after the rebuild from the ChatGPT version, again after per-class playstyles, the one-shot kill model and the site-build reading, and again after shared attachment unlocks.

## Automated

`npm test` runs 31 checks, all passing:

- Attachment values in the bundled data match what CODMunity shows on the VEL 46 and Kastov 762 pages, read by hand.
- Every loadout entry points at a known attachment, no unlock sits above the gun's max level, and every Apex can unlock.
- Stacked changes multiply. VEL 46 time to kill follows its damage bands (252, 315, 378 ms) and a ×1.28 range multiplier moves the 10 m line to 12.8 m.
- The pruned search finds the same best score as a full brute-force search for ten gun, playstyle and Apex cases, including a quickscope Mosin, a hardscope KG-7, a slug Warlord, a hip-fire Rezi and a sidearm SANG. Pruning now also keeps one of each group of parts with identical scored stats, such as the 30 optics that list no changes.
- Every best build for all 28 guns has at most five attachments, one per slot, no optic with optics off, and nothing in an Apex-blocked slot.
- Weapon level gates attachments and the Apex. Locks, exclusions and the optic switch hold. Results are deterministic.
- Stability results are deterministic, stay between 0 and 1, and describe the best build's own parts.
- Under 32 nudged settings across four guns, including a quickscope Mosin, rescoring the stability pool finds a winner within 5 ms of a full search every time, and the exact winner at least 90% of the time. With only the top 1,000 builds, the Mosin missed by up to 35 ms, because a few meters flip its one-shot kills. Adding the best builds at the near and far distances brought the miss to 0 across 80 nudged settings on five one-shot guns.
- Every supported gun has at least two playstyles for its class, and a playstyle from another class falls back to the class default.
- The kill model gives the Mosin a one-shot chance equal to every non-limb hit inside 37 m, and headshots only past 56 m. Its light bolt saves the expected follow-ups times 11% of the 1767 ms rechamber. Its heavy bolt scores as slower but 50% steadier, and a range barrel shows up as kill time at 40 m.
- Bullet velocity scores zero inside hitscan range, for the Mosin at 10 m and the VEL 46 at 10 m, and counts past it.
- Sniper playstyles never spend a slot on an optic, even with the optic switch on. Hip fire never runs one. Slug playstyles always run the slug, report the level it unlocks at, and flag a site build without one.
- The stored site-build reading in game.json matches a fresh run of the engine for the Mosin, Warlord and VEL 46.
- The fetch script's table parser reads names, slots, levels and labels and ignores other tables. Its change report names added, removed, moved and retuned parts.
- All 17 streaks have a cost, and the UAV, Counter UAV, Advanced UAV, Gunship and Bomb Glider match the published values.
- For all 28 guns and every playstyle of their class, every perk and equipment slot gets an item of the right kind, Overkill is never automatic, and three distinct streaks are picked.
- Player level, kills per life, Hardline and locks hold. A locked streak stays even above the band.
- The CODMunity VEL 46 Versatile Apex build keeps its code and its five parts. Across five guns, no fully matched, legal guide build without an optic outscores the optimizer's class at the same settings.
- Scoring a hand-made build reports Apex-blocked slots, two parts in one slot, and parts that do not fit the gun.
- A shared part counts once another gun reaches its level there: 5.56 NATO Overpressured on a level 10 Han 86 unlocks with the M4 at level 3 and not at level 2. The search then uses it.
- Magazines and No Stock never share, and the MAR-9's level-less entries never unlock anything on other guns.
- A prestiged gun loses shared parts from other guns, keeps its Apex, and still shares its earlier unlocks as if at max level.
- Hand marks win over levels. A mark on a shared part applies on every gun, and one on a gun-specific part only on that gun.
- Without an armory, every gun at levels 1, 20 and 45 gets exactly the parts the old level-only rule gave it.
- Marking the Kastov 762's most valuable part as not unlocked removes it from the best build, and the full-unlock build shown beside it is the old best, at the same score.
- A level 5 Warlord on Slugs reports that the slug unlocks at level 10 there or on the Rezi 12, and runs it once the Rezi 12 is at level 10.
- Unlock routes sort by levels left: for a level 40 Han 86 with the M4 at 1 and the FiNN LMG at 50, the M4 (2 to go), then the FiNN (6), then the Han itself (19).

`npm run build` passes the TypeScript check and builds `dist/`.

## In the browser

Checked in the dev server at 1440 px and 390 px wide after the Build screen redesign:

- Switching from Rush to Long lanes on the VEL 46 set the baseline to "Previous build (Rush, 8 m)" and marked five changed slots with arrows. The unchanged Schlager Visiv-5 row had none. Stats that moved got arrows and the rest did not.
- Turning the Apex switch on compared against the build with it off. Pressing Compare on Game8's top build loaded it as the baseline and marked the card as Comparing.
- The baseline survives a trip to another tab and back.
- Locking and excluding parts, the optic switch, weapon level gating and the Apex unlock button work as before.
- Edit in Compare puts the baseline and the build in the Compare tab, and Make baseline swaps which column the others are measured against.
- Saving a class puts it on the Saved tab with its perks and streaks. A share link restores the gun, level, preset, distance, switches, emphasis and exclusions.
- At 390 px there is no horizontal page scroll, and changed parts stack as "Was X" above the new part.
- The README screenshots were taken from this state with headless Chrome.

Checked in the dev server after the per-class playstyles:

- The VEL 46 opens on Mid-range with the Sites' pick tag. The KG-7 opens on Quickscope, shows "Stock scope" instead of the optic switch, lists an 80% one-shot rate, and runs the KT76 Light Bolt at +121 ms.
- The Warlord opens on Slugs, runs the 12 Gauge Slug and the L-Strike Bolt, and shows the handling-only note. The Oris shows "No clear lean" and opens on Quickscope.
- The sites' reading lists the shared parts and whether the optimizer runs them. On the Mosin it runs all three.
- At 375 px the reading panel fits with no horizontal page scroll.
- The README screenshots were retaken from this state.

Checked in the dev server after shared attachment unlocks:

- On a level 10 Han 86, the level was stored for that gun and the panel under the build listed three missing parts at +15 ms, with routes such as "Level 24 on the FiNN LMG".
- Typing FiNN LMG 30 and PPSh-41 10 under Your other guns put the Corvus LVL-40 and Schlager Visiv-5 into the build, tagged "FiNN LMG Lv 24" and "PPSh-41 Lv 4". The score rose from +82 to +94 ms.
- Don't have it on the Corvus redid the build without it at +93 ms, named the old build "Previous build (earlier unlocks)", and showed a pin and an Undo. Undo put it back.
- Ticking In Weapon Prestige on the Han 86 dropped both shared parts and enabled the Apex switch. The settings survived a page reload.
- A level 20 M4 then ran the Corvus from the prestiged Han 86. Switching back to the Han 86 restored level 10.
- A share link carries the level but not the armory.
- At 375 px there is no horizontal page scroll, and the gun list and missing-parts panel fit. This pass also fixed the phone stat rows, which had been squeezed into the arrow column since the Build redesign.

## Data refresh

- `npm run fetch -- --skip-levels` ran against COD Loadout on Oct 30. Both files downloaded, the rebuild reported no data changes, and the tests passed.
- The new Node parser was run on the 26 CODMunity pages saved during the first scrape. It produced exactly the stored unlock tables for all 26.
- The CODMunity page read ran on Oct 30 with the honest user agent, for rechamber, pre-fire and hitscan stats only. All 28 pages loaded. The extracted Mosin values match what the page shows: 1767 ms rechamber, 35 m hitscan, TV-Light ×0.89 and MN-BCH3 ×1.11.
- The unlock-table half of that read has still not run live. The unlock levels in the data are the ones collected in a browser.

## Not checked

- No build was tested in the game, and no stat was measured in a private match.
- Which parts are shared is inferred from names. It was not checked in the game, and neither was whether a prestiged gun can still use shared parts unlocked on other guns.
- Copy to clipboard was not confirmed, because the test browser blocks clipboard writes. The app shows a message when that happens.
- Timed over all 156 gun, playstyle and optic combinations: the slowest full search with stability is the KG-7 on Hardscope with the optic switch on, at 1.3 s. The median is 0.39 s, and the VEL 46 takes 0.36 s. All run off the main thread.
- The hit spreads and miss rates for one-shot guns, and the rule that a bolt fires at the slower of its fire rate and rechamber, are assumptions. Nobody has published measurements for either.
- Weights were moved toward the site builds where the research agreed. The site builds' mean fit to their own playstyle rose for every class, most for SMGs, from 16% to 21%. Some site builds still score below stock under every playstyle, such as the Axion's 100-round drum builds.
