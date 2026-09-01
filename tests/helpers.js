// 测试共享工具：构造 17×100 的测试关卡（不足自动补空格）
import { parseLevel } from '../src/core/level.js';

/**
 * 将行数组构造成合法关卡地图文本并解析。
 * @param {string[]} rows 0..16 行的字符串（可短于 100，自动补齐；缺失行视为空）
 */
export function makeLevel(rows) {
  const full = [];
  for (let r = 0; r < 17; r += 1) {
    full.push((rows[r] ?? '').padEnd(100, ' '));
  }
  return parseLevel(full.join('\n'));
}
