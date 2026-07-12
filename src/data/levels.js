/**
 * 瓦片:
 * 0 地板  1 墙  2 门  3 钥匙  4 敌人  5 出口
 * 6 英雄台  7 脆弱墙  8 宝箱  9 危险地板
 */
export const TILE = {
  FLOOR: 0, WALL: 1, DOOR: 2, KEY: 3, ENEMY: 4, EXIT: 5,
  HERO_PAD: 6, CRACK_WALL: 7, CHEST: 8, HAZARD: 9
};

const pad = (rows, w) => rows.map(r => {
  const line = r.padEnd(w, "1").slice(0, w);
  return [...line].map(c => parseInt(c, 10));
});

const ALL = ["yondu", "starlord", "gamora", "drax", "rocket", "groot"];

/**
 * mode 决定玩法重心，尽量互不重复：
 * tutorial  — 口哨飞箭教学
 * switch    — 英雄切换与分工
 * smash     — 撞碎脆弱墙开路
 * ricochet  — 仅弹射伤害能破盾敌人
 * mines     — 地雷堵口与狭窄通道
 * heist     — 限时夺钥逃出
 * survive   — 坚守计时，波次刷怪
 * arena     — 空旷擂台清场后出口开启
 * gauntlet  — 危险地板突击穿越
 * boss      — Boss 决战
 */
export const LEVELS = [
  {
    id: 0,
    name: "废弃采矿站",
    subtitle: "口哨入门",
    mode: "tutorial",
    width: 14,
    height: 11,
    startHero: "yondu",
    unlockedHeroes: ["yondu"],
    playerStart: { x: 2, y: 5 },
    rules: { win: "exit", requireClear: true, requireKey: true },
    rows: pad([
      "11111111111111",
      "10000000000001",
      "10111011110101",
      "10001000000101",
      "10111011110101",
      "10040000004001",
      "10111122221101",
      "10000003000001",
      "10111011110101",
      "10000008000501",
      "11111111111111"
    ], 14),
    messages: ["按住「口哨」并滑动，引导飞箭穿敌", "拾取钥匙开门，清理敌人后抵达出口"]
  },
  {
    id: 1,
    name: "克里监狱",
    subtitle: "英雄分工",
    mode: "switch",
    width: 18,
    height: 13,
    startHero: "yondu",
    unlockedHeroes: ["yondu", "starlord", "gamora"],
    playerStart: { x: 2, y: 6 },
    rules: { win: "exit", requireClear: true, requireKey: true },
    rows: pad([
      "111111111111111111",
      "100000000000000001",
      "101111011111011101",
      "100401000000040001",
      "101101011111010101",
      "100001000000010001",
      "101111022222210101",
      "100000000060000001",
      "101111011111011101",
      "100040000000040001",
      "101101011111010101",
      "100001080030005001",
      "111111111111111111"
    ], 18),
    messages: ["踩蓝色平台切换英雄", "近距用星爵双枪，突进用卡魔拉"]
  },
  {
    id: 2,
    name: "掠夺者要塞",
    subtitle: "蛮力破壁",
    mode: "smash",
    width: 18,
    height: 13,
    startHero: "drax",
    unlockedHeroes: ["yondu", "starlord", "gamora", "drax"],
    playerStart: { x: 2, y: 6 },
    rules: { win: "exit", requireClear: true, requireKey: false },
    rows: pad([
      "111111111111111111",
      "100000011100000001",
      "101110011100111101",
      "100400077700040001",
      "101110011100111101",
      "100000011100000001",
      "101111111111111101",
      "100000000000000001",
      "101110077700111101",
      "100400000000040001",
      "101110011100111101",
      "100000000000005001",
      "111111111111111111"
    ], 18),
    messages: ["紫色脆弱墙必须用德拉克斯撞碎", "没有钥匙——撞开捷径直达出口"]
  },
  {
    id: 3,
    name: "反弹射击场",
    subtitle: "弹射破盾",
    mode: "ricochet",
    width: 16,
    height: 12,
    startHero: "yondu",
    unlockedHeroes: ["yondu", "starlord", "gamora"],
    playerStart: { x: 2, y: 6 },
    rules: { win: "exit", requireClear: true, bounceOnly: true },
    enemyKind: "shielded",
    rows: pad([
      "1111111111111111",
      "1000000000000001",
      "1011110000111101",
      "1000040000400001",
      "1011110000111101",
      "1000000000000001",
      "1000000000000001",
      "1011110000111101",
      "1000040000400001",
      "1011110000111101",
      "1000000000000501",
      "1111111111111111"
    ], 16),
    messages: ["护盾敌人只吃弹射伤害", "让飞箭先撞墙再命中"]
  },
  {
    id: 4,
    name: "狭道伏击",
    subtitle: "地雷堵口",
    mode: "mines",
    width: 16,
    height: 14,
    startHero: "rocket",
    unlockedHeroes: ["yondu", "starlord", "gamora", "drax", "rocket"],
    playerStart: { x: 2, y: 2 },
    rules: { win: "exit", requireClear: true, requireKey: true },
    enemyKind: "rusher",
    rows: pad([
      "1111111111111111",
      "1000000000000001",
      "1011111111111101",
      "1000000000000401",
      "1011111111111101",
      "1040000000000001",
      "1011111111111101",
      "1000000000000401",
      "1011112222111101",
      "1000000000000001",
      "1011111111111101",
      "1004000000300801",
      "1000000000000501",
      "1111111111111111"
    ], 16),
    messages: ["冲锋敌人极快——用火箭地雷堵死窄道", "拾钥匙开门后清场离开"]
  },
  {
    id: 5,
    name: "索瓦林金库",
    subtitle: "限时夺钥",
    mode: "heist",
    width: 18,
    height: 12,
    startHero: "gamora",
    unlockedHeroes: ["yondu", "starlord", "gamora", "drax", "rocket"],
    playerStart: { x: 1, y: 6 },
    rules: { win: "exit", requireClear: false, requireKey: true, timeLimit: 55 },
    rows: pad([
      "111111111111111111",
      "100000000000000001",
      "101110111101111101",
      "100010000001000001",
      "101110111101111101",
      "100400000040000401",
      "100000022200000001",
      "101110111101111101",
      "100010000001000001",
      "101110111301111101",
      "100000080000005001",
      "111111111111111111"
    ], 18),
    messages: ["限时 55 秒：夺钥匙冲出口", "不必清光敌人——逃出即胜"]
  },
  {
    id: 6,
    name: "星云前哨",
    subtitle: "坚守波次",
    mode: "survive",
    width: 14,
    height: 12,
    startHero: "groot",
    unlockedHeroes: ALL,
    playerStart: { x: 7, y: 6 },
    rules: { win: "survive", surviveFor: 40, waveInterval: 6, waveSize: 2 },
    rows: pad([
      "11111111111111",
      "10000000000001",
      "10000000000001",
      "10000000000001",
      "10000006000001",
      "10000000000001",
      "10000000000001",
      "10000000000001",
      "10000000000001",
      "10000000000001",
      "10000000000001",
      "11111111111111"
    ], 14),
    messages: ["坚守 40 秒，波次敌人从边缘涌入", "格鲁特藤蔓适合控场"]
  },
  {
    id: 7,
    name: "角斗士擂台",
    subtitle: "清场开闸",
    mode: "arena",
    width: 16,
    height: 12,
    startHero: "starlord",
    unlockedHeroes: ALL,
    playerStart: { x: 3, y: 6 },
    rules: { win: "clear", exitAfterClear: true },
    enemyKind: "tank",
    rows: pad([
      "1111111111111111",
      "1000000000000001",
      "1000000000000001",
      "1004000000004001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1004000000004001",
      "1000000000000001",
      "1000000000000001",
      "1111111111111111"
    ], 16),
    messages: ["空旷擂台：打倒全部重装敌人", "清场后中央出口开启"]
  },
  {
    id: 8,
    name: "辐射裂谷",
    subtitle: "危险穿越",
    mode: "gauntlet",
    width: 20,
    height: 12,
    startHero: "gamora",
    unlockedHeroes: ALL,
    playerStart: { x: 1, y: 6 },
    rules: { win: "exit", requireClear: false, requireKey: true },
    rows: pad([
      "11111111111111111111",
      "10000000000000000001",
      "10111111111111111101",
      "10099999999999999001",
      "10111111111111111101",
      "10000000000000000001",
      "10099999993999999001",
      "10000000000000000001",
      "10111111111111111101",
      "10099999999999999001",
      "10000000000000000501",
      "11111111111111111111"
    ], 20),
    messages: ["橙色地面持续灼伤——用卡魔拉疾冲穿越", "中间有钥匙，不必恋战"]
  },
  {
    id: 9,
    name: "至高进化核心",
    subtitle: "最终决战",
    mode: "boss",
    width: 16,
    height: 14,
    startHero: "yondu",
    unlockedHeroes: ALL,
    playerStart: { x: 3, y: 11 },
    rules: { win: "boss", requireClear: true },
    boss: { tx: 12, ty: 4, hp: 420 },
    rows: pad([
      "1111111111111111",
      "1000000000000001",
      "1000000000000001",
      "1004000000004001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000600000001",
      "1000000000000001",
      "1004000000004001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000501",
      "1111111111111111"
    ], 16),
    messages: ["击败至高进化投影与护卫", "口哨飞箭穿透 Boss 最有效"]
  }
];

export function levelById(id) {
  return LEVELS[id] ?? LEVELS[0];
}

export const LEVEL_COUNT = LEVELS.length;
