# 迷你马里奥 mini-mario

一个运行在浏览器中的 2D 横向卷轴平台跳跃小游戏（玩法类似《超级马里奥》），
使用 **HTML5 Canvas + 原生 JavaScript** 编写，无框架、无外部素材：
视差背景、角色动画、粒子特效、WebAudio 合成音效与背景音乐全部由代码生成。

## 玩法（v2）

- 🏃 方向键 ← → 移动，空格（或 ↑）跳跃（**按住跳更高**）；手机上左下 ◀ ▶、右下「跳」、右上 ⏸ 暂停
- ✨ 操作手感：土狼时间（离开平台边缘 0.1s 内仍可起跳）、跳跃缓冲（空中按跳落地自动起跳）、可变跳跃高度
- 🪙 收集金币（+100 分）· 👾 踩敌人消灭敌人（+100 分），侧面碰到会被击退并进入无敌闪烁
- 🌵 踩到钉刺或掉进深渊 → 死亡回**最近检查点**（无限命，记录死亡次数）
- 🚩 触碰终点旗帜通关：奖励 = max(300, 1500 − 死亡次数 × 300)
- ⏸️ P / Esc 暂停（世界完全冻结，可继续或重新开始）· 🏆 最高分持久化保存在浏览器
- 🎵 原创芯片风格音效与循环背景音乐
- 单关长度 200 列（约 6.7 屏）：8 个敌人、30 个金币、6 组钉刺、2 个中途检查点

## 快速开始

```bash
npm install        # 首次运行
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
```

## 部署上线

游戏是纯静态网站（无后端），`dist/` 目录即为可部署的完整站点（已包含相对路径，任意子路径可用）。

### 方式一：Netlify Drop 拖拽部署（免注册，最快）

1. 打开 <https://app.netlify.com/drop>
2. 把整个 `dist/` 文件夹拖进网页虚线框
3. 几秒后获得公开网址（形如 `https://xxx.netlify.app`），发给任何人即可游玩

> 注意：Netlify 免费域名在中国大陆部分网络环境下可能无法访问或较慢。

### 方式二：GitHub Desktop + GitHub Pages（推荐，免费且国内可达性较好）

**准备（一次）**：安装 [GitHub Desktop](https://desktop.github.com/) 并登录 GitHub 账号。

**发布仓库**：

1. 打开 GitHub Desktop → `File → Add local repository` → 选择 `E:\deepseek\mini-mario` 文件夹
2. 顶部点击 `Publish repository` → 名称填 `mini-mario` → **取消勾选** `Keep this code private`（必须公开才能免费开启 Pages）→ `Publish Repository`
3. 浏览器打开 `github.com/<你的用户名>/mini-mario` 确认代码已上传

**开启 Pages**：

1. 仓库页 → `Settings` → 左侧 `Pages`
2. `Source` 选择 `Deploy from a branch` → 分支选 `main`、目录选 `/ (root)` → `Save`
3. 等待 1~3 分钟，网站上线于：`https://<你的用户名>.github.io/mini-mario/`

以后改了代码，在 GitHub Desktop 里提交（左下角填说明 → `Commit to main` → `Push origin`），网站自动更新。

### 单文件版（可选）

`npm run bundle` 会把全部 13 个模块内联生成一个 `dist/index.html`（约 50KB，双击即可离线游玩），
也适合拖拽到任意静态托管（如 Netlify Drop）。

### 方式三：Vercel / Cloudflare Pages（绑定自定义域名更灵活）

- Vercel：导入 GitHub 仓库，框架选 Vite（构建命令 `npm run build`，输出目录 `dist`）
- Cloudflare Pages：同样配置构建命令与输出目录即可

## 测试

```bash
npm run test       # 运行全部单元测试（Vitest）
npm run test:watch # 监听模式
```

测试覆盖核心逻辑（物理、碰撞、玩家、敌人、关卡解析、游戏状态机、镜头），
渲染层通过 `npm run dev` 人工验收。

## 项目结构

```
mini-mario/
├── docs/
│   ├── SPEC.md          # 需求规范文档（模块职责、常量、关卡格式、验收标准）
│   └── TEST_CASES.md    # 测试用例文档（TC 编号与 Vitest 测试一一对应）
├── index.html           # 页面入口（canvas + 触屏按钮）
├── src/
│   ├── core/            # 纯逻辑模块（无浏览器 API，可单元测试）
│   │   ├── constants.js # 全部游戏常量
│   │   ├── physics.js   # 重力积分、AABB 相交
│   │   ├── collision.js # 分轴碰撞响应、踩踏/拾取/旗帜/钉刺/检查点判定
│   │   ├── player.js    # 玩家：移动/跳跃/土狼时间/跳跃缓冲/可变跳/击退
│   │   ├── enemy.js     # 敌人：巡逻/撞墙转身/悬崖转身
│   │   ├── level.js     # 关卡解析（内置单关 200 列 ASCII 地图）
│   │   ├── camera.js    # 镜头跟随与边界钳制
│   │   ├── highscore.js # 最高分纯函数
│   │   └── game.js      # 状态机：暂停/检查点/死亡计数/计分/事件输出
│   └── game/
│       ├── input.js     # 键盘 + 触屏虚拟按钮 + 暂停
│       ├── audio.js     # WebAudio 合成音效与背景音乐
│       ├── renderer.js  # Canvas 绘制（视差/动画/粒子）
│       └── main.js      # 游戏主循环与装配
└── tests/               # Vitest 测试（与 TEST_CASES.md 对应）
```

## 开发流程说明

本项目按「需求讨论 → 规范文档（docs/SPEC.md）→ 测试用例文档（docs/TEST_CASES.md）
→ TDD 编码（先写测试再实现）」的流程开发，全部测试通过即视为满足规范。
