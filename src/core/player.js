// 玩家模块（SPEC 5.4）：移动 / 跳跃 / 无敌计时
import {
  PLAYER_WIDTH, PLAYER_HEIGHT, MOVE_SPEED, JUMP_VELOCITY,
  STOMP_BOUNCE, INVINCIBLE_TIME,
} from './constants.js';
import { applyGravity } from './physics.js';
import { resetGrounded, moveX, moveY } from './collision.js';

// 创建玩家实体（碰撞盒左上角坐标 (x, y)）
export function createPlayer(x, y) {
  return {
    x, y,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    grounded: false,
    invincible: 0,
  };
}

// 跳跃：仅 grounded 时 vy = JUMP_VELOCITY，随后 grounded = false
export function jump(player) {
  if (!player.grounded) return false;
  doJump(player);
  return true;
}

function doJump(player) {
  player.vy = JUMP_VELOCITY;
  player.grounded = false;
}

// 每逻辑帧更新玩家：
// 1) 记录上帧接地状态并重置本帧接地（保证空中无法起跳）
// 2) 水平速度由输入直接设定（无惯性）
// 3) 先水平碰撞，再重力积分，再跳跃（边沿触发，起跳初速度精确等于 JUMP_VELOCITY）
// 4) onFrame 钩子（游戏层在垂直移动前做踩踏/受伤判定）
// 5) 垂直碰撞响应（落地 grounded=true / 顶头失速）
// 6) 无敌时间递减
export function updatePlayer(player, input, level, dt, onFrame = null) {
  const couldJump = player.grounded;
  resetGrounded(player);

  player.vx = (input.isRight() ? MOVE_SPEED : 0) + (input.isLeft() ? -MOVE_SPEED : 0);
  moveX(player, level, dt);
  applyGravity(player, dt);
  if (input.consumeJump() && couldJump) {
    doJump(player);
  }
  if (onFrame) {
    onFrame(player);
  }
  moveY(player, level, dt);

  if (player.invincible > 0) {
    player.invincible = Math.max(0, player.invincible - dt);
  }
}

// 无敌状态判断
export function isInvincible(player) {
  return player.invincible > 0;
}

// 受伤：进入无敌时间（若已无敌则不生效）
export function applyHurt(player) {
  if (isInvincible(player)) return false;
  player.invincible = INVINCIBLE_TIME;
  return true;
}

// 踩踏反弹：vy = STOMP_BOUNCE
export function applyStompBounce(player) {
  player.vy = STOMP_BOUNCE;
  player.grounded = false;
}
