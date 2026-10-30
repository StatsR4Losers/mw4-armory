# Weapon statistics source ledger

Checked October 30, 2026. Target: Call of Duty: Modern Warfare 4 (2026), standard multiplayer. These are public community observations. No live-game measurement was performed.

## Original source and extraction

[CODMunity MW4 multiplayer comparator](https://codmunity.gg/weapon-stats/mw4) identifies the title and multiplayer mode, displays its October 30 update and October 28 patch label, and publicly renders base handling values. Its delivered page data contains an explicit MW4 game configuration with `health: 100` and per-weapon `weaponStats` records. Each imported record has both `game: "mw4"` and `sourceGame: "mw4"`. That two-field check excludes Warzone, DMZ and legacy same-name entries.

The original comparator supplied 19 records. Public weapon pages supplied the remaining 14. Extraction read public HTML and parsed only the delivered literal arrays. It used no login, premium data, hidden API endpoint or credential. Only the normalized factual values are retained in the app; source descriptions and source-calculated TTK columns are omitted.

[COD Loadout data and assumptions](https://codloadout.gitlab.io/mw4/data-and-assumptions/) and its [public October 28 statistics JSON](https://codloadout.gitlab.io/data/mw4-community-stats.json) led to the original source and provided a cross-check. The final weapon overlay uses the original MW4 records.

## Units and interpretation

- ADS, sprint-to-fire and reload are milliseconds. Projectile velocity, movement, ADS movement, sprint and tactical sprint speeds are meters per second. Reload means the source's total reload duration; tactical versus empty reload was not specified. Shell-by-shell reload behavior is not modeled.
- Damage is health points per hit for the listed region. Dropoffs are meters and define intervals with an inclusive lower boundary and exclusive upper boundary. The final interval continues at its last reported damage.
- The eight region keys are `head`, `neck`, `chest`, `stomach`, `upperarm`, `lowerarm`, `upperleg` and `lowerleg`.
- Fire mode comes from the official base-weapon descriptions. Burst and manually cycled weapons cannot use the automatic-fire formula.
- The explicit community health setting is 100. It is scoped to the MW4 multiplayer record, not other modes.
- A damage profile is a base-weapon observation. Attachment and Apex damage changes are not established by these profiles.
- Source `range: 100` is a relative index. It is never converted into meters. Recoil figures without a physical unit are not converted into degrees or hit probabilities.

## Coverage and source rows

Every table value below is a source observation. The source URL opens the public page whose delivered MW4 record supplied that row. Update dates belong to the individual source records and do not prove a later game patch was tested.

| Weapon | ADS ms | Sprint-to-fire ms | Reload ms | Velocity m/s | Damage intervals | Source updated UTC | Source |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Han 86 | 250 | 210 | 3133 | 615 | 2 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| M4 | 240 | 210 | 2600 | 590 | 2 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Hyeon Burst | 275 | 210 | 3400 | 775 | 3 | 2026-10-30 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Patriot XMR | 280 | 210 | 3333 | 620 | 3 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Kastov 762 | 280 | 210 | 3467 | 560 | 3 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Oden | 320 | 210 | 3300 | 690 | 3 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Axion | 260 | 210 | 3333 | 400 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Cronen Squall | 305 | 210 | 3533 | 660 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| ISO Nightshade | 240 | 110 | 3267 | 530 | 4 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| VEL 46 | 230 | 110 | 2633 | 565 | 4 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| WZ.55 Striga | 196 | 96 | 3167 | 380 | 4 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| PPSh-41 | 280 | 110 | 3900 | 550 | 4 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| X-58 Nyx | 255 | 110 | 2767 | 450 | 4 | 2026-10-28 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Rezi 12 | 340 | 160 | 6131 | 340 | 0 | 2026-10-29 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Warlord | 340 | 210 | 20796 | 325 | 0 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/warlord) |
| FiNN LMG | 400 | 237 | 6270 | 710 | 3 | 2026-10-28 | [Original](https://codmunity.gg/weapon/mw4/finn-lmg) |
| Type 73 | 460 | 245 | 6767 | 690 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/type-73) |
| APOC-338 | 510 | 250 | 7100 | 730 | 3 | 2026-10-28 | [Original](https://codmunity.gg/weapon/mw4/apoc-338) |
| MAR-9 | 330 | 249 | 2933 | 670 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/mar-9) |
| Oris 8.6 | 260 | 150 | 3000 | 570 | 4 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Mosin-Nagant | 350 | 240 | 3333 | 700 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| KG-7 Vulcan | 550 | 270 | 4367 | 740 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Astaroth .57 | 603 | 500 | 6533 | 620 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| Signal 50 | 590 | 283 | 4967 | 600 | 4 | 2026-10-23 | [Original](https://codmunity.gg/weapon-stats/mw4) |
| SANG 9mm | 170 | 80 | 2500 | 370 | 4 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/sang-9mm) |
| Krait P68 | 180 | 80 | 2967 | 250 | 4 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/krait-p68) |
| .50 GS | 200 | 80 | 2333 | 460 | 3 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/50-gs) |
| Mojave .357 | 190 | 80 | 3700 | 400 | 4 | 2026-10-23 | [Original](https://codmunity.gg/weapon/mw4/mojave-357) |
| PILA | 680 | 250 | 5933 | 63.5 | 0 | 2026-10-22 | [Original](https://codmunity.gg/weapon/mw4/pila) |
| RPG-8 | 550 | 500 | 3300 | 52.1 | 0 | 2026-10-22 | [Original](https://codmunity.gg/weapon/mw4/rpg-8) |
| JOKR | 740 | 250 | 4033 | 30.5 | 0 | 2026-10-22 | [Original](https://codmunity.gg/weapon/mw4/jokr) |
| PM-40 Anvil | 350 | 250 | 7034 | 790 | 0 | 2026-10-22 | [Original](https://codmunity.gg/weapon/mw4/pm-40-anvil) |
| FSS Carbon Edge 1095 | Unknown | Unknown | Unknown | Unknown | 0 | 2026-10-22 | [Original](https://codmunity.gg/weapon/mw4/fss-carbon-edge-1095) |

Coverage: 33 catalog weapons; 32 weapons with the four handling/projectile values and all four movement values; 26 with damage profiles; 15 automatic base weapons with profiles. Shotguns, launchers and melee have no generic damage/TTK model.

## Movement observations

All four speeds are meters per second. The original MW4 knife record omits these values; it receives no numeric movement score. Walking speed is the source `movement` field.

| Weapon | Movement m/s | ADS movement m/s | Sprint m/s | Tactical sprint m/s |
| --- | ---: | ---: | ---: | ---: |
| Han 86 | 4.67 | 2.47 | 6.13 | 7.21 |
| M4 | 4.7 | 2.51 | 6.18 | 7.26 |
| Hyeon Burst | 4.58 | 2.36 | 6.07 | 7.11 |
| Patriot XMR | 4.54 | 2.22 | 6.05 | 7.09 |
| Kastov 762 | 4.52 | 2.34 | 6.05 | 7.1 |
| Oden | 4.46 | 2.18 | 6.03 | 6.97 |
| Axion | 4.62 | 2.41 | 6.11 | 7.16 |
| Cronen Squall | 4.55 | 2.24 | 6.07 | 7.11 |
| ISO Nightshade | 4.8 | 3.2 | 6.33 | 7.43 |
| VEL 46 | 4.77 | 3.22 | 6.26 | 7.33 |
| WZ.55 Striga | 5.06 | 3.54 | 6.46 | 7.68 |
| PPSh-41 | 4.7 | 3.15 | 6.21 | 7.29 |
| X-58 Nyx | 4.74 | 3.26 | 6.27 | 7.31 |
| Rezi 12 | 4.72 | 3.09 | 6.26 | 7.34 |
| Warlord | 4.55 | 2.93 | 6.11 | 7.09 |
| FiNN LMG | 4.38 | 2.03 | 5.82 | 6.75 |
| Type 73 | 4.33 | 1.81 | 5.71 | 6.55 |
| APOC-338 | 4.05 | 1.51 | 5.57 | 6.35 |
| MAR-9 | 4.41 | 2.1 | 5.93 | 6.95 |
| Oris 8.6 | 4.77 | 2.78 | 6.18 | 7.34 |
| Mosin-Nagant | 4.57 | 2.1 | 6.04 | 7.09 |
| KG-7 Vulcan | 4.33 | 1.13 | 5.8 | 6.67 |
| Astaroth .57 | 4.04 | 1.04 | 5.47 | 6.22 |
| Signal 50 | 4.22 | 1.07 | 5.67 | 6.52 |
| SANG 9mm | 5.05 | 3.73 | 6.62 | 7.64 |
| Krait P68 | 4.99 | 3.68 | 6.58 | 7.6 |
| .50 GS | 4.92 | 3.51 | 6.55 | 7.51 |
| Mojave .357 | 4.96 | 3.58 | 6.56 | 7.55 |
| PILA | 4.12 | 1.07 | 5.52 | 6.33 |
| RPG-8 | 4.33 | 1.51 | 5.63 | 6.46 |
| JOKR | 4.05 | 0.97 | 5.46 | 6.25 |
| PM-40 Anvil | 4.44 | 1.72 | 5.97 | 6.79 |
| FSS Carbon Edge 1095 | Unknown | Unknown | Unknown | Unknown |

## Source conflicts

- The live original MW4 PPSh-41 record has movement 4.70 m/s, ADS movement 3.15 m/s, sprint 6.21 m/s and ADS 280 ms. The October 28 secondary JSON has movement 4.66 m/s, ADS movement 3.13 m/s, sprint 6.18 m/s and ADS 300 ms. The overlay uses the original values.
- The generic PPSh-41 weapon page defaults to a Warzone record with ADS 175 ms, sprint-to-fire 115 ms, reload 3060 ms and velocity 530 m/s. Those values were rejected because their mode does not match.
- The community RPM differs from the official launch sheet by one RPM for several weapons. Examples: M4 811 versus 810; Han 86 741 versus 740; Oden 414 versus 413; Axion 706 versus 705; Cronen Squall 674 versus 673. The overlay uses the exact current community record so calculations can be traced to one source. This does not establish that a game patch changed cadence.
- Hyeon Burst has nominal RPM 375, intra-burst RPM 840, three shots per burst and a 179 ms burst delay. A single average RPM cannot express that shot sequence.
- Source pre-fire delays include Cronen Squall 45 ms, WZ.55 Striga 64 ms, PPSh-41 37 ms, FiNN LMG 50 ms, Type 73 57 ms and APOC-338 75 ms. First-shot ideal TTK excludes them.
- Rezi 12 and Warlord have empty damage arrays. Their reported reload durations of 6131 ms and 20796 ms do not establish shell insertion timings. No per-pellet damage was invented.

## Verification performed

Parsed all 33 selected original records and checked title/mode markers. Checked every imported numeric field against its source record. Checked that damage ranges increase, region values are positive, all eight regions are present, and each interval joins the next. Source-calculated TTK was not imported because some source calculations include projectile travel or special firing behavior.

The app import does not establish deployed behavior, independent game accuracy, attachment stacking, live patch parity, tactical versus empty reload, or a complete combat event model.

## Retrieval receipts

Temporary raw receipts were used to verify extraction. They are not bundled because the public pages also contain unrelated site state. SHA-256 hashes identify the receipts used:

- `codmunity-mw4-comparator.html`: `bb5f00b496a319953b8ffb3ce5ef4be61873dbe2bd8885c004fb9f3edc368721`
- `codmunity-mw4-all-original-stats.json`: `f73fb8dec5f7770b9126eba72d83b772fb9c4a21cc73ff6bc6d25ca3d21419a8`
- `mw4-community-stats.json`: `bf7dad143b2f1d41854ac4758426af429e665e448a15e01a94f7028e75df8ec2`
