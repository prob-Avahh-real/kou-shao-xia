import { heroById } from "./data/heroes.js";
import { levelById, TILE, LEVEL_COUNT } from "./data/levels.js";

export const TILE_SIZE = 48;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const normalize = (x, y) => {
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
};

const SOLID = new Set([TILE.WALL, TILE.DOOR, TILE.CRACK_WALL]);

function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return TILE.WALL;
  return level.rows[ty][tx];
}

function worldToTile(x, y) {
  return { tx: Math.floor(x / TILE_SIZE), ty: Math.floor(y / TILE_SIZE) };
}

function tileCenter(tx, ty) {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

function solidAt(level, x, y, ignoreDoor = false) {
  const { tx, ty } = worldToTile(x, y);
  const t = tileAt(level, tx, ty);
  if (ignoreDoor && t === TILE.DOOR) return false;
  return SOLID.has(t);
}

function enemyStats(kind, levelId) {
  if (kind === "shielded") return { hp: 55, speed: 1.15 + levelId * 0.06 };
  if (kind === "rusher") return { hp: 32, speed: 3.0 + levelId * 0.08 };
  if (kind === "tank") return { hp: 150, speed: 0.85 + levelId * 0.04 };
  return { hp: 60, speed: 1.35 + levelId * 0.1 };
}

function makeEnemy(id, x, y, kind, levelId) {
  const stats = enemyStats(kind, levelId);
  return {
    id, x, y, homeX: x, homeY: y,
    hp: stats.hp, maxHp: stats.hp, speed: stats.speed,
    kind: kind || "normal",
    patrolAngle: Math.random() * Math.PI * 2,
    frozen: 0,
    alive: true
  };
}

function collectSpawns(level) {
  const keys = [], enemies = [], heroPads = [], chests = [], hazards = [];
  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const t = level.rows[ty][tx];
      const pos = tileCenter(tx, ty);
      if (t === TILE.KEY) keys.push({ tx, ty, x: pos.x, y: pos.y, taken: false });
      if (t === TILE.ENEMY) enemies.push({ tx, ty, x: pos.x, y: pos.y });
      if (t === TILE.HERO_PAD) heroPads.push({ tx, ty, x: pos.x, y: pos.y });
      if (t === TILE.CHEST) chests.push({ tx, ty, x: pos.x, y: pos.y, opened: false });
      if (t === TILE.HAZARD) hazards.push({ tx, ty, x: pos.x, y: pos.y });
    }
  }
  return { keys, enemies, heroPads, chests, hazards };
}

function deepCloneLevel(level) {
  return {
    ...level,
    unlockedHeroes: [...level.unlockedHeroes],
    playerStart: { ...level.playerStart },
    rules: { ...(level.rules || {}) },
    boss: level.boss ? { ...level.boss } : null,
    rows: level.rows.map(row => [...row]),
    messages: level.messages ? [...level.messages] : []
  };
}

export function createGame(levelId = 0) {
  const level = deepCloneLevel(levelById(levelId));
  const hero = heroById(level.startHero);
  const start = tileCenter(level.playerStart.x, level.playerStart.y);
  const spawns = collectSpawns(level);
  const kind = level.enemyKind || "normal";
  const rules = { ...(level.rules || { win: "exit", requireClear: true }) };

  let boss = null;
  if (level.boss) {
    const pos = tileCenter(level.boss.tx, level.boss.ty);
    boss = {
      x: pos.x, y: pos.y,
      hp: level.boss.hp, maxHp: level.boss.hp,
      frozen: 0, alive: true
    };
  }

  return {
    status: "playing",
    levelId,
    level,
    mode: level.mode || "tutorial",
    rules,
    tileSize: TILE_SIZE,
    player: {
      x: start.x, y: start.y,
      vx: 0, vy: 0,
      heroId: level.startHero,
      hp: hero.maxHp,
      maxHp: hero.maxHp,
      facing: { x: 1, y: 0 },
      invuln: 0,
      abilityCd: 0
    },
    keys: spawns.keys,
    hasKey: false,
    keysRequired: !!rules.requireKey,
    enemies: spawns.enemies.map((e, i) => makeEnemy(`e-${i}`, e.x, e.y, kind, levelId)),
    enemySeq: spawns.enemies.length,
    heroPads: spawns.heroPads,
    chests: spawns.chests,
    hazards: spawns.hazards,
    unlockedHeroes: [...level.unlockedHeroes],
    arrow: null,
    projectiles: [],
    traps: [],
    vines: [],
    particles: [],
    message: level.messages?.[0] ?? "",
    messageTimer: 4,
    score: 0,
    abilityActive: false,
    steer: { x: 0, y: 0 },
    boss,
    timeLeft: rules.timeLimit ?? null,
    surviveLeft: rules.surviveFor ?? null,
    waveTimer: rules.waveInterval ? 2 : null,
    exitOpened: !rules.exitAfterClear,
    won: false,
    died: false
  };
}

function setMessage(state, text, duration = 3) {
  state.message = text;
  state.messageTimer = duration;
}

function spawnParticle(state, x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 4;
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.4 + Math.random() * 0.3, color, size: 3 + Math.random() * 3
    });
  }
}

function hurtPlayer(state, amount, invuln = 1.2) {
  const p = state.player;
  if (p.invuln > 0) return;
  p.hp -= amount;
  p.invuln = invuln;
  spawnParticle(state, p.x, p.y, "#ff4757", 6);
  if (p.hp <= 0) {
    state.died = true;
    state.status = "dead";
    setMessage(state, "任务失败", 99);
  }
}

function winLevel(state, bonus = 0) {
  if (state.won) return;
  state.won = true;
  state.status = "won";
  state.score += 200 + state.levelId * 100 + bonus;
  setMessage(state, `关卡完成！得分 ${state.score}`, 99);
}

function damageEnemy(state, enemy, amount, opts = {}) {
  if (!enemy.alive) return false;
  if (enemy.kind === "shielded" && !opts.fromBounce) {
    spawnParticle(state, enemy.x, enemy.y, "#74c0fc", 3);
    if (state.messageTimer <= 0) setMessage(state, "护盾：需要弹射命中！", 1.2);
    return false;
  }
  enemy.hp -= amount;
  spawnParticle(state, enemy.x, enemy.y, "#ff6b6b", 4);
  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.score += enemy.kind === "tank" ? 150 : 100;
  }
  return true;
}

function damageBoss(state, amount) {
  if (!state.boss?.alive) return;
  state.boss.hp -= amount;
  spawnParticle(state, state.boss.x, state.boss.y, "#ff4757", 8);
  if (state.boss.hp <= 0) {
    state.boss.alive = false;
    state.score += 500;
    setMessage(state, "Boss 被击败！前往出口", 4);
  }
}

function openDoorIfKey(state) {
  if (!state.hasKey) return;
  const { level } = state;
  let opened = false;
  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      if (level.rows[ty][tx] === TILE.DOOR) {
        level.rows[ty][tx] = TILE.FLOOR;
        opened = true;
      }
    }
  }
  state.hasKey = false;
  setMessage(state, opened ? "门已打开！" : "获得通行凭证", 2);
}

function tryPickupKey(state) {
  for (const key of state.keys) {
    if (key.taken) continue;
    if (dist(state.player, key) < TILE_SIZE * 0.6) {
      key.taken = true;
      state.hasKey = true;
      const { tx, ty } = key;
      state.level.rows[ty][tx] = TILE.FLOOR;
      openDoorIfKey(state);
      return;
    }
  }
}

function tryOpenChest(state) {
  for (const chest of state.chests) {
    if (chest.opened) continue;
    if (dist(state.player, chest) < TILE_SIZE * 0.65) {
      chest.opened = true;
      state.score += 50;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
      setMessage(state, "宝箱：+25 生命", 2);
    }
  }
}

function checkHeroPad(state) {
  for (const pad of state.heroPads) {
    if (dist(state.player, pad) < TILE_SIZE * 0.55) return true;
  }
  return false;
}

export function switchHero(state, heroId) {
  if (!state.unlockedHeroes.includes(heroId)) return false;
  if (!checkHeroPad(state)) return false;
  const hero = heroById(heroId);
  const ratio = state.player.hp / state.player.maxHp;
  state.player.heroId = heroId;
  state.player.maxHp = hero.maxHp;
  state.player.hp = Math.ceil(hero.maxHp * ratio);
  setMessage(state, `切换为 ${hero.name} — ${hero.ability}`, 2);
  return true;
}

export function cycleHero(state, dir = 1) {
  const list = state.unlockedHeroes;
  const idx = list.indexOf(state.player.heroId);
  const next = list[(idx + dir + list.length) % list.length];
  return switchHero(state, next);
}

export function movePlayer(state, dx, dy, dt) {
  if (state.status !== "playing" || state.died) return;
  const hero = heroById(state.player.heroId);
  const speed = hero.speed * 60 * dt;
  if (Math.abs(dx) + Math.abs(dy) > 0.01) {
    state.player.facing = normalize(dx, dy);
  }

  let nx = state.player.x + dx * speed;
  let ny = state.player.y + dy * speed;
  const r = TILE_SIZE * 0.28;

  if (!solidAt(state.level, nx, state.player.y, true)) state.player.x = nx;
  if (!solidAt(state.level, state.player.x, ny, true)) state.player.y = ny;

  state.player.x = clamp(state.player.x, r, state.level.width * TILE_SIZE - r);
  state.player.y = clamp(state.player.y, r, state.level.height * TILE_SIZE - r);

  tryPickupKey(state);
  tryOpenChest(state);
}

function launchWhistleArrow(state) {
  const f = state.player.facing;
  state.arrow = {
    x: state.player.x, y: state.player.y,
    vx: f.x * heroById("yondu").arrowSpeed,
    vy: f.y * heroById("yondu").arrowSpeed,
    bounces: 0,
    returning: false,
    hitIds: new Set(),
    trail: []
  };
  state.abilityActive = true;
}

function steerArrow(state, dt) {
  const arrow = state.arrow;
  if (!arrow) return;
  const hero = heroById("yondu");
  const steer = state.steer;
  const hasSteer = Math.hypot(steer.x, steer.y) > 0.15;

  if (arrow.returning) {
    const d = normalize(state.player.x - arrow.x, state.player.y - arrow.y);
    arrow.vx = d.x * hero.arrowSpeed * 1.4;
    arrow.vy = d.y * hero.arrowSpeed * 1.4;
    if (dist(arrow, state.player) < TILE_SIZE * 0.4) {
      state.arrow = null;
      state.abilityActive = false;
      state.player.abilityCd = 0.4;
    }
    return;
  }

  if (hasSteer) {
    const target = normalize(steer.x, steer.y);
    arrow.vx += target.x * 28 * dt;
    arrow.vy += target.y * 28 * dt;
    const sp = Math.hypot(arrow.vx, arrow.vy) || 1;
    const cap = hero.arrowSpeed * 1.3;
    arrow.vx = (arrow.vx / sp) * cap;
    arrow.vy = (arrow.vy / sp) * cap;
  }

  arrow.trail.push({ x: arrow.x, y: arrow.y });
  if (arrow.trail.length > 24) arrow.trail.shift();

  arrow.x += arrow.vx * 60 * dt;
  arrow.y += arrow.vy * 60 * dt;

  const r = 8;
  if (
    solidAt(state.level, arrow.x, arrow.y) ||
    arrow.x < r || arrow.y < r ||
    arrow.x > state.level.width * TILE_SIZE - r ||
    arrow.y > state.level.height * TILE_SIZE - r
  ) {
    arrow.vx *= -0.85;
    arrow.vy *= -0.85;
    arrow.bounces++;
    spawnParticle(state, arrow.x, arrow.y, "#ffd166", 3);
    if (arrow.bounces >= hero.maxBounces) arrow.returning = true;
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive || arrow.hitIds.has(enemy.id)) continue;
    if (dist(arrow, enemy) < TILE_SIZE * 0.45) {
      arrow.hitIds.add(enemy.id);
      damageEnemy(state, enemy, hero.arrowDamage, { fromBounce: arrow.bounces > 0 });
    }
  }
  if (state.boss?.alive && dist(arrow, state.boss) < TILE_SIZE * 0.7) {
    if (!arrow.hitIds.has("boss")) {
      arrow.hitIds.add("boss");
      damageBoss(state, hero.arrowDamage);
    }
  }
}

function fireDualBlast(state) {
  const hero = heroById("starlord");
  const f = state.player.facing;
  const base = Math.atan2(f.y, f.x);
  for (let i = 0; i < hero.blastCount; i++) {
    const spread = (i - (hero.blastCount - 1) / 2) * 0.22;
    const a = base + spread;
    state.projectiles.push({
      x: state.player.x, y: state.player.y,
      vx: Math.cos(a) * 14, vy: Math.sin(a) * 14,
      damage: hero.blastDamage, life: 0.5, color: hero.accent, kind: "blast"
    });
  }
  state.player.abilityCd = 0.55;
  spawnParticle(state, state.player.x, state.player.y, hero.accent, 5);
}

function swordDash(state) {
  const hero = heroById("gamora");
  const f = state.player.facing;
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const px = state.player.x + f.x * (hero.dashRange / steps) * i;
    const py = state.player.y + f.y * (hero.dashRange / steps) * i;
    if (solidAt(state.level, px, py, true)) break;
    state.player.x = px;
    state.player.y = py;
    for (const enemy of state.enemies) {
      if (enemy.alive && dist(state.player, enemy) < TILE_SIZE * 0.5) {
        damageEnemy(state, enemy, hero.dashDamage);
      }
    }
    if (state.boss?.alive && dist(state.player, state.boss) < TILE_SIZE * 0.65) {
      damageBoss(state, hero.dashDamage);
    }
  }
  state.player.abilityCd = 0.9;
  spawnParticle(state, state.player.x, state.player.y, hero.accent, 10);
}

function chargeSmash(state) {
  const hero = heroById("drax");
  const f = state.player.facing;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const px = state.player.x + f.x * (hero.chargeRange / steps) * i;
    const py = state.player.y + f.y * (hero.chargeRange / steps) * i;
    const { tx, ty } = worldToTile(px, py);
    const t = tileAt(state.level, tx, ty);
    if (t === TILE.CRACK_WALL) {
      state.level.rows[ty][tx] = TILE.FLOOR;
      spawnParticle(state, px, py, "#c77dff", 12);
    } else if (solidAt(state.level, px, py, true)) break;
    state.player.x = px;
    state.player.y = py;
    for (const enemy of state.enemies) {
      if (enemy.alive && dist(state.player, enemy) < TILE_SIZE * 0.55) {
        damageEnemy(state, enemy, hero.chargeDamage);
        enemy.x += f.x * 30;
        enemy.y += f.y * 30;
      }
    }
    if (state.boss?.alive && dist(state.player, state.boss) < TILE_SIZE * 0.7) {
      damageBoss(state, hero.chargeDamage);
    }
  }
  state.player.abilityCd = 1.2;
}

function placeTrap(state) {
  const hero = heroById("rocket");
  state.traps.push({
    x: state.player.x, y: state.player.y,
    radius: hero.trapRadius, damage: hero.trapDamage,
    armed: true, life: 12
  });
  state.player.abilityCd = 0.7;
  setMessage(state, "地雷已部署", 1.5);
}

function vineRoot(state) {
  const hero = heroById("groot");
  state.vines.push({
    x: state.player.x, y: state.player.y,
    radius: hero.vineRadius, duration: hero.vineDuration, age: 0
  });
  for (const enemy of state.enemies) {
    if (enemy.alive && dist(state.player, enemy) < hero.vineRadius) {
      damageEnemy(state, enemy, hero.vineDamage);
      enemy.frozen = hero.vineDuration;
    }
  }
  if (state.boss?.alive && dist(state.player, state.boss) < hero.vineRadius) {
    state.boss.frozen = hero.vineDuration;
    damageBoss(state, hero.vineDamage);
  }
  state.player.abilityCd = 1.4;
  spawnParticle(state, state.player.x, state.player.y, hero.accent, 14);
}

export function startAbility(state) {
  if (state.status !== "playing" || state.player.abilityCd > 0) return;
  const hero = heroById(state.player.heroId);
  if (hero.abilityType === "whistle_arrow") {
    if (!state.arrow) launchWhistleArrow(state);
    return;
  }
  if (hero.abilityType === "dual_blast") fireDualBlast(state);
  else if (hero.abilityType === "sword_dash") swordDash(state);
  else if (hero.abilityType === "charge") chargeSmash(state);
  else if (hero.abilityType === "trap") placeTrap(state);
  else if (hero.abilityType === "vine") vineRoot(state);
}

export function endAbility(state) {
  if (state.arrow && !state.arrow.returning) state.arrow.returning = true;
  state.abilityActive = false;
}

export function setSteer(state, x, y) {
  state.steer = { x, y };
}

function updateProjectiles(state, dt) {
  state.projectiles = state.projectiles.filter(p => {
    p.x += p.vx * 60 * dt;
    p.y += p.vy * 60 * dt;
    p.life -= dt;
    if (p.life <= 0) return false;
    for (const enemy of state.enemies) {
      if (enemy.alive && dist(p, enemy) < TILE_SIZE * 0.4) {
        damageEnemy(state, enemy, p.damage);
        return false;
      }
    }
    if (state.boss?.alive && dist(p, state.boss) < TILE_SIZE * 0.55) {
      damageBoss(state, p.damage);
      return false;
    }
    return !solidAt(state.level, p.x, p.y);
  });
}

function updateTraps(state, dt) {
  state.traps = state.traps.filter(trap => {
    trap.life -= dt;
    if (trap.life <= 0) return false;
    let triggered = false;
    for (const enemy of state.enemies) {
      if (enemy.alive && dist(trap, enemy) < trap.radius * 0.45) {
        damageEnemy(state, enemy, trap.damage);
        triggered = true;
      }
    }
    if (state.boss?.alive && dist(trap, state.boss) < trap.radius * 0.5) {
      damageBoss(state, trap.damage);
      triggered = true;
    }
    if (triggered) {
      spawnParticle(state, trap.x, trap.y, "#ffe66d", 16);
      return false;
    }
    return true;
  });
}

function updateEnemies(state, dt) {
  const p = state.player;
  const chaseRange = state.mode === "survive" ? TILE_SIZE * 12 : TILE_SIZE * 5;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.frozen > 0) { enemy.frozen -= dt; continue; }

    const d = dist(enemy, p);
    if (d < chaseRange) {
      const n = normalize(p.x - enemy.x, p.y - enemy.y);
      enemy.x += n.x * enemy.speed * 60 * dt;
      enemy.y += n.y * enemy.speed * 60 * dt;
    } else {
      enemy.patrolAngle += dt * 0.8;
      enemy.x = enemy.homeX + Math.cos(enemy.patrolAngle) * 28;
      enemy.y = enemy.homeY + Math.sin(enemy.patrolAngle) * 28;
    }

    if (d < TILE_SIZE * 0.5) hurtPlayer(state, enemy.kind === "rusher" ? 10 : 12);
  }

  if (state.boss?.alive) {
    const b = state.boss;
    if (b.frozen > 0) b.frozen -= dt;
    else {
      const n = normalize(p.x - b.x, p.y - b.y);
      b.x += n.x * 1.8 * 60 * dt;
      b.y += n.y * 1.8 * 60 * dt;
      if (dist(b, p) < TILE_SIZE * 0.75) hurtPlayer(state, 18, 1.5);
    }
  }
}

function updateHazards(state) {
  const { tx, ty } = worldToTile(state.player.x, state.player.y);
  if (tileAt(state.level, tx, ty) === TILE.HAZARD) {
    hurtPlayer(state, 8, 0.55);
  }
}

function spawnWave(state) {
  const { width, height } = state.level;
  const n = state.rules.waveSize || 2;
  const kind = state.level.enemyKind || "rusher";
  for (let i = 0; i < n; i++) {
    const side = Math.floor(Math.random() * 4);
    let tx, ty;
    if (side === 0) { tx = 1 + Math.floor(Math.random() * (width - 2)); ty = 1; }
    else if (side === 1) { tx = 1 + Math.floor(Math.random() * (width - 2)); ty = height - 2; }
    else if (side === 2) { tx = 1; ty = 1 + Math.floor(Math.random() * (height - 2)); }
    else { tx = width - 2; ty = 1 + Math.floor(Math.random() * (height - 2)); }
    const pos = tileCenter(tx, ty);
    state.enemySeq += 1;
    state.enemies.push(makeEnemy(`w-${state.enemySeq}`, pos.x, pos.y, kind === "normal" ? "rusher" : kind, state.levelId));
  }
  setMessage(state, "新一波敌人来袭！", 1.5);
}

function openArenaExit(state) {
  if (state.exitOpened) return;
  const tx = Math.floor(state.level.width / 2);
  const ty = Math.floor(state.level.height / 2);
  state.level.rows[ty][tx] = TILE.EXIT;
  state.exitOpened = true;
  setMessage(state, "出口已开启！", 3);
}

function keysCollected(state) {
  if (!state.keysRequired) return true;
  return state.keys.every(k => k.taken);
}

function checkWinConditions(state) {
  const rules = state.rules;
  const alive = state.enemies.filter(e => e.alive).length;
  const bossAlive = !!state.boss?.alive;

  if (rules.win === "survive") {
    if (state.surviveLeft !== null && state.surviveLeft <= 0) {
      winLevel(state, Math.floor(state.score * 0.2));
    }
    return;
  }

  if (rules.exitAfterClear && alive === 0 && !bossAlive) openArenaExit(state);

  if (rules.win === "clear" && alive === 0 && !bossAlive && state.exitOpened) {
    // still need to walk to exit
  }

  const { tx, ty } = worldToTile(state.player.x, state.player.y);
  const onExit = tileAt(state.level, tx, ty) === TILE.EXIT;

  if (!onExit) return;

  if (!keysCollected(state)) {
    setMessage(state, "需要先取得钥匙", 2);
    return;
  }
  if (rules.requireClear && (alive > 0 || bossAlive)) {
    setMessage(state, bossAlive ? "先击败 Boss" : "先清理所有敌人", 2);
    return;
  }
  if (rules.win === "boss" && bossAlive) {
    setMessage(state, "先击败 Boss", 2);
    return;
  }

  const timeBonus = state.timeLeft != null ? Math.floor(state.timeLeft * 5) : 0;
  winLevel(state, timeBonus);
}

function updateTimers(state, dt) {
  if (state.timeLeft != null) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.died = true;
      state.status = "dead";
      setMessage(state, "时间到！金库封锁", 99);
    }
  }

  if (state.surviveLeft != null) {
    state.surviveLeft -= dt;
    if (state.waveTimer != null) {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        spawnWave(state);
        state.waveTimer = state.rules.waveInterval;
      }
    }
  }
}

function updateVines(state, dt) {
  state.vines = state.vines.filter(v => {
    v.age += dt;
    return v.age < v.duration;
  });
}

function updateParticles(state, dt) {
  state.particles = state.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    return p.life > 0;
  });
}

export function tick(state, dt) {
  if (state.status !== "playing") return;
  dt = Math.min(dt, 0.05);

  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.player.invuln > 0) state.player.invuln -= dt;
  if (state.player.abilityCd > 0) state.player.abilityCd -= dt;

  updateTimers(state, dt);
  if (state.status !== "playing") return;

  if (state.arrow) steerArrow(state, dt);
  updateProjectiles(state, dt);
  updateTraps(state, dt);
  updateEnemies(state, dt);
  updateHazards(state);
  updateVines(state, dt);
  updateParticles(state, dt);
  checkWinConditions(state);
}

export function nextLevel(state) {
  const next = state.levelId + 1;
  if (next >= LEVEL_COUNT) return null;
  return createGame(next);
}

export function canSwitchHero(state) {
  return checkHeroPad(state);
}

export { TILE, tileCenter, worldToTile, LEVEL_COUNT };
