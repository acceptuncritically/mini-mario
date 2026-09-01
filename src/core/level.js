// 关卡模块（SPEC 5.7 / 第 7 节）：ASCII 地图解析与查询、内置 3 关
import {
  TILE_SIZE, LEVEL_ROWS, LEVEL_WIDTH_TILES,
} from './constants.js';

// 解析 ASCII 地图文本为关卡数据结构（SPEC 7.3）
// 每关 17 行字符串，每行 100 个字符（不足自动补空格）
// 图例：# 固态格子 | C 金币 | E 敌人出生点 | P 玩家出生点 | F 终点旗帜 | . / 空格 空地
export function parseLevel(mapText) {
  const lines = String(mapText).split('\n');

  // 行补齐与截断：17 行 × 100 字符
  const rows = [];
  for (let r = 0; r < LEVEL_ROWS; r += 1) {
    const raw = (lines[r] ?? '').replace(/\r/g, '');
    rows.push(raw.slice(0, LEVEL_WIDTH_TILES).padEnd(LEVEL_WIDTH_TILES, ' '));
  }

  const solids = rows.map((row) => row.split('').map((ch) => ch === '#'));

  const coins = [];   // 金币中心坐标（px）
  const enemies = []; // 敌人出生点（px，左上角）
  let playerSpawn = { x: TILE_SIZE, y: 0 }; // 缺失时默认放在 (32, 0)
  let flag = null;    // 旗帜触发区域（F 所在格子整格）

  for (let r = 0; r < LEVEL_ROWS; r += 1) {
    const row = rows[r];
    for (let c = 0; c < LEVEL_WIDTH_TILES; c += 1) {
      const ch = row[c];
      if (ch === 'C') {
        coins.push({ x: c * TILE_SIZE + TILE_SIZE / 2, y: r * TILE_SIZE + TILE_SIZE / 2 });
      } else if (ch === 'E') {
        enemies.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
      } else if (ch === 'P') {
        playerSpawn = { x: c * TILE_SIZE, y: r * TILE_SIZE };
      } else if (ch === 'F') {
        flag = { x: c * TILE_SIZE, y: r * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
      }
    }
  }

  const level = {
    rows: LEVEL_ROWS,
    cols: LEVEL_WIDTH_TILES,
    tileSize: TILE_SIZE,
    widthPx: LEVEL_WIDTH_TILES * TILE_SIZE,
    heightPx: LEVEL_ROWS * TILE_SIZE,
    solids,
    coins,
    enemies,
    playerSpawn,
    flag,
  };

  // 格子坐标查询：范围外返回 false
  level.isSolid = (col, row) => {
    if (col < 0 || col >= LEVEL_WIDTH_TILES || row < 0 || row >= LEVEL_ROWS) return false;
    return solids[row][col];
  };

  // 像素坐标查询：范围外返回 false
  level.isSolidPx = (x, y) => level.isSolid(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));

  return level;
}

// ---------------------------------------------------------------------------
// 内置 3 关（17 行 × 100 字符）
// 第 1 关最简单（教学），第 3 关最难；金币约 10/14/16 个，敌人 2/3/4 个
// ---------------------------------------------------------------------------

const SPACE_ROW = ' '.repeat(100);

// 第 1 关：平坦教学关，两个小深渊，2 个敌人，10 个金币
const LEVEL1 = [
  SPACE_ROW,                            //  0
  SPACE_ROW,                            //  1
  SPACE_ROW,                            //  2
  SPACE_ROW,                            //  3
  SPACE_ROW,                            //  4
  SPACE_ROW,                            //  5
  SPACE_ROW,                            //  6
  SPACE_ROW,                            //  7
  SPACE_ROW,                            //  8
  SPACE_ROW,                            //  9
  SPACE_ROW,                            // 10
  '          '.repeat(4) + 'CCCC      ' + '          '.repeat(5),        // 11 金币列 40-43
  '          '.repeat(2) + '         C' + 'CC        ' + '####      ' + '          '.repeat(5), // 12 金币列 29-31 + 平台列 40-43
  '          '.repeat(6) + '  CCC     ' + '          '.repeat(3),        // 13 金币列 62-64
  '  P       ' + '      E   ' + '          '.repeat(5) + '        E ' + '          ' + '      F   ', // 14 实体
  '##########' + '##########' + '######### ' + '  ########' + '##########' + '######### ' + '  ########' + '##########' + '##########' + '##########', // 15 地面（深渊列 29-31, 59-61）
  '##########' + '##########' + '######### ' + '  ########' + '##########' + '######### ' + '  ########' + '##########' + '##########' + '##########', // 16 地面
].join('\n');

// 第 2 关：中等难度，三处深渊 + 浮空平台，3 个敌人，14 个金币
const LEVEL2 = [
  SPACE_ROW,                            //  0
  SPACE_ROW,                            //  1
  SPACE_ROW,                            //  2
  SPACE_ROW,                            //  3
  SPACE_ROW,                            //  4
  SPACE_ROW,                            //  5
  SPACE_ROW,                            //  6
  SPACE_ROW,                            //  7
  SPACE_ROW,                            //  8
  SPACE_ROW,                            //  9
  SPACE_ROW,                            // 10
  '          '.repeat(4) + '     CCCC ' + '          '.repeat(2) + ' C        ' + '          '.repeat(2), // 11 金币列 45-48 + 列 71
  '          '.repeat(2) + 'CCCC      ' + '          ' + '     #### ' + '          ' + 'CCCCC     ' + '          '.repeat(3), // 12 金币列 20-23、60-64 + 平台列 45-48
  SPACE_ROW,                            // 13
  '  P       ' + '  E       ' + '          ' + '        E ' + '          '.repeat(4) + '    E     ' + '      F   ', // 14 实体
  '##########' + '##########' + '    ######' + '##########' + '#####    #' + '##########' + '##########' + '    ######' + '##########' + '##########', // 15 地面（深渊列 20-23, 45-48, 70-73）
  '##########' + '##########' + '    ######' + '##########' + '#####    #' + '##########' + '##########' + '    ######' + '##########' + '##########', // 16 地面
].join('\n');

// 第 3 关：最难，三个深渊上铺跳跃垫脚石，4 个敌人，16 个金币
const LEVEL3 = [
  SPACE_ROW,                            //  0
  SPACE_ROW,                            //  1
  SPACE_ROW,                            //  2
  SPACE_ROW,                            //  3
  SPACE_ROW,                            //  4
  SPACE_ROW,                            //  5
  SPACE_ROW,                            //  6
  SPACE_ROW,                            //  7
  SPACE_ROW,                            //  8
  SPACE_ROW,                            //  9
  SPACE_ROW,                            // 10
  SPACE_ROW,                            // 11
  '          '.repeat(2) + '      CCCC' + '          '.repeat(7),        // 12 金币列 26-29
  '          ' + '      CC  ' + '  CC      ' + '          ' + '  CC   CC ' + '          ' + '     CC   ' + 'CC        ' + '          '.repeat(2), // 13 金币列 16/17/21/22/42/43/47/48/65/66/70/71
  '  P   E   ' + '      ##  ' + '  ##      ' + 'E         ' + '  ##   ## ' + '      E   ' + '     ##   ' + '##        ' + '     E    ' + '      F   ', // 14 实体 + 垫脚石
  '##########' + '#####     ' + '   #######' + '##########' + '#        #' + '##########' + '####      ' + '  ########' + '##########' + '##########', // 15 地面（深渊列 15-22, 41-48, 64-71）
  '##########' + '#####     ' + '   #######' + '##########' + '#        #' + '##########' + '####      ' + '  ########' + '##########' + '##########', // 16 地面
].join('\n');

// 内置 3 个关卡（第 1 关最简单、第 3 关最难）
export const LEVELS = [LEVEL1, LEVEL2, LEVEL3];
