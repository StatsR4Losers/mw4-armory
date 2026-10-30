# MW4 Armory

A React and TypeScript multiplayer class optimizer for Modern Warfare 4 (2026), hosted through ChatGPT Sites.

## Run locally

Use Node 26 or newer. Install with `npm install`, start with `npm run dev`, build with `npm run build`, and run the engine checks with `npm test`.

## What the app does

- Recommends weapons, attachments, tactical, lethal, field upgrade, perks, and streaks for a chosen role.
- Compares builds with and without the weapon's Apex conversion.
- Filters attachment recommendations against current weapon levels and manually confirmed owned attachments.
- Offers preset priorities, favorite perk and equipment locks, saved builds, and share links.
- Shows sources, data coverage, and known limits alongside recommendations.

The optimizer combines sourced game facts with explicitly labeled editorial role weights. A role-fit score is a recommendation under the selected priorities. It is not a measured win rate, damage value, or exact proof that a class beats every possible alternative.

## Data

The source ledgers in `research/` document the official launch catalog, multiplayer patch notes, public attachment progression tables, and numeric base observations. Exact damage and hit-location coverage are incomplete. The app must not fabricate time-to-kill values to fill that gap.

The game's shared attachment unlocks can depend on another weapon. Manually confirmed ownership lets a player represent unlocks that the curated progression data does not capture. A manual confirmation does not bypass weapon compatibility or Apex slot restrictions.

Source images retain their public source URLs. Unavailable images use labeled neutral placeholders. Some official images show a weapon together with its Apex conversion, rather than an isolated item.

## Verification

Engine tests exercise legality, level boundaries, Apex gating, locked choices, and deterministic recommendations. Catalog checks reconcile IDs, references, numeric ranges, and coverage. Browser acceptance also checks changing levels, Apex comparison, saving, sharing, and responsive layout. See `VERIFICATION.md` for the completed release checks and limits.
