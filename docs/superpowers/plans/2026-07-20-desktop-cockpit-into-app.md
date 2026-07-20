# 桌面驾驶舱并入 APP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将桌面驾驶舱三栏能力按方案一拆入「衡」「习」Tab，交付可交互手机原型。

**Architecture:** 衡页在主攻环下叠加五维雷达+分数列表，目标区保持看板式进度条；习页顶部增加今日提醒时间线。全部复用 `state.scores` / `goals` / `habits`；无本地数据时种子演示数据。

**Tech Stack:** 静态 HTML/CSS/JS PWA（`/Users/janeanderson/Downloads/墨衡/`），SVG 雷达，无新依赖。

**Spec:** `docs/superpowers/specs/2026-07-20-desktop-cockpit-into-app-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `index.html` | 衡：五维态势 DOM；习：时间线容器；缓存版本号 |
| `css/style.css` | 雷达、分数行、时间线样式 |
| `js/script.js` | 演示种子、`renderPentagonRadar`、`renderDimScores`、`renderRemindTimeline`、接线 `renderAll` |

---

### Task 1: HTML 结构

**Files:** Modify `index.html`

- [ ] 在 `#dangerAlert` 后插入五维态势区块（`#radarSvg`、`#dimScoreList`）
- [ ] 习页 greeting 后插入 `#remindTimeline`
- [ ] 资源 `?v=20260720a`

### Task 2: CSS

**Files:** Modify `css/style.css`

- [ ] `.radar-panel` / `.radar-wrap` / `.dim-score-list` / `.dim-score-row.is-focus`
- [ ] `.timeline` / `.timeline-item` / `.timeline-item.done`

### Task 3: JS — 演示数据 + 雷达 + 分数列表

**Files:** Modify `js/script.js`

- [ ] `createDemoState()`：分数贴近截图，含 3 主攻 + 2 保底 + 若干习惯
- [ ] 无 localStorage 时用 demo 种子并 `saveStateToLocalStorage`
- [ ] `updateFocusRing()`（原 ring 逻辑）；`renderPentagonRadar()` 真五维 SVG
- [ ] `renderDimScores()` 分数列表，主攻高亮
- [ ] `renderAll` / 分数变更 / 主攻切换后刷新雷达与列表

### Task 4: JS — 提醒时间线

**Files:** Modify `js/script.js`

- [ ] `habitSortTime(h)`：从 `h.time` 取可排序 HH:MM（多段取后者）
- [ ] `renderRemindTimeline()`：`on !== false` 的习惯按时间升序
- [ ] `renderHabitsList` / `updateCheckInUI` 同步刷新时间线

### Task 5: 验收与推送

- [ ] 本地打开核对衡/习结构
- [ ] commit + push Mo-Heng / moheng

---

## Spec coverage

| Spec 项 | Task |
|---------|------|
| 衡：保留环 + 雷达 + 分数 | 1, 2, 3 |
| 衡：目标看板（现有卡片已有进度条） | 已有 `goalCard`，标题文案微调即可 |
| 习：时间线 | 1, 2, 4 |
| 复/我驱动刷新 | 3 |
| 演示数据 | 3 |
| Tab/safe-area 不破坏 | 不改强制覆盖块 |
