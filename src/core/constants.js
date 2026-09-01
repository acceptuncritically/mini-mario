// mini-mario 全局常量（SPEC 第 4 节）
// 所有数值常量集中定义，测试与实现必须引用同一份常量。

export const TILE_SIZE = 32;          // 格子边长 (px)
export const VIEW_WIDTH = 960;        // 逻辑视口宽 (px)
export const VIEW_HEIGHT = 544;       // 逻辑视口高 (px) = 17 行格子
export const LEVEL_ROWS = 17;         // 关卡行数
export const LEVEL_WIDTH_TILES = 100; // 关卡列数

export const GRAVITY = 1600;          // 重力加速度 (px/s²)
export const MAX_FALL_SPEED = 950;    // 最大下落速度 (px/s)
export const MOVE_SPEED = 260;        // 水平移动速度 (px/s)
export const JUMP_VELOCITY = -640;    // 起跳初速度 (y 向上为负)
export const STOMP_BOUNCE = -380;     // 踩死敌人后的反弹速度

export const PLAYER_WIDTH = 28;       // 玩家碰撞盒宽 (px)
export const PLAYER_HEIGHT = 36;      // 玩家碰撞盒高 (px)
export const ENEMY_SIZE = 32;         // 敌人碰撞盒边长 (px)
export const ENEMY_SPEED = 60;        // 敌人巡逻速度 (px/s)
export const ENEMY_STOMP_THRESHOLD = 12; // 踩踏判定阈值 (px)
export const COIN_SIZE = 24;          // 金币碰撞盒边长 (px)

export const INVINCIBLE_TIME = 1.5;   // 受伤无敌时长 (s)
export const START_LIVES = 3;         // 初始生命数
export const COIN_SCORE = 100;        // 金币得分
export const STOMP_SCORE = 100;       // 踩敌得分
export const LIFE_BONUS = 200;        // 通关时每条剩余生命的奖励分
export const LEVEL_CLEAR_PAUSE = 1.5; // 通关画面停留时长 (s)
export const PIT_DEATH_MARGIN = 64;   // 坠落死亡判定边距 (px)

export const FIXED_DT = 1 / 60;       // 固定逻辑帧长 (s)

// 游戏状态机状态（SPEC 5.7）
export const STATE_TITLE = 'TITLE';
export const STATE_PLAYING = 'PLAYING';
export const STATE_LEVEL_CLEAR = 'LEVEL_CLEAR';
export const STATE_VICTORY = 'VICTORY';
export const STATE_GAME_OVER = 'GAME_OVER';
