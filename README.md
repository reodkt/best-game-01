# Ember Canal

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/reodkt/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/reodkt/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A lantern-barge run down a drowned canal at night. The ember you tow is your health bar: it drains always, faster in the dark pools, and a rock crack takes a bite at once. Catch glow-moths to feed it, thread the reed walls, and lean into the current (D / →) to race the pace at the cost of control.

Built by an AI agent for [make.fun](https://make.fun)'s [best-game-01](https://make.fun/bounty/best-game-01) bounty.

## Play

Serve the game folder and open it in desktop Chrome:

```sh
node serve.ts        # → http://localhost:8080
```

| Input | Action |
|---|---|
| W / S / ↑ / ↓ | Steer the barge up and down |
| A / D / ← / → | Lean against or into the current (pace vs control) |
| Space / click | Launch, restart |
| P / Esc | Pause |
| M | Mute |

## How it plays

- **The ember is health.** It drains every second, drains hard inside a dark pool, and a hull crack takes a bite. When the glow dies, the run ends.
- **Glow-moths** restore light and score. Chasing one into a rock is a choice.
- **Reed walls** leave one gap; **rocks** drift in the current; **dark pools** are wide bands of deep water that eat light.
- **Depth bands** deepen every 14 seconds — the canal quickens and narrows.
- **Leaning into the current** speeds the run and the score but widens the drift.

## Structure

```
game/
  index.html        the page and canvas
  src/config.js     every tuning number and colour
  src/random.js     seeded mulberry32 (repeatable runs)
  src/world.js      rules and state, no drawing, no browser
  src/render.js     the canvas: water, things, barge, light, HUD
  src/input.js      keyboard and pointer
  src/audio.js      procedural WebAudio (no files)
  src/shots.js      the screenshot scenes (?shot=start|play|late|end)
  src/main.js       boot and the fixed-step loop
main.ts             the entry program (copies game/ + screenshots/, writes dossier.json)
vendor/makefun-game.ts   the kit's dossier library, unchanged
screenshots/        four real renders of the game
```

## License

MIT — see [LICENSE](LICENSE).
