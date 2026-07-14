/* 墨衡 · 客户端逻辑与 localStorage 持久化 */
const DIMS = [
  { id: "personal", name: "个人", sub: "睡眠 · 运动 · 深度时段" },
  { id: "family", name: "家庭", sub: "高质量陪伴" },
  { id: "career", name: "事业", sub: "关键产出" },
  { id: "team", name: "团队", sub: "协作与带教" },
  { id: "belief", name: "信念", sub: "原则澄清" },
];

const TEMPLATES = {
  sleep: {
    label: "睡眠达标",
    fields: [
      { key: "bedtime", label: "入睡时间", type: "time", default: "23:30" },
      { key: "daysPerWeek", label: "每周至少几天", type: "number", default: 5, min: 1, max: 7 },
      { key: "weeks", label: "坚持周数", type: "number", default: 4, min: 1, max: 52 },
    ],
    format: (m) => `每晚 ${m.bedtime} 前入睡（≥${m.daysPerWeek}天/周）`,
    chips: (m) => [
      { text: `入睡 ${m.bedtime}`, key: true },
      { text: `${m.daysPerWeek}天/周` },
      { text: `${m.weeks}周` },
    ],
  },
  exercise: {
    label: "运动习惯",
    fields: [
      { key: "timesPerWeek", label: "每周次数", type: "number", default: 2, min: 1, max: 14 },
      { key: "minutes", label: "每次分钟", type: "number", default: 30, min: 10, max: 180 },
      { key: "weeks", label: "坚持周数", type: "number", default: 4, min: 1, max: 52 },
    ],
    format: (m) => `每周运动 ≥ ${m.timesPerWeek} 次（${m.minutes}分钟），坚持 ${m.weeks} 周`,
    chips: (m) => [
      { text: `${m.timesPerWeek}次/周`, key: true },
      { text: `${m.minutes}分钟` },
      { text: `${m.weeks}周` },
    ],
  },
  deepwork: {
    label: "深度工作",
    fields: [
      { key: "minMinutes", label: "最少分钟", type: "number", default: 60, min: 15, max: 300 },
      { key: "maxMinutes", label: "最多分钟", type: "number", default: 90, min: 15, max: 360 },
      { key: "daysPerWeek", label: "每周至少几天", type: "number", default: 5, min: 1, max: 7 },
      { key: "weeks", label: "坚持周数", type: "number", default: 6, min: 1, max: 52 },
    ],
    format: (m) => `每日深度工作 ${m.minMinutes}–${m.maxMinutes} 分钟（≥${m.daysPerWeek}天/周）`,
    chips: (m) => [
      { text: `${m.minMinutes}-${m.maxMinutes}分钟`, key: true },
      { text: `${m.daysPerWeek}天/周` },
      { text: `${m.weeks || 6}周` },
    ],
  },
  accompany: {
    label: "高质量陪伴",
    fields: [
      { key: "timesPerWeek", label: "每周次数", type: "number", default: 1, min: 1, max: 7 },
      { key: "minutes", label: "每次分钟", type: "number", default: 45, min: 15, max: 240 },
      { key: "noPhone", label: "无手机", type: "select", options: ["是", "否"], default: "是" },
      { key: "weeks", label: "统计周数（滚动）", type: "number", default: 4, min: 1, max: 52 },
    ],
    format: (m) => `每周 ${m.timesPerWeek} 次${m.noPhone === "是" ? "无手机" : ""}陪伴 ≥${m.minutes} 分钟`,
    chips: (m) => [
      { text: `${m.timesPerWeek}次/周`, key: true },
      { text: `${m.minutes}分钟` },
      ...(m.noPhone === "是" ? [{ text: "无手机" }] : []),
    ],
  },
  output: {
    label: "关键产出",
    fields: [
      { key: "timesPerWeek", label: "每周件数", type: "number", default: 1, min: 1, max: 14 },
      { key: "note", label: "产出说明", type: "text", default: "最关键事业产出" },
      { key: "weeks", label: "统计周数（滚动）", type: "number", default: 4, min: 1, max: 52 },
    ],
    format: (m) => `每周完成 ${m.timesPerWeek} 件：${m.note}`,
    chips: (m) => [
      { text: `${m.timesPerWeek}件/周`, key: true },
      { text: m.note },
    ],
  },
  custom: {
    label: "自定义目标",
    fields: [
      { key: "title", label: "目标标题", type: "text", default: "" },
      { key: "metricLabel", label: "指标名（可选）", type: "text", default: "标准" },
      { key: "metricValue", label: "指标值（可自由填写）", type: "text", default: "" },
    ],
    format: (m) => {
      if (!m.title) return "请填写目标标题";
      return m.metricValue ? `${m.title}（${m.metricLabel}：${m.metricValue}）` : m.title;
    },
    chips: (m) => {
      const arr = [];
      if (m.metricValue) arr.push({ text: `${m.metricLabel || "指标"} ${m.metricValue}`, key: true });
      return arr;
    },
  },
};

let editingGoalId = null;

const DEMO_TODAY = "2026-07-14";

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return formatDate(new Date());
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

function buildLogs(count, endDate, includeEnd) {
  const logs = [];
  let cursor = includeEnd ? endDate : addDays(endDate, -1);
  for (let i = 0; i < count; i++) {
    logs.push(cursor);
    cursor = addDays(cursor, -1);
  }
  return logs.sort();
}

function createDefaultState() {
  // 无本地数据时的优雅初始态：清爽空壳，引导用户添加首个目标
  return {
    focus: "personal",
    belief: "",
    scores: { personal: 5, family: 5, career: 5, team: 5, belief: 5 },
    goals: [],
    habits: [],
    nextId: 1,
    nextHabitId: 1,
  };
}

const STORAGE_KEY = "moheng_data";
const LEGACY_STORAGE_KEYS = ["moheng_state_v1"];

/** 将全局 state 持久化到 localStorage（打卡等操作后立即调用） */
function saveStateToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * 从 localStorage 恢复 state。
 * @returns {boolean} 是否成功读到有效数据
 */
function loadStateFromLocalStorage() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let fromLegacy = false;
    if (!raw) {
      for (const key of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) {
          fromLegacy = true;
          break;
        }
      }
    }
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return false;
    if (!Array.isArray(data.goals) || !Array.isArray(data.habits)) return false;
    if (!data.scores || typeof data.scores !== "object") return false;

    // 补齐缺省字段，保证加载后 UI 稳定
    const base = createDefaultState();
    state = {
      ...base,
      ...data,
      scores: { ...base.scores, ...data.scores },
      goals: data.goals,
      habits: data.habits.map((h) => ({
        ...h,
        logs: Array.isArray(h.logs) ? h.logs : [],
        on: h.on !== false,
      })),
      focus: data.focus || base.focus,
      belief: typeof data.belief === "string" ? data.belief : "",
      nextId: Number(data.nextId) || 1,
      nextHabitId: Number(data.nextHabitId) || 1,
    };

    if (fromLegacy) {
      saveStateToLocalStorage();
    }
    return true;
  } catch (err) {
    return false;
  }
}

/** 启动时的 state；window.onload 中再尝试从本地覆盖 */
let state = createDefaultState();

function habitById(id) {
  return state.habits.find((h) => h.id === id);
}

function refToday() {
  // 持久化后按真实日期打卡；默认演示日志仍基于 DEMO_TODAY 种子
  return todayStr();
}

function habitDoneToday(h) {
  return (h.logs || []).includes(refToday());
}

function habitStreak(h) {
  const set = new Set(h.logs || []);
  let streak = 0;
  let cursor = set.has(refToday()) ? refToday() : addDays(refToday(), -1);
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * 周维度进度（主进度条）：
 * 本周进度 = min(100, round(本周打卡天数 / 每周目标 × 100))
 * 本周窗口 = [startDate + (weekNo-1)*7, startDate + weekNo*7 - 1]
 *
 * 全程累计仅作次要信息：全程已完成 / (每周目标 × 周数)
 */
function goalPeriod(g) {
  const m = g.metrics || {};
  const weeks = Number(m.weeks) || 4;
  const start = g.startDate || addDays(refToday(), -(weeks * 7 - 1));
  const end = addDays(start, weeks * 7 - 1);
  return { weeks, start, end };
}

function weeklyTarget(g) {
  const m = g.metrics || {};
  if (m.timesPerWeek != null) return Number(m.timesPerWeek);
  if (m.daysPerWeek != null) return Number(m.daysPerWeek);
  return 1;
}

function goalLogs(g) {
  const h = habitById(g.habitId);
  return [...new Set(h ? h.logs || [] : g.logs || [])];
}

function goalWeekNo(g) {
  const { weeks, start } = goalPeriod(g);
  const dayIndex = Math.max(0, Math.floor((parseDate(refToday()) - parseDate(start)) / 86400000));
  return Math.min(weeks, Math.max(1, Math.floor(dayIndex / 7) + 1));
}

function goalWeekWindow(g) {
  const { start, end, weeks } = goalPeriod(g);
  const weekNo = goalWeekNo(g);
  const weekStart = addDays(start, (weekNo - 1) * 7);
  let weekEnd = addDays(weekStart, 6);
  if (weekEnd > end) weekEnd = end;
  const cutoff = refToday() < weekEnd ? refToday() : weekEnd;
  return { weekNo, weeks, weekStart, weekEnd, cutoff };
}

function countLogsInRange(logs, from, to) {
  return logs.filter((d) => d >= from && d <= to).length;
}

function goalWeekDone(g) {
  const { weekStart, cutoff } = goalWeekWindow(g);
  return countLogsInRange(goalLogs(g), weekStart, cutoff);
}

function goalOverallDone(g) {
  const { start, end } = goalPeriod(g);
  const cutoff = refToday() < end ? refToday() : end;
  return countLogsInRange(goalLogs(g), start, cutoff);
}

function goalTargetTotal(g) {
  return weeklyTarget(g) * goalPeriod(g).weeks;
}

/** 主进度：本周完成度 */
function calcGoalProgress(g) {
  const target = weeklyTarget(g);
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((goalWeekDone(g) / target) * 100)));
}

/** 次要：全程累计完成度 */
function calcOverallProgress(g) {
  const total = goalTargetTotal(g);
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((goalOverallDone(g) / total) * 100)));
}

function goalProgressMeta(g) {
  const { weekNo, weeks, weekStart, weekEnd } = goalWeekWindow(g);
  const weekTarget = weeklyTarget(g);
  const weekDone = goalWeekDone(g);
  const overallDone = goalOverallDone(g);
  const overallTotal = goalTargetTotal(g);
  return {
    weekNo,
    weeks,
    weekStart,
    weekEnd,
    weekDone,
    weekTarget,
    overallDone,
    overallTotal,
    weekProgress: calcGoalProgress(g),
    overallProgress: calcOverallProgress(g),
    // 兼容旧字段
    done: weekDone,
    total: weekTarget,
  };
}

function recomputeAllProgress() {
  state.goals.forEach((g) => {
    g.progress = calcGoalProgress(g);
    const meta = goalProgressMeta(g);
    g.due = `W${meta.weekNo}/${meta.weeks}`;
  });
}

function dimName(id) {
  return DIMS.find((d) => d.id === id)?.name || id;
}

function goalTitle(g) {
  const tpl = TEMPLATES[g.template] || TEMPLATES.custom;
  return tpl.format(g.metrics || {});
}

function goalChips(g) {
  const tpl = TEMPLATES[g.template] || TEMPLATES.custom;
  return tpl.chips(g.metrics || {});
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === name));
  document.getElementById("phoneScroll").scrollTop = 0;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

function focusGoals() {
  return state.goals.filter((g) => g.type === "main" && g.dim === state.focus);
}

function focusProgress() {
  const gs = focusGoals();
  if (!gs.length) return 0;
  return Math.round(gs.reduce((a, g) => a + calcGoalProgress(g), 0) / gs.length);
}

/** 首页主攻进度环（轻量图表） */
function renderRadarChart() {
  const pct = focusProgress();
  const pctEl = document.getElementById("focusPct");
  const ringEl = document.getElementById("focusRing");
  if (pctEl) pctEl.textContent = pct + "%";
  if (ringEl) ringEl.style.strokeDashoffset = String(188.4 * (1 - pct / 100));
}

function renderFocus() {
  const d = DIMS.find((x) => x.id === state.focus);
  document.getElementById("focusTitle").textContent = d.name;
  document.getElementById("focusSub").textContent = d.sub;
  renderRadarChart();
  document.getElementById("dangerAlert").classList.toggle(
    "show",
    Object.entries(state.scores).some(([, v]) => v < 3)
  );
}

function patchGoalCardEl(el, g) {
  const progress = calcGoalProgress(g);
  const meta = goalProgressMeta(g);
  const h = habitById(g.habitId);
  const doneToday = h ? habitDoneToday(h) : false;
  g.progress = progress;
  g.due = `W${meta.weekNo}/${meta.weeks}`;
  const bar = el.querySelector(".bar i");
  if (bar) bar.style.width = progress + "%";
  const metaSpans = el.querySelectorAll(".meta > span");
  if (metaSpans[0]) metaSpans[0].textContent = `本周 ${meta.weekDone}/${meta.weekTarget} · ${progress}%`;
  if (metaSpans[1]) metaSpans[1].textContent = `W${meta.weekNo}/${meta.weeks} · 全程 ${meta.overallDone}/${meta.overallTotal}`;
  const checkBtn = el.querySelector("[data-check]");
  if (checkBtn) checkBtn.textContent = doneToday ? "撤销今日" : "今日打卡";
}

function patchHabitPillEl(el, h) {
  const done = habitDoneToday(h);
  const streak = habitStreak(h);
  el.classList.toggle("done", done);
  const s = el.querySelector(".s");
  if (s) s.textContent = `${h.time} · 连续 ${streak} 天`;
  const btn = el.querySelector("button");
  if (btn) btn.textContent = done ? "已完成" : "打卡";
}

function patchHabitCardEl(el, h) {
  const done = habitDoneToday(h);
  const streak = habitStreak(h);
  const streakEl = el.querySelector(".streak");
  if (streakEl) streakEl.textContent = `连续 ${streak} 天 · ${dimName(h.dim)} · 累计 ${(h.logs || []).length} 次`;
  const remind = el.querySelector(".remind");
  if (remind) remind.textContent = `提醒时间 ${h.time}${done ? " · 今日已打卡" : " · 今日未完成"}`;
  const btn = el.querySelector(".chip-btn.action-btn, .actions .chip-btn.primary");
  if (btn) btn.textContent = done ? "撤销打卡" : "完成打卡";
  const toggle = el.querySelector(".toggle");
  if (toggle) toggle.classList.toggle("on", !!h.on);
}

/** 打卡后只刷新关联卡片，避免整页重绘 */
function updateCheckInUI(habitId) {
  const h = habitById(habitId);
  if (!h) return;
  document.querySelectorAll(`.goal[data-habit-id="${habitId}"]`).forEach((el) => {
    const g = state.goals.find((x) => String(x.id) === String(el.dataset.goalId));
    if (g) patchGoalCardEl(el, g);
  });
  document.querySelectorAll(`.habit-pill[data-habit-id="${habitId}"]`).forEach((el) => patchHabitPillEl(el, h));
  document.querySelectorAll(`.habit-card[data-habit-id="${habitId}"]`).forEach((el) => patchHabitCardEl(el, h));
  renderRadarChart();
}

function goalCard(g) {
  const progress = calcGoalProgress(g);
  const meta = goalProgressMeta(g);
  const h = habitById(g.habitId);
  const doneToday = h ? habitDoneToday(h) : false;
  const div = document.createElement("div");
  div.className = "goal";
  div.dataset.goalId = String(g.id);
  if (g.habitId != null) div.dataset.habitId = String(g.habitId);
  const chips = goalChips(g)
    .map((c) => `<span class="metric-chip${c.key ? " key" : ""}">${c.text}</span>`)
    .join("");
  div.innerHTML = `
    <div class="row">
      <div class="name">${goalTitle(g)}</div>
      <span class="tag ${g.type === "base" || g.dim !== state.focus ? "base" : ""}">${dimName(g.dim)} · ${g.type === "main" && g.dim === state.focus ? "主攻" : "保底"}</span>
    </div>
    ${chips ? `<div class="metrics">${chips}</div>` : ""}
    <div class="bar"><i style="width:${progress}%"></i></div>
    <div class="meta">
      <span>本周 ${meta.weekDone}/${meta.weekTarget} · ${progress}%</span>
      <span>W${meta.weekNo}/${meta.weeks} · 全程 ${meta.overallDone}/${meta.overallTotal}</span>
    </div>
    <div class="actions">
      <button class="chip-btn" data-edit type="button">编辑</button>
      <button class="chip-btn primary action-btn" data-check type="button">${doneToday ? "撤销今日" : "今日打卡"}</button>
    </div>
  `;
  div.querySelector("[data-edit]").addEventListener("click", (e) => {
    e.stopPropagation();
    openGoalModal(g.id);
  });
  div.querySelector("[data-check]").addEventListener("click", (e) => {
    e.stopPropagation();
    if (!g.habitId) {
      toast("该目标尚未关联习惯");
      return;
    }
    toggleHabit(g.habitId);
  });
  div.addEventListener("click", () => openGoalModal(g.id));
  return div;
}

function renderTodayGoals() {
  recomputeAllProgress();
  const main = document.getElementById("mainGoals");
  const base = document.getElementById("baseGoals");
  main.innerHTML = "";
  base.innerHTML = "";
  const mains = focusGoals().slice(0, 3);
  const bases = state.goals.filter((g) => !(g.type === "main" && g.dim === state.focus));
  if (!mains.length) {
    main.innerHTML = `<div class="goal"><div class="name" style="color:var(--ink-soft)">还没有主攻目标。点右上「+ 目标」，从睡眠 / 运动等模板开始。</div></div>`;
  } else {
    mains.forEach((g) => main.appendChild(goalCard(g)));
  }
  if (!bases.length) {
    base.innerHTML = `<div class="goal"><div class="name" style="color:var(--ink-soft)">暂无保底目标。其它维度可先加一条保底，守住下限即可。</div></div>`;
  } else {
    bases.forEach((g) => base.appendChild(goalCard(g)));
  }
}

function renderGoals() {
  renderTodayGoals();
}

function syncSleepHabit(bedtime) {
  const h = state.habits.find((x) => x.name.includes("睡眠"));
  if (!h || !bedtime) return;
  const wake = h.time.includes("/") ? h.time.split("/")[0].trim() : "07:00";
  const [hh, mm] = bedtime.split(":").map(Number);
  let total = hh * 60 + mm - 15;
  if (total < 0) total += 24 * 60;
  const rh = String(Math.floor(total / 60)).padStart(2, "0");
  const rm = String(total % 60).padStart(2, "0");
  h.time = `${wake} / ${rh}:${rm}`;
}

function syncExerciseHabit(minutes) {
  const h = state.habits.find((x) => x.name.includes("运动"));
  if (h && minutes) h.name = `运动 ${minutes} 分钟`;
}

function ensureLinkedHabit(g) {
  if (g.habitId && habitById(g.habitId)) return;
  const map = {
    sleep: { name: "睡眠打卡", time: "07:00 / 23:15", dim: "personal" },
    exercise: { name: `运动 ${g.metrics.minutes || 30} 分钟`, time: "18:30", dim: "personal" },
    deepwork: { name: "深度专注时段", time: "09:30", dim: "personal" },
    accompany: { name: "家庭陪伴提醒", time: "20:00", dim: "family" },
    output: { name: "关键产出打卡", time: "18:00", dim: "career" },
    custom: { name: g.metrics.title || "自定义打卡", time: "09:00", dim: g.dim },
  };
  const spec = map[g.template] || map.custom;
  const existing = state.habits.find((h) => h.name === spec.name);
  if (existing) {
    g.habitId = existing.id;
    return;
  }
  const id = state.nextHabitId++;
  state.habits.push({ id, name: spec.name, time: spec.time, on: true, dim: spec.dim || g.dim, logs: [] });
  g.habitId = id;
}

function renderHabitsList() {
  const strip = document.getElementById("habitStrip");
  const list = document.getElementById("habitList");
  strip.innerHTML = "";
  list.innerHTML = "";
  if (!state.habits.length) {
    strip.innerHTML = `<div class="habit-pill" style="opacity:.85"><div class="t">还没有习惯</div><div class="s">添加目标后会自动关联打卡</div></div>`;
    list.innerHTML = `<div class="habit-card"><h4 style="margin-bottom:6px">从第一个目标开始</h4><div class="streak">在「衡」中点「+ 目标」，打卡习惯会自动创建并出现在这里。</div></div>`;
    return;
  }
  const sorted = [...state.habits].sort((a, b) => (a.dim === state.focus ? -1 : 1) - (b.dim === state.focus ? -1 : 1));

  sorted.forEach((h) => {
    const done = habitDoneToday(h);
    const streak = habitStreak(h);
    const pill = document.createElement("div");
    pill.className = "habit-pill" + (done ? " done" : "");
    pill.dataset.habitId = String(h.id);
    pill.innerHTML = `
      <div class="t">${h.name}</div>
      <div class="s">${h.time} · 连续 ${streak} 天</div>
      <button type="button">${done ? "已完成" : "打卡"}</button>
    `;
    pill.querySelector("button").addEventListener("click", () => toggleHabit(h.id));
    strip.appendChild(pill);

    const card = document.createElement("div");
    card.className = "habit-card";
    card.dataset.habitId = String(h.id);
    card.innerHTML = `
      <div class="top">
        <div>
          <h4>${h.name}</h4>
          <div class="streak">连续 ${streak} 天 · ${dimName(h.dim)} · 累计 ${(h.logs || []).length} 次</div>
        </div>
        <button class="toggle ${h.on ? "on" : ""}" type="button" aria-label="提醒开关"></button>
      </div>
      <div class="remind">提醒时间 ${h.time}${done ? " · 今日已打卡" : " · 今日未完成"}</div>
      <div class="actions" style="display:flex;gap:6px;margin-top:10px">
        <button class="chip-btn primary action-btn" type="button">${done ? "撤销打卡" : "完成打卡"}</button>
      </div>
    `;
    card.querySelector(".toggle").addEventListener("click", () => {
      h.on = !h.on;
      saveStateToLocalStorage();
      patchHabitCardEl(card, h);
      toast(h.on ? "已开启提醒" : "已关闭提醒");
    });
    card.querySelector(".chip-btn").addEventListener("click", () => toggleHabit(h.id));
    list.appendChild(card);
  });
}

function renderHabits() {
  renderHabitsList();
}

function toggleHabit(id) {
  const h = habitById(id);
  if (!h) return;
  h.logs = h.logs || [];
  const idx = h.logs.indexOf(refToday());
  if (idx >= 0) {
    h.logs.splice(idx, 1);
    toast("已撤销今日打卡，进度已重算");
  } else {
    h.logs.push(refToday());
    h.logs.sort();
    toast(`已打卡：${h.name}，进度已更新`);
  }
  saveStateToLocalStorage();
  // 局部更新关联卡片，不触发全局 renderAll
  updateCheckInUI(id);
}

function renderScores() {
  const grid = document.getElementById("scoreGrid");
  grid.innerHTML = "";
  DIMS.forEach((d) => {
    const cell = document.createElement("div");
    cell.className = "score-cell";
    cell.innerHTML = `<div class="d">${d.name}</div><input type="number" min="1" max="10" value="${state.scores[d.id]}" data-dim="${d.id}" />`;
    cell.querySelector("input").addEventListener("change", (e) => {
      let v = Number(e.target.value);
      v = Math.max(1, Math.min(10, v || 1));
      e.target.value = v;
      state.scores[d.id] = v;
      saveStateToLocalStorage();
      renderFocus();
    });
    grid.appendChild(cell);
  });
}

function renderMe() {
  document.getElementById("beliefText").value = state.belief;
  const pick = document.getElementById("dimPick");
  pick.innerHTML = "";
  DIMS.forEach((d) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dim-opt" + (state.focus === d.id ? " active" : "");
    btn.innerHTML = `<span class="l">${d.name}</span><span class="r">${state.focus === d.id ? "当前主攻" : d.sub}</span>`;
    btn.addEventListener("click", () => {
      state.focus = d.id;
      saveStateToLocalStorage();
      renderAll();
      toast(`主攻维已切换为「${d.name}」`);
    });
    pick.appendChild(btn);
  });
}

function saveProfile() {
  state.belief = document.getElementById("beliefText").value.trim() || state.belief;
  saveStateToLocalStorage();
  toast("阶段设置已保存");
}

function saveReview() {
  const a = document.getElementById("rq1").value.trim();
  const b = document.getElementById("rq2").value.trim();
  if (!a && !b) {
    toast("先写一点复盘内容吧");
    return;
  }
  // 复盘文本暂仅提示；若后续扩展可写入 state.reviews
  saveStateToLocalStorage();
  toast("本周复盘已保存");
  renderFocus();
}

function defaultMetrics(templateId) {
  const tpl = TEMPLATES[templateId];
  const m = {};
  tpl.fields.forEach((f) => { m[f.key] = f.default; });
  return m;
}

function readMetricsFromForm() {
  const template = document.getElementById("gTemplate").value;
  const tpl = TEMPLATES[template];
  const metrics = {};
  tpl.fields.forEach((f) => {
    const el = document.getElementById("mf_" + f.key);
    if (!el) return;
    if (f.type === "number") {
      let v = Number(el.value);
      if (Number.isNaN(v)) v = f.default;
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      metrics[f.key] = v;
    } else {
      metrics[f.key] = el.value;
    }
  });
  return metrics;
}

function updatePreview() {
  const template = document.getElementById("gTemplate").value;
  const metrics = readMetricsFromForm();
  document.getElementById("goalPreview").textContent = "预览：" + TEMPLATES[template].format(metrics);
}

function renderMetricFields(templateId, metrics) {
  const tpl = TEMPLATES[templateId];
  const box = document.getElementById("metricFields");
  const vals = metrics || defaultMetrics(templateId);
  box.innerHTML = tpl.fields
    .map((f) => {
      const id = "mf_" + f.key;
      const val = vals[f.key] ?? f.default;
      if (f.type === "select") {
        const opts = f.options.map((o) => `<option value="${o}" ${o === val ? "selected" : ""}>${o}</option>`).join("");
        return `<div class="field"><label>${f.label}</label><select id="${id}">${opts}</select></div>`;
      }
      const inputType = f.type === "number" ? "number" : f.type === "time" ? "time" : "text";
      const extra = f.type === "number" ? ` min="${f.min ?? 0}" max="${f.max ?? 999}"` : "";
      const ph = f.type === "text" ? ` placeholder="可自由填写"` : "";
      return `<div class="field"><label>${f.label}</label><input id="${id}" type="${inputType}" value="${val}"${extra}${ph} /></div>`;
    })
    .join("");
  box.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });
  updatePreview();
}

function onTemplateChange() {
  renderMetricFields(document.getElementById("gTemplate").value);
}

function openGoalModal(goalId = null) {
  editingGoalId = goalId;
  const selTpl = document.getElementById("gTemplate");
  selTpl.innerHTML = Object.entries(TEMPLATES)
    .map(([id, t]) => `<option value="${id}">${t.label}</option>`)
    .join("");

  const selDim = document.getElementById("gDim");
  selDim.innerHTML = DIMS.map((d) => `<option value="${d.id}">${d.name}</option>`).join("");

  const delBtn = document.getElementById("gDeleteBtn");
  const title = document.getElementById("goalModalTitle");
  const saveBtn = document.getElementById("gSaveBtn");

  if (goalId != null) {
    const g = state.goals.find((x) => x.id === goalId);
    if (!g) return;
    title.textContent = "编辑目标";
    saveBtn.textContent = "保存调整";
    delBtn.style.display = "";
    selTpl.value = g.template;
    selDim.value = g.dim;
    document.getElementById("gType").value = g.type;
    document.getElementById("gStartDate").value = g.startDate || todayStr();
    const meta = goalProgressMeta(g);
    document.getElementById("gProgressHint").textContent =
      `本周 ${meta.weekDone}/${meta.weekTarget}（${calcGoalProgress(g)}%）· W${meta.weekNo}/${meta.weeks} · 全程 ${meta.overallDone}/${meta.overallTotal}（${meta.overallProgress}%）`;
    renderMetricFields(g.template, g.metrics);
  } else {
    title.textContent = "新建目标";
    saveBtn.textContent = "创建";
    delBtn.style.display = "none";
    selTpl.value = "sleep";
    selDim.value = state.focus;
    document.getElementById("gType").value = "main";
    document.getElementById("gStartDate").value = todayStr();
    document.getElementById("gProgressHint").textContent =
      "进度按「本周」自动计算：本周打卡次数 ÷ 每周目标；全程累计仅作参考";
    renderMetricFields("sleep");
  }
  document.getElementById("goalModal").classList.add("show");
}

function closeGoalModal() {
  editingGoalId = null;
  document.getElementById("goalModal").classList.remove("show");
}

function saveGoal() {
  const template = document.getElementById("gTemplate").value;
  const metrics = readMetricsFromForm();
  if (template === "custom" && !String(metrics.title || "").trim()) {
    toast("请填写目标标题");
    return;
  }
  const dim = document.getElementById("gDim").value;
  const type = document.getElementById("gType").value;
  const startDate = document.getElementById("gStartDate").value || todayStr();

  if (editingGoalId == null) {
    if (type === "main" && dim === state.focus && focusGoals().length >= 3) {
      toast("主攻目标最多 3 个");
      return;
    }
    const g = {
      id: state.nextId++,
      template,
      metrics,
      dim,
      type,
      startDate,
      due: "W1",
    };
    ensureLinkedHabit(g);
    state.goals.push(g);
    toast("目标已创建（进度自动计算）");
  } else {
    const g = state.goals.find((x) => x.id === editingGoalId);
    if (!g) return;
    const wasMainFocus = g.type === "main" && g.dim === state.focus;
    const willMainFocus = type === "main" && dim === state.focus;
    if (!wasMainFocus && willMainFocus && focusGoals().length >= 3) {
      toast("主攻目标最多 3 个");
      return;
    }
    g.template = template;
    g.metrics = metrics;
    g.dim = dim;
    g.type = type;
    g.startDate = startDate;
    ensureLinkedHabit(g);
    toast("目标已更新（进度已重算）");
  }

  if (template === "sleep") syncSleepHabit(metrics.bedtime);
  if (template === "exercise") syncExerciseHabit(metrics.minutes);

  saveStateToLocalStorage();
  closeGoalModal();
  renderAll();
  switchTab("home");
}

function deleteGoal() {
  if (editingGoalId == null) return;
  state.goals = state.goals.filter((g) => g.id !== editingGoalId);
  saveStateToLocalStorage();
  toast("目标已删除");
  closeGoalModal();
  renderAll();
}

document.getElementById("goalModal").addEventListener("click", (e) => {
  if (e.target.id === "goalModal") closeGoalModal();
});

function renderAll() {
  renderFocus();
  renderTodayGoals();
  renderHabitsList();
  renderRadarChart();
  renderScores();
  renderMe();
}

function initApp() {
  if (!state || !Array.isArray(state.goals) || !Array.isArray(state.habits)) {
    state = createDefaultState();
  }
  renderAll();
}

window.onload = function () {
  // 按要求：页面加载时立即从 localStorage 恢复
  const ok = loadStateFromLocalStorage();
  if (!ok) {
    state = createDefaultState();
  }
  initApp();
};
