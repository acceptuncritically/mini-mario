// mini-mario 全局常量（SPEC v2 第 4 节）
// 所有数值常量集中定义，测试与实现必须引用同一份常量。

export const TILE_SIZE = 32;          // 格子边长 (px)
export const VIEW_WIDTH = 960;        // 逻辑视口宽 (px)
export const VIEW_HEIGHT = 544;       // 逻辑视口高 (px) = 17 行格子
export const LEVEL_ROWS = 17;         // 关卡行数
export const LEVEL_WIDTH_TILES = 200; // 关卡列数（v2 单长关）

export const GRAVITY = 1600;          // 重力加速度 (px/s²)
export const MAX_FALL_SPEED = 950;    // 最大下落速度 (px/s)
export const MOVE_SPEED = 260;        // 水平移动速度 (px/s)
export const JUMP_VELOCITY = -640;    // 起跳初速度 (y 向上为负)
export const JUMP_CUT_FACTOR = 0.45;  // 可变跳：上升中松开跳键 vy 乘此系数（单次）
export const COYOTE_TIME = 0.10;      // 土狼时间 (s)：离开平台边缘后仍可起跳的窗口
export const JUMP_BUFFER_TIME = 0.12; // 跳跃缓冲 (s)：空中按跳，落地瞬间自动起跳
export const STOMP_BOUNCE = -380;     // 踩死敌人后的反弹速度
export const KNOCKBACK_SPEED = 220;   // 受伤击退水平速度 (px/s)
export const HURT_KNOCKBACK_VY = -260;// 受伤击退垂直速度（小幅弹起）

export const PLAYER_WIDTH = 28;       // 玩家碰撞盒宽 (px)
export const PLAYER_HEIGHT = 36;      // 玩家碰撞盒高 (px)
export const ENEMY_SIZE = 32;         // 敌人碰撞盒边长 (px)
export const ENEMY_SPEED = 90;        // 敌人巡逻速度 (px/s)（v2 提速）
export const ENEMY_STOMP_THRESHOLD = 12; // 踩踏判定阈值 (px)
export const COIN_SIZE = 24;          // 金币碰撞盒边长 (px)
export const SPIKE_W = 26;            // 钉刺碰撞盒宽 (px)
export const SPIKE_H = 18;            // 钉刺碰撞盒高 (px)
export const SPIKE_OFFSET_Y = 14;     // 钉刺碰撞盒距所在格顶部的偏移 (px)

export const INVINCIBLE_TIME = 1.5;   // 受伤无敌时长 (s)
export const COIN_SCORE = 100;        // 金币得分
export const STOMP_SCORE = 100;       // 踩敌得分
export const CLEAR_BASE_BONUS = 1500; // 通关基础奖励
export const CLEAR_DEATH_PENALTY = 300; // 每次死亡扣除的奖励
export const CLEAR_MIN_BONUS = 300;   // 通关奖励下限
export const LEVEL_CLEAR_PAUSE = 1.5; // 通关画面停留时长 (s)
export const PIT_DEATH_MARGIN = 64;   // 坠落死亡判定边距 (px)

export const FIXED_DT = 1 / 60;       // 固定逻辑帧长 (s)
export const HIGH_SCORE_KEY = 'mini-mario-highscore'; // localStorage 键名

// 游戏状态机状态（SPEC v2 5.7；GAME_OVER 已移除）
export const STATE_TITLE = 'TITLE';
export const STATE_PLAYING = 'PLAYING';
export const STATE_PAUSED = 'PAUSED';
export const STATE_LEVEL_CLEAR = 'LEVEL_CLEAR';
export const STATE_VICTORY = 'VICTORY';
