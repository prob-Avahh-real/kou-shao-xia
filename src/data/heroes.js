/** 银河护卫队风格英雄 — 每人对应一项绝招 */
export const HEROES = {
  yondu: {
    id: "yondu",
    name: "勇度",
    title: "掠夺者船长",
    color: "#c41e3a",
    accent: "#ffd166",
    ability: "口哨飞箭",
    abilityType: "whistle_arrow",
    desc: "按住口哨并滑动手指，飞箭沿轨迹穿梭、弹射，穿透多名敌人后归返",
    speed: 3.2,
    maxHp: 100,
    arrowSpeed: 11,
    arrowDamage: 35,
    maxBounces: 6,
    unlockLevel: 0
  },
  starlord: {
    id: "starlord",
    name: "星爵",
    title: "星际游侠",
    color: "#3d5a80",
    accent: "#ee6c4d",
    ability: "元素双枪",
    abilityType: "dual_blast",
    desc: "双枪扇形连射，快速清剿近距敌人",
    speed: 3.6,
    maxHp: 90,
    blastDamage: 22,
    blastCount: 5,
    unlockLevel: 1
  },
  gamora: {
    id: "gamora",
    name: "卡魔拉",
    title: "致命刺客",
    color: "#2d6a4f",
    accent: "#95d5b2",
    ability: "死亡舞步",
    abilityType: "sword_dash",
    desc: "向前疾冲斩击，路径上的敌人全部受到伤害",
    speed: 3.8,
    maxHp: 95,
    dashDamage: 40,
    dashRange: 140,
    unlockLevel: 1
  },
  drax: {
    id: "drax",
    name: "德拉克斯",
    title: "毁灭者",
    color: "#6c2d8a",
    accent: "#c77dff",
    ability: "蛮力冲撞",
    abilityType: "charge",
    desc: "蓄力冲撞，撞碎脆弱墙壁并击飞敌人",
    speed: 2.8,
    maxHp: 130,
    chargeDamage: 50,
    chargeRange: 120,
    unlockLevel: 2
  },
  rocket: {
    id: "rocket",
    name: "火箭",
    title: "武器大师",
    color: "#bc6c25",
    accent: "#ffe66d",
    ability: "陷阱火箭",
    abilityType: "trap",
    desc: "放置感应地雷，敌人靠近时爆炸",
    speed: 3.4,
    maxHp: 80,
    trapDamage: 55,
    trapRadius: 70,
    unlockLevel: 2
  },
  groot: {
    id: "groot",
    name: "格鲁特",
    title: "树人守卫",
    color: "#386641",
    accent: "#a7c957",
    ability: "藤蔓缠绕",
    abilityType: "vine",
    desc: "释放根须定身周围敌人，为队友创造突破口",
    speed: 2.6,
    maxHp: 140,
    vineDamage: 15,
    vineRadius: 100,
    vineDuration: 3,
    unlockLevel: 3
  }
};

export const HERO_ORDER = ["yondu", "starlord", "gamora", "drax", "rocket", "groot"];

export function heroById(id) {
  return HEROES[id] ?? HEROES.yondu;
}
