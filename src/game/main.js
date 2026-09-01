// 游戏入口（SPEC 第 9 节）：装配 core 层与输入/渲染，驱动主循环
// requestAnimationFrame 驱动；固定逻辑帧 FIXED_DT，累加器追赶，单帧最多 5 个逻辑帧
import { Game } from '../core/game.js';
import { FIXED_DT } from '../core/constants.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';

const MAX_STEPS_PER_FRAME = 5;   // 单帧最多追赶的逻辑帧数（防螺旋）
const MAX_FRAME_DELTA = 0.25;    // 单帧渲染时间差上限（秒），防止切后台后大跳变

const canvas = document.getElementById('game-canvas');
const game = new Game();
const input = createInput();
const renderer = createRenderer(canvas);

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
  lastTime = now;

  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
    game.update(input, FIXED_DT);
    accumulator -= FIXED_DT;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_FRAME) {
    accumulator = 0; // 丢弃多余时间，防止螺旋
  }

  renderer.render(game, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
