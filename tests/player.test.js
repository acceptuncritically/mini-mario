import { describe, it, expect } from 'vitest';
import {
  createPlayer, jump, updatePlayer, isInvincible, applyHurt, applyStompBounce,
} from '../src/core/player.js';
import {
  MOVE_SPEED, JUMP_VELOCITY, STOMP_BOUNCE, INVINCIBLE_TIME, GRAVITY, FIXED_DT,
} from '../src/core/constants.js';
import { makeLevel } from './helpers.js';

// 平坦地面关卡（第 15/16 行为地面）
const flatLevel = makeLevel([
  ...Array.from({ length: 15 }, () => ''),
  '#'.repeat(100),
  '#'.repeat(100),
]);

const noInput = {
  isLeft: () => false,
  isRight: () => false,
  consumeJump: () => false,
};

describe('player 玩家模块', () => {
  it('TC-PLR-01 按住「右」更新一帧：vx = +MOVE_SPEED，x 增加', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    const input = { isLeft: () => false, isRight: () => true, consumeJump: () => false };
    updatePlayer(player, input, flatLevel, FIXED_DT);
    expect(player.vx).toBe(MOVE_SPEED);
    expect(player.x).toBeGreaterThan(64);
  });

  it('TC-PLR-02 按住「左」更新一帧后松开：vx = -MOVE_SPEED；松开后 vx = 0', () => {
    const player = createPlayer(400, 444);
    player.grounded = true;
    const inputLeft = { isLeft: () => true, isRight: () => false, consumeJump: () => false };
    updatePlayer(player, inputLeft, flatLevel, FIXED_DT);
    expect(player.vx).toBe(-MOVE_SPEED);
    expect(player.x).toBeLessThan(400);
    updatePlayer(player, noInput, flatLevel, FIXED_DT);
    expect(player.vx).toBe(0);
  });

  it('TC-PLR-03 玩家接地时触发跳跃：vy = JUMP_VELOCITY（起跳），随后 grounded = false', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    const input = { isLeft: () => false, isRight: () => false, consumeJump: () => true };
    updatePlayer(player, input, flatLevel, FIXED_DT);
    expect(player.vy).toBe(JUMP_VELOCITY);
    expect(player.grounded).toBe(false);
  });

  it('TC-PLR-04 玩家在空中（grounded=false）触发跳跃：vy 不被设置为 JUMP_VELOCITY（不可二段跳）', () => {
    const player = createPlayer(64, 100); // 空中，下方远处才有地面
    player.grounded = false;
    player.vy = 0;
    const input = { isLeft: () => false, isRight: () => false, consumeJump: () => true };
    updatePlayer(player, input, flatLevel, FIXED_DT);
    expect(player.vy).not.toBe(JUMP_VELOCITY);
    expect(player.vy).toBeCloseTo(GRAVITY * FIXED_DT, 5); // 仅受重力
  });

  it('TC-PLR-05 跳跃为边沿触发：持续按住更新两帧，只有触发的第一帧起跳，之后不重复起跳', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    let jumpSignal = true; // 第一次 consumeJump 返回 true（按下瞬间），之后 false（持续按住）
    const input = {
      isLeft: () => false,
      isRight: () => true,
      consumeJump: () => {
        const v = jumpSignal;
        jumpSignal = false;
        return v;
      },
    };
    updatePlayer(player, input, flatLevel, FIXED_DT);
    expect(player.vy).toBe(JUMP_VELOCITY); // 第一帧起跳
    updatePlayer(player, input, flatLevel, FIXED_DT);
    expect(player.vy).not.toBe(JUMP_VELOCITY); // 第二帧不重复起跳
  });

  it('TC-PLR-06 无敌时间逐帧递减至 0：期间 isInvincible() 为真，归零后为假', () => {
    const player = createPlayer(64, 444);
    player.grounded = true;
    player.invincible = INVINCIBLE_TIME;
    for (let i = 0; i < 45; i += 1) {
      updatePlayer(player, noInput, flatLevel, FIXED_DT);
    }
    expect(player.invincible).toBeCloseTo(INVINCIBLE_TIME - 45 * FIXED_DT, 5);
    expect(isInvincible(player)).toBe(true);
    for (let i = 0; i < 46; i += 1) {
      updatePlayer(player, noInput, flatLevel, FIXED_DT);
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
});
