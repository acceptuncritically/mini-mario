// 游戏状态机模块（SPEC v2 5.5~5.8）：无限命 / 检查点 / 死亡计数 / 暂停 / 最高分 / 事件输出
import {
  COIN_SCORE, STOMP_SCORE,
  CLEAR_BASE_BONUS, CLEAR_DEATH_PENALTY, CLEAR_MIN_BONUS,
  LEVEL_CLEAR_PAUSE, PIT_DEATH_MARGIN, FIXED_DT,
  STATE_TITLE, STATE_PLAYING, STATE_PAUSED, STATE_LEVEL_CLEAR, STATE_VICTORY,
} from './constants.js';
import { LEVELS, parseLevel } from './level.js';
import { createPlayer, updatePlayer, isInvincible, applyHurt, applyStompBounce } from './player.js';
import { createEnemy, updateEnemy } from './enemy.js';
import { aabbIntersect } from './physics.js';
import { isStomp, coinHit, flagHit, spikeHit, checkpointHit } from './collision.js';
import { createCamera, updateCamera } from './camera.js';
import { applyHighScore } from './highscore.js';

// 游戏状态机：TITLE → PLAYING ⇄ PAUSED；PLAYING → LEVEL_CLEAR → VICTORY；VICTORY → TITLE
// 存储注入：new Game({ loadScore, saveScore })，game 层用 localStorage 实现（键 HIGH_SCORE_KEY）
export class Game {
  constructor({ loadScore = () => 0, saveScore = () => {} } = {}) {
    this.loadScore = loadScore;
    this.saveScore = saveScore;
    this.state = STATE_TITLE;
    this.score = 0;
    this.deaths = 0;              // 死亡次数（无限命，不设命数）
    this.highScore = loadScore();
    this.levelIndex = 0;          // v2 恒为 0（单关）
    this.level = null;
    this.player = null;
    this.enemies = [];
    this.coins = [];
    this.spikes = [];
    this.checkpoints = [];        // 合并后的检查点（0 号 = 出生点）
    this.activeCheckpoint = 0;    // 最近激活的检查点下标
    this.camera = { x: 0, y: 0 };
    this.levelClearTimer = 0;
    this.events = [];             // 本帧语义事件（SPEC 5.8），帧首清空
  }

  emit(name) {
    this.events.push(name);
  }

  // 开始：TITLE → 重置分数/死亡/检查点 → 加载唯一关卡 → PLAYING
  start() {
    this.score = 0;
    this.deaths = 0;
    this.levelIndex = 0;
    this.loadLevel();
    this.state = STATE_PLAYING;
  }

  // 从暂停/任意位置重新开始本关：重置分数、死亡、检查点与实体
  restartRun() {
    this.score = 0;
    this.deaths = 0;
    this.levelIndex = 0;
    this.loadLevel();
    this.state = STATE_PLAYING;
  }

  // 加载关卡：解析地图、生成玩家/敌人/金币/钉刺/检查点（分数与死亡次数不受影响）
  loadLevel() {
    this.level = parseLevel(LEVELS[this.levelIndex]);
    this.coins = this.level.coins.map((c) => ({ ...c }));
    this.enemies = this.level.enemies.map((spawn) => createEnemy(spawn.x, spawn.y));
    this.spikes = this.level.spikes.map((s) => ({ ...s }));
    this.checkpoints = [
      { x: this.level.playerSpawn.x, y: this.level.playerSpawn.y }, // 0 号 = 出生点，默认激活
      ...this.level.checkpoints,
    ];
    this.activeCheckpoint = 0;
    this.player = createPlayer(this.level.playerSpawn.x, this.level.playerSpawn.y);
    this.camera = createCamera();
    this.levelClearTimer = 0;
  }

  // 每逻辑帧更新
  update(input, dt = FIXED_DT) {
    this.events = [];

    if (this.state === STATE_TITLE) {
      if (input.consumeJump()) {
        this.start();
        this.emit('start');
      }
      return;
    }

    if (this.state === STATE_PAUSED) {
      // 世界完全冻结：仅响应继续（暂停边沿）或重新开始（跳跃边沿）
      if (input.consumePause()) {
        this.state = STATE_PLAYING;
        this.emit('resume');
      } else if (input.consumeJump()) {
        this.restartRun();
        this.emit('start');
      }
      return;
    }

    if (this.state === STATE_LEVEL_CLEAR) {
      this.levelClearTimer += dt;
      if (this.levelClearTimer >= LEVEL_CLEAR_PAUSE) {
        this.state = STATE_VICTORY;
        this.highScore = applyHighScore(this.highScore, this.score);
        this.saveScore(this.highScore);
        this.emit('victory');
      }
      return;
    }

    if (this.state === STATE_VICTORY) {
      if (input.consumeJump()) {
        this.state = STATE_TITLE;
      }
      return;
    }

    // ---- PLAYING ----
    if (input.consumePause()) {
      this.state = STATE_PAUSED;
      this.emit('pause');
      return;
    }

    const playerEvents = updatePlayer(this.player, input, this.level, dt, () => this.handleEnemyContact());
    for (const ev of playerEvents) this.emit(ev);

    for (const enemy of this.enemies) {
      updateEnemy(enemy, this.level, dt);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    this.collectCoins();
    this.activateCheckpoints();
    this.checkFlag();
    if (this.state === STATE_LEVEL_CLEAR) return; // 碰旗后不再做死亡判定
    this.checkDeath();
    updateCamera(this.camera, this.player, this.level);
  }

  // 玩家与敌人交互：踩踏优先于受伤；受伤仅无敌+击退，不死亡（v2）
  handleEnemyContact() {
    const pRect = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const eRect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (!aabbIntersect(pRect, eRect)) continue;
      if (isStomp(this.player, enemy)) {
        enemy.dead = true;
        applyStompBounce(this.player);
        this.score += STOMP_SCORE;
        this.emit('stomp');
      } else if (!isInvincible(this.player)) {
        const dir = (this.player.x + this.player.w / 2) >= (enemy.x + enemy.w / 2) ? 1 : -1;
        applyHurt(this.player, dir);
        this.emit('hurt');
      }
    }
  }

  // 金币拾取：相交即拾取并加分、从关卡移除
  collectCoins() {
    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      if (coinHit(this.player, this.coins[i])) {
        this.coins.splice(i, 1);
        this.score += COIN_SCORE;
        this.emit('coin');
      }
    }
  }

  // 检查点激活：经过中途检查点（下标 1..n）即激活；仅在下标变化时输出事件
  activateCheckpoints() {
    for (let i = 1; i < this.checkpoints.length; i += 1) {
      if (checkpointHit(this.player, this.checkpoints[i]) && this.activeCheckpoint !== i) {
        this.activeCheckpoint = i;
        this.emit('checkpoint');
      }
    }
  }

  // 旗帜：触发通关，结算奖励（1500 − 死亡×300，下限 300）→ LEVEL_CLEAR
  checkFlag() {
    if (this.level.flag && flagHit(this.player, this.level.flag)) {
      const bonus = Math.max(CLEAR_MIN_BONUS, CLEAR_BASE_BONUS - this.deaths * CLEAR_DEATH_PENALTY);
      this.score += bonus;
      this.state = STATE_LEVEL_CLEAR;
      this.levelClearTimer = 0;
      this.emit('flag');
    }
  }

  // 死亡：坠落深渊或踩钉刺 → 死亡次数 +1，回最近激活检查点，实体复位（分数保留）
  checkDeath() {
    const fell = this.player.y > this.level.heightPx + PIT_DEATH_MARGIN;
    const spiked = this.spikes.some((s) => spikeHit(this.player, s));
    if (!fell && !spiked) return;

    this.deaths += 1;
    this.emit('death');
    this.respawn();
  }

  // 重生：玩家回到最近激活检查点，敌人/金币/钉刺恢复初始，无敌清零（重生不送无敌）
  respawn() {
    const cp = this.checkpoints[this.activeCheckpoint];
    this.enemies = this.level.enemies.map((spawn) => createEnemy(spawn.x, spawn.y));
    this.coins = this.level.coins.map((c) => ({ ...c }));
    this.spikes = this.level.spikes.map((s) => ({ ...s }));
    this.player = createPlayer(cp.x, cp.y);
  }
}
