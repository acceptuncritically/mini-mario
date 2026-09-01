// 物理模块（SPEC 5.1）：重力积分、水平积分、AABB 相交判定
import { GRAVITY, MAX_FALL_SPEED } from './constants.js';

// 施加重力一个逻辑帧：vy += GRAVITY * dt，且不超过 MAX_FALL_SPEED
export function applyGravity(entity, dt) {
  entity.vy += GRAVITY * dt;
  if (entity.vy > MAX_FALL_SPEED) {
    entity.vy = MAX_FALL_SPEED;
  }
}

// 水平积分一帧：x += vx * dt（vx 不受重力影响）
export function integrateX(entity, dt) {
  entity.x += entity.vx * dt;
}

// AABB 相交判定：两矩形重叠（含边界接触不算相交）
export function aabbIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
}
