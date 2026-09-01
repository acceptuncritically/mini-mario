// 渲染层（SPEC v2 第 9 节，不写自动化测试）：Canvas 绘制 v2
// 视差背景 / 角色与敌人动画 / 金币旋转 / 旗帜飘动 / 钉刺 / 检查点 / 粒子 / HUD v2 / 覆盖层
import {
  TILE_SIZE, VIEW_WIDTH, VIEW_HEIGHT, LEVEL_WIDTH_TILES, LEVEL_ROWS,
  COIN_SIZE, ENEMY_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT,
  STATE_TITLE, STATE_PAUSED, STATE_LEVEL_CLEAR, STATE_VICTORY,
} from '../core/constants.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];

  // ---- 视差元素（确定性的伪随机分布，避免每帧抖动） ----
  const clouds = [];
  for (let i = 0; i < 14; i += 1) {
    clouds.push({
      x: (i * 733) % 3600,
      y: 24 + ((i * 97) % 150),
      s: 0.7 + ((i * 53) % 10) / 12,
      speed: 4 + (i % 3) * 3,
    });
  }
  const CLOUD_PERIOD = 3600;
  const hillsFar = [];
  for (let i = 0; i < 24; i += 1) {
    hillsFar.push({ x: i * 300, w: 420, h: 70 + ((i * 61) % 90) });
  }
  const HILL_FAR_PERIOD = 24 * 300;
  const hillsNear = [];
  for (let i = 0; i < 24; i += 1) {
    hillsNear.push({ x: i * 340 + 90, w: 520, h: 95 + ((i * 41) % 110) });
  }
  const HILL_NEAR_PERIOD = 24 * 340;

  const wrap = (v, period) => ((v % period) + period) % period;

  // ---- 粒子系统 ----
  function spawnParticles(type, x, y) {
    const palette = {
      stomp: ['#8e24aa', '#ce93d8', '#e1bee7'],
      coin: ['#ffd54f', '#fff176', '#ffe082'],
      death: ['#e53935', '#ff8a80', '#ffcdd2'],
      checkpoint: ['#4fc3f7', '#b3e5fc', '#e1f5fe'],
      dust: ['#d7ccc8', '#efebe9'],
    };
    const colors = palette[type] || palette.dust;
    const count = type === 'death' ? 26 : type === 'checkpoint' ? 18 : type === 'stomp' ? 12 : 8;
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 190;
      particles.push({
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 90,
        life: 0.35 + Math.random() * 0.45,
        size: 2 + Math.random() * 3.5,
        color: colors[i % colors.length],
        gravity: type === 'dust' ? 60 : 340,
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // ---- 背景与视差 ----
  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    grad.addColorStop(0, '#4a90d9');
    grad.addColorStop(0.65, '#87ceeb');
    grad.addColorStop(1, '#c8ecf7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  function drawClouds(cameraX) {
    const off = wrap(cameraX * 0.2, CLOUD_PERIOD);
    for (const c of clouds) {
      const x = wrap(c.x - off, CLOUD_PERIOD);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const w = 90 * c.s;
      const h = 30 * c.s;
      ctx.beginPath();
      ctx.ellipse(x, c.y, w, h, 0, 0, Math.PI * 2);
      ctx.ellipse(x + w * 0.7, c.y + 6 * c.s, w * 0.75, h * 0.8, 0, 0, Math.PI * 2);
      ctx.ellipse(x - w * 0.7, c.y + 8 * c.s, w * 0.65, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHillLayer(hills, period, cameraX, color) {
    const off = wrap(cameraX, period);
    ctx.fillStyle = color;
    for (const h of hills) {
      const x = wrap(h.x - off, period);
      const baseY = 470;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + h.w / 2, baseY - h.h, x + h.w, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- 关卡元素 ----
  function drawTiles(level, cameraX) {
    const colStart = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const colEnd = Math.min(LEVEL_WIDTH_TILES - 1, Math.ceil((cameraX + VIEW_WIDTH) / TILE_SIZE));
    for (let row = 0; row < LEVEL_ROWS; row += 1) {
      for (let col = colStart; col <= colEnd; col += 1) {
        if (!level.isSolid(col, row)) continue;
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        ctx.fillStyle = '#a5682a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#7c4a1e';
        ctx.fillRect(x, y + TILE_SIZE - 6, TILE_SIZE, 6);
        // 顶面草地
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(x, y, TILE_SIZE, 5);
        ctx.fillStyle = '#43a047';
        ctx.fillRect(x, y + 5, TILE_SIZE, 3);
      }
    }
  }

  function drawFlag(flag, timeMs) {
    const poleX = flag.x + flag.w / 2;
    const sway = Math.sin(timeMs * 0.005) * 4;
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(poleX, flag.y + flag.h);
    ctx.lineTo(poleX, flag.y);
    ctx.stroke();
    ctx.fillStyle = '#ffca28';
    ctx.beginPath();
    ctx.arc(poleX, flag.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(poleX, flag.y + 2);
    ctx.lineTo(poleX + 22 + sway, flag.y + 12);
    ctx.lineTo(poleX, flag.y + 22);
    ctx.closePath();
    ctx.fill();
  }

  function drawCoins(coins, timeMs) {
    const squish = 0.3 + 0.7 * Math.abs(Math.cos(timeMs * 0.004));
    for (const coin of coins) {
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.scale(squish, 1);
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(0, 0, COIN_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemies(enemies, timeMs) {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const bounce = Math.abs(Math.sin(timeMs * 0.012)) * 2.5;
      const y = enemy.y + bounce;
      ctx.fillStyle = '#8e24aa';
      ctx.fillRect(enemy.x, y, ENEMY_SIZE, ENEMY_SIZE);
      ctx.fillStyle = '#6a1b9a';
      ctx.fillRect(enemy.x, y + ENEMY_SIZE - 4, ENEMY_SIZE, 4);
      const eyeY = y + 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x + 6, eyeY, 8, 8);
      ctx.fillRect(enemy.x + 18, eyeY, 8, 8);
      ctx.fillStyle = '#1a1a1a';
      const dir = Math.sign(enemy.vx);
      ctx.fillRect(enemy.x + 6 + (dir > 0 ? 4 : 0), eyeY + 3, 4, 4);
      ctx.fillRect(enemy.x + 18 + (dir > 0 ? 4 : 0), eyeY + 3, 4, 4);
    }
  }

  function drawSpikes(spikes) {
    ctx.fillStyle = '#cfd8dc';
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1;
    for (const s of spikes) {
      const n = 2;
      const tw = s.w / n;
      for (let i = 0; i < n; i += 1) {
        const x0 = s.x + i * tw;
        ctx.beginPath();
        ctx.moveTo(x0, s.y + s.h);
        ctx.lineTo(x0 + tw / 2, s.y);
        ctx.lineTo(x0 + tw, s.y + s.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawCheckpoints(game, timeMs) {
    for (let i = 0; i < game.checkpoints.length; i += 1) {
      const cp = game.checkpoints[i];
      const active = game.activeCheckpoint >= i;
      const poleX = cp.x + TILE_SIZE / 2;
      const topY = cp.y;
      const glow = active ? 0.5 + Math.abs(Math.sin(timeMs * 0.004)) * 0.5 : 0;
      if (active) {
        ctx.save();
        ctx.shadowColor = '#ffd54f';
        ctx.shadowBlur = 10 * glow;
      }
      ctx.fillStyle = active ? '#ffe082' : '#9e9e9e';
      ctx.fillRect(poleX - 2, topY, 4, TILE_SIZE);
      const sway = Math.sin(timeMs * 0.006) * 3;
      ctx.beginPath();
      ctx.moveTo(poleX, topY + 2);
      ctx.lineTo(poleX + 16 + sway, topY + 10);
      ctx.lineTo(poleX, topY + 18);
      ctx.closePath();
      ctx.fillStyle = active ? '#e53935' : '#bdbdbd';
      ctx.fill();
      if (active) ctx.restore();
    }
  }

  function roundedRectPath(x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }

  function drawPlayer(player, timeMs) {
    if (player.invincible > 0 && Math.floor(timeMs / 100) % 2 === 1) return;

    const running = player.grounded && Math.abs(player.vx) > 1;
    const airborne = !player.grounded;

    // 腿（跑动时交替摆动）
    const legSwing = running ? Math.sin(timeMs * 0.03) * 4 : 0;
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(player.x + 4, player.y + player.h - 8, 8, 8);
    ctx.fillRect(player.x + player.w - 12, player.y + player.h - 8, 8, 8);
    if (running) {
      ctx.fillRect(player.x + 4 + legSwing, player.y + player.h - 10, 7, 10);
      ctx.fillRect(player.x + player.w - 11 - legSwing, player.y + player.h - 10, 7, 10);
    }

    // 身体：跳跃/下落时轻微拉伸
    let bodyY = player.y;
    let bodyH = player.h - 8;
    if (airborne) {
      bodyY -= player.vy < 0 ? 3 : 2;
      bodyH += 3;
    }
    ctx.fillStyle = '#e53935';
    roundedRectPath(player.x, bodyY, player.w, bodyH, 5);
    ctx.fill();
    ctx.fillStyle = '#ef9a9a';
    ctx.fillRect(player.x + 2, bodyY + 3, player.w - 4, 4);

    // 眼睛（朝移动方向）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 4, bodyY + 7, 7, 7);
    ctx.fillRect(player.x + player.w - 11, bodyY + 7, 7, 7);
    ctx.fillStyle = '#1a1a1a';
    const look = player.vx >= 0 ? 3 : 0;
    ctx.fillRect(player.x + 5 + look, bodyY + 9, 3, 3);
    ctx.fillRect(player.x + player.w - 10 + look, bodyY + 9, 3, 3);
  }

  function drawHud(game) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, VIEW_WIDTH, 44);
    ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`分数 ${game.score}`, 16, 23);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(`最高 ${game.highScore}`, 210, 23);
    ctx.fillStyle = '#ef9a9a';
    ctx.fillText(`死亡 ×${game.deaths}`, 400, 23);
    // 暂停提示（桌面端）
    if (game.state !== STATE_TITLE) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('P/Esc 暂停', VIEW_WIDTH - 16, 23);
    }
  }

  function overlay(title, lines, accent = '#ffffff') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillText(title, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px "Segoe UI", "PingFang SC", sans-serif';
    let y = VIEW_HEIGHT / 2;
    for (const line of lines) {
      ctx.fillText(line, VIEW_WIDTH / 2, y);
      y += 36;
    }
  }

  function render(game, timeMs = 0, dt = 1 / 60) {
    const cameraX = game.camera ? game.camera.x : 0;

    drawSky();
    drawClouds(cameraX);
    drawHillLayer(hillsFar, HILL_FAR_PERIOD, cameraX * 0.2, 'rgba(165, 214, 167, 0.9)');
    drawHillLayer(hillsNear, HILL_NEAR_PERIOD, cameraX * 0.5, 'rgba(129, 199, 132, 0.95)');

    ctx.save();
    ctx.translate(-cameraX, 0);

    if (game.level) {
      drawTiles(game.level, cameraX);
      if (game.level.flag) drawFlag(game.level.flag, timeMs);
      drawCheckpoints(game, timeMs);
      drawSpikes(game.spikes);
      drawCoins(game.coins, timeMs);
      drawEnemies(game.enemies, timeMs);
      if (game.player) drawPlayer(game.player, timeMs);
    }

    updateParticles(dt);
    drawParticles();
    ctx.restore();

    drawHud(game);

    if (game.state === STATE_TITLE) {
      overlay('MINI MARIO', [
        '空格 / ↑ / Enter 开始',
        '← → 移动 · 空格跳跃（按住跳更高）',
        'P / Esc 暂停 · 触屏：左下方向 右下跳 右上暂停',
      ], '#ffd54f');
    } else if (game.state === STATE_PAUSED) {
      overlay('已暂停', [
        'P / Esc / ⏸ 继续',
        'Enter / 跳 重新开始',
      ], '#81d4fa');
    } else if (game.state === STATE_LEVEL_CLEAR) {
      overlay('通关！', [
        '奖励已计入分数',
        '即将结算…',
      ], '#ffd54f');
    } else if (game.state === STATE_VICTORY) {
      overlay('🎉 恭喜通关！', [
        `最终得分：${game.score}`,
        `死亡次数：${game.deaths}`,
        `最高分：${game.highScore}`,
        '空格 / ↑ / Enter 返回标题',
      ], '#ffd54f');
    }
  }

  return { render, spawnParticles };
}
