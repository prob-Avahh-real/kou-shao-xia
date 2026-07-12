import {
  createGame, tick, movePlayer, startAbility, endAbility, setSteer,
  switchHero, cycleHero, canSwitchHero, nextLevel, LEVEL_COUNT
} from "./game.js";
import { HEROES } from "./data/heroes.js";
import { drawGame, drawHud, drawHeroBar, drawOverlay, drawTitle } from "./render.js";
import { createInput } from "./input.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const stick = document.getElementById("stick");
const steerZone = document.getElementById("steer");
const abilityBtn = document.getElementById("ability");
const switchBtn = document.getElementById("switch");
const sensorBtn = document.getElementById("sensor");
const micBtn = document.getElementById("mic");
const helpDialog = document.getElementById("helpDialog");

let W = 0, H = 0;
let screen = "title";
let game = null;
let titleBtn = null;
let overlayBtn = null;
let last = 0;
let abilityHeld = false;
let cycleLock = 0;

const input = createInput();
input.bindStick(stick);
input.bindSteerZone(steerZone);
input.bindAbilityBtn(abilityBtn);
const pollSensor = input.bindSensor(sensorBtn);

micBtn?.addEventListener("click", async () => {
  const ok = await input.enableMic();
  micBtn.textContent = ok ? "🎤 口哨已开" : "🎤 不可用";
  micBtn.classList.toggle("active", ok);
});

switchBtn?.addEventListener("click", () => {
  if (screen !== "play" || !canSwitchHero(game)) return;
  cycleHero(game, 1);
});

document.getElementById("help")?.addEventListener("click", () => helpDialog.showModal());
document.getElementById("closeHelp")?.addEventListener("click", () => helpDialog.close());

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function startPlay(levelId = 0) {
  game = createGame(levelId);
  screen = "play";
  last = performance.now();
  document.body.classList.add("playing");
}

function handlePointer(x, y) {
  if (screen === "title" && titleBtn) {
    if (x >= titleBtn.bx && x <= titleBtn.bx + titleBtn.bw && y >= titleBtn.by && y <= titleBtn.by + titleBtn.bh) {
      startPlay(0);
    }
  } else if ((screen === "won" || screen === "dead") && overlayBtn) {
    if (x >= overlayBtn.bx && x <= overlayBtn.bx + overlayBtn.bw && y >= overlayBtn.by && y <= overlayBtn.by + overlayBtn.bh) {
      if (screen === "won") {
        const n = nextLevel(game);
        if (n) { game = n; screen = "play"; }
        else { screen = "title"; document.body.classList.remove("playing"); }
      } else {
        startPlay(game.levelId);
      }
    }
  } else if (screen === "play") {
    const barY = H - 56;
    if (y >= barY && canSwitchHero(game)) {
      const unlocked = game.unlockedHeroes;
      const slotW = Math.min(56, (W - 16) / unlocked.length);
      const idx = Math.floor((x - 8) / (slotW + 4));
      if (idx >= 0 && idx < unlocked.length) switchHero(game, unlocked[idx]);
    }
  }
}

canvas.addEventListener("click", e => handlePointer(e.clientX, e.clientY));
canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

function updatePlay(dt) {
  pollSensor();
  const inp = input.state;

  const micWhistle = input.readWhistle() && game.player.heroId === "yondu";
  if (micWhistle) {
    if (!abilityHeld) startAbility(game);
    abilityHeld = true;
    if (Math.hypot(inp.move.x, inp.move.y) > 0.2) setSteer(game, inp.move.x, inp.move.y);
    else if (Math.hypot(inp.steer.x, inp.steer.y) > 0.15) setSteer(game, inp.steer.x, inp.steer.y);
  } else {
    if (inp.ability) {
      if (!abilityHeld) startAbility(game);
      abilityHeld = true;
      setSteer(game, inp.steer.x || inp.move.x, inp.steer.y || inp.move.y);
    } else if (abilityHeld) {
      endAbility(game);
      abilityHeld = false;
    }
  }

  movePlayer(game, inp.move.x, inp.move.y, dt);
  tick(game, dt);

  cycleLock -= dt;
  if (cycleLock <= 0 && canSwitchHero(game)) {
    if (input.isCyclePrev()) { cycleHero(game, -1); cycleLock = 0.3; }
    if (input.isCycleNext()) { cycleHero(game, 1); cycleLock = 0.3; }
  }

  if (game.status === "won") screen = "won";
  if (game.status === "dead") screen = "dead";
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (screen === "play") updatePlay(dt);

  ctx.clearRect(0, 0, W, H);

  if (screen === "title") {
    titleBtn = drawTitle(ctx, W, H);
  } else if (screen === "play") {
    drawGame(ctx, game, W, H);
    drawHud(ctx, game, W);
    if (canSwitchHero(game)) drawHeroBar(ctx, game, W, H);
    const hero = HEROES[game.player.heroId];
    abilityBtn.textContent = hero.abilityType === "whistle_arrow" ? "口哨" : hero.ability;
  } else if (screen === "won") {
    drawGame(ctx, game, W, H);
    const hasNext = game.levelId < LEVEL_COUNT - 1;
    overlayBtn = drawOverlay(ctx, W, H, "关卡完成！", [
      `${game.level.name} 已通关`,
      `得分：${game.score}`,
      hasNext ? "准备好下一关了吗？" : "全部通关！你是真正的护卫队"
    ], hasNext ? "下一关" : "返回标题");
  } else if (screen === "dead") {
    drawGame(ctx, game, W, H);
    overlayBtn = drawOverlay(ctx, W, H, "任务失败", [
      `${HEROES[game.player.heroId].name} 倒下了`,
      "再试一次，用口哨飞箭开路"
    ], "重新挑战");
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
