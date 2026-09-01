// 关卡模块（SPEC v2 第 7 节）：ASCII 地图解析与查询、内置单关（200 列）
import {
  TILE_SIZE, LEVEL_ROWS, LEVEL_WIDTH_TILES,
  COIN_SIZE, ENEMY_SIZE, SPIKE_W, SPIKE_H, SPIKE_OFFSET_Y,
} from './constants.js';

// 解析 ASCII 地图文本为关卡数据结构（SPEC v2 7）
// 每关 17 行字符串，每行 200 个字符（不足自动补空格）
// 图例：# 固态 | C 金币 | E 敌人 | P 出生点 | F 旗帜 | S 钉刺 | K 检查点 | 空格 空地
export function parseLevel(mapText) {
  const lines = String(mapText).split('\n');

  const rows = [];
  for (let r = 0; r < LEVEL_ROWS; r += 1) {
    const raw = (lines[r] ?? '').replace(/\r/g, '');
    rows.push(raw.slice(0, LEVEL_WIDTH_TILES).padEnd(LEVEL_WIDTH_TILES, ' '));
  }

  const solids = rows.map((row) => row.split('').map((ch) => ch === '#'));

  const coins = [];        // 金币中心坐标（px）
  const enemies = [];      // 敌人出生点（px，左上角）
  const spikes = [];       // 钉刺碰撞盒（px 矩形）
  const checkpoints = [];  // 检查点所在格左上角（px，按列升序）
  let playerSpawn = { x: TILE_SIZE, y: 0 }; // 缺失时默认 (32, 0)
  let flag = null;

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
      } else if (ch === 'S') {
        spikes.push({
          x: c * TILE_SIZE + (TILE_SIZE - SPIKE_W) / 2,
          y: r * TILE_SIZE + SPIKE_OFFSET_Y,
          w: SPIKE_W,
          h: SPIKE_H,
        });
      } else if (ch === 'K') {
        checkpoints.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
      }
    }
  }

  // 按列升序排列检查点
  checkpoints.sort((a, b) => a.x - b.x);

  const level = {
    rows: LEVEL_ROWS,
    cols: LEVEL_WIDTH_TILES,
    tileSize: TILE_SIZE,
    widthPx: LEVEL_WIDTH_TILES * TILE_SIZE,
    heightPx: LEVEL_ROWS * TILE_SIZE,
    solids,
    coins,
    enemies,
    spikes,
    checkpoints,
    playerSpawn,
    flag,
  };

  level.isSolid = (col, row) => {
    if (col < 0 || col >= LEVEL_WIDTH_TILES || row < 0 || row >= LEVEL_ROWS) return false;
    return solids[row][col];
  };

  level.isSolidPx = (x, y) => level.isSolid(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));

  return level;
}

// 内置单关（SPEC v2 7：17 行 × 200 列）
// 设计：8 深渊 / 8 敌人 / 30 金币 / 6 组钉刺 / 2 中途检查点 / 3 浮空平台
// 前 20 列教学区；旗帜前 10 列无敌人
const LEVEL1 = [
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                  CCCC                                                                                                                                                  ",
  "                                         CC       ####                                      ####                          ####                                                                          ",
  "        CCCC                  CCCC                ####                              CCCC    ####                    CCCC  ####                                    CCCC                      CCCC        ",
  "  P                       E         SS        E         SS        K         E   SS                        E   SSS                       K         E   SS      E                 E   SS  E          F    ",
  "####################   #################    ################   #######   ###########################   ###########################   #######   ###########################   ###########################",
  "####################   #################    ################   #######   ###########################   ###########################   #######   ###########################   ###########################",
].join('\n');

export const LEVELS = [LEVEL1];
