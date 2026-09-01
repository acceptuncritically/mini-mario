// 最高分纯函数（SPEC v2 5.6 / 11）：不触碰 localStorage，存储读写由 game 层注入。
// 用法：game 层把 localStorage 读取值交给 parseScore 规范化，
//       通关结算时用 applyHighScore 计算新纪录并写回存储。

// 返回更新后的最高分（取较大值）
export function applyHighScore(prev, score) {
  return Math.max(prev, score);
}

// 把存储文本解析为非负整数；非法值回退 0
export function parseScore(text) {
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
