// 游戏状态机模块（SPEC 5.6 / 5.7）：生命 / 计分 / 关卡切换 / 胜负
import {
  START_LIVES, COIN_SCORE, STOMP_SCORE, LIFE_BONUS,
  LEVEL_CLEAR_PAUSE, PIT_DEATH_MARGIN, FIXED_DT,
  STATE_TITLE, STATE_PLAYING, STATE_LEVEL_CLEAR, STATE_VICTORY, STATE_GAME_OVER,
} from './constants.js';
import { LEVELS, parseLevel } from './level.js';
import { createPlayer, updatePlayer, isInvincible, applyHurt, applyStompBounce } from './player.js';
import { createEnemy, updateEnemy } from './enemy.js';
import { aabbIntersect } from './physics.js';
import { isStomp, coinHit, flagHit } from './collision.js';
import { createCamera, updateCamera } from './camera.js';

// 游戏状态机：TITLE → PLAYING → LEVEL_CLEAR → PLAYING / VICTORY，PLAYING → GAME_OVER
export class Game {
  constructor() {
    this.state = STATE_TITLE;
    this.lives = START_LIVES;
    this.score = 0;
    this.levelIndex = 0;
    this.level = null;
    this.player = null;
    this.enemies = [];
    this.coins = [];
    this.camera = { x: 0, y: 0 };
    this.levelClearTimer = 0;
  }

  // 开始操作：TITLE -> 重置生命/分数/第 1 关 -> PLAYING；GAME_OVER/VICTORY -> TITLE
  start() {
    if (this.state === STATE_TITLE) {
      this.lives = START_LIVES;
      this.score = 0;
      this.levelIndex = 0;
      this.loadLevel(0);
      this.state = STATE_PLAYING;
    } else if (this.state === STATE_GAME_OVER || this.state === STATE_VICTORY) {
      this.state = STATE_TITLE;
    }
  }

  // 加载指定关卡（解析地图、生成玩家/敌人/金币；生命与分数不受影响）
  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.coins = this.level.coins;
    this.enemies = this.level.enemies.map((spawn) => createEnemy(spawn.x, spawn.y));
    this.player = createPlayer(this.level.playerSpawn.x, this.level.playerSpawn.y);
    this.camera = createCamera();
    this.levelClearTimer = 0;
  }

  // 每逻辑帧更新
  update(input, dt = FIXED_DT) {
    if (this.state === STATE_TITLE) {
      if (input.consumeJump()) this.start();
      return;
    }

    if (this.state === STATE_GAME_OVER || this.state === STATE_VICTORY) {
      if (input.consumeJump()) this.state = STATE_TITLE;
      return;
    }

    if (this.state === STATE_LEVEL_CLEAR) {
      // 通关停留计时（世界冻结）；时长到后进入下一关或胜利
      this.levelClearTimer += dt;
      if (this.levelClearTimer >= LEVEL_CLEAR_PAUSE) {
        if (this.levelIndex >= LEVELS.length - 1) {
          this.state = STATE_VICTORY;
        } else {
          this.loadLevel(this.levelIndex + 1);
          this.state = STATE_PLAYING;
        }
      }
      return;
    }

    // ---- PLAYING ----
    updatePlayer(this.player, input, this.level, dt, () => this.handleEnemyContact());
    for (const enemy of this.enemies) {
      updateEnemy(enemy, this.level, dt);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.collectCoins();
    this.checkFlag();
    this.checkPit();
    updateCamera(this.camera, this.player, this.level);
  }

  // 玩家与敌人交互：踩踏优先于受伤
  handleEnemyContact() {
    const pRect = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const eRect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (!aabbIntersect(pRect, eRect)) continue;
      if (isStomp(this.player, enemy)) {
        // 踩踏：敌人死亡移除、玩家反弹、加分
        enemy.dead = true;
        applyStompBounce(this.player);
        this.score += STOMP_SCORE;
      } else if (!isInvincible(this.player)) {
        // 受伤：扣命并进入无敌
        applyHurt(this.player);
        this.lives -= 1;
        if (this.lives <= 0) {
          this.state = STATE_GAME_OVER;
        }
      }
    }
  }

  // 金币拾取：相交即拾取并加分、从关卡移除
  collectCoins() {
    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      if (coinHit(this.player, this.coins[i])) {
        this.coins.splice(i, 1);
        this.score += COIN_SCORE;
      }
    }
  }

  // 旗帜：触发通关，结算通关奖励（剩余生命 × LIFE_BONUS）
  checkFlag() {
    if (this.level.flag && flagHit(this.player, this.level.flag)) {
      this.score += this.lives * LIFE_BONUS;
      this.state = STATE_LEVEL_CLEAR;
      this.levelClearTimer = 0;
    }
  }

  // 坠落深渊：扣命；剩命 > 0 则当前关复位重生（分数保留），否则游戏结束
  checkPit() {
    if (this.player.y > this.level.heightPx + PIT_DEATH_MARGIN) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.state = STATE_GAME_OVER;
      } else {
        this.loadLevel(this.levelIndex);
      }
    }
  }
}
