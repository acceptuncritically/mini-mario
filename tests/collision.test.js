import { describe, it, expect } from 'vitest';
import {
  resetGrounded, moveX, moveY, isStomp, coinHit, flagHit,
} from '../src/core/collision.js';
import {
  TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT, ENEMY_SIZE, ENEMY_STOMP_THRESHOLD,
  COIN_SIZE, MOVE_SPEED, FIXED_DT,
} from '../src/core/constants.js';
import { makeLevel } from './helpers.js';

describe('collision 碰撞模块', () => {
  it('TC-COL-01 水平碰撞响应：玩家右侧有墙且 vx>0，右边贴齐墙左边界，不再进入墙内', () => {
    // 墙：第 4 列（128..160），覆盖玩家所在行
    const level = makeLevel([
      '    ####'.padEnd(100, '.'),
      '    ####'.padEnd(100, '.'),
    ]);
    const player = {
      x: 100, y: 0, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vx: MOVE_SPEED, vy: 0,
    };
    moveX(player, level, FIXED_DT);
    const wallLeft = 4 * TILE_SIZE;
    expect(player.x + player.w).toBe(wallLeft); // 右边贴齐墙左边界
    expect(player.x + player.w).toBeLessThanOrEqual(wallLeft); // 未穿入墙内
  });

  it('TC-COL-02 水平碰撞响应：玩家左侧有墙且 vx<0，左边贴齐墙右边界', () => {
    // 墙：第 3 列（96..128），覆盖玩家所在行
    const level = makeLevel([
      '   #'.padEnd(100, '.'),
      '   #'.padEnd(100, '.'),
    ]);
    const player = {
      x: 100, y: 0, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vx: -MOVE_SPEED, vy: 0,
    };
    moveX(player, level, FIXED_DT);
    const wallRight = 4 * TILE_SIZE;
    expect(player.x).toBe(wallRight); // 左边贴齐墙右边界
  });

  it('TC-COL-03 垂直碰撞响应：下落撞到地面顶部，底部贴齐、vy=0、grounded=true', () => {
    // 地面：第 4 行（顶部 128）
    const level = makeLevel([
      '', '', '', '',
      '##'.padEnd(100, '.'),
    ]);
    const player = {
      x: 0, y: 100, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vx: 0, vy: 300, grounded: false,
    };
    moveY(player, level, FIXED_DT);
    const groundTop = 4 * TILE_SIZE;
    expect(player.y).toBe(groundTop - PLAYER_HEIGHT);
    expect(player.vy).toBe(0);
    expect(player.grounded).toBe(true);
  });

  it('TC-COL-04 垂直碰撞响应：上升顶到格子底部，顶部贴齐、vy=0（顶头失速）', () => {
    // 天花板：第 5 行（底部 192）
    const level = makeLevel([
      '', '', '', '', '',
      '##'.padEnd(100, '.'),
    ]);
    const player = {
      x: 0, y: 196, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vx: 0, vy: -300, grounded: false,
    };
    moveY(player, level, FIXED_DT);
    const ceilingBottom = 6 * TILE_SIZE;
    expect(player.y).toBe(ceilingBottom);
    expect(player.vy).toBe(0);
  });

  it('TC-COL-05 每帧开始重置接地状态：grounded 被置为 false（在垂直碰撞前重置）', () => {
    const player = { grounded: true };
    resetGrounded(player);
    expect(player.grounded).toBe(false);
  });

  it('TC-COL-06 踩踏判定：下落中与敌人相交且底部 ≤ 敌人顶部 + 阈值，返回 stomp 为真', () => {
    const player = {
      x: 0, y: -10, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vy: 300,
    };
    const enemy = { x: 0, y: 20, w: ENEMY_SIZE, h: ENEMY_SIZE };
    // 玩家底部 = -10 + 36 = 26 ≤ 20 + 12 = 32
    expect(player.y + player.h).toBeLessThanOrEqual(enemy.y + ENEMY_STOMP_THRESHOLD);
    expect(isStomp(player, enemy)).toBe(true);
  });

  it('TC-COL-07 踩踏判定：vy ≤ 0 或底部远低于敌人顶部，返回 stomp 为假', () => {
    const enemy = { x: 0, y: 20, w: ENEMY_SIZE, h: ENEMY_SIZE };
    // vy = 0（水平/静止接触）
    const horizontal = {
      x: 0, y: -10, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vy: 0,
    };
    expect(isStomp(horizontal, enemy)).toBe(false);
    // 底部远低于敌人顶部（侧碰在敌人中下部）
    const deep = {
      x: 0, y: 10, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vy: 300,
    };
    expect(deep.y + deep.h).toBeGreaterThan(enemy.y + ENEMY_STOMP_THRESHOLD);
    expect(isStomp(deep, enemy)).toBe(false);
  });

  it('TC-COL-08 金币拾取判定：玩家与金币相交为真，不相交为假', () => {
    const player = {
      x: 100, y: 100, w: PLAYER_WIDTH, h: PLAYER_HEIGHT,
    };
    // 金币中心与玩家中心重合 -> 相交
    const overlappingCoin = {
      x: 100 + PLAYER_WIDTH / 2, y: 100 + PLAYER_HEIGHT / 2,
    };
    expect(coinHit(player, overlappingCoin)).toBe(true);
    // 金币远离玩家 -> 不相交
    const farCoin = { x: 1000, y: 1000 };
    expect(coinHit(player, farCoin)).toBe(false);
  });

  it('TC-COL-09 通关判定：玩家与旗帜区域相交为真，不相交为假', () => {
    const flag = { x: 320, y: 320, w: TILE_SIZE, h: TILE_SIZE };
    const onFlag = { x: 320, y: 320, w: PLAYER_WIDTH, h: PLAYER_HEIGHT };
    expect(flagHit(onFlag, flag)).toBe(true);
    const far = { x: 0, y: 0, w: PLAYER_WIDTH, h: PLAYER_HEIGHT };
    expect(flagHit(far, flag)).toBe(false);
  });
});
