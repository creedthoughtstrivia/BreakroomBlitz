// packs/index.js
//
// This module registers all available question packs.  To add a new pack,
// drop a JSON file into the `packs/` directory and add a descriptor to
// the array below.  Each descriptor contains a unique `packId`, a
// human‑readable `title`, the JSON `path` relative to the root and an
// `enabled` flag that administrators can toggle.  The array is
// attached to `window.PACKS` so it can be consumed by config.js.

// List of available question packs.  Each entry references a JSON file
// containing the questions for that pack.  When adding new packs, ensure
// the `packId` is unique and the `path` points to the correct file
// relative to the project root.  All packs listed here will appear in
// the question set dropdown for solo play and live matches.
const PACKS = [
  // Place the mega pack first so it becomes the default when no selection is shown.
  {
    packId: 'mega-mixed-500',
    title: 'Mega Mixed Pack (500 Questions)',
    path: 'questions/mega-pack-500.json',
    enabled: true
  },
  {
    packId: 'pack-core-01',
    title: 'Core Pack 01',
    path: 'packs/pack-core-01.json',
    enabled: true
  },
  {
    packId: 'creed-basics-001',
    title: 'Creed Basics Vol. 1',
    path: 'questions/creed-basics-001.json',
    enabled: true
  },
  {
    packId: 'creed-pack-001A',
    title: 'Creed Pack 001A',
    path: 'questions/creed-pack-001A.json',
    enabled: true
  }
];

// Expose globally
window.PACKS = PACKS;