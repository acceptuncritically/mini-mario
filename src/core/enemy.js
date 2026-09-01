// 敌人模块（SPEC 5.5）：巡逻 / 撞墙转身 / 边缘转身 / 死亡
import { ENEMY_SIZE, ENEMY_SPEED, TILE_SIZE } from './constants.js';

// 创建敌人实体（出生点左上角 (x, y)，初始朝左巡逻）
export function createEnemy(x, y) {
  return {
    x, y,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    vx: -ENEMY_SPEED,
    dead: false,
  };
}

// 移动到 newX 后是否与固态格子（墙）重叠
function hitsWall(enemy, level, newX) {
  const top = Math.floor(enemy.y / TILE_SIZE);
  const bottom = Math.floor((enemy.y + enemy.h - 0.001) / TILE_SIZE);
  const left = Math.floor(newX / TILE_SIZE);
  const right = Math.floor((newX + enemy.w - 0.001) / TILE_SIZE);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (level.isSolid(col, row)) return true;
    }
  }
  return false;
}

// 前进方向脚下一格是否为悬崖（无地面）
function isEdgeAhead(enemy, level, newX) {
  const dir = Math.sign(enemy.vx);
  const frontX = dir > 0 ? newX + enemy.w : newX - 0.001;
  const col = Math.floor(frontX / TILE_SIZE);
  const row = Math.floor((enemy.y + enemy.h) / TILE_SIZE);
  return !level.isSolid(col, row);
}

// 每逻辑帧更新敌人：匀速巡逻，撞墙或前方悬崖时转身，死亡后不再移动
export function updateEnemy(enemy, level, dt) {
  if (enemy.dead) return;
  const step = ENEMY_SPEED * dt;
  const newX = enemy.x + Math.sign(enemy.vx) * step;

  // 撞墙转身：不穿墙
  if (hitsWall(enemy, level, newX)) {
    enemy.vx = -enemy.vx;
    return;
  }
  // 边缘转身：前方是悬崖则不走出平台
  if (isEdgeAhead(enemy, level, newX)) {
    enemy.vx = -enemy.vx;
    return;
  }
  enemy.x = newX;
}
