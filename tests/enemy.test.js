import { describe, it, expect } from 'vitest';
import { createEnemy, updateEnemy } from '../src/core/enemy.js';
import { Game } from '../src/core/game.js';
import {
  ENEMY_SPEED, ENEMY_SIZE, FIXED_DT,
} from '../src/core/constants.js';
import { makeLevel } from './helpers.js';

const noInput = {
  isLeft: () => false,
  isRight: () => false,
  consumeJump: () => false,
};

describe('enemy 敌人模块', () => {
  it('TC-ENM-01 平地巡逻：朝左匀速移动，x 减少 ENEMY_SPEED * dt', () => {
    // 平坦地面（第 15/16 行），敌人站在第 14 行地面之上
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '#'.repeat(100),
      '#'.repeat(100),
    ]);
    const enemy = createEnemy(100, 15 * 32 - ENEMY_SIZE); // 底部贴齐第 15 行地面顶部
    updateEnemy(enemy, level, FIXED_DT);
    expect(enemy.x).toBeCloseTo(100 - ENEMY_SPEED * FIXED_DT, 5);
    expect(enemy.vx).toBeLessThan(0); // 保持朝左
  });

  it('TC-ENM-02 撞墙转身：前方一格有墙，方向反转且不再穿墙', () => {
    // 墙：第 5 列第 14 行（与敌人同一行）
    const level = makeLevel([
      ...Array.from({ length: 14 }, () => ''),
      '     #'.padEnd(100, '.'),
      '#'.repeat(100),
      '#'.repeat(100),
    ]);
    const enemy = createEnemy(128, 14 * 32); // 第 4 列，正对第 5 列的墙
    enemy.vx = ENEMY_SPEED; // 初始朝右
    updateEnemy(enemy, level, FIXED_DT);
    expect(enemy.vx).toBe(-ENEMY_SPEED); // 方向反转
    expect(enemy.x).toBe(128); // 未穿墙
    expect(enemy.x + ENEMY_SIZE).toBeLessThanOrEqual(5 * 32);
  });

  it('TC-ENM-03 边缘转身：前进方向脚下一格无地面（悬崖），方向反转不走出平台', () => {
    // 地面仅第 0..18 列（第 15/16 行），第 19 列起为空（悬崖）
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '#'.repeat(19).padEnd(100, '.'),
      '#'.repeat(19).padEnd(100, '.'),
    ]);
    const enemy = createEnemy(576, 15 * 32 - ENEMY_SIZE); // 第 18 列，右边缘恰好到第 19 列边界
    enemy.vx = ENEMY_SPEED; // 初始朝右
    updateEnemy(enemy, level, FIXED_DT);
    expect(enemy.vx).toBe(-ENEMY_SPEED); // 方向反转
    expect(enemy.x).toBe(576); // 不走出平台
  });

  it('TC-ENM-04 死亡标记：被标记死亡后游戏更新时被移除，不再参与碰撞', () => {
    const game = new Game();
    game.start();
    const deadEnemy = game.enemies[0];
    deadEnemy.dead = true;
    game.update(noInput, FIXED_DT);
    expect(game.enemies.includes(deadEnemy)).toBe(false);
  });
});
