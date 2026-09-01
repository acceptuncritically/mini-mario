import { describe, it, expect } from 'vitest';
import {
  createPlayer, jump, updatePlayer, isInvincible, applyHurt, applyStompBounce,
} from '../src/core/player.js';
import {
  MOVE_SPEED, JUMP_VELOCITY, JUMP_CUT_FACTOR, COYOTE_TIME, JUMP_BUFFER_TIME,
  STOMP_BOUNCE, INVINCIBLE_TIME, GRAVITY, KNOCKBACK_SPEED, HURT_KNOCKBACK_VY, FIXED_DT,
} from '../src/core/constants.js';
import { makeLevel, flatLevel, noInput, onceInput } from './helpers.js';

// 平台边缘关卡：地面仅第 15/16 行的前 10 列（col 0-9），右侧是悬崖
const ledgeLevel = makeLevel([
  ...Array.from({ length: 15 }, () => ''),
  '#'.repeat(10),
  '#'.repeat(10),
]);

describe('player 玩家模块', () => {
  it('TC-PLR-01 按住「右」更新一帧：vx = +MOVE_SPEED，x 增加', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    updatePlayer(player, onceInput({ right: true }), flatLevel(), FIXED_DT);
    expect(player.vx).toBe(MOVE_SPEED);
    expect(player.x).toBeGreaterThan(64);
  });

  it('TC-PLR-02 按住「左」更新一帧后松开：vx = -MOVE_SPEED；松开后 vx = 0', () => {
    const player = createPlayer(400, 444);
    player.grounded = true;
    updatePlayer(player, onceInput({ left: true }), flatLevel(), FIXED_DT);
    expect(player.vx).toBe(-MOVE_SPEED);
    expect(player.x).toBeLessThan(400);
    updatePlayer(player, noInput(), flatLevel(), FIXED_DT);
    expect(player.vx).toBe(0);
  });

  it('TC-PLR-03 玩家接地时触发跳跃：vy = JUMP_VELOCITY（起跳），随后 grounded = false', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    updatePlayer(player, onceInput({ jump: true, jumpHeld: true }), flatLevel(), FIXED_DT);
    expect(player.vy).toBe(JUMP_VELOCITY);
    expect(player.grounded).toBe(false);
  });

  it('TC-PLR-04 玩家在空中（无土狼时间）触发跳跃：vy 不被设置为 JUMP_VELOCITY（不可二段跳）', () => {
    const player = createPlayer(64, 100);
    player.grounded = false;
    player.coyoteTimer = 0;
    player.vy = 0;
    updatePlayer(player, onceInput({ jump: true }), flatLevel(), FIXED_DT);
    expect(player.vy).not.toBe(JUMP_VELOCITY);
    expect(player.vy).toBeCloseTo(GRAVITY * FIXED_DT, 5); // 仅受重力
  });

  it('TC-PLR-05 跳跃为边沿触发：持续按住更新两帧，只有触发的第一帧起跳，之后不重复起跳', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    const input = onceInput({ jump: true, jumpHeld: true });
    updatePlayer(player, input, flatLevel(), FIXED_DT);
    expect(player.vy).toBe(JUMP_VELOCITY); // 第一帧起跳
    updatePlayer(player, noInput(), flatLevel(), FIXED_DT);
    expect(player.vy).not.toBe(JUMP_VELOCITY); // 第二帧不重复起跳
  });

  it('TC-PLR-06 无敌时间逐帧递减至 0：期间 isInvincible() 为真，归零后为假', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    player.invincible = INVINCIBLE_TIME;
    for (let i = 0; i < 45; i += 1) {
      updatePlayer(player, noInput(), flatLevel(), FIXED_DT);
    }
    expect(player.invincible).toBeCloseTo(INVINCIBLE_TIME - 45 * FIXED_DT, 5);
    expect(isInvincible(player)).toBe(true);
    for (let i = 0; i < 46; i += 1) {
      updatePlayer(player, noInput(), flatLevel(), FIXED_DT);
    }
    expect(player.invincible).toBe(0);
    expect(isInvincible(player)).toBe(false);
  });

  it('TC-PLR-07 踩踏敌人后反弹：vy = STOMP_BOUNCE', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    applyStompBounce(player);
    expect(player.vy).toBe(STOMP_BOUNCE);
    expect(player.grounded).toBe(false);
  });

  it('TC-PLR-08 土狼时间：离开平台边缘后 COYOTE_TIME 内可起跳，超时后不可', () => {
    // 走到边缘外（连续右移直到完全离开地面，土狼窗口开启）
    const edgeX = 10 * 32 - 28; // 292：右边缘恰好贴齐平台边界
    const a = createPlayer(edgeX, 444);
    a.grounded = true;
    const holdRight = onceInput({ right: true });
    for (let i = 0; i < 8; i += 1) {
      updatePlayer(a, holdRight, ledgeLevel, FIXED_DT); // 完全走出平台
    }
    expect(a.grounded).toBe(false);
    expect(a.coyoteTimer).toBeGreaterThan(0);
    updatePlayer(a, onceInput({ jump: true, jumpHeld: true }), ledgeLevel, FIXED_DT); // 窗口内起跳
    expect(a.vy).toBe(JUMP_VELOCITY);

    // 超过土狼窗口（0.1s ≈ 6 帧）后不起跳
    const b = createPlayer(edgeX, 444);
    b.grounded = true;
    const holdRight2 = onceInput({ right: true });
    for (let i = 0; i < 8; i += 1) {
      updatePlayer(b, holdRight2, ledgeLevel, FIXED_DT);
    }
    for (let i = 0; i < 8; i += 1) {
      updatePlayer(b, noInput(), ledgeLevel, FIXED_DT);
    }
    expect(b.coyoteTimer).toBe(0);
    updatePlayer(b, onceInput({ jump: true, jumpHeld: true }), ledgeLevel, FIXED_DT);
    expect(b.vy).not.toBe(JUMP_VELOCITY);
    expect(COYOTE_TIME * 60).toBeGreaterThanOrEqual(6);
  });

  it('TC-PLR-09 跳跃缓冲：空中按跳后落地瞬间自动起跳；超时落地则不起跳', () => {
    // 落地早于缓冲耗尽（0.12s ≈ 7.2 帧）：自动起跳
    const a = createPlayer(64, 428);
    a.vy = 300;
    updatePlayer(a, onceInput({ jump: true, jumpHeld: true }), flatLevel(), FIXED_DT); // 空中按跳 → 缓冲
    expect(a.jumpBufferTimer).toBeGreaterThan(0);
    expect(a.vy).not.toBe(JUMP_VELOCITY);
    for (let i = 0; i < 10 && !a.grounded; i += 1) {
      const before = a.jumpBufferTimer;
      updatePlayer(a, noInput(), flatLevel(), FIXED_DT);
      if (before > 0 && a.vy === JUMP_VELOCITY) break;
    }
    expect(a.vy).toBe(JUMP_VELOCITY); // 落地帧自动起跳

    // 落地晚于缓冲耗尽：不起跳，正常落地
    const b = createPlayer(64, 380);
    b.vy = 300;
    updatePlayer(b, onceInput({ jump: true, jumpHeld: true }), flatLevel(), FIXED_DT);
    for (let i = 0; i < 20; i += 1) {
      updatePlayer(b, noInput(), flatLevel(), FIXED_DT);
    }
    expect(b.grounded).toBe(true);
    expect(b.vy).toBe(0); // 已落地且未自动起跳
    expect(b.jumpBufferTimer).toBe(0);
    expect(JUMP_BUFFER_TIME * 60).toBeCloseTo(7.2, 5);
  });

  it('TC-PLR-10 可变跳跃高度：上升中松开跳键 vy 被削减一次；按住则只受重力', () => {
    // 松开：削减一次
    const a = createPlayer(64, 444);
    a.grounded = true;
    updatePlayer(a, onceInput({ jump: true, jumpHeld: true }), flatLevel(), FIXED_DT);
    updatePlayer(a, onceInput({ jumpHeld: false }), flatLevel(), FIXED_DT); // 松开
    expect(a.vy).toBeCloseTo((JUMP_VELOCITY + GRAVITY * FIXED_DT) * JUMP_CUT_FACTOR, 4);
    const cutVy = a.vy;
    updatePlayer(a, onceInput({ jumpHeld: false }), flatLevel(), FIXED_DT); // 不再二次削减
    expect(a.vy).toBeCloseTo(cutVy + GRAVITY * FIXED_DT, 4);

    // 按住：不受削减
    const b = createPlayer(64, 444);
    b.grounded = true;
    updatePlayer(b, onceInput({ jump: true, jumpHeld: true }), flatLevel(), FIXED_DT);
    updatePlayer(b, noInput(), flatLevel(), FIXED_DT); // 仍视为按住
    expect(b.vy).toBeCloseTo(JUMP_VELOCITY + GRAVITY * FIXED_DT, 5);
  });

  it('TC-PLR-11 受伤击退：无敌 + 远离敌人方向的击退速度；无敌期间不再重复受伤', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    expect(applyHurt(player, -1)).toBe(true); // 敌人在右侧 → 向左击退
    expect(player.invincible).toBe(INVINCIBLE_TIME);
    expect(player.vx).toBe(-KNOCKBACK_SPEED);
    expect(player.vy).toBe(HURT_KNOCKBACK_VY);
    expect(player.grounded).toBe(false);
    expect(isInvincible(player)).toBe(true);

    expect(applyHurt(player, 1)).toBe(false); // 无敌期间不重复受伤
    expect(player.vx).toBe(-KNOCKBACK_SPEED); // 速度不被覆盖
  });
});
