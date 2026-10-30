# Attachment source ledger

Checked October 30, 2026 for Modern Warfare 4 (2026), standard multiplayer. This is a community catalog with source-based compatibility. No in-game Gunsmith captures or combination tests were performed.

## Imported records

- 615 distinct standard attachment names, expanded into 1,589 weapon-specific records across all 24 primaries and four pistols. This keeps a weapon's qualitative effects separate from the same attachment on another weapon.
- 175 records have a provisional weapon-level unlock reported in a public MW4 Multiplayer build. The remaining 1,414 records have null levels. Unknown levels require explicit ownership in the optimizer.
- 611 distinct real attachment picture URLs appear on 1,585 records. Four records have no picture. These are remote source assets, not generated pictures or downloaded media.
- Pros and cons summarize directions in the community multiplier snapshot. Editorial role deltas stay between -12 and 12. The file contains no exact numeric effect overrides.

The imported file is [src/data/attachments.ts](../src/data/attachments.ts). Its exports are `attachments`, `attachmentSources`, and `attachmentNotes`. Record IDs use `weapon-id--attachment-id`; the suffix matches the public community data ID. Slots use lowercase hyphenated names, including `rear-grip` and `trigger-action`.

## Public data sources

| Source | Use | Limits |
| --- | --- | --- |
| [Public attachment JSON](https://codloadout.gitlab.io/data/mw4-community-attachments.json) | Names, slots, reported compatible weapons and short type labels. Snapshot dated October 28. | Community reports attributed to ggranked and CODMunity, with some older DMZ sources. No official attachment-by-attachment catalog exists for comparison. |
| [Public multiplier JSON](https://codloadout.gitlab.io/data/mw4-community-stats.json) | Qualitative directions and bounded editorial role preferences, separately for each weapon. | Snapshot dated October 28. The upstream source is CODMunity. Missing changes remain unknown. This importer does not claim exact effects or apply these multipliers to combat calculations. |
| [Public attachment page](https://codloadout.gitlab.io/mw4/attachments/) | Read the actual linked image addresses. | Addresses came from the HTML's attachment image tags. The importer does not invent URLs from names. |
| [Source and conflict ledger](https://codloadout.gitlab.io/mw4/data-and-assumptions/) | Check collection dates, source scope and known disagreements. | The ledger reports one-level disagreements between ggranked and CODMunity. It omits their unlock levels. Its retained unlocks are from DMZ Codex, so this importer excluded them from multiplayer level filtering. |
| [Image credits](https://codloadout.gitlab.io/credits/) | Attribution and origin of attachment artwork. | Activision owns the in-game model renders. The fan project credits ggranked as its image host. It states unofficial use and does not grant an independent reuse license. |
| [Public official-fact transcription](https://codloadout.gitlab.io/data/mw4.json) | Validate allowed attachment slots against the official weapon sheets. | Catalog agent compared Apex blocked-slot arrays with the official guide and normalized slot names. This attachment import does not replace the catalog's official rules. |

The JSON resources are linked from the public source ledger. No login, paid endpoint, hidden API, player credentials or premium loadout contents were accessed. Local inspection copies were kept in `/tmp` and are not runtime dependencies.

## Provisional multiplayer unlock sources

Each known level references its weapon's source record in `attachmentSources`. Only the explicit MW4 Multiplayer section supplied a level. The sites' default Warzone statistics and DMZ sections were not substituted.

| Weapon | Source |
| --- | --- |
| Han 86 | [CODMunity](https://codmunity.gg/weapon/mw4/han-86?game=mw4) |
| M4 | [WZStats](https://wzstats.gg/best-loadouts/m4-mw4) |
| Hyeon Burst | [WZStats](https://wzstats.gg/best-loadouts/hyeon-burst-mw4) |
| Patriot XMR | [WZStats, source spells it Partriot](https://wzstats.gg/best-loadouts/partriot-xmr-mw4) |
| Kastov 762 | [CODMunity](https://codmunity.gg/weapon/mw4/kastov-762?game=mw4) |
| Oden | [CODMunity](https://codmunity.gg/weapon/mw4/oden?game=mw4) |
| Axion | [WZStats](https://wzstats.gg/best-loadouts/axion-mw4) |
| Cronen Squall | [WZStats](https://wzstats.gg/best-loadouts/cronen-squall-mw4) |
| ISO Nightshade | [CODMunity](https://codmunity.gg/weapon/mw4/iso-nightshade?game=mw4) |
| VEL 46 | [CODMunity](https://codmunity.gg/weapon/mw4/vel-46?game=mw4) |
| WZ.55 Striga | [WZStats](https://wzstats.gg/best-loadouts/wz55-striga-mw4) |
| PPSh-41 | [WZStats](https://wzstats.gg/best-loadouts/ppsh-41-mw4) |
| X-58 Nyx | [WZStats](https://wzstats.gg/best-loadouts/x-58-nyx-mw4) |
| REZI 12 | [WZStats](https://wzstats.gg/best-loadouts/rezi-12-mw4) |
| Warlord | [WZStats](https://wzstats.gg/best-loadouts/warlord-mw4) |
| FiNN LMG | [WZStats](https://wzstats.gg/best-loadouts/finn-lmg-mw4) |
| Type 73 | [WZStats](https://wzstats.gg/best-loadouts/type-73-mw4) |
| APOC-338 | [WZStats](https://wzstats.gg/best-loadouts/apoc-338-mw4) |
| MAR-9 | [WZStats](https://wzstats.gg/best-loadouts/mar-9-mw4) |
| Oris 8.6 | [WZStats](https://wzstats.gg/best-loadouts/oris-86-mw4) |
| Mosin-Nagant | [WZStats](https://wzstats.gg/best-loadouts/mosin-nagant-mw4) |
| KG-7 Vulcan | [WZStats](https://wzstats.gg/best-loadouts/kg-7-vulcan-mw4) |
| Astaroth .57 | [WZStats](https://wzstats.gg/best-loadouts/astaroth-57-mw4) |
| Signal 50 | [WZStats](https://wzstats.gg/best-loadouts/signal-50-mw4) |
| SANG 9mm | [WZStats](https://wzstats.gg/best-loadouts/sang-9mm-mw4) |
| Krait P68 | [CODMunity](https://codmunity.gg/weapon/mw4/krait-p68?game=mw4) |
| .50 GS | [WZStats](https://wzstats.gg/best-loadouts/50-gs-mw4) |
| Mojave .357 | [WZStats](https://wzstats.gg/best-loadouts/mojave-357-mw4) |

The M4 has a complete reported lower-level set: SZ Gen.6 PEQ at 2, 5.56 NATO Overpressured at 3, FSS IS300 at 4, Slimline Elite at 13 and PF1 Fixed Stock at 14. ISO Nightshade has EXP G2-44 Stock at 5, Demo STP-1 at 6, 40 Round Mag at 10, XRK Herder 40 at 17 and FSS Fireline Grip at 23. These are useful guide-backed sets, with provisional unlocks. They are not live game acceptance results.

## Gaps and conflicts

Weapon-level unlocks remain incomplete. A selected weapon's maximum level is not used as an invented exact unlock level for unknown attachments. Shared unlocks and blueprint ownership can be confirmed manually. Records currently keep the selected weapon's reported path, not every alternate weapon path.

Nine guide names did not exactly match the canonical catalog and therefore received no inferred unlock mapping: Mugi Ingoem 558.8mm, FTAC Guards, LX3-V 408.94mm, DV3-SinsQK Grip, FTAC Firebase-70 15, XRK Aura-5, Haebang ET-9D 772.16mm, FTAC RZRO Stock and Lightfir-5 Quick Bolt. Some resemble rounded dimensions or spelling differences, but an automatic rename could attach the wrong level. WZStats reports TT Bulkkot Grip at .50 GS level 39, above the official weapon maximum of 38. That level was also excluded.

The official PPSh-41 sheet has Fire Mods rather than Ammunition. The imported catalog excludes unsupported PPSh-41 ammunition entries despite their appearance in third-party builds. It also excludes Cronen Squall combs. The source has no named Fire Mods records, so this slot remains a catalog gap.

Source compatibility identifies which weapon a part was listed for. It does not prove every five-part combination. Mutual exclusions beyond the shared slot and official Apex blocked-slot rules still need in-game checks. The source's qualitative snapshot can also lag later tuning.

## Checks performed

The importer reconciled all records with the official-fact transcription's weapon IDs and allowed slots. It checked unique record IDs, valid source references, bounded finite editorial deltas and known unlock levels within the official weapon maximum. It found and removed the .50 GS level conflict above.

Image addresses came from 611 actual public image tags. HEAD checks for XRK Herder 40, FSS IS300 and P68 Tapper 9 returned HTTP 200 with `image/webp`. Browser rendering and every image response were not checked by this agent.

The explicit `Attachment` type on each generated record prevents TypeScript from constructing an oversized union for the 1,589-item array. The parent runs the final integrated build and browser flow after all agents finish.
