// 输入抽象（SPEC 第 6 节）：键盘 + 触屏虚拟按钮
// 向上层暴露稳定接口：isLeft() / isRight() / consumeJump()
// - 键盘：←/→（或 A/D）持续移动；空格 / ↑ / Enter 跳跃（边沿触发，Enter 兼作开始键）
// - 触屏：左下 ◀ ▶ 方向按钮 + 右下「跳」按钮（pointerdown/up/cancel，多点触控互不干扰）
// - 仅触屏设备显示按钮；触屏设备上同样保留键盘输入

export function createInput() {
  const keyState = { left: false, right: false };
  let jumpQueued = false;

  // ---- 键盘 ----
  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keyState.left = true;
      e.preventDefault();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keyState.right = true;
      e.preventDefault();
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      jumpQueued = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keyState.left = false;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keyState.right = false;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ---- 触屏 ----
  const controls = document.getElementById('touch-controls');
  const touchState = { left: false, right: false };
  const buttons = controls ? Array.from(controls.querySelectorAll('.touch-btn')) : [];

  function onPointerDown(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    if (action === 'left') touchState.left = true;
    else if (action === 'right') touchState.right = true;
    else if (action === 'jump') jumpQueued = true;
    btn.classList.add('pressed');
    if (btn.setPointerCapture) {
      try { btn.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
    }
    e.preventDefault();
  }

  function releaseButton(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    if (action === 'left') touchState.left = false;
    else if (action === 'right') touchState.right = false;
    btn.classList.remove('pressed');
  }

  for (const btn of buttons) {
    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('pointerup', releaseButton);
    btn.addEventListener('pointercancel', releaseButton);
  }

  // 仅触屏设备显示虚拟按钮
  const isTouchDevice = ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0)
    || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
  if (isTouchDevice && controls) {
    controls.hidden = false;
  }

  return {
    isLeft: () => keyState.left || touchState.left,
    isRight: () => keyState.right || touchState.right,
    // 读取并清除跳跃边沿信号（每个逻辑帧最多触发一次）
    consumeJump: () => {
      const v = jumpQueued;
      jumpQueued = false;
      return v;
    },
  };
}
