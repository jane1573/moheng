# 墨衡 · 人生五维

墨衡是一款面向手机的人生节奏管理 App（PWA 原型）。围绕 **个人 · 家庭 · 事业 · 团队 · 信念** 五个维度，帮助你设定阶段主攻目标、打卡习惯，并做轻量周复盘。

## 能做什么

- **衡**：看清本阶段主攻维与 Top3 目标进度  
- **习**：习惯提醒与今日打卡  
- **复**：五维打分 + 简短复盘问答  
- **我**：切换主攻维、写下人生信念  

数据保存在浏览器 `localStorage`（键名 `moheng_data`）。`script.js` 中的 `saveStateToLocalStorage()` / `loadStateFromLocalStorage()` 会在打卡后立即写入，并在 `window.onload` 时恢复；无缓存时进入清爽空状态引导添加首个目标。

## 本地预览

在项目根目录用任意静态服务器打开即可，例如：

```bash
npx serve .
```

浏览器访问提示的本地地址，建议用手机或开发者工具的移动视口查看。

## 添加到 iPhone 主屏幕（PWA）

1. 用 Safari 打开部署后的网址  
2. 点「分享」→「添加到主屏幕」  
3. 从主屏幕图标进入即可全屏使用  

## 部署到 Vercel

1. 将本目录作为仓库根目录推送到 GitHub / GitLab  
2. 在 [Vercel](https://vercel.com) 导入该仓库  
3. Framework Preset 选 **Other**，输出目录保持默认即可（静态站点）  
4. 部署完成后用手机打开线上链接  

资源路径均为相对路径（如图标在 `./assets/`），无本地绝对路径依赖。

## 目录结构

```text
.
├── index.html          # 应用入口
├── css/style.css       # 样式
├── js/script.js        # 逻辑与 localStorage 持久化
├── manifest.json       # PWA 清单
├── assets/             # 图标等图片资源
├── docs/               # 设计说明（可选）
└── README.md
```

## 使用提示

- 先在「我」里确认本阶段 **主攻维**（默认「个人」）  
- 在「衡」添加主攻 Top3 / 保底目标，并用「今日打卡」推进进度  
- 周末到「复」给五维打分、写一到两句复盘即可  
