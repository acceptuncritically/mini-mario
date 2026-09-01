import { describe, it, expect } from 'vitest';
import { Game } from '../src/core/game.js';
import {
  START_LIVES, COIN_SCORE, STOMP_SCORE, LIFE_BONUS, LEVEL_CLEAR_PAUSE,
  INVINCIBLE_TIME, PLAYER_WIDTH, PLAYER_HEIGHT, FIXED_DT,
  STATE_TITLE, STATE_PLAYING, STATE_LEVEL_CLEAR, STATE_VICTORY, STATE_GAME_OVER,
} from '../src/core/constants.js';
import { isInvincible } from '../src/core/player.js';

const noInput = {
  isLeft: () => false,
  isRight: () => false,
  consumeJump: () => false,
};

const jumpOnceInput = {
  isLeft: () => false,
  isRight: () => false,
  consumeJump: () => true,
};

describe('game 游戏状态机模块', () => {
  it('TC-GAM-01 新建游戏：state = TITLE、lives = START_LIVES、score = 0、levelIndex = 0', () => {
    const game = new Game();
    expect(game.state).toBe(STATE_TITLE);
    expect(game.lives).toBe(START_LIVES);
    expect(game.score).toBe(0);
    expect(game.levelIndex).toBe(0);
  });

  it('TC-GAM-02 TITLE 状态调用开始：state = PLAYING，加载第 1 关，生命/分数重置', () => {
    const game = new Game();
    game.lives = 1;
    game.score = 999;
    game.start();
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.levelIndex).toBe(0);
    expect(game.lives).toBe(START_LIVES);
    expect(game.score).toBe(0);
    expect(game.player).not.toBeNull();
    expect(game.enemies.length).toBeGreaterThan(0);
  });

  it('TC-GAM-03 PLAYING 玩家与金币相交：分数 +100，金币从关卡移除', () => {
    const game = new Game();
    game.start();
    const before = game.coins.length;
    const coin = game.coins[0];
    game.player.x = coin.x - PLAYER_WIDTH / 2;
    game.player.y = coin.y - PLAYER_HEIGHT / 2;
    game.update(noInput, FIXED_DT);
    expect(game.score).toBe(COIN_SCORE);
    expect(game.coins.length).toBe(before - 1);
  });

  it('TC-GAM-04 PLAYING 踩踏敌人：分数 +100，敌人移除，玩家获得反弹', () => {
    const game = new Game();
    game.start();
    const enemy = game.enemies[0];
    game.player.x = enemy.x;
    game.player.y = enemy.y - 30;
    game.player.vy = 300;
    game.player.grounded = false;
    game.update(noInput, FIXED_DT);
    expect(game.score).toBe(STOMP_SCORE);
    expect(game.enemies.includes(enemy)).toBe(false);
    expect(game.player.vy).toBe(-380); // STOMP_BOUNCE
  });

  it('TC-GAM-05 PLAYING 非无敌状态侧碰敌人：生命 -1，进入无敌', () => {
    const game = new Game();
    game.start();
    const enemy = game.enemies[0];
    game.player.x = enemy.x - PLAYER_WIDTH + 1; // 侧边重叠
    game.player.y = enemy.y - 4;                // 底部远低于敌人顶部（非踩踏）
    game.player.grounded = true;
    game.update(noInput, FIXED_DT);
    expect(game.lives).toBe(START_LIVES - 1);
    expect(isInvincible(game.player)).toBe(true);
    expect(game.score).toBe(0);
  });

  it('TC-GAM-06 PLAYING 无敌状态碰敌人：生命不变，分数不变', () => {
    const game = new Game();
    game.start();
    const enemy = game.enemies[0];
    game.player.invincible = INVINCIBLE_TIME;
    game.player.x = enemy.x - PLAYER_WIDTH + 1;
    game.player.y = enemy.y - 4;
    game.player.grounded = true;
    game.update(noInput, FIXED_DT);
    expect(game.lives).toBe(START_LIVES);
    expect(game.score).toBe(0);
    expect(game.player.invincible).toBeGreaterThan(0);
  });

  it('TC-GAM-07 生命 = 1 时非无敌侧碰敌人：生命 = 0，state = GAME_OVER', () => {
    const game = new Game();
    game.start();
    game.lives = 1;
    const enemy = game.enemies[0];
    game.player.x = enemy.x - PLAYER_WIDTH + 1;
    game.player.y = enemy.y - 4;
    game.player.grounded = true;
    game.update(noInput, FIXED_DT);
    expect(game.lives).toBe(0);
    expect(game.state).toBe(STATE_GAME_OVER);
  });

  it('TC-GAM-08 生命 = 3 坠落深渊：生命 = 2，回到出生点，敌人金币复位，分数保留，仍为 PLAYING', () => {
    const game = new Game();
    game.start();
    game.score = 150;
    const spawn = game.level.playerSpawn;
    const coinCount = game.coins.length;
    const enemyCount = game.enemies.length;
    game.player.x = 30 * 32; // 深渊列（第 1 关 29..31 列为深渊）
    game.player.y = game.level.heightPx + 64 + 10; // 超过坠落判定线
    game.update(noInput, FIXED_DT);
    expect(game.lives).toBe(START_LIVES - 1);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.player.x).toBe(spawn.x);
    expect(game.player.y).toBe(spawn.y);
    expect(game.coins.length).toBe(coinCount);
    expect(game.enemies.length).toBe(enemyCount);
    expect(game.score).toBe(150);
  });

  it('TC-GAM-09 生命 = 1 坠落深渊：生命 = 0，state = GAME_OVER', () => {
    const game = new Game();
    game.start();
    game.lives = 1;
    game.player.x = 30 * 32;
    game.player.y = game.level.heightPx + 64 + 10;
    game.update(noInput, FIXED_DT);
    expect(game.lives).toBe(0);
    expect(game.state).toBe(STATE_GAME_OVER);
  });

  it('TC-GAM-10 第 1 关碰旗：加分 = 剩余生命 × LIFE_BONUS，LEVEL_CLEAR 停留后进入第 2 关 PLAYING', () => {
    const game = new Game();
    game.start();
    const flag = game.level.flag;
    game.player.x = flag.x;
    game.player.y = flag.y;
    game.update(noInput, FIXED_DT);
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
    expect(game.score).toBe(START_LIVES * LIFE_BONUS);
    // 推进 LEVEL_CLEAR_PAUSE 时长（91 帧 > 90 帧）
    for (let i = 0; i < 91; i += 1) {
      game.update(noInput, FIXED_DT);
    }
    expect(game.levelIndex).toBe(1);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.score).toBe(START_LIVES * LIFE_BONUS); // 分数延续
  });

  it('TC-GAM-11 第 3 关碰旗并推进停留时长：state = VICTORY（分数含通关奖励）', () => {
    const game = new Game();
    game.start();
    game.levelIndex = 2;
    game.loadLevel(2);
    game.state = STATE_PLAYING;
    const flag = game.level.flag;
    game.player.x = flag.x;
    game.player.y = flag.y;
    game.update(noInput, FIXED_DT);
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
    expect(game.score).toBe(START_LIVES * LIFE_BONUS);
    for (let i = 0; i < 91; i += 1) {
      game.update(noInput, FIXED_DT);
    }
    expect(game.state).toBe(STATE_VICTORY);
    expect(game.score).toBe(START_LIVES * LIFE_BONUS);
  });

  it('TC-GAM-12 GAME_OVER 或 VICTORY 调用开始操作：state = TITLE', () => {
    const game = new Game();
    game.start();
    game.state = STATE_GAME_OVER;
    game.update(jumpOnceInput, FIXED_DT);
    expect(game.state).toBe(STATE_TITLE);
    game.state = STATE_VICTORY;
    game.update(jumpOnceInput, FIXED_DT);
    expect(game.state).toBe(STATE_TITLE);
  });

  it('TC-GAM-13 LEVEL_CLEAR 停留期间世界冻结：玩家与敌人位置不再变化', () => {
    const game = new Game();
    game.start();
    const flag = game.level.flag;
    game.player.x = flag.x;
    game.player.y = flag.y;
    game.update(noInput, FIXED_DT);
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
    const px = game.player.x;
    const py = game.player.y;
    const ex = game.enemies[0].x;
    for (let i = 0; i < 5; i += 1) {
      game.update(noInput, FIXED_DT);
    }
    expect(game.state).toBe(STATE_LEVEL_CLEAR);
    expect(game.player.x).toBe(px);
    expect(game.player.y).toBe(py);
    expect(game.enemies[0].x).toBe(ex);
  });

  it('TC-GAM-14 坠落重生后：重生不额外赠送无敌（无敌时间保持 0）', () => {
    const game = new Game();
    game.start();
    game.lives = 2;
    game.player.x = 30 * 32;
    game.player.y = game.level.heightPx + 64 + 10;
    expect(game.player.invincible).toBe(0);
    game.update(noInput, FIXED_DT);
    expect(game.state).toBe(STATE_PLAYING);
    expect(game.player.invincible).toBe(0);
  });
});
