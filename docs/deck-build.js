/*  build-deck.js
 *  Generates a real, editable .pptx (13 slides, 16:9) for
 *  编程助学智能体 · 项目答辩 (Programming Tutor).
 *
 *  Run:
 *    $env:NODE_PATH="<global node_modules>"
 *    & $env:OD_NODE_BIN build-deck.js
 */
'use strict';

const path = require('path');
const PptxGenJS = require('pptxgenjs');

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE';                 // 13.333in x 7.5in = 16:9
pres.title = '编程助学智能体 · 项目答辩';
pres.subject = 'AI 驱动的多语言编程学习平台';
pres.author = 'Programming Tutor';
pres.company = '编程助学智能体';

const SH = pres.ShapeType;

/* ------------------------------------------------------------------ *
 * Design tokens
 * Palette derived in OKLch, emitted as sRGB because PPTX stores sRGB:
 *   --bg      oklch(19% 0.030 258)  -> 0D1524   deep navy canvas
 *   --surface oklch(24% 0.032 258)  -> 141F35   card
 *   --raised  oklch(28% 0.034 258)  -> 1B2740   inner node
 *   --sunken  oklch(15% 0.028 258)  -> 0A111E   code plate
 *   --fg      oklch(96% 0.008 250)  -> F1F4F9
 *   --muted   oklch(74% 0.020 250)  -> A9B4C8
 *   --faint   oklch(60% 0.020 250)  -> 76829A
 *   --border  oklch(33% 0.030 258)  -> 27334E
 *   --accent  oklch(76% 0.115 200)  -> 34C6DE   cyan (one accent only)
 *   status:   green 4FD08A / amber F0B357 / red F2748A
 * Type: display+body Microsoft YaHei (editorial-less, utilitarian deck),
 *       mono Consolas for code, versions and numerals.
 * ------------------------------------------------------------------ */
const C = {
  bg: '0D1524',
  surface: '141F35',
  raised: '1B2740',
  sunken: '0A111E',
  fg: 'F1F4F9',
  muted: 'A9B4C8',
  faint: '76829A',
  border: '27334E',
  accent: '34C6DE',
  accentInk: '062430',
  green: '4FD08A',
  amber: 'F0B357',
  red: 'F2748A'
};
const F = { cn: 'Microsoft YaHei', mono: 'Consolas' };

const PW = 13.333;          // page width  (in)
const PH = 7.5;             // page height (in)
const M = 0.75;             // side margin
const CW = PW - M * 2;      // content width = 11.833
const TOP = 1.62;           // first content baseline
const FOOT = 6.78;          // footer hairline
const TOTAL = 13;

/* ----------------------------- helpers ----------------------------- */

function pad2(n) { return (n < 10 ? '0' : '') + n; }

/** rounded card */
function card(s, x, y, w, h, o) {
  o = o || {};
  s.addShape(SH.roundRect, {
    x, y, w, h,
    rectRadius: o.r === undefined ? 0.07 : o.r,
    fill: { color: o.fill || C.surface },
    ...(o.line === null ? {} : { line: { color: o.line || C.border, width: o.lw === undefined ? 0.75 : o.lw } })
  });
}

/** plain rectangle (hairlines, dividers, connectors) */
function bar(s, x, y, w, h, color) {
  s.addShape(SH.rect, { x, y, w, h, fill: { color: color || C.border } });
}

/** text box */
function T(s, str, x, y, w, h, o) {
  o = o || {};
  s.addText(str, {
    x, y, w, h,
    fontFace: o.font || F.cn,
    fontSize: o.size === undefined ? 16 : o.size,
    bold: !!o.bold,
    color: o.color || C.fg,
    align: o.align || 'left',
    valign: o.valign || 'top',
    charSpacing: o.cs === undefined ? 0 : o.cs,
    lineSpacingMultiple: o.lsm === undefined ? 1.3 : o.lsm,
    margin: 0,
    wrap: true,
    isTextBox: true
  });
}

/** text box built from runs: [[text, {bold,color}], ...] */
function TR(s, runs, x, y, w, h, o) {
  o = o || {};
  s.addText(runs.map(function (r) {
    return { text: r[0], options: Object.assign({}, r[1] || {}) };
  }), {
    x, y, w, h,
    fontFace: o.font || F.cn,
    fontSize: o.size === undefined ? 16 : o.size,
    color: o.color || C.fg,
    align: o.align || 'left',
    valign: o.valign || 'top',
    charSpacing: o.cs === undefined ? 0 : o.cs,
    lineSpacingMultiple: o.lsm === undefined ? 1.3 : o.lsm,
    margin: 0,
    wrap: true,
    isTextBox: true
  });
}

/** equal columns across the content width */
function cols(n, gap, x0, total) {
  gap = gap === undefined ? 0.2 : gap;
  x0 = x0 === undefined ? M : x0;
  total = total === undefined ? CW : total;
  const w = (total - gap * (n - 1)) / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), w: w });
  return out;
}

/** right-pointing block arrow between two columns */
function arrowR(s, x, y, w, h, color) {
  s.addShape(SH.rightArrow, { x, y, w, h, fill: { color: color || C.border } });
}

/** small square bullet marker */
function dot(s, x, y, size, color, round) {
  s.addShape(round ? SH.ellipse : SH.rect, {
    x, y, w: size, h: size,
    fill: { color: color || C.border }
  });
}

/** bullet line: marker + text (marker is a native shape, so text stays editable) */
function bullet(s, x, y, w, str, o) {
  o = o || {};
  dot(s, x, y + (o.size || 16) / 72 * 0.42 - (o.dotSize || 0.09) / 2, o.dotSize || 0.09, o.dot || C.border, o.round);
  T(s, str, x + 0.26, y, w - 0.26, o.h || 0.42, {
    size: o.size || 16, color: o.color || C.muted, lsm: o.lsm || 1.28
  });
}

/** slide chrome: module pill (header mark), title, rule, footer */
function frame(no, kicker, title, lead) {
  const s = pres.addSlide();
  s.background = { color: C.bg };

  if (kicker) {
    const pw = 0.52 + kicker.length * 0.19;
    card(s, M, 0.40, pw, 0.34, { r: 0.17, fill: C.surface });
    T(s, kicker, M + 0.20, 0.40, pw - 0.36, 0.34, {
      size: 11.5, color: C.muted, cs: 1.4, valign: 'middle'
    });
  }

  T(s, title, M, 0.78, CW * 0.58, 0.52, { size: 27, bold: true, cs: 0.6, valign: 'middle' });
  if (lead) {
    T(s, lead, M + CW * 0.60, 0.84, CW * 0.40, 0.46, {
      size: 13.5, color: C.faint, align: 'right', valign: 'middle', lsm: 1.25
    });
  }

  bar(s, M, 1.365, CW, 0.012, C.border);
  bar(s, M, 1.348, 0.78, 0.046, C.accent);

  bar(s, M, FOOT, CW, 0.012, C.border);
  T(s, '编程助学智能体', M, FOOT + 0.10, 5.0, 0.26, {
    size: 10, color: C.faint, cs: 1.4, valign: 'middle'
  });
  T(s, pad2(no) + ' / ' + TOTAL, PW - M - 2.2, FOOT + 0.10, 2.2, 0.26, {
    size: 10.5, color: C.faint, font: F.mono, cs: 1.6, align: 'right', valign: 'middle'
  });
  return s;
}

/** section caption used inside diagram slides */
function caption(s, x, y, str) {
  T(s, str, x, y, 6, 0.3, { size: 12.5, color: C.faint, cs: 1.6, valign: 'middle' });
}

/* ================================================================== *
 *  01 — Cover
 * ================================================================== */
(function cover() {
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // corner flourish: dot grid (top right) + arc slipping off the right edge
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      dot(s, 8.62 + c * 0.46, 0.72 + r * 0.34, 0.055, C.border, true);
    }
  }
  s.addShape(SH.ellipse, {
    x: 11.20, y: 5.62, w: 1.05, h: 1.05,
    fill: { color: C.bg }, line: { color: C.border, width: 0.75 }
  });
  s.addShape(SH.ellipse, {
    x: 11.48, y: 5.90, w: 0.49, h: 0.49,
    fill: { color: C.bg }, line: { color: C.border, width: 0.75 }
  });

  bar(s, M, 2.02, 0.62, 0.055, C.accent);
  T(s, 'AI 驱动的多语言编程学习平台', M + 0.02, 2.20, 7.0, 0.34, {
    size: 16, color: C.muted, cs: 2.2, valign: 'middle'
  });

  T(s, '编程助学智能体', M, 2.68, 7.2, 1.05, {
    size: 54, bold: true, cs: 1.5, valign: 'middle'
  });

  T(s, '面向学生的自主学习与即时辅导', M, 3.86, 7.2, 0.44, {
    size: 20, color: C.muted, cs: 1.2, valign: 'middle'
  });

  bar(s, M, 4.52, 6.3, 0.012, C.border);
  T(s, 'Vue 3 · TypeScript · Node.js · SQLite · Docker · DeepSeek', M, 4.68, 7.4, 0.34, {
    size: 12.5, color: C.faint, font: F.mono, cs: 0.6, valign: 'middle'
  });
  T(s, '项目答辩 · 汇报材料', M, 6.34, 5.0, 0.30, {
    size: 11, color: C.faint, cs: 1.6, valign: 'middle'
  });

  // product hint: sandbox terminal plate
  const tx = 7.95, ty = 2.02, tw = 4.63, th = 3.48;
  card(s, tx, ty, tw, th, { r: 0.12, fill: C.surface });
  for (let i = 0; i < 3; i++) dot(s, tx + 0.30 + i * 0.24, ty + 0.28, 0.10, C.border, true);
  T(s, 'code-sandbox', tx + tw - 1.55, ty + 0.20, 1.25, 0.26, {
    size: 10, color: C.faint, font: F.mono, align: 'right', valign: 'middle'
  });
  bar(s, tx + 0.24, ty + 0.64, tw - 0.48, 0.012, C.border);

  const lines = [
    ['> python main.py', C.fg],
    ['[sandbox] 容器启动 · 已断网', C.muted],
    ['[result] 运行结束 · 退出码 0', C.muted],
    ['> 这段代码为什么会死循环？', C.fg],
    ['AI 正在分析执行结果…', C.accent]
  ];
  lines.forEach(function (ln, i) {
    T(s, ln[0], tx + 0.32, ty + 0.86 + i * 0.45, tw - 0.62, 0.34, {
      size: 12.5, color: ln[1], font: F.mono, valign: 'middle'
    });
  });

  T(s, '编程助学智能体', M, FOOT + 0.10, 5.0, 0.26, {
    size: 10, color: C.faint, cs: 1.4, valign: 'middle'
  });
  T(s, '01 / ' + TOTAL, PW - M - 2.2, FOOT + 0.10, 2.2, 0.26, {
    size: 10.5, color: C.faint, font: F.mono, cs: 1.6, align: 'right', valign: 'middle'
  });
  bar(s, M, FOOT, CW, 0.012, C.border);

  s.addNotes('开场一句话：编程助学智能体是一个面向学生的 AI 编程助教，把「提问、练习、判题、点评」收在同一个平台里。今天用 13 页说明问题、方案、实现与部署。');
})();

/* ================================================================== *
 *  02 — 项目背景与痛点
 * ================================================================== */
(function painPoints() {
  const s = frame(2, '项目背景', '项目背景与痛点', '四个真实卡点，指向同一个缺口');

  const items = [
    ['01', '求助无门', '遇到语法错误或逻辑 bug 时，身边没有人能立刻解释「为什么错」。'],
    ['02', '覆盖有限', '一位教师难以对全班同学做到 1v1 的逐行讲解与即时答疑。'],
    ['03', '资源分散', '多语言学习资料散落在视频、博客与文档里，缺少统一入口。'],
    ['04', '反馈缺失', '练习写完不知道对错，缺少「运行 → 判题 → 讲解」的闭环。']
  ];
  const g = cols(2, 0.25);
  items.forEach(function (it, i) {
    const x = g[i % 2].x, w = g[i % 2].w;
    const y = TOP + Math.floor(i / 2) * 2.24;
    card(s, x, y, w, 2.10);
    T(s, it[0], x + 0.34, y + 0.26, 1.0, 0.38, {
      size: 20, bold: true, font: F.mono, color: C.faint, cs: 1.2, valign: 'middle'
    });
    T(s, it[1], x + 0.34, y + 0.70, w - 0.68, 0.38, { size: 19, bold: true, valign: 'middle' });
    bar(s, x + 0.34, y + 1.16, 0.5, 0.03, C.border);
    T(s, it[2], x + 0.34, y + 1.30, w - 0.68, 0.68, { size: 16, color: C.muted, lsm: 1.35 });
  });

  TR(s, [
    ['结论：', { bold: true, color: C.accent }],
    ['四个痛点指向同一个缺口 —— 学生需要一个随手可用、随叫随到的辅导入口。', { color: C.muted }]
  ], M, 6.14, CW, 0.34, { size: 16, valign: 'middle' });

  s.addNotes('这四个痛点来自真实教学场景，不是假设：学生卡住时无人可问，教师精力无法 1v1 覆盖，资料分散，练习没有反馈。共同结论是——需要一个即时、可复用的辅导入口。');
})();

/* ================================================================== *
 *  03 — 教学理念
 * ================================================================== */
(function pedagogy() {
  const s = frame(3, '教学理念', '教学理念：以学生为中心', 'SCL · OBE · 数智化转型');

  const items = [
    ['SCL', '以学生为中心', ['自选语言、难度与学习深度', '按自己的节奏推进，不绑定统一进度']],
    ['OBE', '成果导向', ['每个知识点对应可验证的产出', '用「能不能做出来」衡量掌握程度']],
    ['数智化', '数字化转型', ['从教学过程数据走向个性化推荐', '传统 → 信息化 → 数字化 → AI 个性化']]
  ];
  const g = cols(3, 0.24);
  items.forEach(function (it, i) {
    const x = g[i].x, w = g[i].w, y = TOP;
    card(s, x, y, w, 3.00);
    T(s, it[0], x + 0.34, y + 0.30, w - 0.68, 0.40, {
      size: 21, bold: true, font: F.mono, cs: 1.6, valign: 'middle'
    });
    T(s, it[1], x + 0.34, y + 0.78, w - 0.68, 0.38, { size: 19, bold: true, valign: 'middle' });
    bar(s, x + 0.34, y + 1.28, 0.5, 0.03, C.border);
    bullet(s, x + 0.36, y + 1.48, w - 0.7, it[2][0], { size: 16, h: 0.62, lsm: 1.3 });
    bullet(s, x + 0.36, y + 2.16, w - 0.7, it[2][1], { size: 16, h: 0.62, lsm: 1.3 });
  });

  // 数智化演进：四个 chevron，最后一节用强调色填充
  caption(s, M, 4.78, '数字化演进路径');
  const stages = ['传统课堂', '信息化', '数字化', 'AI 个性化'];
  const cg = cols(4, 0.11);
  stages.forEach(function (st, i) {
    const last = i === stages.length - 1;
    s.addShape(SH.chevron, {
      x: cg[i].x, y: 5.12, w: cg[i].w, h: 0.85,
      fill: { color: last ? C.accent : C.surface },
      line: { color: last ? C.accent : C.border, width: 0.75 }
    });
    T(s, st, cg[i].x + 0.32, 5.12, cg[i].w - 0.5, 0.85, {
      size: 16, bold: last, color: last ? C.accentInk : C.muted,
      align: 'center', valign: 'middle', cs: 1.2
    });
  });

  T(s, '数字化不是把纸搬上屏幕，而是让每个学生都有一条自己的路径。', M, 6.10, CW, 0.34, {
    size: 16, color: C.muted, cs: 0.6, valign: 'middle'
  });

  s.addNotes('三种理念各有分工：SCL 决定「谁来选」，OBE 决定「怎么算学会」，数智化决定「怎么规模化地做到个性化」。最终都落到学生自选语言、节奏与深度。');
})();

/* ================================================================== *
 *  04 — 系统架构
 * ================================================================== */
(function architecture() {
  const s = frame(4, '系统架构', '系统架构：四层分层设计', '表现 / 应用 / 智能 / 数据与执行');

  const layers = [
    ['表现层', ['Vue 3 + TypeScript + Vite', 'Monaco 代码编辑器', 'SSE 流式渲染']],
    ['应用层', ['Node.js + Express', 'REST 接口 + JWT 鉴权', '限流与输入校验']],
    ['智能层', ['DeepSeek 大模型', '流式对话与讲解', 'AI 出题与判题点评']],
    ['数据与执行层', ['SQLite 数据存储', 'Docker 执行沙箱', '六语言运行时']]
  ];

  const bandH = 1.04, gap = 0.09;
  layers.forEach(function (ly, i) {
    const y = TOP + i * (bandH + gap);
    card(s, M, y, CW, bandH, { r: 0.08 });
    card(s, M + 0.19, y + 0.19, 1.95, bandH - 0.38, { r: 0.06, fill: C.raised, lw: 0.75 });
    T(s, ly[0], M + 0.19, y + 0.19, 1.95, bandH - 0.38, {
      size: 16, bold: true, align: 'center', valign: 'middle', cs: 0.8
    });

    const inner = cols(3, 0.19, M + 2.41, CW - 2.60);
    inner.forEach(function (b, j) {
      card(s, b.x, y + 0.19, b.w, bandH - 0.38, { r: 0.06, fill: C.bg, lw: 0.75 });
      T(s, ly[1][j], b.x + 0.14, y + 0.19, b.w - 0.28, bandH - 0.38, {
        size: 16, color: C.muted, align: 'center', valign: 'middle', lsm: 1.22
      });
    });
  });

  T(s, '前后端分离部署；代码执行与业务服务隔离，沙箱内不持有任何业务数据。', M, 6.16, CW, 0.34, {
    size: 16, color: C.muted, valign: 'middle'
  });

  s.addNotes('按层讲：表现层负责交互与流式渲染，应用层负责接口、鉴权与限流，智能层接大模型做对话、出题与点评，数据与执行层负责存储和沙箱运行。关键点是执行沙箱与业务服务完全隔离。');
})();

/* ================================================================== *
 *  05 — 核心功能 1：AI 对话学伴
 * ================================================================== */
(function aiChat() {
  const s = frame(5, '核心功能 1 / 4', 'AI 对话学伴', '把提问、解释与代码操作收在同一个窗口');

  const rows = [
    ['01', 'SSE 流式输出', '回答逐字呈现，无需等待整段结果'],
    ['02', 'Markdown 与代码块渲染', '标题、列表、表格与代码块完整排版'],
    ['03', '一键复制 / 在编辑器中打开', '讲解代码可直接复制或送入编辑器'],
    ['04', '语音输入', '用说的方式描述问题，降低提问门槛'],
    ['05', '历史会话管理', '会话可保存、重命名与切换']
  ];
  rows.forEach(function (r, i) {
    const y = TOP + i * 0.92;
    card(s, M, y, 5.55, 0.80, { r: 0.06 });
    T(s, r[0], M + 0.28, y, 0.6, 0.80, {
      size: 15, bold: true, font: F.mono, color: C.faint, valign: 'middle'
    });
    T(s, r[1], M + 0.92, y + 0.09, 4.4, 0.28, { size: 17, bold: true, valign: 'middle' });
    T(s, r[2], M + 0.92, y + 0.40, 4.4, 0.32, { size: 14.5, color: C.muted, valign: 'middle' });
  });

  // 对话窗口示意
  const cx = 6.55, cy = TOP, cw = CW - 5.55 - 0.25, ch = 4.58;
  card(s, cx, cy, cw, ch, { r: 0.10 });
  bar(s, cx + 0.26, cy + 0.62, cw - 0.52, 0.012, C.border);
  T(s, '会话：二分查找为什么会死循环', cx + 0.30, cy + 0.16, cw - 1.0, 0.36, {
    size: 16, color: C.muted, valign: 'middle'
  });
  dot(s, cx + cw - 0.52, cy + 0.29, 0.10, C.accent, true);

  card(s, cx + 0.30, cy + 0.82, cw - 0.60, 0.58, { r: 0.06, fill: C.raised });
  T(s, '这段二分查找为什么会死循环？', cx + 0.48, cy + 0.82, cw - 0.96, 0.58, {
    size: 16, valign: 'middle'
  });

  card(s, cx + 0.30, cy + 1.56, cw - 0.60, 2.06, { r: 0.06, fill: C.sunken, lw: 0.75 });
  T(s, 'AI', cx + 0.48, cy + 1.70, 0.5, 0.26, {
    size: 11, bold: true, font: F.mono, color: C.faint, cs: 1.4, valign: 'middle'
  });
  T(s, '循环条件与边界没有收敛，lo / hi 不再更新：', cx + 0.48, cy + 2.00, cw - 0.96, 0.36, {
    size: 16, color: C.muted, valign: 'middle'
  });
  T(s, 'while (lo <= hi) {\n  const mid = (lo + hi) >> 1;\n}', cx + 0.48, cy + 2.38, cw - 0.96, 0.86, {
    size: 12.5, font: F.mono, color: C.fg, lsm: 1.42
  });
  T(s, '正在输出…', cx + 0.48, cy + 3.26, cw - 0.96, 0.28, {
    size: 12.5, color: C.accent, font: F.mono, valign: 'middle'
  });

  ['复制代码', '在编辑器中打开'].forEach(function (label, i) {
    const bxx = cx + 0.30 + i * 1.62;
    card(s, bxx, cy + 3.88, 1.50, 0.46, { r: 0.23, fill: C.surface, lw: 0.75 });
    T(s, label, bxx, cy + 3.88, 1.50, 0.46, {
      size: 13.5, color: C.muted, align: 'center', valign: 'middle'
    });
  });

  s.addNotes('重点演示流式体验：回答边生成边显示；代码块可以直接复制或送进编辑器运行。语音输入用于降低提问门槛，历史会话管理保证学习记录可回溯。');
})();

/* ================================================================== *
 *  06 — 核心功能 2：多语言代码沙箱
 * ================================================================== */
(function sandbox() {
  const s = frame(6, '核心功能 2 / 4', '多语言代码沙箱', '六语言 · 容器隔离 · 完全断网');

  caption(s, M, TOP - 0.06, '支持语言');
  const langs = ['Python', 'Java', 'C', 'C++', 'Go', 'JavaScript'];
  const lg = cols(6, 0.16);
  langs.forEach(function (l, i) {
    card(s, lg[i].x, TOP + 0.26, lg[i].w, 0.66, { r: 0.33, fill: C.surface });
    T(s, l, lg[i].x, TOP + 0.26, lg[i].w, 0.66, {
      size: 15, font: F.mono, color: C.fg, align: 'center', valign: 'middle'
    });
  });

  caption(s, M, 2.62, '单次运行流程');
  const steps = [
    ['编辑代码', 'Monaco 编辑器'],
    ['提交运行', '参数与权限校验'],
    ['容器隔离执行', '独立 Docker 容器'],
    ['限额与超时', '内存 / CPU / 进程'],
    ['结果回传', 'stdout / stderr / 状态']
  ];
  const fg = cols(5, 0.40);
  steps.forEach(function (st, i) {
    const x = fg[i].x, w = fg[i].w, y = 2.94;
    card(s, x, y, w, 1.18, { r: 0.07 });
    T(s, st[0], x + 0.14, y + 0.22, w - 0.28, 0.34, {
      size: 16, bold: true, align: 'center', valign: 'middle'
    });
    T(s, st[1], x + 0.14, y + 0.62, w - 0.28, 0.46, {
      size: 13, color: C.muted, align: 'center', valign: 'top', lsm: 1.24
    });
    if (i < steps.length - 1) {
      arrowR(s, x + w + 0.06, y + 0.44, 0.28, 0.24, C.border);
    }
  });

  caption(s, M, 4.34, '隔离与保护');
  const guards = [
    ['完全断网', '容器内无法访问外网，杜绝滥用'],
    ['资源限制', '限制内存与 CPU 上限，防止拖垮主机'],
    ['进程数限制', '限制容器内进程数量，防止 fork 攻击'],
    ['超时保护', '超过 14 秒强制终止，回收进程']
  ];
  const gg = cols(4, 0.20);
  guards.forEach(function (g, i) {
    const x = gg[i].x, w = gg[i].w, y = 4.66;
    card(s, x, y, w, 1.54, { r: 0.07 });
    T(s, g[0], x + 0.26, y + 0.24, w - 0.52, 0.34, { size: 17, bold: true, valign: 'middle' });
    bar(s, x + 0.26, y + 0.68, 0.42, 0.03, C.border);
    T(s, g[1], x + 0.26, y + 0.80, w - 0.52, 0.62, { size: 16, color: C.muted, lsm: 1.3 });
  });

  s.addNotes('沙箱是这个项目最需要讲清楚的安全部分：代码只在容器里跑，容器完全断网，内存、CPU、进程数都有限额，并且有 14 秒超时；超时后强制回收，避免残留进程。');
})();

/* ================================================================== *
 *  07 — 核心功能 3：知识卡片与学习路径
 * ================================================================== */
(function knowledge() {
  const s = frame(7, '核心功能 3 / 4', '知识卡片与学习路径', '让学习有地图，也有落脚点');

  // 左：知识卡片
  const lx = M, lw = 5.40, ly = TOP, lh = 4.55;
  card(s, lx, ly, lw, lh, { r: 0.10 });
  T(s, '知识卡片', lx + 0.34, ly + 0.28, lw - 0.68, 0.36, { size: 19, bold: true, valign: 'middle' });
  T(s, '90+', lx + 0.34, ly + 0.76, 2.4, 0.82, {
    size: 44, bold: true, font: F.mono, color: C.accent, cs: 1.0, valign: 'middle'
  });
  T(s, '个知识点 · 覆盖 6 门语言与算法专题', lx + 0.34, ly + 1.62, lw - 0.68, 0.34, {
    size: 16, color: C.muted, valign: 'middle'
  });
  bar(s, lx + 0.34, ly + 2.10, lw - 0.68, 0.012, C.border);

  const actions = [
    ['问 AI', '围绕当前知识点向 AI 追问'],
    ['运行示例', '示例代码一键送进沙箱运行'],
    ['B站视频', '关联视频讲解与对应课程']
  ];
  actions.forEach(function (a, i) {
    const y = ly + 2.32 + i * 0.66;
    card(s, lx + 0.34, y, 1.30, 0.46, { r: 0.23, fill: C.raised, lw: 0.75 });
    T(s, a[0], lx + 0.34, y, 1.30, 0.46, {
      size: 13, color: C.fg, align: 'center', valign: 'middle'
    });
    T(s, a[1], lx + 1.80, y, lw - 2.20, 0.46, {
      size: 16, color: C.muted, valign: 'middle'
    });
  });

  // 右：学习路径
  const rx = M + 5.40 + 0.43, rw = CW - 5.40 - 0.43, ry = TOP, rh = 4.55;
  card(s, rx, ry, rw, rh, { r: 0.10 });
  T(s, '分级学习路径', rx + 0.34, ry + 0.28, rw - 0.68, 0.36, { size: 19, bold: true, valign: 'middle' });
  T(s, '7 门语言 · 入门 → 进阶 → 实战', rx + 0.34, ry + 0.68, rw - 0.68, 0.30, {
    size: 16, color: C.faint, valign: 'middle'
  });

  const levels = [
    ['入门', '语法基础、变量、流程控制与函数'],
    ['进阶', '数据结构、算法思想与调试方法'],
    ['实战', '综合项目练习与工程化编码习惯']
  ];
  bar(s, rx + 0.50, ry + 1.44, 0.012, 2.06, C.border);
  levels.forEach(function (lv, i) {
    const y = ry + 1.20 + i * 0.86;
    dot(s, rx + 0.38, y + 0.12, 0.26, C.bg, true);
    s.addShape(SH.ellipse, {
      x: rx + 0.38, y: y + 0.12, w: 0.26, h: 0.26,
      fill: { color: C.raised },
      line: { color: i === 2 ? C.muted : C.border, width: 1 }
    });
    T(s, lv[0], rx + 0.86, y, 1.10, 0.50, { size: 17, bold: true, valign: 'middle' });
    T(s, lv[1], rx + 2.10, y, rw - 2.50, 0.50, {
      size: 16, color: C.muted, valign: 'middle'
    });
  });
  bar(s, rx + 0.34, ry + 3.72, rw - 0.68, 0.012, C.border);
  T(s, '路径节点与知识卡片联动，点击直达', rx + 0.34, ry + 3.90, rw - 0.68, 0.34, {
    size: 16, color: C.muted, valign: 'middle'
  });

  s.addNotes('知识卡片是最小学习单元，学习路径是地图，两者联动。卡片上的三个动作——问 AI、运行示例、看视频——覆盖「理解、实践、补充讲解」三种需求。');
})();

/* ================================================================== *
 *  08 — 核心功能 4：AI 出题与自动判题
 * ================================================================== */
(function judgeLoop() {
  const s = frame(8, '核心功能 4 / 4', 'AI 出题与自动判题', '出题 → 作答 → 判题 → 点评 → 错题回顾');

  const nodes = [
    ['AI 出题', '按语言与难度生成题目与测试用例'],
    ['学生作答', '在编辑器中编写代码并提交'],
    ['自动判题', '沙箱内执行测试用例，逐项比对'],
    ['AI 点评', '结合真实执行结果讲解错因']
  ];
  const ny = 1.72, nh = 1.55;
  const ng = cols(4, 0.42);
  nodes.forEach(function (n, i) {
    const x = ng[i].x, w = ng[i].w;
    card(s, x, ny, w, nh, { r: 0.08 });
    dot(s, x + 0.26, ny + 0.28, 0.10, C.border, true);
    T(s, n[0], x + 0.26, ny + 0.24, w - 0.52, 0.36, { size: 17, bold: true, valign: 'middle' });
    T(s, n[1], x + 0.26, ny + 0.74, w - 0.52, 0.72, { size: 16, color: C.muted, lsm: 1.32 });
    if (i < nodes.length - 1) arrowR(s, x + w + 0.07, ny + 0.65, 0.28, 0.24, C.border);
  });

  // 闭环回流：点评结果回到出题环节
  T(s, '闭环：判题结果与错题记录回流到出题环节，薄弱知识点会被再次覆盖。', M, 3.48, CW, 0.30, {
    size: 14, color: C.faint, align: 'center', valign: 'middle'
  });
  bar(s, 2.07, 3.92, 9.19, 0.018, C.border);
  bar(s, 2.06, 3.58, 0.018, 0.34, C.border);
  s.addShape(SH.upArrow, { x: 1.92, y: 3.27, w: 0.30, h: 0.31, fill: { color: C.accent } });

  // 错题本
  card(s, M, 4.22, CW, 1.62, { r: 0.09 });
  T(s, '错题本', M + 0.36, 4.42, 2.2, 0.36, { size: 18, bold: true, valign: 'middle' });
  bar(s, M + 0.36, 4.86, 0.5, 0.03, C.border);
  bullet(s, M + 0.38, 5.02, 5.4, '自动记录未通过的题目与失败用例', { size: 16, h: 0.4 });
  bullet(s, M + 0.38, 5.42, 5.4, '按语言与知识点筛选，支持重做', { size: 16, h: 0.4 });
  bullet(s, M + 6.06, 5.02, 5.4, '判题依据是真实执行结果，不是模型猜测', { size: 16, h: 0.4 });
  bullet(s, M + 6.06, 5.42, 5.4, '点评结合失败用例，指出具体错因', { size: 16, h: 0.4 });

  s.addNotes('这一页讲闭环：AI 出题后由学生在编辑器里作答，判题在沙箱里真实执行测试用例，AI 再结合执行结果点评；未通过的题目进入错题本，回流到出题环节。强调判题依据是真实执行结果。');
})();

/* ================================================================== *
 *  09 — 学习追踪
 * ================================================================== */
(function tracking() {
  const s = frame(9, '学习追踪', '学习追踪：让过程可见', '对话 · 消息 · 收藏 · 活跃时间');

  const metrics = [
    ['对话数', '累计的会话数量，反映提问频次'],
    ['消息数', '提问与回答的总条数，反映活跃度'],
    ['收藏数', '收藏的代码片段与解法，随时回看'],
    ['最近活跃', '最近一次进入学习的时间']
  ];
  const mg = cols(4, 0.20);
  metrics.forEach(function (m, i) {
    const x = mg[i].x, w = mg[i].w, y = TOP;
    card(s, x, y, w, 1.50, { r: 0.08 });
    T(s, m[0], x + 0.28, y + 0.28, w - 0.56, 0.36, { size: 17, bold: true, valign: 'middle' });
    bar(s, x + 0.28, y + 0.74, 0.42, 0.03, C.border);
    T(s, m[1], x + 0.28, y + 0.86, w - 0.56, 0.56, { size: 16, color: C.muted, lsm: 1.3 });
  });

  const features = [
    ['成就徽章', '按学习行为解锁，让坚持被看见', '覆盖持续学习与练习通过'],
    ['AI 学习报告', '汇总提问主题与练习表现', '按周期生成，便于回顾'],
    ['代码片段收藏库', '沉淀可复用的代码与解法', '支持收藏、检索与再次运行']
  ];
  const fgd = cols(3, 0.24);
  features.forEach(function (f, i) {
    const x = fgd[i].x, w = fgd[i].w, y = 3.28;
    card(s, x, y, w, 1.85, { r: 0.08 });
    T(s, f[0], x + 0.30, y + 0.26, w - 0.60, 0.36, { size: 18, bold: true, valign: 'middle' });
    T(s, f[1], x + 0.30, y + 0.76, w - 0.60, 0.46, { size: 16, color: C.muted, lsm: 1.3 });
    T(s, f[2], x + 0.30, y + 1.26, w - 0.60, 0.44, { size: 16, color: C.faint, lsm: 1.3 });
  });

  card(s, M, 5.42, CW, 0.76, { r: 0.08 });
  TR(s, [
    ['学习可见：', { bold: true, color: C.accent }],
    ['对话、消息、收藏与活跃时间构成最小可用仪表盘，配合徽章与报告形成正向反馈。', { color: C.muted }]
  ], M + 0.34, 5.42, CW - 0.68, 0.76, { size: 16, valign: 'middle' });

  s.addNotes('这一页说明「怎么知道学生在进步」：四个基础指标构成最小仪表盘，徽章提供即时正反馈，AI 学习报告用于阶段性回顾，收藏库沉淀可复用代码。');
})();

/* ================================================================== *
 *  10 — 账号与安全
 * ================================================================== */
(function security() {
  const s = frame(10, '账号与安全', '账号与安全', '身份可信 · 请求可控 · 内容可信');

  function panel(x, w, title, sub, rows) {
    card(s, x, TOP, w, 4.40, { r: 0.10 });
    T(s, title, x + 0.34, TOP + 0.28, w - 0.68, 0.38, { size: 19, bold: true, valign: 'middle' });
    T(s, sub, x + 0.34, TOP + 0.70, w - 0.68, 0.32, { size: 16, color: C.faint, valign: 'middle' });
    rows.forEach(function (r, i) {
      const y = TOP + 1.20 + i * 1.06;
      dot(s, x + 0.36, y + 0.11, 0.15, C.bg, true);
      s.addShape(SH.ellipse, {
        x: x + 0.36, y: y + 0.11, w: 0.15, h: 0.15,
        fill: { color: C.bg }, line: { color: C.muted, width: 1 }
      });
      T(s, r[0], x + 0.70, y, w - 1.10, 0.34, { size: 17, bold: true, valign: 'middle' });
      T(s, r[1], x + 0.70, y + 0.40, w - 1.10, 0.52, { size: 16, color: C.muted, lsm: 1.3 });
    });
  }

  panel(M, 5.79, '账号体系', '注册与找回都走邮箱验证码', [
    ['注册邮箱验证', '注册时校验邮箱验证码，避免无效账号'],
    ['忘记密码重置', '通过邮箱验证码重置密码，无需人工介入'],
    ['唯一性校验', '用户名与邮箱唯一，且大小写不敏感']
  ]);
  panel(M + 5.79 + 0.25, 5.79, '接口与数据安全', '鉴权、限流与输入校验', [
    ['JWT 认证', '接口访问基于令牌鉴权，未授权请求直接拒绝'],
    ['限流与输入校验', '限制请求频率，过滤与校验非法参数'],
    ['XSS 防护', '输出转义与内容过滤，阻断脚本注入']
  ]);

  T(s, '安全边界：先确认「你是谁」，再确认「请求是否合规」，最后确认「内容是否可信」。', M, 6.18, CW, 0.34, {
    size: 16, color: C.muted, valign: 'middle'
  });

  s.addNotes('安全分三层讲：身份可信（邮箱验证码注册与找回、唯一性校验、JWT 鉴权）、请求可控（限流与输入校验）、内容可信（XSS 防护与输出转义）。');
})();

/* ================================================================== *
 *  11 — 工程亮点
 * ================================================================== */
(function engineering() {
  const s = frame(11, '工程亮点', '工程亮点：真实问题驱动', '五个被实际问题逼出来的改进');

  const rows = [
    ['01', 'SSE 流式解析可靠性', '兼容分片边界与 CRLF 换行，避免内容错位或丢失'],
    ['02', '会话并发竞态治理', '隔离并发请求与响应，避免回答串到错误的会话'],
    ['03', '消息顺序一致性', '保证多轮对话的消息顺序与持久化结果一致'],
    ['04', '流式渲染性能优化', '80ms 节流批量更新，降低高频重渲染开销'],
    ['05', '容器超时防残留', '超时后强制清理进程，避免沙箱资源堆积']
  ];
  rows.forEach(function (r, i) {
    const y = TOP + i * 0.94;
    card(s, M, y, CW, 0.84, { r: 0.06 });
    T(s, r[0], M + 0.30, y, 0.6, 0.84, {
      size: 16, bold: true, font: F.mono, color: C.faint, valign: 'middle'
    });
    T(s, r[1], M + 0.96, y, 4.0, 0.84, { size: 17, bold: true, valign: 'middle' });
    bar(s, M + 5.06, y + 0.22, 0.012, 0.40, C.border);
    T(s, r[2], M + 5.30, y, CW - 5.30 - 0.30, 0.84, {
      size: 16, color: C.muted, valign: 'middle'
    });
  });

  s.addNotes('这五个亮点都来自实际调试：流式数据分片与换行导致解析错位、并发请求导致回答串会话、消息顺序与持久化不一致、高频重渲染卡顿、沙箱超时后进程残留。逐条说明发现与修复方式。');
})();

/* ================================================================== *
 *  12 — 打包式部署
 * ================================================================== */
(function deploy() {
  const s = frame(12, '打包式部署', '打包式部署', '运行时全部打包进镜像，服务器零语言依赖');

  const tier = [
    ['用户浏览器', 'Web 界面与编辑器'],
    ['Nginx 反向代理', 'TLS · 静态资源转发'],
    ['Node.js + Express', 'PM2 守护 · 接口服务'],
    ['SQLite 数据库', '账号与会话记录']
  ];
  const tg = cols(4, 0.36);
  tier.forEach(function (t, i) {
    const x = tg[i].x, w = tg[i].w, y = 1.72;
    card(s, x, y, w, 1.20, { r: 0.08 });
    T(s, t[0], x + 0.20, y + 0.20, w - 0.40, 0.36, {
      size: 16, bold: true, align: 'center', valign: 'middle'
    });
    T(s, t[1], x + 0.18, y + 0.62, w - 0.36, 0.44, {
      size: 16, color: C.muted, align: 'center', valign: 'top', lsm: 1.26
    });
    if (i < tier.length - 1) arrowR(s, x + w + 0.05, 2.20, 0.26, 0.24, C.border);
  });

  // Node → 沙箱镜像
  s.addShape(SH.downArrow, { x: 8.04, y: 3.02, w: 0.30, h: 0.54, fill: { color: C.border } });

  const dx = 3.40, dy = 3.56, dw = 9.18, dh = 1.86;
  card(s, dx, dy, dw, dh, { r: 0.10 });
  T(s, 'Docker 沙箱镜像', dx + 0.34, dy + 0.22, 4.6, 0.36, { size: 18, bold: true, valign: 'middle' });
  T(s, '内置语言运行时，服务器无需安装任何语言环境', dx + 0.34, dy + 0.64, dw - 0.68, 0.32, {
    size: 16, color: C.muted, valign: 'middle'
  });
  const chips = ['Go', 'Java', 'Python', 'gcc', 'Node.js'];
  const cgw = (dw - 0.68 - 4 * 0.14) / 5;
  chips.forEach(function (c, i) {
    const x = dx + 0.34 + i * (cgw + 0.14);
    card(s, x, dy + 1.06, cgw, 0.56, { r: 0.06, fill: C.bg, lw: 0.75 });
    T(s, c, x, dy + 1.06, cgw, 0.56, {
      size: 15, font: F.mono, color: C.muted, align: 'center', valign: 'middle'
    });
  });

  card(s, M, 5.62, CW, 0.80, { r: 0.08 });
  TR(s, [
    ['一键部署脚本：', { bold: true, color: C.accent }],
    ['Docker 容器 + PM2 守护 + Nginx 反向代理，服务器零语言环境依赖。', { color: C.muted }]
  ], M + 0.34, 5.62, CW - 0.68, 0.80, { size: 16, valign: 'middle' });

  s.addNotes('部署的关键点是「零语言环境依赖」：Go、Java、Python、gcc 等运行时全部打包在沙箱镜像里，服务器只需要 Docker；一键脚本完成容器启动、PM2 守护与 Nginx 反代配置。');
})();

/* ================================================================== *
 *  13 — 总结与展望
 * ================================================================== */
(function summary() {
  const s = frame(13, '总结与展望', '总结与展望', '能力矩阵 · 教学价值 · 后续规划');

  // 左：能力矩阵
  const lw = 5.79;
  card(s, M, TOP, lw, 4.30, { r: 0.10 });
  T(s, '已完成的能力矩阵', M + 0.34, TOP + 0.28, lw - 0.68, 0.38, { size: 19, bold: true, valign: 'middle' });
  const done = [
    ['学习闭环', '对话答疑 → 沙箱运行 → 出题判题 → 错题回顾'],
    ['语言覆盖', 'Python、Java、C、C++、Go、JavaScript'],
    ['工程可靠性', '流式解析、并发竞态、消息顺序、超时清理'],
    ['部署运维', '镜像内置运行时，一键脚本完成部署']
  ];
  done.forEach(function (d, i) {
    const y = TOP + 1.00 + i * 0.80;
    T(s, '✓', M + 0.36, y, 0.34, 0.34, {
      size: 15, bold: true, color: C.green, font: F.mono, valign: 'middle'
    });
    T(s, d[0], M + 0.80, y, 1.70, 0.34, { size: 16, bold: true, valign: 'middle' });
    T(s, d[1], M + 0.80, y + 0.36, lw - 1.20, 0.38, {
      size: 16, color: C.muted, valign: 'middle', lsm: 1.28
    });
  });

  // 右：后续规划
  const rx = M + lw + 0.25, rw = CW - lw - 0.25;
  card(s, rx, TOP, rw, 4.30, { r: 0.10 });
  T(s, '后续规划', rx + 0.34, TOP + 0.28, rw - 0.68, 0.38, { size: 19, bold: true, valign: 'middle' });
  const next = [
    ['会话分页', '长会话按页加载，提升浏览与定位效率'],
    ['公式与流程图渲染', '支持数学公式与流程图，覆盖更多题型'],
    ['更丰富的学习分析', '按知识点细粒度追踪掌握度与薄弱环节']
  ];
  next.forEach(function (n, i) {
    const y = TOP + 1.10 + i * 1.02;
    card(s, rx + 0.34, y, rw - 0.68, 0.88, { r: 0.06, fill: C.bg, lw: 0.75 });
    T(s, n[0], rx + 0.56, y + 0.12, rw - 1.12, 0.32, { size: 16, bold: true, valign: 'middle' });
    T(s, n[1], rx + 0.56, y + 0.46, rw - 1.12, 0.34, { size: 16, color: C.muted, valign: 'middle' });
  });

  dot(s, M, 6.14, 0.13, C.accent, true);
  T(s, '让每个学生都有一位随叫随到的编程助教。', M + 0.30, 6.02, CW - 0.30, 0.40, {
    size: 18, bold: true, valign: 'middle'
  });

  s.addNotes('收尾：能力矩阵已经形成闭环——答疑、练习、判题、回顾都能走通；对教学的价值是把教师的重复答疑转化为可复用的即时辅导。后续做会话分页、公式与流程图渲染，以及更细粒度的学习分析。');
})();

/* ------------------------------------------------------------------ */
const out = path.join(__dirname, 'programming-tutor-deck.pptx');
pres.writeFile({ fileName: out })
  .then(function (f) { console.log('OK -> ' + f); })
  .catch(function (e) { console.error('FAILED: ' + e.message); process.exit(1); });
