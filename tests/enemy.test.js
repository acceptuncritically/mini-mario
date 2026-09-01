import { describe, it, expect } from 'vitest';
import { createEnemy, updateEnemy } from '../src/core/enemy.js';
import { Game } from '../src/core/game.js';
import {
  ENEMY_SPEED, ENEMY_SIZE, FIXED_DT,
} from '../src/core/constants.js';
import { makeLevel, noInput } from './helpers.js';

describe('enemy 敌人模块', () => {
  it('TC-ENM-01 平地巡逻：朝左匀速移动，x 减少 ENEMY_SPEED * dt（v2 速度为 90）', () => {
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '#'.repeat(200),
      '#'.repeat(200),
    ]);
    const enemy = createEnemy(100, 15 * 32 - ENEMY_SIZE);
    updateEnemy(enemy, level, FIXED_DT);
    expect(ENEMY_SPEED).toBe(90);
    expect(enemy.x).toBeCloseTo(100 - ENEMY_SPEED * FIXED_DT, 5);
    expect(enemy.vx).toBeLessThan(0);
  });

  it('TC-ENM-02 撞墙转身：前方一格有墙，方向反转且不再穿墙', () => {
    const level = makeLevel([
      ...Array.from({ length: 14 }, () => ''),
      '     #',
      '#'.repeat(200),
      '#'.repeat(200),
    ]);
    const enemy = createEnemy(128, 14 * 32);
    enemy.vx = ENEMY_SPEED; // 初始朝右
    updateEnemy(enemy, level, FIXED_DT);
    expect(enemy.vx).toBe(-ENEMY_SPEED);
    expect(enemy.x).toBe(128);
    expect(enemy.x + ENEMY_SIZE).toBeLessThanOrEqual(5 * 32);
  });

  it('TC-ENM-03 边缘转身：前进方向脚下一格无地面（悬崖），方向反转不走出平台', () => {
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '#'.repeat(19),
      '#'.repeat(19),
    ]);
    const enemy = createEnemy(576, 15 * 32 - ENEMY_SIZE);
    enemy.vx = ENEMY_SPEED;
    updateEnemy(enemy, level, FIXED_DT);
    expect(enemy.vx).toBe(-ENEMY_SPEED);
    expect(enemy.x).toBe(576);
  });

  it('TC-ENM-04 死亡标记：被标记死亡后游戏更新时被移除，不再参与碰撞', () => {
    const game = new Game();
    game.start();
    expect(game.enemies.length).toBeGreaterThan(0);
    const deadEnemy = game.enemies[0];
    deadEnemy.dead = true;
    game.update(noInput(), FIXED_DT);
    expect(game.enemies.includes(deadEnemy)).toBe(false);
  });
});
