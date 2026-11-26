// Skerry Run — the hand-in program (Node 22, standard library only).
// The game itself lives in game/ as plain static files and the screenshots in
// screenshots/; this program carries both into /output and writes the dossier
// the judge reads, using the kit's vendored library so the dossier is exactly
// the one the gate rebuilds. It runs twice in the grader and both runs must
// write the same bytes, so nothing here depends on the time or the machine:
// plain copies and a deterministic dossier.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own: the dossier text is capped at 160 KiB, each
// screenshot at 256 KiB with at most 4 of them, and game/ at 993 files and
// 48 MiB. A hand-in that breaks one is refused by the gate, so the program
// refuses it here first rather than shipping a doomed entry.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Why the program is this short on purpose: the grader runs it twice and
// compares the bytes, so it does no work that could vary between runs — no
// clock, no randomness, no network. The game itself is already finished
// before this program starts; all it does is carry the finished files to
// /output and let the kit's library describe them for the judge.
