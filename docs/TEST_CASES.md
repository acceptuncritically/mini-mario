# 迷你马里奥（mini-mario）测试用例文档 v2.0

- 版本：2.0
- 配套规范：[SPEC.md](./SPEC.md)
- 测试框架：Vitest（Node 环境），测试文件位于 `tests/`，与下表一一对应。
- 约定：每个用例的 Vitest 测试名（`it(...)` 第一参数）必须以用例 ID 开头，如 `TC-PHYS-01 ...`。
- 数值依据：所有预期值引用 `src/core/constants.js` 中的常量，不写死魔法数字（关卡地图坐标除外，地图是数据）。

---

## 1. 物理模块 — tests/physics.test.js（沿用 v1，4 例）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-PHYS-01 | 物体 `vy = 0` | 施加重力积分一个逻辑帧 | `vy` 增加 `GRAVITY * dt` |
| TC-PHYS-02 | `vy` 接近上限 | 施加重力积分若干帧 | `vy` 不超过 `MAX_FALL_SPEED` |
| TC-PHYS-03 | 两个矩形 | 分别构造重叠/相切/分离 | 重叠为真，相切与分离为假 |
| TC-PHYS-04 | 水平运动物体 | 水平积分一帧 | `x` 增加 `vx * dt`；重力不改变 `vx` |

## 2. 碰撞模块 — tests/collision.test.js（11 例）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-COL-01 | 玩家右侧有墙，`vx > 0` | 水平碰撞响应一帧 | 右边贴齐墙左边界 |
| TC-COL-02 | 玩家左侧有墙，`vx < 0` | 水平碰撞响应一帧 | 左边贴齐墙右边界 |
| TC-COL-03 | 玩家悬空，下方一格有地面 | 垂直碰撞响应一帧 | 底部贴齐地面顶部；`vy=0`；`grounded=true` |
| TC-COL-04 | 玩家上升，头顶有格子 | 垂直碰撞响应一帧 | 顶部贴齐格子底部；`vy=0`（顶头失速） |
| TC-COL-05 | 玩家落地后新帧开始 | 重置接地状态 | `grounded=false` |
| TC-COL-06 | 下落中与敌人相交且底部 ≤ 敌人顶部 + 阈值 | 踩踏判定 | stomp 为真 |
| TC-COL-07 | 相交但 `vy≤0`，或底部过低 | 踩踏判定 | stomp 为假 |
| TC-COL-08 | 玩家与金币相交/不相交 | 拾取判定 | 相交为真，不相交为假 |
| TC-COL-09 | 玩家与旗帜区域相交/不相交 | 通关判定 | 相交为真，不相交为假 |
| TC-COL-10 | 玩家与钉刺碰撞盒相交/不相交 | 钉刺判定 | 相交为真，不相交为假（碰撞盒按 SPEC 5.2-5：`x=col*32+3, y=row*32+SPIKE_OFFSET_Y, w=SPIKE_W, h=SPIKE_H`） |
| TC-COL-11 | 玩家与检查点所在格相交/不相交 | 检查点判定 | 相交为真，不相交为假 |

## 3. 玩家模块 — tests/player.test.js（11 例）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-PLR-01 | 地面 | 按住「右」更新一帧 | `vx = +MOVE_SPEED`，`x` 增加 |
| TC-PLR-02 | 地面 | 按住「左」一帧后松开 | `vx = -MOVE_SPEED`；松开后 `vx = 0` |
| TC-PLR-03 | 接地 | 触发一次跳跃更新一帧 | `vy = JUMP_VELOCITY`；`grounded=false` |
| TC-PLR-04 | 空中（grounded=false，无土狼时间） | 触发跳跃 | 不起跳（不可二段跳） |
| TC-PLR-05 | 跳跃边沿触发 | 持续按住更新两帧 | 仅第一帧起跳，之后不重复 |
| TC-PLR-06 | `invincible = INVINCIBLE_TIME` | 连续更新多帧 | 逐帧递减至 0；期间 `isInvincible()` 为真，归零后为假 |
| TC-PLR-07 | 踩踏敌人 | 踩踏响应 | `vy = STOMP_BOUNCE` |
| TC-PLR-08 | 走到平台边缘后未起跳（土狼窗口内） | 离开地面后 < COYOTE_TIME 内触发跳跃 | 可以起跳；超过 COYOTE_TIME 后触发则不起跳 |
| TC-PLR-09 | 空中不可起跳时按下跳跃 | 落地瞬间（接地） | 若距按键 ≤ JUMP_BUFFER_TIME，落地帧自动起跳；超过则不起跳 |
| TC-PLR-10 | 起跳后按住跳跃键 | 上升中松开跳跃键更新一帧 | `vy` 被乘 JUMP_CUT_FACTOR（仅一次）；继续按住时 `vy` 只受重力 |
| TC-PLR-11 | 未无敌时被敌人碰到 | 调用受伤响应（方向来自敌人左侧） | `invincible = INVINCIBLE_TIME`；`vx = +KNOCKBACK_SPEED`（远离敌人）；`vy = HURT_KNOCKBACK_VY`；`grounded=false` |

## 4. 敌人模块 — tests/enemy.test.js（4 例，沿用 v1 逻辑，速度改常量）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-ENM-01 | 平地，敌人朝左 | 更新一帧 | `x` 减少 `ENEMY_SPEED * dt`（ENEMY_SPEED=90） |
| TC-ENM-02 | 前方一格有墙 | 更新一帧 | 方向反转，不穿墙 |
| TC-ENM-03 | 前方是悬崖 | 更新一帧 | 方向反转，不走出平台 |
| TC-ENM-04 | 敌人死亡标记 | 游戏更新一帧 | 被移除，不再参与碰撞 |

## 5. 关卡模块 — tests/level.test.js（6 例）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-LVL-01 | 合法 17×200 地图 | 解析 | `rows=17`、`cols=200`、`widthPx=6400`、`heightPx=544` |
| TC-LVL-02 | 地图含若干 `#` | 解析后查询 | `isSolid(col,row)` 在 `#` 处为真、空地/其他图例处为假（**注意：S/K/C/E/P/F 所在格不是固态格子**） |
| TC-LVL-03 | 地图含 C/E/P/F | 解析 | 金币/敌人坐标与数量正确；出生点、旗帜区域正确 |
| TC-LVL-04 | 地图含 S 与 K | 解析 | `spikes` 数组：数量正确、碰撞盒 = `{x:col*32+3, y:row*32+SPIKE_OFFSET_Y, w:SPIKE_W, h:SPIKE_H}`；`checkpoints` 数组：坐标 = 格左上角、按列升序 |
| TC-LVL-05 | 某行不足 200 字符 | 解析 | 自动补空格，不报错；`isSolidPx` 越界返回 false |
| TC-LVL-06 | 内置 `LEVELS` | 校验 | 长度 = 1；17 行 × 200 列；恰好 1 个 P、1 个 F；敌人 ≥ 6、金币 ≥ 25、钉刺组 ≥ 6、中途检查点 = 2 |

## 6. 游戏状态机模块 — tests/game.test.js（16 例）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-GAM-01 | 新建游戏（注入返回 0 的存储） | 检查初始值 | `state=TITLE`、`score=0`、`deaths=0`、`highScore=0`、无 `lives` 字段 |
| TC-GAM-02 | TITLE | 调用开始操作 | `state=PLAYING`；玩家在出生点；`deaths=0`、`score=0`、检查点重置（0 号激活） |
| TC-GAM-03 | PLAYING，玩家与金币相交 | 更新一帧 | 分数 +100，金币移除，事件含 `coin` |
| TC-GAM-04 | PLAYING，踩踏敌人 | 更新一帧 | 分数 +100，敌人移除，玩家反弹，事件含 `stomp` |
| TC-GAM-05 | PLAYING，非无敌侧碰敌人（敌人在左侧） | 更新一帧 | `deaths` 不变；进入无敌；`vx = +KNOCKBACK_SPEED`；事件含 `hurt` |
| TC-GAM-06 | PLAYING，无敌状态碰敌人 | 更新一帧 | 无受伤、无击退、分数不变、事件不含 `hurt` |
| TC-GAM-07 | 玩家坠落深渊，检查点 0 激活 | 更新一帧 | `deaths=1`；回到出生点；敌人/金币复位；分数保留；事件含 `death`；仍 PLAYING |
| TC-GAM-08 | 玩家踩钉刺 | 更新一帧 | `deaths+1`；回到最近检查点；事件含 `death` |
| TC-GAM-09 | 玩家经过中途检查点 K（第 1 个） | 更新一帧 | 检查点激活（事件含 `checkpoint`）；此后死亡回到该 K 位置而非出生点 |
| TC-GAM-10 | 玩家碰旗，deaths=2 | 更新一帧 | 分数 += max(300, 1500−2×300)=900；`state=LEVEL_CLEAR`；事件含 `flag` |
| TC-GAM-11 | LEVEL_CLEAR 停留 | 推进 ≥ LEVEL_CLEAR_PAUSE | `state=VICTORY`；最高分被更新（若分数更高）；事件含 `victory` |
| TC-GAM-12 | VICTORY | 开始操作 | `state=TITLE`（分数/死亡次数保留至下次 start 重置） |
| TC-GAM-13 | PLAYING，暂停边沿 | 更新一帧 | `state=PAUSED`，事件含 `pause`；随后连续更新多帧：玩家/敌人位置、各计时器完全不变 |
| TC-GAM-14 | PAUSED，暂停边沿 | 更新一帧 | 恢复 `PLAYING`，事件含 `resume` |
| TC-GAM-15 | PAUSED，重新开始操作 | 更新一帧 | `PLAYING`；`score=0`、`deaths=0`、检查点重置、玩家回出生点、实体复位 |
| TC-GAM-16 | 通关奖励下限 | deaths=10 时碰旗 | 奖励 = CLEAR_MIN_BONUS（300） |

## 7. 镜头模块 — tests/camera.test.js（4 例，沿用 v1，宽度改 200 列）

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-CAM-01 | 玩家在关卡中部 | 更新镜头 | `x = 玩家中心x - VIEW_WIDTH/2` |
| TC-CAM-02 | 玩家在关卡最左侧 | 更新镜头 | `x = 0` |
| TC-CAM-03 | 玩家在关卡最右侧 | 更新镜头 | `x = 6400 - VIEW_WIDTH` |
| TC-CAM-04 | 任意位置 | 更新镜头 | 垂直方向恒为 0 |

---

## 8. 执行方式

```bash
npm run test          # 运行全部测试（56 例，单次）
npm run test:watch    # 监听模式
```

- 测试通过标准：`npx vitest run` 退出码 0，无失败、无跳过。
- 渲染层与音频层（`src/game/`）不写自动化测试，通过 `npm run dev` 人工验收。
- 测试中构造地图务必保持「行数组索引 ↔ 注释 ↔ 期望坐标」三者一致（行 0 为最顶行，y 向下为正）。
