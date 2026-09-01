// 渲染层（SPEC 第 8 节，不写测试）：Canvas 绘制
// 逻辑分辨率 960×544（由 CSS 等比缩放）；镜头平移下绘制可见 Tile 与实体
import {
  TILE_SIZE, VIEW_WIDTH, VIEW_HEIGHT, LEVEL_WIDTH_TILES, LEVEL_ROWS,
  COIN_SIZE, ENEMY_SIZE,
  STATE_TITLE, STATE_PLAYING, STATE_LEVEL_CLEAR, STATE_VICTORY, STATE_GAME_OVER,
} from '../core/constants.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const isInvincible = (player) => player.invincible > 0;

  // 可见范围的 Tile 绘制（镜头平移）
  function drawTiles(level, cameraX) {
    const colStart = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const colEnd = Math.min(
      LEVEL_WIDTH_TILES - 1,
      Math.ceil((cameraX + VIEW_WIDTH) / TILE_SIZE),
    );
    for (let row = 0; row < LEVEL_ROWS; row += 1) {
      for (let col = colStart; col <= colEnd; col += 1) {
        if (!level.isSolid(col, row)) continue;
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        // 地面/平台：棕色方块，顶面亮色描边
        ctx.fillStyle = '#a5682a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#7c4a1e';
        ctx.fillRect(x, y + TILE_SIZE - 6, TILE_SIZE, 6);
        ctx.fillStyle = '#c9853f';
        ctx.fillRect(x, y, TILE_SIZE, 4);
      }
    }
  }

  function drawFlag(flag) {
    // 灰色旗杆 + 红色三角旗
    const poleX = flag.x + flag.w / 2;
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(poleX, flag.y + flag.h);
    ctx.lineTo(poleX, flag.y);
    ctx.stroke();
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(poleX, flag.y + 2);
    ctx.lineTo(poleX + 22, flag.y + 12);
    ctx.lineTo(poleX, flag.y + 22);
    ctx.closePath();
    ctx.fill();
  }

  function drawCoins(coins) {
    for (const coin of coins) {
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, COIN_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemies(enemies) {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      ctx.fillStyle = '#8e24aa';
      ctx.fillRect(enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE);
      // 眼睛
      const eyeY = enemy.y + 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x + 6, eyeY, 8, 8);
      ctx.fillRect(enemy.x + 18, eyeY, 8, 8);
      ctx.fillStyle = '#1a1a1a';
      const dir = Math.sign(enemy.vx);
      ctx.fillRect(enemy.x + 6 + (dir > 0 ? 4 : 0), eyeY + 3, 4, 4);
      ctx.fillRect(enemy.x + 18 + (dir > 0 ? 4 : 0), eyeY + 3, 4, 4);
    }
  }

  function roundedRect(x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
  }

  function drawPlayer(player, timeMs) {
    // 无敌闪烁：100ms 周期显隐
    if (isInvincible(player) && Math.floor(timeMs / 100) % 2 === 1) {
      return;
    }
    ctx.fillStyle = '#e53935';
    roundedRect(player.x, player.y, player.w, player.h, 6);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 4, player.y + 8, 7, 7);
    ctx.fillRect(player.x + player.w - 11, player.y + 8, 7, 7);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(player.x + 7, player.y + 10, 3, 3);
    ctx.fillRect(player.x + player.w - 8, player.y + 10, 3, 3);
  }

  function drawHud(game) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, VIEW_WIDTH, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${game.score}`, 16, 23);
    // 生命红心
    ctx.fillStyle = '#e53935';
    ctx.font = '22px sans-serif';
    let hearts = '';
    for (let i = 0; i < game.lives; i += 1) hearts += '♥ ';
    ctx.fillText(hearts.trimEnd(), 260, 23);
  }

  function overlay(texts) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px "Segoe UI", sans-serif';
    ctx.fillText(texts.title, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40);
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd54f';
    let y = VIEW_HEIGHT / 2 + 10;
    for (const line of texts.lines) {
      ctx.fillText(line, VIEW_WIDTH / 2, y);
      y += 34;
    }
  }

  function render(game, timeMs = 0) {
    const cameraX = game.camera ? game.camera.x : 0;

    // 天空
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.save();
    ctx.translate(-cameraX, 0);

    if (game.level) {
      drawTiles(game.level, cameraX);
      if (game.level.flag) drawFlag(game.level.flag);
      drawCoins(game.coins);
      drawEnemies(game.enemies);
      if (game.player) drawPlayer(game.player, timeMs);
    }

    ctx.restore();

    drawHud(game);

    if (game.state === STATE_TITLE) {
      overlay({
        title: 'MINI MARIO',
        lines: ['按 空格 / ↑ / Enter 开始', '← → 移动 · 空格 / ↑ 跳跃', '触屏：左下方向键 + 右下跳跃键'],
      });
    } else if (game.state === STATE_LEVEL_CLEAR) {
      overlay({
        title: `第 ${game.levelIndex + 1} 关 通关！`,
        lines: [`奖励 +${game.lives * 200} 分`, '准备进入下一关…'],
      });
    } else if (game.state === STATE_VICTORY) {
      overlay({
        title: '🎉 恭喜通关！',
        lines: [`最终得分：${game.score}`, '按 空格 / ↑ / Enter 返回标题'],
      });
    } else if (game.state === STATE_GAME_OVER) {
      overlay({
        title: 'GAME OVER',
        lines: [`最终得分：${game.score}`, '按 空格 / ↑ / Enter 返回标题'],
      });
    }
  }

  return { render };
}
