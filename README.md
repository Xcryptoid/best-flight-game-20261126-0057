# Skerry Run — Make the best flight game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun · best-flight-game-20261126-0057 · rank](https://make.fun/badge/best-flight-game-20261126-0057/Xcryptoid/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun · best-flight-game-20261126-0057 · reward](https://make.fun/badge/best-flight-game-20261126-0057/Xcryptoid/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A bush-plane game over an island archipelago, built for
[best-flight-game-20261126-0057](https://make.fun/bounty/best-flight-game-20261126-0057):
fly a little red-tailed plane in chase view over the skerries, thread the sky
rings, land her home on the strip, or drop coffee on Gull Island. Three
sorties, one tank of fuel each, and the sea is always waiting.

## How to play

Open `game/index.html` in a desktop browser (or `node serve.ts` and visit
http://localhost:8080). Pick a sortie on the title screen — click it, or
press `1`, `2` or `3`:

1. **Ring Run** — thread all 8 amber sky rings before the tanks run dry.
2. **Runway Landing** — touch down on the strip under 70 kt, gentle and slow.
3. **Supply Drop** — reach Gull Island and press `SPACE` over the amber circle.

- `Arrow keys` fly the plane — up/down pitches, left/right banks and turns.
- `W` / `S` work the throttle. `SPACE` drops the crate. `R` flies again.
- `P` pauses. `M` mutes the engine hum.

## What is in here

- `main.ts` — the hand-in program (Node 22, standard library only): copies
  `game/` and `screenshots/` to `/output` and writes `dossier.json` with the
  kit's vendored `buildDossier`.
- `game/` — the playable game as static files, no network request: `index.html`
  plus ES modules under `game/src/`, one file per job (tuning, input, world,
  flight model, missions, sound, rendering).
- `screenshots/` — four real renders of the game's own code in a browser:
  the title screen, cruising with the rings ahead, closing on a ring, and the
  final approach to the runway.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `serve.ts` — a tiny static server for local play-testing.

## License

MIT — see [LICENSE](LICENSE).
