// 单文件版构建脚本：把 src/ 下 11 个 ES 模块内联合并成一个可独立运行的 index.html。
// 产物：dist/index.html（双击可玩，也适合拖拽部署到任意静态托管）。
// 用法：node scripts/build-single-file.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 依赖顺序：常量 → 物理 → 碰撞 → 实体 → 关卡 → 镜头 → 状态机 → 输入/渲染/主循环
const ORDER = [
  'src/core/constants.js',
  'src/core/physics.js',
  'src/core/collision.js',
  'src/core/player.js',
  'src/core/enemy.js',
  'src/core/level.js',
  'src/core/camera.js',
  'src/core/game.js',
  'src/game/input.js',
  'src/game/renderer.js',
  'src/game/main.js',
];

let bundle = '// mini-mario 单文件合并构建（自动生成，勿手改）\n';
for (const rel of ORDER) {
  let code = await readFile(path.join(ROOT, rel), 'utf8');
  code = code.replace(/^import[^;]*?;\s*$/gm, '');          // 去除 import 语句（均为单行）
  code = code.replace(/^export\s+(const|function|class|let|var)\s+/gm, '$1 '); // 去除 export 关键字
  bundle += `\n// ============ ${rel} ============\n${code.trim()}\n`;
}

if (/<\/script/i.test(bundle)) {
  throw new Error('合并代码中含有 </script> 序列，无法内联到 HTML');
}

const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const inlined = html.replace(
  /<script type="module" src="\.\/src\/game\/main\.js"><\/script>/,
  () => `<script>\n${bundle}\n</script>`,
);
if (!inlined.includes('<script>\n// mini-mario 单文件合并构建')) {
  throw new Error('index.html 中未找到模块脚本标签，替换失败');
}

await mkdir(path.join(ROOT, 'dist'), { recursive: true });
await writeFile(path.join(ROOT, 'dist', 'index.html'), inlined, 'utf8');
console.log(`单文件版已生成: dist/index.html (${(inlined.length / 1024).toFixed(1)} KB)`);
console.log(`合并模块: ${ORDER.length} 个`);
