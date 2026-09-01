import { describe, it, expect } from 'vitest';
import { createCamera, updateCamera } from '../src/core/camera.js';
import {
  VIEW_WIDTH, PLAYER_WIDTH, TILE_SIZE, LEVEL_WIDTH_TILES, LEVEL_ROWS,
} from '../src/core/constants.js';
import { makeLevel } from './helpers.js';

const level = makeLevel([
  ...Array.from({ length: LEVEL_ROWS - 2 }, () => ''),
  '#'.repeat(LEVEL_WIDTH_TILES),
  '#'.repeat(LEVEL_WIDTH_TILES),
]);

function makePlayer(x) {
  return { x, y: 100, w: PLAYER_WIDTH, h: 36, vx: 0, vy: 0 };
}

describe('camera 镜头模块', () => {
  it('TC-CAM-01 玩家在关卡中部：x = 玩家中心x - VIEW_WIDTH/2', () => {
    const camera = createCamera();
    const playerX = 3200 - PLAYER_WIDTH / 2;
    updateCamera(camera, makePlayer(playerX), level);
    expect(camera.x).toBe(playerX + PLAYER_WIDTH / 2 - VIEW_WIDTH / 2);
  });

  it('TC-CAM-02 玩家在关卡最左侧：x = 0（左边界钳制）', () => {
    const camera = createCamera();
    updateCamera(camera, makePlayer(0), level);
    expect(camera.x).toBe(0);
  });

  it('TC-CAM-03 玩家在关卡最右侧：x = 6400 - VIEW_WIDTH（右边界钳制）', () => {
    const camera = createCamera();
    const playerX = LEVEL_WIDTH_TILES * TILE_SIZE - PLAYER_WIDTH;
    updateCamera(camera, makePlayer(playerX), level);
    expect(camera.x).toBe(LEVEL_WIDTH_TILES * TILE_SIZE - VIEW_WIDTH);
    expect(camera.x).toBe(5440);
  });

  it('TC-CAM-04 任意位置：垂直方向恒为 0（无垂直滚动）', () => {
    const camera = createCamera();
    for (const x of [0, 800, 1600, 3000, 6000]) {
      updateCamera(camera, makePlayer(x), level);
      expect(camera.y).toBe(0);
    }
  });
});
