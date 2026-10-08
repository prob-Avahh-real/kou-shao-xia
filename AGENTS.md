# 口哨侠

银河护卫队 · 口哨冒险 以《银河护卫队》角色与绝招为设定的俯视角冒险游戏。核心玩法是**勇度的口哨飞箭**——按住口哨并滑动手指（或对着麦克风吹口哨），引导飞箭沿轨迹穿梭、弹射穿敌，松手后归返。 英雄与绝招 十关玩法（互不重复） 启动 cd /Users/skat/Projects/whistle-archer npm install npm run dev 浏览器打开 Vite 输出的地址（通常 `http://localhost:5173`）。

## 用途与 Target 判定

口哨侠 Capacitor+穿戴

- 移动端：需要
- 智能硬件：需要

## 目标平台

| 平台 | 方式 | 产出 |
|------|------|------|
| 移动端 | Capacitor → `android/`（`webDir: dist`） | APK |
| 手表 | 窄屏 CSS（已有） | 同 App |
| 智能戒指 / 手杖 | 可选（现有 watch tilt；戒指手杖可搁置） | — |

CI：`capacitor-smoke.yml` → `whistle-archer`

## 命令

```bash
npm install
npm test
npm run build
npx cap sync android
# 可选：npm run apk:debug  # JDK 17
```

## 状态

已归档。默认只做必要修复与知识库同步，不新开大范围需求。

## 智能硬件约定

- 戒指：DeviceOrientation；手杖：DeviceMotion；手表窄屏 CSS
- 复用 shared / 兄弟项目模块，避免复制漂移

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `/Users/skat/AGENTS.md` 与本文件的用途判定
- 可选 Target 可搁置；不适用形态不要硬加
- 改动聚焦；公共逻辑抽离复用
