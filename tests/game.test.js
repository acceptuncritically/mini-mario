import { describe, it, expect } from 'vitest';
import { Game } from '../src/core/game.js';
import {
  COIN_SCORE, STOMP_SCORE, CLEAR_BASE_BONUS, CLEAR_DEATH_PENALTY, CLEAR_MIN_BONUS,
  LEVEL_CLEAR_PAUSE, INVINCIBLE_TIME, KNOCKBACK_SPEED, FIXED_DT,
  STATE_TITLE, STATE_PLAYING, STATE_PAUSED, STATE_LEVEL_CLEAR, STATE_VICTORY,
} from '../src/core/constants.js';
import { isInvincible } from '../src/core/player.js';
import { noInput, onceInput } from './helpers.js';

// 内置地图关键坐标（与 src/core/level.js 的 LEVEL1 一致）
const SPAWN = { x: 64, y: 448 };          // P col 2
const FLAG = { x: 6240, y: 448 };         // F col 195
const CHECKPOINT_1 = { x: 66 * 32, y: 448 }; // K1 col 66
const PIT_COL = 21;                       // 深渊 20-22
const SPIKE_X = 36 * 32;                  // 钉刺组 36-37 的第一格
const FIRST_COIN = { x: 8 * 32 + 16, y: 13 * 32 + 16 }; // (272, 432)
const ENEMY_COL_26 = { x: 26 * 32, y: 448 };

describe('game 游戏状态机模块（v2）', () => {
  it('TC-GAM-01 新建游戏：TITLE / 0 分 / 0 死亡 / 最高分来自存储，无 lives 字段', () => {
    const game = new Game();
    expect(game.state).toBe(STATE_TITLE);
    expect(game.score).toBe(0);
    expect(game.deaths).toBe(0);
    expect(game.highScore).toBe(0);
    expect('lives' in game).toBe(false);

    const withScore = new Game({ loadScore: () => 777 });
    expect(withScore.highScore).toBe(777);
  });

  it('TC-GAM-02 TITLE 开始操作：PLAYING，玩家在出生点，分数/死亡/检查点重置，事件含 start', () => {
    const game = new Game();
    game.update(onceInput({ jump: true }), FIXED_DT);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.player.x).toBe(SPAWN.x);
    expect(game.player.y).toBe(SPAWN.y);
    expect(game.score).toBe(0);
    expect(game.deaths).toBe(0);
    expect(game.activeCheckpoint).toBe(0);
    expect(game.checkpoints).toHaveLength(3);
    expect(game.events).toContain('start');
  });

  it('TC-GAM-03 玩家与金币相交：分数 +100，金币移除，事件含 coin', () => {
    const game = new Game();
    game.start();
    const before = game.coins.length;
    game.player.x = FIRST_COIN.x - 14;
    game.player.y = FIRST_COIN.y - 18;
    game.update(noInput(), FIXED_DT);
    expect(game.score).toBe(COIN_SCORE);
    expect(game.coins.length).toBe(before - 1);
    expect(game.events).toContain('coin');
  });

  it('TC-GAM-04 踩踏敌人：分数 +100，敌人移除，玩家反弹，事件含 stomp', () => {
    const game = new Game();
    game.start();
    const enemy = game.enemies[0]; // col 26
    game.player.x = enemy.x;
    game.player.y = enemy.y - 30;
    game.player.vy = 300;
    game.player.grounded = false;
    game.update(noInput(), FIXED_DT);
    expect(game.score).toBe(STOMP_SCORE);
    expect(game.enemies.includes(enemy)).toBe(false);
    expect(game.player.vy).toBe(-380); // STOMP_BOUNCE
    expect(game.events).toContain('stomp');
  });

  it('TC-GAM-05 非无敌侧碰敌人（敌人在左侧）：不死亡，无敌 + 向右击退，事件含 hurt', () => {
    const game = new Game();
    game.start();
    const enemy = game.enemies[0]; // (832, 448)
    game.player.x = enemy.x + 32 - 1; // 右侧重叠 1px
    game.player.y = enemy.y - 4;
    game.player.grounded = true;
    game.update(noInput(), FIXED_DT);
    expect(game.deaths).toBe(0);
    expect(isInvincible(game.player)).toBe(true);
    expect(game.player.vx).toBe(KNOCKBACK_SPEED); // 敌人在左 → 向右击退
    expect(game.score).toBe(0);
    expect(game.events).toContain('hurt');
  });

  it('TC-GAM-06 无敌状态碰敌人：无受伤、无击退、无 hurt 事件', () => {
    const game = new Game();
    game.start();
    const enemy = game.enemies[0];
    game.player.invincible = INVINCIBLE_TIME;
    game.player.x = enemy.x + 32 - 1;
    game.player.y = enemy.y - 4;
    game.player.grounded = true;
    game.update(noInput(), FIXED_DT);
    expect(game.deaths).toBe(0);
    expect(game.score).toBe(0);
    expect(game.player.vx).toBe(0);
    expect(game.events).not.toContain('hurt');
  });

  it('TC-GAM-07 坠落深渊：deaths=1，回出生点，实体复位，分数保留，事件含 death', () => {
    const game = new Game();
    game.start();
    game.score = 150;
    const coinCount = game.coins.length;
    const enemyCount = game.enemies.length;
    game.player.x = PIT_COL * 32;
    game.player.y = game.level.heightPx + 74;
    game.update(noInput(), FIXED_DT);
    expect(game.deaths).toBe(1);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.player.x).toBe(SPAWN.x);
    expect(game.player.y).toBe(SPAWN.y);
    expect(game.coins.length).toBe(coinCount);
    expect(game.enemies.length).toBe(enemyCount);
    expect(game.score).toBe(150);
    expect(game.events).toContain('death');
  });

  it('TC-GAM-08 踩钉刺：deaths=1，回最近检查点（初始为出生点），事件含 death', () => {
    const game = new Game();
    game.start();
    game.player.x = SPIKE_X;
    game.player.y = 448;
    game.update(noInput(), FIXED_DT);
    expect(game.deaths).toBe(1);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.player.x).toBe(SPAWN.x);
    expect(game.player.y).toBe(SPAWN.y);
    expect(game.events).toContain('death');
  });

  it('TC-GAM-09 经过中途检查点：激活（事件 checkpoint），此后死亡回到该检查点', () => {
    const game = new Game();
    game.start();
    // 经过 K1（col 66）
    game.player.x = CHECKPOINT_1.x;
    game.player.y = CHECKPOINT_1.y;
    game.update(noInput(), FIXED_DT);
    expect(game.activeCheckpoint).toBe(1);
    expect(game.events).toContain('checkpoint');
    // 掉进 K1 右侧深渊（70-72）
    game.player.x = 70 * 32;
    game.player.y = game.level.heightPx + 74;
    game.update(noInput(), FIXED_DT);
    expect(game.deaths).toBe(1);
    expect(game.player.x).toBe(CHECKPOINT_1.x);
    expect(game.player.y).toBe(CHECKPOINT_1.y);
  });

  it('TC-GAM-10 碰旗（deaths=2）：奖励 = max(300, 1500-2×300)=900，进入 LEVEL_CLEAR，事件含 flag', () => {
    const game = new Game();
    game.start();
    game.deaths = 2;
    game.player.x = FLAG.x;
    game.player.y = FLAG.y;
    game.update(noInput(), FIXED_DT);
    expect(game.score).toBe(CLEAR_BASE_BONUS - 2 * CLEAR_DEATH_PENALTY);
    expect(game.score).toBe(900);
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
    expect(game.events).toContain('flag');
  });

  it('TC-GAM-11 LEVEL_CLEAR 停留后：VICTORY，最高分更新并保存，事件含 victory', () => {
    let saved = -1;
    const game = new Game({ loadScore: () => 100, saveScore: (n) => { saved = n; } });
    game.start();
    game.deaths = 2;
    game.player.x = FLAG.x;
    game.player.y = FLAG.y;
    game.update(noInput(), FIXED_DT);
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
    for (let i = 0; i < Math.ceil(LEVEL_CLEAR_PAUSE / FIXED_DT) + 1; i += 1) {
      game.update(noInput(), FIXED_DT);
    }
    expect(game.state).toBe(STATE_VICTORY);
    expect(game.score).toBe(900);
    expect(game.highScore).toBe(900);
    expect(saved).toBe(900);
    expect(game.events).toContain('victory');
  });

  it('TC-GAM-12 VICTORY 开始操作：回到 TITLE', () => {
    const game = new Game();
    game.start();
    game.state = STATE_VICTORY;
    game.update(onceInput({ jump: true }), FIXED_DT);
    expect(game.state).toBe(STATE_TITLE);
  });

  it('TC-GAM-13 暂停：PLAYING → PAUSED（事件 pause），期间玩家/敌人/计时器完全冻结', () => {
    const game = new Game();
    game.start();
    game.update(onceInput({ pause: true }), FIXED_DT);
    expect(game.state).toBe(STATE_PAUSED);
    expect(game.events).toContain('pause');
    const px = game.player.x;
    const py = game.player.y;
    const pvx = game.player.vx;
    const pvy = game.player.vy;
    const ex = game.enemies[0].x;
    const inv = game.player.invincible;
    for (let i = 0; i < 30; i += 1) {
      game.update(noInput(), FIXED_DT);
    }
    expect(game.state).toBe(STATE_PAUSED);
    expect(game.player.x).toBe(px);
    expect(game.player.y).toBe(py);
    expect(game.player.vx).toBe(pvx);
    expect(game.player.vy).toBe(pvy);
    expect(game.enemies[0].x).toBe(ex);
    expect(game.player.invincible).toBe(inv);
  });

  it('TC-GAM-14 暂停边沿：PAUSED → PLAYING（事件 resume）', () => {
    const game = new Game();
    game.start();
    game.update(onceInput({ pause: true }), FIXED_DT);
    game.update(onceInput({ pause: true }), FIXED_DT);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.events).toContain('resume');
  });

  it('TC-GAM-15 暂停中重新开始：分数/死亡/检查点重置，回出生点，事件含 start', () => {
    const game = new Game();
    game.start();
    game.score = 999;
    game.deaths = 5;
    game.update(onceInput({ pause: true }), FIXED_DT);
    game.update(onceInput({ jump: true }), FIXED_DT); // 暂停中的跳跃边沿 = 重新开始
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.score).toBe(0);
    expect(game.deaths).toBe(0);
    expect(game.activeCheckpoint).toBe(0);
    expect(game.player.x).toBe(SPAWN.x);
    expect(game.player.y).toBe(SPAWN.y);
    expect(game.events).toContain('start');
  });

  it('TC-GAM-16 通关奖励下限：deaths=10 时奖励 = CLEAR_MIN_BONUS(300)', () => {
    const game = new Game();
    game.start();
    game.deaths = 10;
    game.player.x = FLAG.x;
    game.player.y = FLAG.y;
    game.update(noInput(), FIXED_DT);
    expect(CLEAR_BASE_BONUS - 10 * CLEAR_DEATH_PENALTY).toBeLessThan(CLEAR_MIN_BONUS);
    expect(game.score).toBe(CLEAR_MIN_BONUS);
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
  });
});
