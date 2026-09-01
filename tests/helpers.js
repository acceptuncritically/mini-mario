// 测试共享工具：构造 17×200 的测试关卡（不足自动补空格）
import { parseLevel } from '../src/core/level.js';

/**
 * 将行数组构造成合法关卡地图文本并解析。
 * @param {string[]} rows 0..16 行的字符串（可短于 200，自动补齐；缺失行视为空）
 */
export function makeLevel(rows) {
  const full = [];
  for (let r = 0; r < 17; r += 1) {
    full.push((rows[r] ?? '').padEnd(200, ' '));
  }
  return parseLevel(full.join('\n'));
}

// 平坦地面关卡（第 15/16 行为满地面，200 列）
export function flatLevel() {
  return makeLevel([
    ...Array.from({ length: 15 }, () => ''),
    '#'.repeat(200),
    '#'.repeat(200),
  ]);
}

// 标准空输入（不按任何键；跳跃键视为按住，模拟完整起跳后不削减）
export function noInput() {
  return {
    isLeft: () => false,
    isRight: () => false,
    consumeJump: () => false,
    isJumpHeld: () => true,
    consumePause: () => false,
  };
}

// 一次性边沿输入构造器：jump/pause 只在第一次读取时为 true（模拟按下瞬间）
export function onceInput(overrides = {}) {
  let jump = overrides.jump ?? false;
  let pause = overrides.pause ?? false;
  return {
    isLeft: () => overrides.left ?? false,
    isRight: () => overrides.right ?? false,
    consumeJump: () => {
      const v = jump;
      jump = false;
      return v;
    },
    isJumpHeld: () => overrides.jumpHeld ?? true,
    consumePause: () => {
      const v = pause;
      pause = false;
      return v;
    },
  };
}
