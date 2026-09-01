// 游戏入口（SPEC v2 第 10 节）：装配 core 层与输入/渲染/音频，驱动主循环
// 固定逻辑帧 FIXED_DT，累加器追赶，单帧最多 5 个逻辑帧；事件 → 音效/粒子
import { Game } from '../core/game.js';
import { FIXED_DT, HIGH_SCORE_KEY } from '../core/constants.js';
import { parseScore } from '../core/highscore.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game-canvas');

// 最高分存储（localStorage；不可用时静默回退内存态）
function loadScore() {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    return raw === null ? 0 : parseScore(raw);
  } catch {
    return 0;
  }
}
function saveScore(n) {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(n));
  } catch {
    /* 忽略 */
  }
}

const game = new Game({ loadScore, saveScore });
const input = createInput();
const renderer = createRenderer(canvas);
const audio = createAudio();

// 首次用户手势初始化音频（浏览器自动播放策略）
function onFirstInteract() {
  audio.init();
  window.removeEventListener('keydown', onFirstInteract);
  window.removeEventListener('pointerdown', onFirstInteract);
}
window.addEventListener('keydown', onFirstInteract);
window.addEventListener('pointerdown', onFirstInteract);

// 事件 → 音效 / 粒子
const EVENT_SFX = {
  jump: 'jump',
  coin: 'coin',
  stomp: 'stomp',
  hurt: 'hurt',
  death: 'death',
  checkpoint: 'checkpoint',
  flag: 'flag',
  victory: 'victory',
  pause: 'pause',
  resume: 'resume',
  start: 'resume',
};
const EVENT_PARTICLES = {
  stomp: 'stomp',
  coin: 'coin',
  death: 'death',
  checkpoint: 'checkpoint',
};

function consumeEvents() {
  const p = game.player;
  if (!p) return;
  for (const ev of game.events) {
    if (EVENT_SFX[ev]) audio.sfx(EVENT_SFX[ev]);
    if (EVENT_PARTICLES[ev]) {
      renderer.spawnParticles(EVENT_PARTICLES[ev], p.x + p.w / 2, p.y + p.h / 2);
    }
    if (ev === 'jump') {
      renderer.spawnParticles('dust', p.x + p.w / 2, p.y + p.h);
    }
  }
}

const MAX_STEPS_PER_FRAME = 5;   // 单帧最多追赶的逻辑帧数（防螺旋）
const MAX_FRAME_DELTA = 0.25;    // 单帧渲染时间差上限（秒），防止切后台后大跳变

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
  lastTime = now;

  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
    game.update(input, FIXED_DT);
    consumeEvents();
    accumulator -= FIXED_DT;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_FRAME) {
    accumulator = 0; // 丢弃多余时间，防止螺旋
  }

  audio.setState(game.state);
  renderer.render(game, now, elapsed);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
