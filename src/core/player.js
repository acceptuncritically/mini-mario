// 玩家模块（SPEC v2 5.3）：移动 / 跳跃 / 土狼时间 / 跳跃缓冲 / 可变跳跃 / 无敌 / 击退
import {
  PLAYER_WIDTH, PLAYER_HEIGHT, MOVE_SPEED, JUMP_VELOCITY,
  JUMP_CUT_FACTOR, COYOTE_TIME, JUMP_BUFFER_TIME,
  STOMP_BOUNCE, INVINCIBLE_TIME, KNOCKBACK_SPEED, HURT_KNOCKBACK_VY,
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
    coyoteTimer: 0,       // 土狼时间剩余（s）
    jumpBufferTimer: 0,   // 跳跃缓冲剩余（s）
    jumpCutApplied: false, // 本次起跳是否已削减过上升速度
  };
}

// 跳跃：grounded 或土狼窗口内可起跳；起跳后清空土狼与缓冲
export function jump(player) {
  if (!player.grounded && player.coyoteTimer <= 0) return false;
  player.vy = JUMP_VELOCITY;
  player.grounded = false;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  player.jumpCutApplied = false;
  return true;
}

// 每逻辑帧更新玩家（SPEC v2 5.3）：
// 1) 捕获上帧接地状态并重置本帧接地
// 2) 上帧接地则刷新土狼窗口；空中则递减土狼计时
// 3) 输入设定水平速度 → 水平碰撞
// 4) 重力积分
// 5) 跳跃边沿：可跳（上帧接地或土狼窗口）则起跳；不可跳则写入跳跃缓冲
// 6) 可变跳跃：上升中松开跳键 → vy *= JUMP_CUT_FACTOR（每次起跳仅一次）
// 7) onFrame 钩子（游戏层做踩踏/受伤判定）
// 8) 垂直碰撞响应（落地 grounded=true / 顶头失速）
// 9) 落地时若跳跃缓冲未耗尽 → 自动起跳
// 10) 无敌时间递减
// 返回本帧玩家事件数组（如 ['jump']），供游戏层合并输出
export function updatePlayer(player, input, level, dt, onFrame = null) {
  const frameEvents = [];
  const wasGrounded = player.grounded;
  resetGrounded(player);

  if (wasGrounded) {
    player.coyoteTimer = COYOTE_TIME; // 仍在地面：土狼窗口保持满
  } else if (player.coyoteTimer > 0) {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  player.vx = (input.isRight() ? MOVE_SPEED : 0) + (input.isLeft() ? -MOVE_SPEED : 0);
  moveX(player, level, dt);
  applyGravity(player, dt);

  if (input.consumeJump()) {
    if (wasGrounded || player.coyoteTimer > 0) {
      if (jump(player)) frameEvents.push('jump');
    } else {
      player.jumpBufferTimer = JUMP_BUFFER_TIME; // 空中缓冲
    }
  }

  // 空中递减跳跃缓冲（落地后由落地分支消费）
  if (!player.grounded && player.jumpBufferTimer > 0) {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }

  // 可变跳跃高度：上升中松开跳键 → 削减一次
  if (!player.jumpCutApplied && player.vy < 0 && !input.isJumpHeld()) {
    player.vy *= JUMP_CUT_FACTOR;
    player.jumpCutApplied = true;
  }

  if (onFrame) onFrame(player);

  moveY(player, level, dt);

  // 落地缓冲起跳
  if (player.grounded && player.jumpBufferTimer > 0) {
    player.jumpBufferTimer = 0;
    if (jump(player)) frameEvents.push('jump');
  }

  if (player.invincible > 0) {
    player.invincible = Math.max(0, player.invincible - dt);
  }

  return frameEvents;
}

// 无敌状态判断
export function isInvincible(player) {
  return player.invincible > 0;
}

// 受伤（v2）：进入无敌时间 + 击退（dir 为远离敌人的方向：+1 向右 / -1 向左）
export function applyHurt(player, dir) {
  if (isInvincible(player)) return false;
  player.invincible = INVINCIBLE_TIME;
  player.vx = (dir >= 0 ? 1 : -1) * KNOCKBACK_SPEED;
  player.vy = HURT_KNOCKBACK_VY;
  player.grounded = false;
  return true;
}

// 踩踏反弹：vy = STOMP_BOUNCE
export function applyStompBounce(player) {
  player.vy = STOMP_BOUNCE;
  player.grounded = false;
}
