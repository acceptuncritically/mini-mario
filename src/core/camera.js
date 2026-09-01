// 镜头模块（SPEC 5.8）：跟随玩家、边界钳制、垂直恒为 0
import { VIEW_WIDTH, PLAYER_WIDTH } from './constants.js';

// 创建镜头对象
export function createCamera() {
  return { x: 0, y: 0 };
}

// 更新镜头：x = clamp(玩家中心 x - VIEW_WIDTH/2, 0, 关卡像素宽 - VIEW_WIDTH)，y 恒 0
export function updateCamera(camera, player, level) {
  const targetX = player.x + PLAYER_WIDTH / 2 - VIEW_WIDTH / 2;
  const maxX = level.widthPx - VIEW_WIDTH;
  camera.x = Math.max(0, Math.min(targetX, maxX));
  camera.y = 0;
}
