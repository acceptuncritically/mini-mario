# 迷你马里奥（mini-mario）需求规范文档 v2.0

- 版本：2.0（v1 → v2 升级版）
- 状态：已与用户确认（v2 共 3 轮需求讨论）
- 关联文档：[测试用例文档 TEST_CASES.md](./TEST_CASES.md)

---

## 1. 版本变更摘要（v1 → v2）

| 变更项 | v1 | v2 |
| --- | --- | --- |
| 关卡 | 3 关 × 100 列 | **1 个长关卡 × 200 列（约 6.7 屏）** |
| 生命 | 3 条命，命尽 GAME_OVER | **无限命**：死亡仅回检查点，记录死亡次数 |
| 存档 | 无 | **检查点复活 + 最高分记录（localStorage）** |
| 暂停 | 无 | **P/Esc + 触屏按钮，世界完全冻结，可继续/重新开始** |
| 手感 | 固定跳跃 | **土狼时间 + 跳跃缓冲 + 可变跳跃高度** |
| 敌人 | 60 px/s 巡逻 | **90 px/s，数量更多（约 8 个）** |
| 陷阱 | 无 | **钉刺陷阱（踩到即死）** |
| 敌人碰撞 | 扣命 | **受伤：无敌 1.5s + 击退，不死亡** |
| 通关奖励 | 剩余生命 × 200 | **1500 − 死亡次数 × 300（最低 300）** |
| 音效 | 无 | **WebAudio 合成效果音 + 循环芯片背景音乐（原创，风格致敬经典）** |
| 美术 | 静态几何色块 | **代码绘制升级：视差背景、角色/金币/敌人动画、粒子特效、旗帜飘动** |
| 状态机 | TITLE/PLAYING/LEVEL_CLEAR/VICTORY/GAME_OVER | **TITLE/PLAYING/PAUSED/LEVEL_CLEAR/VICTORY**（GAME_OVER 移除） |

---

## 2. 术语定义

| 术语 | 含义 |
| --- | --- |
| Tile（格子） | 关卡地图基本单位，32×32 px |
| 检查点（Checkpoint） | 关卡中途的复活记录点；起点为默认激活的第 0 号检查点，地图中 `K` 为中途检查点，玩家经过即激活 |
| 土狼时间（Coyote Time） | 离开平台边缘后仍有 0.1s 可起跳的宽容窗口 |
| 跳跃缓冲（Jump Buffer） | 空中提前按跳 0.12s 内，落地瞬间自动起跳 |
| 可变跳跃 | 按住跳跃键跳满高度；上升中松开则削减上升速度（每次起跳只削减一次） |
| 击退（Knockback） | 受伤时被弹离敌人的强制位移 |
| 钉刺（Spike） | 尖刺陷阱，玩家碰到即死亡 |
| 最高分（High Score） | 历史最高通关得分，持久化在浏览器 localStorage |
| 事件（Event） | game 核心每帧输出的语义事件（jump/coin/stomp/hurt/death/checkpoint/flag/victory…），供音效与粒子层消费 |

---

## 3. 技术架构

### 3.1 目录结构

```
mini-mario/
├── docs/SPEC.md / TEST_CASES.md
├── index.html               # 含暂停按钮 DOM
├── src/
│   ├── core/                # 纯逻辑（无 DOM/无 WebAudio，全部可测）
│   │   ├── constants.js
│   │   ├── physics.js
│   │   ├── collision.js     # + 钉刺/检查点判定
│   │   ├── player.js        # + 土狼/缓冲/可变跳/击退
│   │   ├── enemy.js
│   │   ├── level.js         # 单关 200 列，图例 #/C/E/P/F/S/K/.
│   │   ├── camera.js
│   │   ├── game.js          # 状态机 v2 + 事件输出 + 死亡/检查点/最高分
│   │   └── highscore.js     # 最高分纯函数（存储读写注入）
│   └── game/
│       ├── input.js         # + isJumpHeld() + consumePause() + 暂停按钮
│       ├── audio.js         # WebAudio 合成：效果音 + 背景音乐（新增）
│       ├── renderer.js      # 美术 v2：视差/动画/粒子/钉刺/检查点/HUD v2
│       └── main.js          # 事件→音效/粒子 装配
├── scripts/build-single-file.mjs
└── tests/                   # 56 个用例（v2）
```

分层原则与 v1 相同：core 纯函数可测；game 层只做装配；固定逻辑帧 dt=1/60。

---

## 4. 全局常量（constants.js v2）

| 常量 | 值 | 说明 |
| --- | --- | --- |
| `TILE_SIZE` | 32 | 格子边长 |
| `VIEW_WIDTH` / `VIEW_HEIGHT` | 960 / 544 | 逻辑视口 |
| `LEVEL_ROWS` | 17 | 行数 |
| `LEVEL_WIDTH_TILES` | **200** | 列数（v1 为 100） |
| `GRAVITY` | 1600 | 重力 |
| `MAX_FALL_SPEED` | 950 | 最大下落速度 |
| `MOVE_SPEED` | 260 | 水平移动速度 |
| `JUMP_VELOCITY` | -640 | 起跳初速度 |
| `JUMP_CUT_FACTOR` | **0.45** | 可变跳：上升中松开跳键，vy 乘此系数（单次） |
| `COYOTE_TIME` | **0.10** | 土狼时间（秒） |
| `JUMP_BUFFER_TIME` | **0.12** | 跳跃缓冲（秒） |
| `STOMP_BOUNCE` | -380 | 踩敌反弹 |
| `KNOCKBACK_SPEED` | **220** | 受伤击退水平速度 |
| `HURT_KNOCKBACK_VY` | **-260** | 受伤击退垂直速度（小幅弹起） |
| `PLAYER_WIDTH` / `PLAYER_HEIGHT` | 28 / 36 | 玩家碰撞盒 |
| `ENEMY_SIZE` | 32 | 敌人碰撞盒 |
| `ENEMY_SPEED` | **90** | 敌人巡逻速度（v1 为 60） |
| `ENEMY_STOMP_THRESHOLD` | 12 | 踩踏判定阈值 |
| `COIN_SIZE` | 24 | 金币碰撞盒 |
| `SPIKE_W` / `SPIKE_H` | **26 / 18** | 钉刺碰撞盒 |
| `SPIKE_OFFSET_Y` | **14** | 钉刺碰撞盒距所在格顶部的偏移 |
| `INVINCIBLE_TIME` | 1.5 | 受伤无敌时长 |
| `COIN_SCORE` / `STOMP_SCORE` | 100 / 100 | 金币/踩敌得分 |
| `CLEAR_BASE_BONUS` | **1500** | 通关基础奖励 |
| `CLEAR_DEATH_PENALTY` | **300** | 每次死亡扣除的奖励 |
| `CLEAR_MIN_BONUS` | **300** | 通关奖励下限 |
| `LEVEL_CLEAR_PAUSE` | 1.5 | 通关停留时长 |
| `PIT_DEATH_MARGIN` | 64 | 坠落判定线 |
| `FIXED_DT` | 1/60 | 固定逻辑帧 |
| `HIGH_SCORE_KEY` | **`'mini-mario-highscore'`** | localStorage 键名 |
| 状态常量 | `STATE_TITLE/PLAYING/PAUSED/LEVEL_CLEAR/VICTORY` | GAME_OVER 已移除 |

坐标约定：y 向下为正；`(x,y)` 为碰撞盒左上角。

---

## 5. 核心玩法规范

### 5.1 物理（physics.js）
与 v1 相同：重力积分 + 钳制、水平积分、严格 AABB（边界接触不算相交）。

### 5.2 碰撞（collision.js）
1. 分轴响应：先水平后垂直；落地贴齐、顶头失速（与 v1 相同）。
2. 金币：碰撞盒相交即拾取移除。
3. 旗帜：相交触发通关。
4. 踩踏判定：`player.vy > 0` 且 `player.bottom ≤ enemy.top + ENEMY_STOMP_THRESHOLD` 且相交 → stomp。
5. **钉刺判定（新增）**：玩家碰撞盒与钉刺碰撞盒（以所在格为基准：`{x: col*32+3, y: row*32+SPIKE_OFFSET_Y, w: SPIKE_W, h: SPIKE_H}`）相交 → 死亡。
6. **检查点判定（新增）**：玩家碰撞盒与检查点所在格（整格）相交 → 激活该检查点。

### 5.3 操作手感（player.js，v2 新增）
1. **土狼时间**：每帧开始时若上一帧 grounded 为真而本帧重置后为假（即刚离开地面），令 `coyoteTimer = COYOTE_TIME`；空中逐帧递减。
   跳跃条件 = `grounded || coyoteTimer > 0`；成功起跳后 `coyoteTimer = 0`。
2. **跳跃缓冲**：空中（不可起跳时）收到跳跃边沿信号，令 `jumpBufferTimer = JUMP_BUFFER_TIME`；逐帧递减。
   本帧垂直碰撞后若 `grounded == true` 且 `jumpBufferTimer > 0` → 立即起跳并清零缓冲。
3. **可变跳跃高度**：起跳后置 `jumpCutApplied = false`；此后若 `vy < 0`（上升中）且 `!input.isJumpHeld()` 且未削减过 → `vy *= JUMP_CUT_FACTOR`，`jumpCutApplied = true`。
4. 其余移动/跳跃/无敌递减与 v1 相同。
5. **受伤击退（新增）**：`applyHurt` 扩展为：进入无敌 1.5s，`vx = 远离敌人方向 × KNOCKBACK_SPEED`，`vy = HURT_KNOCKBACK_VY`，`grounded = false`。

### 5.4 敌人（enemy.js）
逻辑同 v1（撞墙/悬崖转身、可被踩死、死亡移除），速度使用 `ENEMY_SPEED = 90`。

### 5.5 死亡、检查点与无限命（game.js）
1. 无命数概念；`deaths` 计数从 0 开始，每次死亡 +1。
2. 死亡触发：坠落（`player.y > 关卡高 + PIT_DEATH_MARGIN`）或踩钉刺。
3. 死亡处理：`deaths++`；玩家回到**最近激活的检查点**位置；关卡实体（敌人/金币）恢复为关卡初始状态；分数保留；无敌时间清零（重生不送无敌）；输出 `death` 事件。
4. 检查点：起点为 0 号检查点，默认激活；地图 `K` 处为中途检查点，玩家经过（碰撞盒相交）即激活，输出 `checkpoint` 事件。
5. 敌人侧面碰撞：不死亡——若未无敌则受伤（无敌 1.5s + 击退），输出 `hurt` 事件；无敌期间无效果。

### 5.6 计分与最高分（game.js / highscore.js）
1. 金币 +100、踩敌 +100（同 v1）。
2. 通关奖励：`max(CLEAR_MIN_BONUS, CLEAR_BASE_BONUS − deaths × CLEAR_DEATH_PENALTY)`。
3. 最高分：`highscore.js` 提供纯函数 `applyHighScore(prev, score) → next`（取较大值）；读取/写入通过注入的存储接口（game 层用 localStorage 实现，键 `HIGH_SCORE_KEY`）。通关结算时更新最高分并输出 `victory` 事件；HUD 始终显示最高分。

### 5.7 流程与状态机（game.js）
状态：`TITLE → PLAYING ⇄ PAUSED`，`PLAYING → LEVEL_CLEAR → VICTORY`，`VICTORY → TITLE`。

1. TITLE：开始操作 → 重置分数/死亡次数/检查点 → 加载唯一关卡 → PLAYING。
2. PAUSED（新增）：仅当 PLAYING 时，收到暂停边沿 → PAUSED；PAUSED 时 `update` 中**世界完全冻结**（玩家、敌人、计时器、粒子逻辑均不推进），仅响应：
   - 暂停边沿 → 恢复 PLAYING（输出 `resume` 事件）；
   - 重新开始操作 → 重置分数/死亡次数/检查点并重载关卡 → PLAYING。
3. 碰旗：结算通关奖励（按 5.6-2）→ 输出 `flag` 事件 → LEVEL_CLEAR（停留 `LEVEL_CLEAR_PAUSE`，世界冻结，同 v1）→ VICTORY。
4. VICTORY：显示分数/死亡次数/最高分；开始操作 → TITLE。
5. `update(input, dt)` 每帧将本帧事件写入 `this.events`（数组，帧首清空），供 main.js 播放音效/粒子。

### 5.8 事件清单（game.js 输出）
`jump`（起跳）、`coin`、`stomp`、`hurt`、`death`、`checkpoint`、`flag`、`victory`、`pause`、`resume`、`start`。

### 5.9 镜头（camera.js）
同 v1：水平跟随 + 双向钳制（上限 = 200×32 − 960 = 5440），垂直恒 0。

---

## 6. 输入规范（input.js v2）

1. 键盘：←/→（A/D 亦可）移动；空格/↑/Enter 跳跃（边沿 `consumeJump()`）；**P 或 Esc：暂停/继续（边沿 `consumePause()`）**。
2. 新增接口：
   - `isJumpHeld()` — 跳跃键当前是否按住（键盘与触屏跳跃按钮状态合并）；
   - `consumePause()` — 读取并清除暂停边沿。
3. 触屏：左下 ◀ ▶、右下「跳」（同 v1）；**右上角新增「⏸」暂停按钮**（`#btn-pause`，DOM 在 index.html），仅触屏设备显示，pointer 事件驱动 `consumePause`。
4. 任一按键/触控首次交互时调用一次音频解锁（由 main.js 挂接）。

---

## 7. 关卡数据格式（level.js v2）

- 17 行 × **200 列** ASCII 地图，共 1 关（`LEVELS` 数组长度 1）。
- 图例：

| 字符 | 含义 |
| --- | --- |
| `#` | 固态格子 |
| `C` | 金币 |
| `E` | 敌人出生点（初始朝左） |
| `P` | 玩家出生点（同时是 0 号检查点） |
| `F` | 终点旗帜 |
| `S` | 钉刺（所在格） |
| `K` | 中途检查点（所在格） |
| `.` / 空格 | 空地 |

- 解析结果新增：`spikes: [{x,y,w,h}]`（碰撞盒像素矩形，按所在格计算）、`checkpoints: [{x,y}]`（格左上角像素坐标，按列升序；0 号检查点 = playerSpawn，由 game 层合并）。
- 设计约束（新关卡）：
  - 恰好 1 个 P、1 个 F；敌人约 8 个；金币约 30 个；钉刺 ≥ 6 组（每组 1~4 个连续）；中途检查点 2 个（位于约 1/3 与 2/3 处）；
  - 敌人全部站在实心地面/平台上；深渊 ≥ 4 处且宽度 2~4 格；钉刺铺在平地上（保留可避让空间，不铺满整条必经路线）；
  - 前 20 列为教学区（无敌人无钉刺），之后难度递增；
  - 终点旗帜前 10 列无敌人。

---

## 8. 音效规范（audio.js，新增，不写自动化测试）

1. 技术：Web Audio API 合成，无任何外部音频文件；首次用户手势时创建/恢复 `AudioContext`。
2. 效果音（原创芯片风格，接近经典平台跳跃游戏听感）：
   - `jump`：方波上行滑音（约 200→600 Hz，0.15s）；
   - `coin`：双音短促上行（B5→E6 正弦，约 0.12s）；
   - `stomp`：噪声短爆 + 方波下行滑音；
   - `hurt`：锯齿波下行（约 400→120 Hz，0.25s）；
   - `death`：下行琶音（4 音，约 0.5s）；
   - `checkpoint`：上行琶音钟声（3 音）；
   - `flag` / `victory`：胜利号角琶音（5 音）；
   - `pause` / `resume`：短促「嗒」声。
3. 背景音乐：约 110 BPM 的 8 拍原创芯片循环（方波主旋律 + 三角波低音），PLAYING 时播放、PAUSED 时暂停、LEVEL_CLEAR/VICTORY 停止并播放胜利音；TITLE 播放另一段更慢的循环或保持静默（实现任选其一，不测）。
4. 音量：效果音约 -6 dB、音乐约 -18 dB，总输出限幅防削波。

---

## 9. 渲染规范（renderer.js v2，不写自动化测试）

1. **视差背景**（按 0.2/0.5 倍镜头偏移滚动）：渐变天空（顶部深蓝→地平线浅蓝）、两层云朵、两层山丘剪影。
2. **Tile**：草地顶面 + 泥土块（沿用 v1 配色，可微调）。
3. **玩家**：红色圆角矩形 + 眼睛；跑动时腿交替摆动（sin 动画）；跳跃/下落姿态（拉伸/压缩）；无敌期 100ms 周期闪烁。
4. **敌人**：紫色方块 + 眼睛朝移动方向；走路上下轻微弹跳。
5. **金币**：金色圆 + 旋转动画（横向椭圆缩放周期变化）。
6. **旗帜**：旗杆 + 三角旗飘动（周期摆动）。
7. **钉刺**：灰白三角形排（所在格底部）。
8. **检查点**：小旗杆图形；未激活灰色，激活后彩色并发光。
9. **粒子系统**（renderer 内部维护，随渲染帧更新）：踩敌碎屑、吃金币星花、死亡爆散、检查点激活光环、落地微尘。
10. **HUD**：左上 `分数`、`最高分`、`死亡次数`，半透明底条。
11. **覆盖层**：TITLE（标题+操作说明）、PAUSED（「继续 / 重新开始」提示 + 对应按键说明）、LEVEL_CLEAR（通关+奖励）、VICTORY（最终分数/死亡次数/最高分）。
12. PAUSED 时画面静止在最后一帧（渲染照常进行，仅逻辑冻结）。

---

## 10. 主循环与装配（main.js v2）

1. 固定步长累加器 + 单帧最多 5 逻辑帧 + 0.25s 帧时间上限（同 v1）。
2. 每逻辑帧：`game.update(input, FIXED_DT)` → 消费 `game.events` → 播放对应音效/触发粒子。
3. 背景音乐根据 game.state 启停（PLAYING 播放、PAUSED 暂停）。
4. 首次用户手势（keydown/pointerdown）时初始化音频（浏览器自动播放策略）。

---

## 11. 存档（highscore.js + game 层存储）

1. 仅持久化**最高分**：键 `mini-mario-highscore`，值非负整数（JSON）。
2. core 层 `highscore.js` 导出纯函数：`applyHighScore(prev, score)`；`parseScore(text)`（非法值回退 0）。存储读写由 game 层注入（`loadScore()` / `saveScore(n)` 回调），core 不直接触碰 localStorage。
3. 检查点与进度**不持久化**（刷新浏览器后从标题重新开始，仅最高分保留）。

---

## 12. 验收标准（v2）

1. `npm run test` 全部通过（56 个用例，与 TEST_CASES.md 一一对应，0 失败 0 跳过）。
2. `npm run dev` 可玩：视差背景、角色动画、粒子、音效与背景音乐正常；手机触屏含暂停按钮。
3. 手感：空中可缓冲跳、平台边缘 0.1s 内可起跳、轻点小跳按住大跳。
4. 敌人更多更快；踩钉刺/掉深渊死亡回最近检查点；死亡次数正确累计；敌人碰触仅受伤击退不死亡。
5. 暂停：P/Esc/触屏按钮可暂停与继续；暂停时玩家、敌人、金币、计时全部冻结；可重新开始。
6. 通关：奖励 = max(300, 1500 − 死亡×300)；胜利画面显示分数/死亡次数/最高分；最高分持久化（刷新后仍在）。
7. 单文件版 `npm run bundle` 产物含全部新功能，可离线双击游玩。
