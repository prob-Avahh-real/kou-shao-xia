import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createGame, tick, movePlayer, startAbility, endAbility,
  switchHero, nextLevel, LEVEL_COUNT, TILE, tileCenter
} from "../src/game.js";
import { HEROES } from "../src/data/heroes.js";
import { LEVELS } from "../src/data/levels.js";

function standOnHeroPad(g) {
  const pad = g.heroPads[0];
  g.player.x = pad.x;
  g.player.y = pad.y;
}

describe("heroes", () => {
  it("勇度默认拥有口哨飞箭", () => {
    assert.equal(HEROES.yondu.abilityType, "whistle_arrow");
    assert.ok(HEROES.yondu.arrowDamage > 0);
  });

  it("六名英雄各有绝招类型", () => {
    const types = new Set(Object.values(HEROES).map(h => h.abilityType));
    assert.equal(types.size, 6);
  });
});

describe("levels", () => {
  it("共十个关卡", () => assert.equal(LEVELS.length, 10));
  it("LEVEL_COUNT 同步", () => assert.equal(LEVEL_COUNT, 10));
  it("第一关仅勇度可用", () => {
    assert.deepEqual(LEVELS[0].unlockedHeroes, ["yondu"]);
  });
  it("每关 mode 不重复", () => {
    const modes = LEVELS.map(l => l.mode);
    assert.equal(new Set(modes).size, modes.length);
  });
  it("每关可创建", () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const g = createGame(i);
      assert.equal(g.levelId, i);
      assert.equal(g.status, "playing");
      assert.equal(g.mode, LEVELS[i].mode);
    }
  });
});

describe("game", () => {
  it("创建初始状态", () => {
    const g = createGame(0);
    assert.equal(g.status, "playing");
    assert.equal(g.player.heroId, "yondu");
    assert.ok(g.enemies.length > 0);
  });

  it("口哨飞箭可发射", () => {
    const g = createGame(0);
    startAbility(g);
    assert.ok(g.arrow);
    assert.equal(g.arrow.returning, false);
    endAbility(g);
    assert.equal(g.arrow.returning, true);
  });

  it("非英雄平台无法切换", () => {
    const g = createGame(1);
    assert.equal(switchHero(g, "starlord"), false);
    assert.equal(g.player.heroId, "yondu");
  });

  it("英雄平台切换并保留生命比例", () => {
    const g = createGame(1);
    standOnHeroPad(g);
    g.player.hp = g.player.maxHp * 0.5;
    const before = g.player.maxHp;
    assert.equal(switchHero(g, "starlord"), true);
    assert.equal(g.player.heroId, "starlord");
    assert.equal(g.player.maxHp, HEROES.starlord.maxHp);
    assert.notEqual(g.player.maxHp, before);
    assert.equal(g.player.hp, Math.ceil(HEROES.starlord.maxHp * 0.5));
  });

  it("弹射关护盾需弹射", () => {
    const g = createGame(3);
    assert.equal(g.mode, "ricochet");
    assert.ok(g.enemies.every(e => e.kind === "shielded"));
  });

  it("限时关有倒计时", () => {
    const g = createGame(5);
    assert.equal(g.mode, "heist");
    assert.ok(g.timeLeft > 0);
  });

  it("坚守关有生存计时", () => {
    const g = createGame(6);
    assert.equal(g.mode, "survive");
    assert.ok(g.surviveLeft > 0);
  });

  it("Boss 关有 Boss", () => {
    const g = createGame(9);
    assert.ok(g.boss?.alive);
  });

  it("tick 不崩溃", () => {
    for (let id = 0; id < LEVEL_COUNT; id++) {
      const g = createGame(id);
      for (let i = 0; i < 30; i++) {
        movePlayer(g, 0.2, 0, 1 / 60);
        tick(g, 1 / 60);
      }
      assert.ok(["playing", "won", "dead"].includes(g.status));
    }
  });

  it("nextLevel 递增至第十关", () => {
    const g = createGame(0);
    const n = nextLevel(g);
    assert.equal(n.levelId, 1);
    assert.equal(nextLevel({ levelId: 9 }), null);
  });

  it("护盾敌人仅弹射可伤", () => {
    const g = createGame(3);
    const enemy = g.enemies.find(e => e.alive);
    const hp = enemy.hp;
    g.arrow = {
      x: enemy.x, y: enemy.y,
      vx: 10, vy: 0,
      bounces: 0, returning: false,
      hitIds: new Set(), trail: []
    };
    tick(g, 1 / 60);
    assert.equal(enemy.hp, hp);
    g.arrow.hitIds.clear();
    g.arrow.bounces = 1;
    tick(g, 1 / 60);
    assert.ok(enemy.hp < hp);
  });

  it("德拉克斯撞碎脆弱墙", () => {
    const g = createGame(2);
    assert.equal(g.player.heroId, "drax");
    let crack = null;
    for (let ty = 0; ty < g.level.height; ty++) {
      for (let tx = 0; tx < g.level.width; tx++) {
        if (g.level.rows[ty][tx] === TILE.CRACK_WALL) {
          crack = { tx, ty };
          break;
        }
      }
      if (crack) break;
    }
    assert.ok(crack);
    const center = tileCenter(crack.tx, crack.ty);
    g.player.x = center.x - 48;
    g.player.y = center.y;
    g.player.facing = { x: 1, y: 0 };
    startAbility(g);
    assert.equal(g.level.rows[crack.ty][crack.tx], TILE.FLOOR);
  });

  it("限时关超时失败", () => {
    const g = createGame(5);
    g.timeLeft = 0.01;
    tick(g, 0.02);
    assert.equal(g.status, "dead");
  });

  it("夺钥关不必清场", () => {
    const g = createGame(5);
    assert.equal(g.rules.requireClear, false);
  });

  it("坚守计时结束获胜", () => {
    const g = createGame(6);
    g.surviveLeft = 0.01;
    tick(g, 0.02);
    assert.equal(g.status, "won");
  });

  it("擂台清场后开启出口", () => {
    const g = createGame(7);
    assert.equal(g.exitOpened, false);
    for (const e of g.enemies) e.alive = false;
    tick(g, 1 / 60);
    assert.equal(g.exitOpened, true);
    const tx = Math.floor(g.level.width / 2);
    const ty = Math.floor(g.level.height / 2);
    assert.equal(g.level.rows[ty][tx], TILE.EXIT);
  });

  it("火箭地雷可部署", () => {
    const g = createGame(4);
    assert.equal(g.player.heroId, "rocket");
    startAbility(g);
    assert.equal(g.traps.length, 1);
    assert.ok(g.traps[0].armed);
  });

  it("格鲁特藤蔓定身敌人", () => {
    const g = createGame(6);
    assert.equal(g.player.heroId, "groot");
    const enemy = {
      id: "test", x: g.player.x + 20, y: g.player.y,
      homeX: g.player.x + 20, homeY: g.player.y,
      hp: 60, maxHp: 60, speed: 1.5, kind: "normal",
      patrolAngle: 0, frozen: 0, alive: true
    };
    g.enemies.push(enemy);
    startAbility(g);
    assert.ok(enemy.frozen > 0);
    assert.equal(g.vines.length, 1);
  });
});
