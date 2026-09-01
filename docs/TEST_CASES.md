# 迷你马里奥（mini-mario）测试用例文档

- 版本：1.0
- 配套规范：[SPEC.md](./SPEC.md)
- 测试框架：Vitest（Node 环境），测试文件位于 `tests/`，与下表一一对应。
- 约定：每个用例的 Vitest 测试名（`it(...)` 第一参数）必须以用例 ID 开头，如 `TC-PHYS-01 ...`。
- 数值依据：所有预期值引用 `src/core/constants.js` 中的常量，不写死魔法数字。

---

## 1. 物理模块 — tests/physics.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-PHYS-01 | 物体 `vy = 0` | 施加重力积分一个逻辑帧（dt = 1/60） | `vy` 增加 `GRAVITY * dt`（≈ 26.67） |
| TC-PHYS-02 | 物体 `vy` 已接近上限 | 施加重力积分若干帧 | `vy` 不超过 `MAX_FALL_SPEED` |
| TC-PHYS-03 | 两个矩形 A 与 B | 分别构造：重叠 / 仅边接触（相切）/ 完全分离 | 重叠返回 true；相切与分离返回 false |
| TC-PHYS-04 | 水平运动物体 | `vx` 正向积分一帧 | `x` 增加 `vx * dt`；`vx` 不被重力改变 |

## 2. 碰撞模块 — tests/collision.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-COL-01 | 玩家右侧有墙，`vx > 0` | 水平碰撞响应一帧 | 玩家右边贴齐墙左边界，不再进入墙内 |
| TC-COL-02 | 玩家左侧有墙，`vx < 0` | 水平碰撞响应一帧 | 玩家左边贴齐墙右边界 |
| TC-COL-03 | 玩家悬空，下方一格有地面，`vy > 0` | 垂直碰撞响应一帧 | 玩家底部贴齐地面顶部；`vy = 0`；`grounded = true` |
| TC-COL-04 | 玩家上升，头顶有格子，`vy < 0` | 垂直碰撞响应一帧 | 玩家顶部贴齐格子底部；`vy = 0`（顶头失速） |
| TC-COL-05 | 玩家落地后新逻辑帧开始 | 重置本帧接地状态 | `grounded = false`（须在垂直碰撞前重置，保证空中无法起跳） |
| TC-COL-06 | 玩家下落中与敌人相交，玩家底部 ≤ 敌人顶部 + `ENEMY_STOMP_THRESHOLD` | 踩踏判定 | 返回踩踏（stomp）为真 |
| TC-COL-07 | 玩家与敌人相交但 `vy ≤ 0`；或底部远低于敌人顶部 | 踩踏判定 | 返回踩踏为假（应走受伤逻辑） |
| TC-COL-08 | 玩家与金币相交 / 不相交 | 拾取判定 | 相交为真，不相交为假 |
| TC-COL-09 | 玩家与旗帜区域相交 / 不相交 | 通关判定 | 相交为真，不相交为假 |

## 3. 玩家模块 — tests/player.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-PLR-01 | 地面，无其他阻挡 | 按住「右」更新一帧 | `vx = +MOVE_SPEED`，`x` 增加 |
| TC-PLR-02 | 地面 | 按住「左」更新一帧，随后松开更新一帧 | `vx = -MOVE_SPEED`；松开后 `vx = 0` |
| TC-PLR-03 | 玩家接地 | 触发一次跳跃并更新一帧 | `vy = JUMP_VELOCITY`（起跳）；随后 `grounded = false` |
| TC-PLR-04 | 玩家在空中（`grounded = false`） | 触发跳跃 | `vy` 不被设置为 `JUMP_VELOCITY`（不可二段跳） |
| TC-PLR-05 | 跳跃为边沿触发 | 不触发跳跃持续按住更新两帧 | 只有触发的第一帧起跳，之后不重复起跳 |
| TC-PLR-06 | 玩家 `invincible = INVINCIBLE_TIME` | 连续更新多帧 | 无敌时间逐帧递减至 0，期间 `isInvincible()` 为真、归零后为假 |
| TC-PLR-07 | 玩家踩踏敌人 | 踩踏响应 | `vy = STOMP_BOUNCE`（反弹向上） |

## 4. 敌人模块 — tests/enemy.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-ENM-01 | 平地，敌人朝左 | 更新一帧 | `x` 减少 `ENEMY_SPEED * dt`（匀速巡逻） |
| TC-ENM-02 | 敌人前方一格有墙 | 更新一帧 | 方向反转（原朝左变朝右），不再穿墙 |
| TC-ENM-03 | 敌人前方是悬崖（前进方向脚下一格无地面） | 更新一帧 | 方向反转，不走出平台 |
| TC-ENM-04 | 敌人死亡标记 | 被踩踏后标记为死亡 | 游戏更新时被移除，不再参与碰撞 |

## 5. 关卡模块 — tests/level.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-LVL-01 | 合法的 17×100 ASCII 地图 | 解析 | `rows = 17`、`cols = 100`、`widthPx = 3200`、`heightPx = 544` |
| TC-LVL-02 | 地图含若干 `#` | 解析后查询 | `isSolid(col,row)` 在 `#` 处为真，在空地处为假 |
| TC-LVL-03 | 地图含 `C`/`E`/`P`/`F` | 解析 | 金币/敌人坐标与数量正确；玩家出生点、旗帜区域坐标正确 |
| TC-LVL-04 | 某行不足 100 字符 | 解析 | 自动补空格，不报错 |
| TC-LVL-05 | 任意关卡 | 像素坐标查询 | `isSolidPx(x,y)` 正确；关卡范围外坐标返回 false |
| TC-LVL-06 | 三关内置数据 `LEVELS` | 校验 | 每关恰好 1 个出生点、1 个旗帜；至少 1 个金币、1 个敌人 |

## 6. 游戏状态机模块 — tests/game.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-GAM-01 | 新建游戏 | 检查初始值 | `state = TITLE`、`lives = START_LIVES`、`score = 0`、`levelIndex = 0` |
| TC-GAM-02 | TITLE 状态 | 调用开始 | `state = PLAYING`，加载第 1 关，生命/分数重置 |
| TC-GAM-03 | PLAYING，玩家与金币相交 | 更新一帧 | 分数 +100，金币从关卡移除 |
| TC-GAM-04 | PLAYING，踩踏敌人 | 更新一帧 | 分数 +100，敌人移除，玩家获得反弹 |
| TC-GAM-05 | PLAYING，非无敌状态侧碰敌人 | 更新一帧 | 生命 -1，进入无敌（`isInvincible()` 为真） |
| TC-GAM-06 | PLAYING，无敌状态碰敌人 | 更新一帧 | 生命不变，分数不变 |
| TC-GAM-07 | 生命 = 1，非无敌侧碰敌人 | 更新一帧 | 生命 = 0，`state = GAME_OVER` |
| TC-GAM-08 | 生命 = 3，玩家坠落深渊 | 触发坠落死亡 | 生命 = 2；玩家回到出生点；敌人、金币复位；分数保留；`state` 仍为 PLAYING |
| TC-GAM-09 | 生命 = 1，玩家坠落深渊 | 触发坠落死亡 | 生命 = 0，`state = GAME_OVER` |
| TC-GAM-10 | 第 1 关，玩家碰旗 | 触发通关 | 分数 += 剩余生命 × 200；`state = LEVEL_CLEAR`；推进 `LEVEL_CLEAR_PAUSE` 时长后进入第 2 关且 `state = PLAYING` |
| TC-GAM-11 | 第 3 关，玩家碰旗 | 触发通关并推进停留时长 | `state = VICTORY`（分数含通关奖励） |
| TC-GAM-12 | GAME_OVER 或 VICTORY | 调用开始操作 | `state = TITLE` |
| TC-GAM-13 | LEVEL_CLEAR 停留期间 | 更新若干帧 | 玩家与敌人位置不再变化（世界冻结） |
| TC-GAM-14 | 坠落重生后 | 无敌时间为 0 检查 | 重生不额外赠送无敌（保持 0 或原值） |

## 7. 镜头模块 — tests/camera.test.js

| 用例 ID | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- |
| TC-CAM-01 | 玩家在关卡中部 | 更新镜头 | `x = 玩家中心x - VIEW_WIDTH/2` |
| TC-CAM-02 | 玩家在关卡最左侧 | 更新镜头 | `x = 0`（左边界钳制） |
| TC-CAM-03 | 玩家在关卡最右侧 | 更新镜头 | `x = 关卡像素宽 - VIEW_WIDTH`（右边界钳制） |
| TC-CAM-04 | 任意位置 | 更新镜头 | 垂直方向恒为 0（无垂直滚动） |

---

## 8. 执行方式

```bash
npm run test          # 运行全部测试（CI 风格，单次）
npm run test:watch    # 监听模式
```

- 所有测试必须在 Node 环境运行，不得依赖浏览器 API。
- 测试通过标准：`npx vitest run` 退出码为 0，无失败、无跳过（skip）。
- 渲染层（`src/game/`）不写自动化测试，通过人工验收（`npm run dev`）。
