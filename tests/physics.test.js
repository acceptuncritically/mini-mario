import { describe, it, expect } from 'vitest';
import {
  applyGravity, integrateX, aabbIntersect,
} from '../src/core/physics.js';
import {
  GRAVITY, MAX_FALL_SPEED, MOVE_SPEED, FIXED_DT,
} from '../src/core/constants.js';

describe('physics 物理模块', () => {
  it('TC-PHYS-01 施加重力一个逻辑帧：vy 增加 GRAVITY * dt（≈26.67）', () => {
    const entity = { vy: 0 };
    applyGravity(entity, FIXED_DT);
    expect(entity.vy).toBeCloseTo(GRAVITY * FIXED_DT, 5);
  });

  it('TC-PHYS-02 施加重力若干帧：vy 不超过 MAX_FALL_SPEED', () => {
    const entity = { vy: MAX_FALL_SPEED - 10 };
    for (let i = 0; i < 5; i += 1) {
      applyGravity(entity, FIXED_DT);
    }
    expect(entity.vy).toBeLessThanOrEqual(MAX_FALL_SPEED);
    expect(entity.vy).toBe(MAX_FALL_SPEED); // 已到上限后继续被钳制
  });

  it('TC-PHYS-03 AABB 相交判定：重叠为真，相切与分离为假', () => {
    // 重叠
    expect(aabbIntersect(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 },
    )).toBe(true);
    // 仅边接触（水平相切）
    expect(aabbIntersect(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 10, y: 0, w: 10, h: 10 },
    )).toBe(false);
    // 仅边接触（垂直相切）
    expect(aabbIntersect(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 0, y: 10, w: 10, h: 10 },
    )).toBe(false);
    // 完全分离
    expect(aabbIntersect(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 0, w: 10, h: 10 },
    )).toBe(false);
  });

  it('TC-PHYS-04 水平积分一帧：x 增加 vx * dt，vx 不被重力改变', () => {
    const entity = { x: 100, vx: MOVE_SPEED, vy: 0 };
    integrateX(entity, FIXED_DT);
    expect(entity.x).toBeCloseTo(100 + MOVE_SPEED * FIXED_DT, 5);
    // 先施加重力，再水平积分：vx 不应变化
    applyGravity(entity, FIXED_DT);
    expect(entity.vx).toBe(MOVE_SPEED);
  });
});
