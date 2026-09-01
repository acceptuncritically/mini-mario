import { describe, it, expect } from 'vitest';
import { parseLevel, LEVELS } from '../src/core/level.js';
import {
  TILE_SIZE, LEVEL_ROWS, LEVEL_WIDTH_TILES, COIN_SIZE,
} from '../src/core/constants.js';
import { makeLevel } from './helpers.js';

function countChar(map, ch) {
  return map.split('').filter((c) => c === ch).length;
}

describe('level 关卡模块', () => {
  it('TC-LVL-01 解析合法 17×100 地图：rows/cols/widthPx/heightPx 正确', () => {
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '#'.repeat(100),
      '#'.repeat(100),
    ]);
    expect(level.rows).toBe(LEVEL_ROWS);
    expect(level.cols).toBe(LEVEL_WIDTH_TILES);
    expect(level.tileSize).toBe(TILE_SIZE);
    expect(level.widthPx).toBe(LEVEL_WIDTH_TILES * TILE_SIZE); // 3200
    expect(level.heightPx).toBe(LEVEL_ROWS * TILE_SIZE); // 544
  });

  it('TC-LVL-02 解析后查询 isSolid：`#` 处为真，空地处为假', () => {
    const level = makeLevel([
      ...Array.from({ length: 8 }, () => ''),
      '          #'.padEnd(100, '.'), // 第 8 行第 10 列平台
      ...Array.from({ length: 6 }, () => ''),
      '   ###'.padEnd(100, '.'),      // 第 15 行第 3..5 列地面
      '#'.repeat(100),
    ]);
    expect(level.isSolid(4, 15)).toBe(true);
    expect(level.isSolid(10, 8)).toBe(true);
    expect(level.isSolid(0, 15)).toBe(false);
    expect(level.isSolid(50, 15)).toBe(false);
    expect(level.isSolid(0, 0)).toBe(false);
  });

  it('TC-LVL-03 解析 C/E/P/F：金币/敌人坐标与数量正确，出生点与旗帜区域坐标正确', () => {
    const level = makeLevel([
      ...Array.from({ length: 5 }, () => ''),
      '          C'.padEnd(100, '.'), // 金币 (col 10, row 5)
      ...Array.from({ length: 8 }, () => ''),
      '  P' + ' '.repeat(17) + 'E' + ' '.repeat(69) + 'F'.padEnd(100, ' '), // P/E/F 第 14 行
      '#'.repeat(100),
      '#'.repeat(100),
    ]);
    expect(level.coins).toEqual([{ x: 10 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 }]);
    expect(level.enemies).toEqual([{ x: 20 * TILE_SIZE, y: 14 * TILE_SIZE }]);
    expect(level.playerSpawn).toEqual({ x: 2 * TILE_SIZE, y: 14 * TILE_SIZE });
    expect(level.flag).toEqual({ x: 90 * TILE_SIZE, y: 14 * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
  });

  it('TC-LVL-04 某行不足 100 字符：自动补空格，不报错', () => {
    const level = makeLevel([
      '#'.repeat(50), // 只有 50 字符
    ]);
    expect(level.rows).toBe(LEVEL_ROWS);
    expect(level.cols).toBe(LEVEL_WIDTH_TILES);
    expect(level.isSolid(0, 0)).toBe(true);
    expect(level.isSolid(60, 0)).toBe(false); // 补空格区域为空地
    expect(level.solids[0].length).toBe(100);
  });

  it('TC-LVL-05 像素坐标查询 isSolidPx 正确；关卡范围外坐标返回 false', () => {
    const level = makeLevel([
      ...Array.from({ length: 15 }, () => ''),
      '     #'.padEnd(100, '.'), // 第 15 行第 5 列
      '#'.repeat(100),
    ]);
    expect(level.isSolidPx(5 * TILE_SIZE + 10, 15 * TILE_SIZE + 10)).toBe(true);
    expect(level.isSolidPx(10 * TILE_SIZE + 10, 15 * TILE_SIZE + 10)).toBe(false); // 空地
    expect(level.isSolidPx(-1, 0)).toBe(false);            // x 越界
    expect(level.isSolidPx(100 * TILE_SIZE, 0)).toBe(false); // x 恰好关卡宽
    expect(level.isSolidPx(0, 17 * TILE_SIZE)).toBe(false);  // y 恰好关卡高
  });

  it('TC-LVL-06 三关内置数据 LEVELS 校验：每关恰好 1 个出生点、1 个旗帜，至少 1 个金币、1 个敌人', () => {
    expect(LEVELS).toHaveLength(3);
    for (const map of LEVELS) {
      const rows = map.split('\n');
      expect(rows).toHaveLength(17);
      for (const row of rows) {
        expect(row.length).toBe(100); // 每行恰好 100 字符
      }
      const level = parseLevel(map);
      expect(countChar(map, 'P')).toBe(1);
      expect(countChar(map, 'F')).toBe(1);
      expect(level.coins.length).toBeGreaterThanOrEqual(1);
      expect(level.enemies.length).toBeGreaterThanOrEqual(1);
    }
  });
});
