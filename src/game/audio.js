// 音频模块（SPEC v2 第 8 节，不写自动化测试）：WebAudio 全合成音效与背景音乐
// 无任何外部音频文件；原创芯片风格（接近经典平台跳跃游戏听感，非复制任何版权旋律）。
// 首次用户手势时调用 init() 创建/恢复 AudioContext（浏览器自动播放策略）。

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicPlaying = false;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      // 总输出限幅：防削波
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      master.connect(limiter);
      limiter.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.12; // 音乐约 -18 dB
      musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 首次用户手势（键盘/触控）时调用
  function init() {
    ensureCtx();
  }

  // ---- 基础合成工具 ----
  function tone({ freq = 440, freqEnd = null, dur = 0.15, type = 'square', vol = 0.35, when = 0 }) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst({ dur = 0.12, vol = 0.3, when = 0, freq = 800 }) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  // ---- 效果音（SPEC 8-2） ----
  function sfx(name) {
    if (!ctx) return;
    switch (name) {
      case 'jump':       // 方波上行滑音 200→600Hz
        tone({ freq: 200, freqEnd: 600, dur: 0.15, type: 'square', vol: 0.3 });
        break;
      case 'coin':       // 双音短促上行 B5→E6
        tone({ freq: 987.77, dur: 0.07, type: 'sine', vol: 0.35 });
        tone({ freq: 1318.51, dur: 0.16, type: 'sine', vol: 0.35, when: 0.07 });
        break;
      case 'stomp':      // 噪声短爆 + 方波下行滑音
        noiseBurst({ dur: 0.1, vol: 0.35 });
        tone({ freq: 400, freqEnd: 90, dur: 0.18, type: 'square', vol: 0.3 });
        break;
      case 'hurt':       // 锯齿波下行 400→120Hz
        tone({ freq: 400, freqEnd: 120, dur: 0.25, type: 'sawtooth', vol: 0.3 });
        break;
      case 'death':      // 下行琶音（4 音）
        [660, 520, 390, 260].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'square', vol: 0.3, when: i * 0.11 }));
        break;
      case 'checkpoint': // 上行琶音钟声（3 音）
        [523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.35, when: i * 0.09 }));
        break;
      case 'flag':       // 胜利号角琶音（5 音）
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'square', vol: 0.28, when: i * 0.11 }));
        break;
      case 'victory':    // 更长的胜利号角
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'square', vol: 0.28, when: i * 0.15 }));
        break;
      case 'pause':
      case 'resume':     // 短促「嗒」
        tone({ freq: 880, dur: 0.06, type: 'square', vol: 0.25 });
        break;
      default:
        break;
    }
  }

  // ---- 背景音乐：~110 BPM 8 拍原创芯片循环（方波主旋律 + 三角波低音） ----
  const MELODY = [523.25, 0, 659.25, 0, 783.99, 659.25, 523.25, 0, 587.33, 0, 698.46, 0, 783.99, 698.46, 587.33, 0];
  const BASS = [130.81, 0, 98.0, 0, 130.81, 0, 98.0, 0, 146.83, 0, 110.0, 0, 146.83, 0, 110.0, 0];
  const STEP_SEC = 60 / 110 / 2; // 8 分音符（~0.273s）

  function playMusicStep() {
    const c = ensureCtx();
    if (!c || !musicPlaying) return;
    const mel = MELODY[musicStep % MELODY.length];
    const bas = BASS[musicStep % BASS.length];
    if (mel) tone({ freq: mel, dur: STEP_SEC * 0.9, type: 'square', vol: 0.09, when: 0 });
    if (bas) tone({ freq: bas, dur: STEP_SEC * 0.95, type: 'triangle', vol: 0.22, when: 0 });
    musicStep += 1;
    musicTimer = setTimeout(playMusicStep, STEP_SEC * 1000);
  }

  function startMusic() {
    if (musicPlaying || !ensureCtx()) return;
    musicPlaying = true;
    musicStep = 0;
    playMusicStep();
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  function suspendMusic() {
    // 暂停：停止调度但保留进度；继续时重新调度
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  function resumeMusic() {
    if (musicPlaying && !musicTimer) {
      musicTimer = setTimeout(playMusicStep, STEP_SEC * 1000);
    }
  }

  // 按游戏状态管理背景音乐
  function setState(state) {
    const c = ensureCtx();
    if (!c) return;
    if (state === 'PLAYING') {
      if (!musicPlaying) startMusic();
      if (ctx.state === 'suspended') ctx.resume();
      resumeMusic();
    } else if (state === 'PAUSED') {
      suspendMusic();
      if (ctx.state === 'running') ctx.suspend();
    } else if (state === 'LEVEL_CLEAR' || state === 'VICTORY') {
      stopMusic();
      if (ctx.state === 'suspended') ctx.resume();
    } else {
      suspendMusic();
    }
  }

  return { init, sfx, setState };
}
