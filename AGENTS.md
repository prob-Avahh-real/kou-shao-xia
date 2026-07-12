# Project Instructions

This file provides context for AI assistants working on this project.

## Project Type: Node.js + Vite (vanilla ES modules, Canvas 2D)

**Purpose:** 银河护卫队 · 口哨冒险 — top-down adventure game. Core: Yondu whistle-arrow (hold + swipe to steer bouncing projectile). Six heroes, ten unique level modes. Fan-inspired, not official IP.

### Commands
- Install: `npm install`
- Dev/Start: `npm run dev` or `npm start` (Vite, usually http://localhost:5173)
- Build: `npm run build`
- Preview: `npm run preview`
- Test: `npm test` (Node `--test test/game.test.js`)

## Directory Structure

```
guardian-adventure/
├── index.html          # Shell: canvas, touch controls, help dialog
├── package.json        # Vite devDep only; "type": "module"
├── README.md           # Chinese docs: heroes, levels, controls
├── src/
│   ├── main.js         # Game loop, screens (title/play/won/dead), wiring
│   ├── game.js         # Pure game state + logic (NO DOM) — test here
│   ├── render.js       # Canvas drawing: map, HUD, overlays, hero bar
│   ├── input.js        # Touch stick, steer zone, keyboard, mic, watch tilt
│   ├── style.css       # Mobile-first UI; watch narrow-screen media queries
│   └── data/
│       ├── heroes.js   # 6 heroes + abilityType stats
│       └── levels.js   # 10 tile-map levels + TILE enum + rules
└── test/
    └── game.test.js    # Node test runner; imports from src/game.js
```

## Architecture

```
main.js ──► game.js (state/tick) ◄── test/game.test.js
    │           ▲
    ├── render.js (Canvas only)
    └── input.js (DOM events → state.move/steer/ability)
```

- **Screens:** `title` → `play` → `won`/`dead` overlays (handled in main.js)
- **Game state:** `createGame(levelId)` returns mutable state object; `tick(state, dt)` advances simulation
- **Tile maps:** ASCII digit rows in `levels.js` → `TILE` enum (0=floor … 9=hazard)
- **Win rules:** per-level `rules` object — `win: exit|survive|clear|boss`, `requireKey`, `requireClear`, `timeLimit`, `surviveFor`, `exitAfterClear`
- **Hero switch:** only on `TILE.HERO_PAD` (blue platform); `switchHero`/`cycleHero` preserve HP ratio

## Heroes & Abilities

| ID | abilityType | Mechanism |
|----|-------------|-----------|
| yondu | whistle_arrow | Hold + steer; bounces off walls; returns on release/max bounces |
| starlord | dual_blast | Fan of projectiles |
| gamora | sword_dash | Forward dash damage |
| drax | charge | Smash `CRACK_WALL` tiles, knockback |
| rocket | trap | Proximity mine |
| groot | vine | AoE freeze + damage |

Shielded enemies (`ricochet` level) only take damage from bounced arrows (`fromBounce: true`).

## Ten Level Modes (each unique)

tutorial → switch → smash → ricochet → mines → heist → survive → arena → gauntlet → boss

See `src/data/levels.js` for map data and `README.md` for player-facing descriptions.

## Input

- **Touch:** left stick = move; right steer zone or ability btn + steer = whistle arrow
- **Keyboard:** WASD move, Space/Shift ability, Q/E cycle heroes
- **Mic:** `enableMic()` → RMS > 0.04 triggers whistle (auto-fires arrow)
- **Watch tilt:** `#sensor` btn → DeviceOrientation (gamma/beta → move/steer)
- No smart ring/cane support yet (unlike whistle-runner/platformer)

## Target Platforms

Mobile-first Canvas game. Watch/glasses narrow layout via CSS:
`@media (max-width: 280px), (max-height: 300px)` — smaller controls.

Per user global rules: default targets are **mobile APK** + **smart wearables**. Currently web-only Vite app; no Capacitor/android/ folder yet. When adding native wrapper, follow pattern from whistle-runner (copy to `www/` + Capacitor assets).

## Guidelines

- Follow existing code style and patterns
- **Keep game logic in `game.js`** — no DOM imports; enables `npm test`
- **Add level data in `levels.js`**, hero stats in `heroes.js`
- Write tests for new game mechanics in `test/game.test.js`
- Keep changes focused and atomic
- UI strings and comments in Chinese (matches existing codebase)
- Canvas coords: `TILE_SIZE = 48`; map centered via offset in render.js

## Gotchas

- `game.js` exports `createGame`, `tick`, `movePlayer`, `startAbility`, `endAbility`, `setSteer`, `switchHero`, `cycleHero`, `canSwitchHero`, `nextLevel`, `LEVEL_COUNT`
- Ability button label updates in main.js based on active hero
- `deepCloneLevel()` on create — mutating `level.rows` at runtime is intentional (doors, crack walls)
- dt capped at 0.05s in tick and main loop
- First level only unlocks yondu; hero unlocks expand per level config
- No vite.config.js — default Vite behavior; entry is index.html

## Default Target Platforms (永久规则)

所有新项目默认构建移动版 + 智能硬件版。本项目为 Vite web demo，优先保持 mobile/watch 布局兼容；若用户要求 APK/嵌入式交付，添加 Capacitor 或对应 native shell，不要仅交付桌面网页。
