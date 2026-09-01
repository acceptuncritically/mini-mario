// 碰撞模块（SPEC 5.2 / 5.3）：分轴移动碰撞检测与响应（含踩踏判定）
import { TILE_SIZE, ENEMY_STOMP_THRESHOLD, COIN_SIZE } from './constants.js';
import { aabbIntersect } from './physics.js';

// 每帧开始重置接地状态（须在垂直碰撞前重置，保证空中无法起跳）
export function resetGrounded(entity) {
  entity.grounded = false;
}

// 实体矩形（碰撞盒）
function rectOf(entity) {
  return { x: entity.x, y: entity.y, w: entity.w, h: entity.h };
}

// 水平移动并做碰撞响应（向右撞墙贴齐墙左边界，向左贴齐墙右边界）
export function moveX(entity, level, dt) {
  entity.x += entity.vx * dt;
  const dir = Math.sign(entity.vx);
  if (dir === 0) return;

  const top = Math.floor(entity.y / TILE_SIZE);
  const bottom = Math.floor((entity.y + entity.h - 0.001) / TILE_SIZE);
  const left = Math.floor(entity.x / TILE_SIZE);
  const right = Math.floor((entity.x + entity.w - 0.001) / TILE_SIZE);

  if (dir > 0) {
    // 向右：找重叠区域中最左侧的固态格子，贴齐其左边界
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (level.isSolid(col, row)) {
          entity.x = col * TILE_SIZE - entity.w;
          return;
        }
      }
    }
  } else {
    // 向左：找重叠区域中最右侧的固态格子，贴齐其右边界
    for (let row = top; row <= bottom; row += 1) {
      for (let col = right; col >= left; col -= 1) {
        if (level.isSolid(col, row)) {
          entity.x = (col + 1) * TILE_SIZE;
          return;
        }
      }
    }
  }
}

// 垂直移动并做碰撞响应（落地贴齐地面顶部 vy=0 grounded=true；顶头贴齐格子底部 vy=0）
export function moveY(entity, level, dt) {
  entity.y += entity.vy * dt;
  const dir = Math.sign(entity.vy);
  if (dir === 0) return;

  const left = Math.floor(entity.x / TILE_SIZE);
  const right = Math.floor((entity.x + entity.w - 0.001) / TILE_SIZE);
  const top = Math.floor(entity.y / TILE_SIZE);
  const bottom = Math.floor((entity.y + entity.h - 0.001) / TILE_SIZE);

  if (dir > 0) {
    // 下落：找重叠区域中最靠上的固态格子，贴齐其顶部并落地
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (level.isSolid(col, row)) {
          entity.y = row * TILE_SIZE - entity.h;
          entity.vy = 0;
          entity.grounded = true;
          return;
        }
      }
    }
  } else {
    // 上升：找重叠区域中最靠下的固态格子，贴齐其底部并失速
    for (let row = bottom; row >= top; row -= 1) {
      for (let col = left; col <= right; col += 1) {
        if (level.isSolid(col, row)) {
          entity.y = (row + 1) * TILE_SIZE;
          entity.vy = 0;
          return;
        }
      }
    }
  }
}

// 踩踏判定：player.vy > 0 且 player.bottom <= enemy.top + ENEMY_STOMP_THRESHOLD
// （且两碰撞盒相交；踩踏判定优先于受伤判定）
export function isStomp(player, enemy) {
  if (player.vy <= 0) return false;
  if (player.y + player.h > enemy.y + ENEMY_STOMP_THRESHOLD) return false;
  return aabbIntersect(rectOf(player), rectOf(enemy));
}

// 金币拾取判定：玩家碰撞盒与金币碰撞盒（以金币中心为中心的 COIN_SIZE 矩形）AABB 相交
export function coinHit(player, coin) {
  const coinRect = {
    x: coin.x - COIN_SIZE / 2,
    y: coin.y - COIN_SIZE / 2,
    w: COIN_SIZE,
    h: COIN_SIZE,
  };
  return aabbIntersect(rectOf(player), coinRect);
}

// 通关判定：玩家碰撞盒与旗帜区域 AABB 相交
export function flagHit(player, flag) {
  return aabbIntersect(rectOf(player), flag);
}
