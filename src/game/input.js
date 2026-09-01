// 输入抽象（SPEC v2 第 6 节）：键盘 + 触屏虚拟按钮 + 暂停
// 接口：isLeft() / isRight() / consumeJump()（边沿）/ isJumpHeld()（按住）/ consumePause()（边沿）
// 键盘：←/→（A/D）移动；空格/↑/Enter 跳跃；P/Esc 暂停/继续
// 触屏：左下 ◀ ▶、右下「跳」、右上「⏸」暂停按钮；仅触屏设备显示；多点触控互不干扰

export function createInput() {
  const keyState = { left: false, right: false, jump: false };
  const touchState = { left: false, right: false, jump: false };
  let jumpQueued = false;
  let pauseQueued = false;

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
      keyState.jump = true;
      jumpQueued = true;
      e.preventDefault();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      pauseQueued = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keyState.left = false;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keyState.right = false;
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      keyState.jump = false;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ---- 触屏 ----
  const controls = document.getElementById('touch-controls');
  const pauseBtn = document.getElementById('btn-pause');
  const buttons = controls ? Array.from(controls.querySelectorAll('.touch-btn')) : [];

  function onPointerDown(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    if (action === 'left') touchState.left = true;
    else if (action === 'right') touchState.right = true;
    else if (action === 'jump') {
      touchState.jump = true;
      jumpQueued = true;
    }
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
    else if (action === 'jump') touchState.jump = false;
    btn.classList.remove('pressed');
  }

  for (const btn of buttons) {
    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('pointerup', releaseButton);
    btn.addEventListener('pointercancel', releaseButton);
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('pointerdown', (e) => {
      pauseQueued = true;
      pauseBtn.classList.add('pressed');
      if (pauseBtn.setPointerCapture) {
        try { pauseBtn.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
      }
      e.preventDefault();
    });
    pauseBtn.addEventListener('pointerup', () => pauseBtn.classList.remove('pressed'));
    pauseBtn.addEventListener('pointercancel', () => pauseBtn.classList.remove('pressed'));
  }

  // 仅触屏设备显示虚拟按钮与暂停按钮
  const isTouchDevice = ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0)
    || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
  if (isTouchDevice) {
    if (controls) controls.hidden = false;
    if (pauseBtn) pauseBtn.hidden = false;
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
    // 跳跃键是否按住（可变跳跃高度用）
    isJumpHeld: () => keyState.jump || touchState.jump,
    // 读取并清除暂停边沿信号
    consumePause: () => {
      const v = pauseQueued;
      pauseQueued = false;
      return v;
    },
  };
}
