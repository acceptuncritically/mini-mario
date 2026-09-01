import { describe, it, expect } from 'vitest';
import { parseLevel, LEVELS } from '../src/core/level.js';
import {
  TILE_SIZE, LEVEL_ROWS, LEVEL_WIDTH_TILES, SPIKE_W, SPIKE_H, SPIKE_OFFSET_Y,
} from '../src/core/constants.js';
import { makeLevel } from './helpers.js';

function countChar(map, ch) {
  return map.split('').filter((c) => c === ch).length;
}

describe('level 关卡模块', () => {
  it('TC-LVL-01 解析合法 17×200 地图：rows/cols/widthPx/heightPx 正确', () => {
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '#'.repeat(200),
      '#'.repeat(200),
    ]);
    expect(level.rows).toBe(LEVEL_ROWS);
    expect(level.cols).toBe(LEVEL_WIDTH_TILES);
    expect(level.tileSize).toBe(TILE_SIZE);
    expect(level.widthPx).toBe(LEVEL_WIDTH_TILES * TILE_SIZE); // 6400
    expect(level.heightPx).toBe(LEVEL_ROWS * TILE_SIZE); // 544
  });

  it('TC-LVL-02 解析后查询 isSolid：`#` 处为真，空地与其他图例处为假', () => {
    const level = makeLevel([
      ...Array.from({ length: 8 }, () => ''),
      '          #',
      ...Array.from({ length: 6 }, () => ''),
      '   ### S K',
      '#'.repeat(200),
    ]);
    expect(level.isSolid(4, 15)).toBe(true);
    expect(level.isSolid(10, 8)).toBe(true);
    expect(level.isSolid(0, 15)).toBe(false);
    expect(level.isSolid(50, 15)).toBe(false);
    expect(level.isSolid(0, 0)).toBe(false);
    // S（col 7）/ K（col 9）所在格不是固态格子
    expect(level.isSolid(7, 15)).toBe(false);
    expect(level.isSolid(9, 15)).toBe(false);
  });

  it('TC-LVL-03 解析 C/E/P/F：金币/敌人坐标与数量正确，出生点与旗帜区域坐标正确', () => {
    const level = makeLevel([
      ...Array.from({ length: 5 }, () => ''),
      '          C', // 金币 (col 10, row 5)
      ...Array.from({ length: 8 }, () => ''),
      '  P' + ' '.repeat(17) + 'E' + ' '.repeat(69) + 'F',
      '#'.repeat(200),
      '#'.repeat(200),
    ]);
    expect(level.coins).toEqual([{ x: 10 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 }]);
    expect(level.enemies).toEqual([{ x: 20 * TILE_SIZE, y: 14 * TILE_SIZE }]);
    expect(level.playerSpawn).toEqual({ x: 2 * TILE_SIZE, y: 14 * TILE_SIZE });
    expect(level.flag).toEqual({ x: 90 * TILE_SIZE, y: 14 * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
  });

  it('TC-LVL-04 解析 S 与 K：钉刺碰撞盒与检查点坐标正确（检查点按列升序）', () => {
    const level = makeLevel([
      ...Array.from({ length: 14 }, () => ''),
      '  S K' + ' '.repeat(3) + 'K',
      '#'.repeat(200),
      '#'.repeat(200),
    ]);
    // 钉刺：col 2, row 14 → x=2*32+3, y=14*32+SPIKE_OFFSET_Y
    expect(level.spikes).toEqual([
      { x: 2 * TILE_SIZE + (TILE_SIZE - SPIKE_W) / 2, y: 14 * TILE_SIZE + SPIKE_OFFSET_Y, w: SPIKE_W, h: SPIKE_H },
    ]);
    // 检查点：col 4 与 col 8（升序）
    expect(level.checkpoints).toEqual([
      { x: 4 * TILE_SIZE, y: 14 * TILE_SIZE },
      { x: 8 * TILE_SIZE, y: 14 * TILE_SIZE },
    ]);
  });

  it('TC-LVL-05 某行不足 200 字符：自动补空格，不报错；isSolidPx 越界返回 false', () => {
    const level = makeLevel([
      '#'.repeat(50),
    ]);
    expect(level.rows).toBe(LEVEL_ROWS);
    expect(level.cols).toBe(LEVEL_WIDTH_TILES);
    expect(level.isSolid(0, 0)).toBe(true);
    expect(level.isSolid(60, 0)).toBe(false);
    expect(level.solids[0].length).toBe(200);
    expect(level.isSolidPx(-1, 0)).toBe(false);
    expect(level.isSolidPx(200 * TILE_SIZE, 0)).toBe(false);
    expect(level.isSolidPx(0, 17 * TILE_SIZE)).toBe(false);
  });

  it('TC-LVL-06 内置 LEVELS：仅 1 关，17×200，内容数量符合设计约束', () => {
    expect(LEVELS).toHaveLength(1);
    const map = LEVELS[0];
    const rows = map.split('\n');
    expect(rows).toHaveLength(17);
    for (const row of rows) {
      expect(row.length).toBe(200);
    }
    expect(countChar(map, 'P')).toBe(1);
    expect(countChar(map, 'F')).toBe(1);
    const level = parseLevel(map);
    expect(level.coins.length).toBeGreaterThanOrEqual(25);
    expect(level.enemies.length).toBeGreaterThanOrEqual(6);
    expect(level.spikes.length).toBeGreaterThanOrEqual(6);
    expect(level.checkpoints).toHaveLength(2);
  });
});
