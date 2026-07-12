import { HEROES, HERO_ORDER } from "./data/heroes.js";
import { TILE, TILE_SIZE } from "./game.js";
const WALL = "#1a1f3a";
const FLOOR = "#0d1321";
const FLOOR_ALT = "#111827";

export function drawGame(ctx, state, W, H) {
  const level = state.level;
  const mapW = level.width * TILE_SIZE;
  const mapH = level.height * TILE_SIZE;
  const ox = (W - mapW) / 2;
  const oy = (H - mapH) / 2;

  ctx.fillStyle = "#050810";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(ox, oy);

  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const t = level.rows[ty][tx];
      const x = tx * TILE_SIZE;
      const y = ty * TILE_SIZE;
      ctx.fillStyle = (tx + ty) % 2 ? FLOOR_ALT : FLOOR;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      if (t === TILE.WALL) {
        ctx.fillStyle = WALL;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#2d3561";
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      } else if (t === TILE.DOOR) {
        ctx.fillStyle = "#5c4033";
        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE - 12, y + TILE_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === TILE.CRACK_WALL) {
        ctx.fillStyle = "#4a3060";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#9d4edd";
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + 28, y + 36);
        ctx.moveTo(x + 36, y + 8); ctx.lineTo(x + 12, y + 40);
        ctx.stroke();
      } else if (t === TILE.EXIT) {
        ctx.fillStyle = "rgba(46, 196, 182, 0.25)";
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.strokeStyle = "#2ec4b6";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        ctx.fillStyle = "#2ec4b6";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("出口", x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 4);
      } else if (t === TILE.HAZARD) {
        ctx.fillStyle = "rgba(255, 107, 53, 0.35)";
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.strokeStyle = "rgba(255, 159, 28, 0.7)";
        ctx.beginPath();
        ctx.moveTo(x + 8, y + TILE_SIZE - 8);
        ctx.lineTo(x + TILE_SIZE / 2, y + 10);
        ctx.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE - 8);
        ctx.closePath();
        ctx.stroke();
      } else if (t === TILE.HERO_PAD) {
        ctx.fillStyle = "rgba(61, 90, 128, 0.35)";
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = "#3d5a80";
        ctx.strokeRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      }
    }
  }

  for (const key of state.keys) {
    if (key.taken) continue;
    drawKey(ctx, key.x, key.y);
  }

  for (const chest of state.chests) {
    if (!chest.opened) drawChest(ctx, chest.x, chest.y);
  }

  for (const trap of state.traps) {
    ctx.fillStyle = "rgba(255, 230, 109, 0.5)";
    ctx.beginPath();
    ctx.arc(trap.x, trap.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bc6c25";
    ctx.stroke();
  }

  for (const vine of state.vines) {
    const alpha = 1 - vine.age / vine.duration;
    ctx.strokeStyle = `rgba(167, 201, 87, ${alpha * 0.6})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(vine.x, vine.y, vine.radius * (0.6 + vine.age * 0.15), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.arrow) drawArrow(ctx, state.arrow);
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const enemy of state.enemies) {
    if (enemy.alive) drawEnemy(ctx, enemy);
  }
  if (state.boss?.alive) drawBoss(ctx, state.boss);

  drawHero(ctx, state.player);

  for (const p of state.particles) {
    ctx.globalAlpha = p.life * 2;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return { ox, oy, mapW, mapH };
}

function drawHero(ctx, player) {
  const hero = HEROES[player.heroId];
  const r = TILE_SIZE * 0.32;
  if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) ctx.globalAlpha = 0.5;

  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hero.accent;
  ctx.beginPath();
  ctx.arc(player.x + player.facing.x * r * 0.6, player.y + player.facing.y * r * 0.6, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  if (player.heroId === "yondu") {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + player.facing.x * 18, player.y + player.facing.y * 18);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(hero.name.slice(0, 2), player.x, player.y + 3);
}

function drawArrow(ctx, arrow) {
  if (arrow.trail.length > 1) {
    ctx.strokeStyle = "rgba(255, 209, 102, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arrow.trail[0].x, arrow.trail[0].y);
    for (let i = 1; i < arrow.trail.length; i++) ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
    ctx.stroke();
  }
  const a = Math.atan2(arrow.vy, arrow.vx);
  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(a);
  ctx.fillStyle = arrow.returning ? "#ff6b6b" : "#ffd166";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, enemy) {
  const r = TILE_SIZE * (enemy.kind === "tank" ? 0.36 : 0.28);
  if (enemy.frozen > 0) ctx.fillStyle = "#74c0fc";
  else if (enemy.kind === "shielded") ctx.fillStyle = "#4dabf7";
  else if (enemy.kind === "rusher") ctx.fillStyle = "#ff922b";
  else if (enemy.kind === "tank") ctx.fillStyle = "#862e9c";
  else ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
  ctx.fill();
  if (enemy.kind === "shielded") {
    ctx.strokeStyle = "#a5d8ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  const hpRatio = enemy.hp / enemy.maxHp;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(enemy.x - 16, enemy.y - r - 8, 32, 4);
  ctx.fillStyle = "#2ec4b6";
  ctx.fillRect(enemy.x - 16, enemy.y - r - 8, 32 * hpRatio, 4);
}

function drawBoss(ctx, boss) {
  const r = TILE_SIZE * 0.55;
  ctx.fillStyle = boss.frozen > 0 ? "#5c7cfa" : "#9d0208";
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffba08";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BOSS", boss.x, boss.y + 4);
  const hpRatio = boss.hp / boss.maxHp;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(boss.x - 40, boss.y - r - 12, 80, 6);
  ctx.fillStyle = "#ff4757";
  ctx.fillRect(boss.x - 40, boss.y - r - 12, 80 * hpRatio, 6);
}

function drawKey(ctx, x, y) {
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(x, y - 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2, y, 4, 12);
  ctx.fillRect(x - 2, y + 8, 8, 3);
}

function drawChest(ctx, x, y) {
  ctx.fillStyle = "#bc6c25";
  ctx.fillRect(x - 14, y - 10, 28, 20);
  ctx.fillStyle = "#ffe66d";
  ctx.fillRect(x - 14, y - 2, 28, 4);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(x - 3, y - 4, 6, 8);
}

export function drawHud(ctx, state, W) {
  const hero = HEROES[state.player.heroId];
  ctx.fillStyle = "rgba(5, 8, 16, 0.75)";
  ctx.fillRect(0, 0, W, 52);

  ctx.fillStyle = hero.color;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${hero.name} · ${hero.ability}`, 12, 20);

  ctx.fillStyle = "#8892b0";
  ctx.font = "11px sans-serif";
  const modeLabel = state.level.subtitle ? `${state.level.name} · ${state.level.subtitle}` : state.level.name;
  ctx.fillText(`${state.levelId + 1}/10  ${modeLabel}`, 12, 38);

  const hpW = 100;
  const hpX = W - hpW - 60;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(hpX, 16, hpW, 10);
  ctx.fillStyle = "#2ec4b6";
  ctx.fillRect(hpX, 16, hpW * (state.player.hp / state.player.maxHp), 10);
  ctx.fillStyle = "#ccd6f6";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`HP ${Math.ceil(state.player.hp)}`, W - 12, 25);

  let rightExtra = `得分 ${state.score}`;
  if (state.timeLeft != null) rightExtra = `⏱ ${Math.ceil(state.timeLeft)}s`;
  else if (state.surviveLeft != null) rightExtra = `坚守 ${Math.ceil(Math.max(0, state.surviveLeft))}s`;
  ctx.fillText(rightExtra, W - 12, 42);

  if (state.messageTimer > 0 && state.message) {
    ctx.fillStyle = "rgba(255, 209, 102, 0.92)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.message, W / 2, 44);
  }
}

export function drawHeroBar(ctx, state, W, H) {
  const barH = 56;
  const y = H - barH;
  ctx.fillStyle = "rgba(5, 8, 16, 0.88)";
  ctx.fillRect(0, y, W, barH);

  const unlocked = state.unlockedHeroes;
  const slotW = Math.min(56, (W - 16) / unlocked.length);
  unlocked.forEach((id, i) => {
    const hero = HEROES[id];
    const x = 8 + i * (slotW + 4);
    const active = id === state.player.heroId;
    ctx.fillStyle = active ? hero.color : "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(x, y + 8, slotW, 40, 8);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = hero.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${active ? 11 : 10}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(hero.name, x + slotW / 2, y + 26);
    ctx.font = "8px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(hero.ability.slice(0, 4), x + slotW / 2, y + 38);
  });
}

export function drawOverlay(ctx, W, H, title, lines, btnText) {
  ctx.fillStyle = "rgba(5, 8, 16, 0.88)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, H * 0.32);
  ctx.fillStyle = "#8892b0";
  ctx.font = "14px sans-serif";
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.42 + i * 22));
  const bw = 160, bh = 44;
  const bx = (W - bw) / 2, by = H * 0.62;
  ctx.fillStyle = "#c41e3a";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 22);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(btnText, W / 2, by + 28);
  return { bx, by, bw, bh };
}

export function drawTitle(ctx, W, H) {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#0d1321");
  grd.addColorStop(1, "#1a1f3a");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("银河护卫队", W / 2, H * 0.22);
  ctx.fillStyle = "#c41e3a";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("口哨冒险", W / 2, H * 0.30);

  const heroes = HERO_ORDER.slice(0, 6).map(id => HEROES[id]);
  const startY = H * 0.38;
  heroes.forEach((h, i) => {
    const y = startY + i * 28;
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.arc(W / 2 - 120, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ccd6f6";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${h.name} — ${h.ability}`, W / 2 - 100, y + 4);
  });

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("勇度用口哨引导飞箭 · 探索关卡 · 切换英雄施展绝招", W / 2, H * 0.78);

  const bw = 180, bh = 48;
  const bx = (W - bw) / 2, by = H * 0.84;
  ctx.fillStyle = "#c41e3a";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 24);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("开始冒险", W / 2, by + 30);
  return { bx, by, bw, bh };
}
