import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Fixed port so ~/.claude/settings.json can point to a stable URL.
const PORT = 57438;

// The four hook events Claude Code fires. Each one pipes its JSON stdin
// straight to our server with curl — that's the entire bridge.
const HOOK_EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'UserPromptSubmit'] as const;
const HOOK_CMD = `curl -s -X POST http://localhost:${PORT} -H "Content-Type: application/json" -d @-`;

let server: http.Server | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let body = '';
    req.on('data', (c: Buffer) => { body += c; });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        const state = classifyEvent(event);
        currentPanel?.webview.postMessage({ type: 'setState', state });
      } catch { }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      vscode.window.showErrorMessage(`Claude Face: port ${PORT} is already in use. Is another instance running?`);
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    bar.text = '$(smiley) CLAUDE.FACE';
    bar.tooltip = `Listening on http://localhost:${PORT}\nClick to open face`;
    bar.command = 'claude-face.show';
    bar.show();
    context.subscriptions.push(bar);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('claude-face.show', () => openPanel(context)),
    vscode.commands.registerCommand('claude-face.setupHooks', () => setupHooks()),
    { dispose: () => server?.close() }
  );

  openPanel(context);

  // On first run, prompt to wire up the hooks automatically.
  if (!hooksConfigured()) {
    vscode.window.showInformationMessage(
      'Claude Face: hook Claude Code events to animate the face?',
      'Set up hooks'
    ).then(choice => { if (choice) { setupHooks(); } });
  }
}

function hooksConfigured(): boolean {
  try {
    const settings = JSON.parse(fs.readFileSync(claudeSettingsPath(), 'utf-8'));
    return HOOK_EVENTS.every(event =>
      settings?.hooks?.[event]?.some((entry: any) =>
        entry?.hooks?.some((h: any) => h?.command?.includes(`localhost:${PORT}`))
      )
    );
  } catch { return false; }
}

function setupHooks(): void {
  const settingsPath = claudeSettingsPath();
  let settings: any = {};
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch { }

  settings.hooks ??= {};
  const hookEntry = { matcher: '', hooks: [{ type: 'command', command: HOOK_CMD }] };

  for (const event of HOOK_EVENTS) {
    settings.hooks[event] ??= [];
    // Remove any stale claude-face entry for this port before re-adding.
    settings.hooks[event] = (settings.hooks[event] as any[]).filter(
      (e: any) => !e?.hooks?.some((h: any) => h?.command?.includes(`localhost:${PORT}`))
    );
    settings.hooks[event].push(hookEntry);
  }

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  vscode.window.showInformationMessage('Claude Face: hooks written to ~/.claude/settings.json ✓');
}

function claudeSettingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function classifyEvent(event: any): string {
  const hook: string = event.hook_event_name ?? '';
  if (hook === 'SessionStart') { return 'idle'; }
  if (hook === 'UserPromptSubmit') { return 'thinking'; }
  if (hook === 'PreToolUse') {
    const tool: string = event.tool_name ?? '';
    if (tool === 'Read') { return 'reading'; }
    if (tool === 'Write' || tool === 'Edit') { return 'writing'; }
    if (tool === 'Bash') { return 'running_command'; }
    return 'thinking';
  }
  if (hook === 'PostToolUse') { return 'thinking'; }
  if (hook === 'Stop') {
    const msg = ((event.last_assistant_message ?? '') as string).toLowerCase();
    if (/\b(actually|wait|hmm|hold on)\b/.test(msg)) { return 'actually'; }
    if (/\b(error|failed|cannot|can't|unable|sorry)\b/.test(msg)) { return 'error'; }
    if (/\b(done|success|complete|finished|perfect)\b/.test(msg)) { return 'success'; }
    if (/\b(not sure|might|perhaps|maybe|unsure)\b/.test(msg)) { return 'uncertain'; }
    return 'idle';
  }
  return 'idle';
}

function openPanel(context: vscode.ExtensionContext) {
  if (currentPanel) { currentPanel.reveal(vscode.ViewColumn.Two); return; }
  currentPanel = vscode.window.createWebviewPanel(
    'claudeFace', 'CLAUDE.FACE',
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  currentPanel.webview.html = buildHtml();
  currentPanel.onDidDispose(() => { currentPanel = undefined; }, null, context.subscriptions);
}

function buildHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--vscode-editor-background, #1e1e1e);
}

canvas {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(100vw, 100vh);
  height: min(100vw, 100vh);
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
</head>
<body>
<canvas id="px" width="36" height="36"></canvas>

<script>
// ─── PIXEL RENDERER ──────────────────────────────────────────────────────────
//
// Grid: 36x36 logical pixels
// Each logical pixel = SCALE css pixels
// Colors are palette indices; 0 = transparent (bg)

const SCALE = 8;          // css pixels per logical pixel
const W = 36, H = 36;     // logical grid size

const canvas = document.getElementById('px');
canvas.width  = W;
canvas.height = H;

const ctx = canvas.getContext('2d');

function themeVar(v, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;
}

// Palette: index → hex color. 0 = bg (transparent).
// Slots 7, 11, 14 pull from the active VSCode theme so colors feel native.
const PAL = [
  null,        // 0  transparent / bg
  '#1a0a00',   // 1  deep shadow
  '#3d1f00',   // 2  dark orange-brown
  '#c85000',   // 3  crab body orange
  '#ff6b1a',   // 4  crab highlight
  '#ff9955',   // 5  crab light
  '#ffddbb',   // 6  pale/skin
  themeVar('--vscode-editorWidget-background', '#2d2d30'),  // 7  file background
  '#000000',   // 8  black
  '#ff2222',   // 9  red (error / claw accent)
  '#ffee44',   // 10 yellow (star / success)
  themeVar('--vscode-terminal-ansiBlue', '#44aaff'),        // 11 blue (eyes / iris)
  '#001133',   // 12 dark blue (pupil bg)
  '#88ccff',   // 13 eye highlight
  themeVar('--vscode-editor-foreground', '#cccccc'),        // 14 file border + code lines
  '#00cc44',   // 15 green (success)
  '#aaffcc',   // 16 light green
  '#884400',   // 17 mid brown-orange
  '#552200',   // 18 dark brown
  '#ffcc00',   // 19 amber / gold
  '#ffaacc',   // 20 pink (eraser)
];

const BG = themeVar('--vscode-editor-background', '#1e1e1e');

// Current frame buffer — flat array of palette indices, row-major
let frameBuf = new Uint8Array(W * H);

function drawFrame(buf) {
  // fill bg
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = buf[y * W + x];
      if (idx === 0) continue;          // transparent
      ctx.fillStyle = PAL[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// Paint helper — set a pixel in a mutable buffer
function px(buf, x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  buf[y * W + x] = c;
}

// Fill a rectangle in a buffer
function fillRect(buf, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      px(buf, x + dx, y + dy, c);
}

// ─── ANIMATION ENGINE ────────────────────────────────────────────────────────
//
// An animation is an array of { buf: Uint8Array, dur: number (ms) } frames.
// The engine cycles through frames and calls drawFrame on each tick.

let activeAnim = null;
let animFrameIdx = 0;
let animLastTime = 0;

function playAnim(frames) {
  activeAnim   = frames;
  animFrameIdx = 0;
  animLastTime = performance.now();
}

function animTick(now) {
  requestAnimationFrame(animTick);
  if (!activeAnim) return;

  const elapsed = now - animLastTime;
  const frame   = activeAnim[animFrameIdx];
  if (elapsed >= frame.dur) {
    animLastTime  = now;
    animFrameIdx  = (animFrameIdx + 1) % activeAnim.length;
  }
  drawFrame(activeAnim[animFrameIdx].buf);
}
requestAnimationFrame(animTick);

// ─── DUMMY STATE ANIMATIONS ──────────────────────────────────────────────────
//
// Each animation is a visually distinct placeholder for a real sprite later.
// Palette indices used here so swapping real art is a drop-in replacement.

function solid(c) {
  return new Uint8Array(W * H).fill(c);
}

function blink(c1, c2, d1, d2) {
  return [{ buf: solid(c1), dur: d1 }, { buf: solid(c2), dur: d2 }];
}

function scanBar(fg, bg, barH, stepMs) {
  const frames = [];
  for (let top = 0; top <= H - barH; top++) {
    const buf = solid(bg);
    fillRect(buf, 0, top, W, barH, fg);
    frames.push({ buf, dur: stepMs });
  }
  return frames;
}

function chaseDots(fg, bg, dotCount, stepMs) {
  const frames = [];
  const mid = Math.floor(H / 2);
  const gap  = Math.floor(W / dotCount);
  for (let offset = 0; offset < gap; offset++) {
    const buf = solid(bg);
    for (let d = 0; d < dotCount; d++) {
      const x = (offset + d * gap) % W;
      fillRect(buf, x, mid - 1, 2, 2, fg);
    }
    frames.push({ buf, dur: stepMs });
  }
  return frames;
}

function diagSweep(c1, c2, stepMs) {
  const frames = [];
  for (let offset = 0; offset < 6; offset++) {
    const buf = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        px(buf, x, y, ((x + y + offset) % 6 < 3) ? c1 : c2);
    frames.push({ buf, dur: stepMs });
  }
  return frames;
}

function checkerFlip(c1, c2, dur) {
  const make = (a, b) => {
    const buf = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        px(buf, x, y, ((x + y) % 2 === 0) ? a : b);
    return buf;
  };
  return [{ buf: make(c1, c2), dur }, { buf: make(c2, c1), dur }];
}

// ─── CRAB SPRITE ─────────────────────────────────────────────────────────────

function makeCrab(oy) {
  const buf = new Uint8Array(W * H);
  const lx = 9;        // left edge of sprite (centres 18px body in 36px grid)
  const ty = 8 + oy;   // top of body

  // Body fill (full 18x12, no outline)
  fillRect(buf, lx, ty, 18, 12, 3);
  // Highlight strip across top
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: 3x3 black with single highlight pixel
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  px(buf, lx+3,  ty+3, 13);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+12, ty+3, 13);

  // Mouth: subtle smile — corners 1px higher than center
  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);
  px(buf, lx+11, ty+8, 8);

  // Arms: 2px wide, 4px tall stubs on each side at mid-body height
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);  // tip shadow
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);  // tip shadow

  // Legs: 4 legs, 2px wide, 4px tall
  // outer legs flush with body edges, 2px gap between neighbours, large centre gap
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);  // foot shadow
  }

  return buf;
}

function makeCrabBob() {
  return [
    { buf: makeCrab(0), dur: 400 },
    { buf: makeCrab(2), dur: 400 },
  ];
}

function makeReadingCrab(oy, gleamOff) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: 3x3 black, iris at bottom row, drifting left/right
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+3  + gleamOff, ty+5, 11);
  px(buf, lx+12 + gleamOff, ty+5, 11);

  // Mouth: tight flat line
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  // Large file — fills the lower half of the frame
  fillRect(buf, 8, 25, 20, 11, 7);    // white fill
  fillRect(buf, 8, 25, 20,  1, 14);   // top border
  fillRect(buf, 8, 35, 20,  1, 14);   // bottom border
  fillRect(buf, 8, 25,  1, 11, 14);   // left border
  fillRect(buf, 27,25,  1, 11, 14);   // right border
  fillRect(buf, 10, 27, 12, 1, 14);   // code line 1
  fillRect(buf, 10, 29, 15, 1, 14);   // code line 2
  fillRect(buf, 12, 31, 10, 1, 14);   // code line 3 (indented)
  fillRect(buf, 12, 33,  8, 1, 14);   // code line 4 (indented)

  return buf;
}

function makeReadingAnim() {
  return [
    { buf: makeReadingCrab(0, 0), dur: 600 },  // oy=0, gleam left
    { buf: makeReadingCrab(1, 2), dur: 600 },  // oy=1, gleam right
  ];
}

function makeWritingCrab(oy, tipX) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: looking down
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+4,  ty+5, 11);
  px(buf, lx+13, ty+5, 11);

  // Mouth: tight
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  // File
  fillRect(buf, 8, 25, 20, 11, 7);
  fillRect(buf, 8, 25, 20,  1, 14);
  fillRect(buf, 8, 35, 20,  1, 14);
  fillRect(buf, 8, 25,  1, 11, 14);
  fillRect(buf, 27,25,  1, 11, 14);
  fillRect(buf, 10, 29, 15, 1, 14);   // static line 2
  fillRect(buf, 12, 31, 10, 1, 14);   // static line 3
  fillRect(buf, 12, 33,  8, 1, 14);   // static line 4

  // Written text trail up to pencil tip
  if (tipX > 10) { fillRect(buf, 10, 27, tipX - 10, 1, 14); }

  // Diagonal pencil: tip at (tipX, 27), ascending up-right
  // 1px wood tip → 3px yellow body → pink eraser
  px(buf, tipX,   27, 17);   // tip (wood)
  px(buf, tipX+1, 26, 10);   // body
  px(buf, tipX+2, 25, 10);   // body
  px(buf, tipX+3, 24, 10);   // body
  px(buf, tipX+4, 23, 20);   // eraser (pink)

  return buf;
}

function makeWritingAnim() {
  return [
    { buf: makeWritingCrab(0, 10), dur: 220 },
    { buf: makeWritingCrab(1, 14), dur: 220 },
    { buf: makeWritingCrab(0, 18), dur: 220 },
    { buf: makeWritingCrab(1, 22), dur: 220 },
  ];
}

function makeCommandCrab(oy, lineWidth) {
  const buf = new Uint8Array(W * H);
  const lx = 2;   // scooted left to make room for terminal
  const ty = 8 + oy;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: iris at right column = looking right
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+5,  ty+4, 11);
  px(buf, lx+14, ty+4, 11);

  // Mouth: smile
  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);
  px(buf, lx+11, ty+8, 8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  // Terminal: black fill, left+top+bottom borders, open right (cut off by canvas)
  fillRect(buf, 22, 8,  14, 20, 8);   // black fill
  fillRect(buf, 22, 8,  14,  1, 14);  // top border
  fillRect(buf, 22, 27, 14,  1, 14);  // bottom border
  fillRect(buf, 22, 8,   1, 20, 14);  // left border

  // Previous output lines
  fillRect(buf, 24, 12,  8, 1, 16);
  fillRect(buf, 24, 14, 10, 1, 16);
  fillRect(buf, 24, 17,  5, 1, 16);

  // Prompt marker + active typing line — same color as previous lines
  px(buf, 24, 21, 16);
  fillRect(buf, 24, 21, lineWidth, 1, 16);

  return buf;
}

function makeCommandAnim() {
  const frames = [];
  for (let w = 0; w <= 11; w++) {
    frames.push({ buf: makeCommandCrab(0, w), dur: 80 });
  }
  return frames;
}

function makeThinkingCrab(showDot1, showDot2, showBubble) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 14;  // shifted down to open space above for thought bubble

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: iris at top row = looking up
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+4,  ty+3, 11);
  px(buf, lx+13, ty+3, 11);

  // Mouth: smile
  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);
  px(buf, lx+11, ty+8, 8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  // Thought bubble chain — each element separated by a 1-row gap
  if (showDot1)   px(buf, 18, 12, 14);               // 1×1 dot  (row 12, gap at 13)
  if (showDot2)   fillRect(buf, 17, 9, 2, 2, 14);    // 2×2 dot  (rows 9-10, gap at 11)
  if (showBubble) {
    // Filled pill: cols 14-21, rows 4-7 (gap at 8)
    fillRect(buf, 15, 4, 6, 1, 14);  // top row (rounded)
    fillRect(buf, 14, 5, 8, 2, 14);  // middle
    fillRect(buf, 15, 7, 6, 1, 14);  // bottom row (rounded)
  }

  return buf;
}

function makeThinkingAnim() {
  const f0 = makeThinkingCrab(false, false, false);
  const f1 = makeThinkingCrab(true,  false, false);
  const f2 = makeThinkingCrab(true,  true,  false);
  const f3 = makeThinkingCrab(true,  true,  true);
  return [
    { buf: f0, dur: 400 },
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
    { buf: f3, dur: 500 },
    { buf: f3, dur: 500 },
  ];
}

function makeErrorCrab() {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // X eyes — diagonal cross in each 3x3 socket
  px(buf, lx+3, ty+3, 8); px(buf, lx+4, ty+4, 8); px(buf, lx+5, ty+5, 8);
  px(buf, lx+5, ty+3, 8);                           px(buf, lx+3, ty+5, 8);
  px(buf, lx+12, ty+3, 8); px(buf, lx+13, ty+4, 8); px(buf, lx+14, ty+5, 8);
  px(buf, lx+14, ty+3, 8);                           px(buf, lx+12, ty+5, 8);

  // Frown (mirror of smile: corners low, center high)
  px(buf, lx+4,  ty+10, 8);
  px(buf, lx+5,  ty+9,  8);
  px(buf, lx+6,  ty+8,  8);
  px(buf, lx+7,  ty+8,  8);
  px(buf, lx+8,  ty+8,  8);
  px(buf, lx+9,  ty+8,  8);
  px(buf, lx+10, ty+8,  8);
  px(buf, lx+11, ty+8,  8);
  px(buf, lx+12, ty+9,  8);
  px(buf, lx+13, ty+10, 8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  return buf;
}

function makeErrorAnim() {
  return [{ buf: makeErrorCrab(), dur: 9999 }];
}

function makeUncertainCrab(irisOff) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: both irises dart in the same direction each frame
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+3  + irisOff, ty+4, 11);
  px(buf, lx+12 + irisOff, ty+4, 11);

  // Wavy mouth
  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+8, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+8, 8);
  px(buf, lx+11, ty+9, 8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  return buf;
}

function makeUncertainAnim() {
  return [
    { buf: makeUncertainCrab(0), dur: 350 },  // iris left
    { buf: makeUncertainCrab(2), dur: 350 },  // iris right
  ];
}

function makeSuccessCrab(sparkleCol) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  px(buf, lx+3,  ty+3, 13);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+12, ty+3, 13);

  // Big smile: 8px wide, deeper curve than idle
  px(buf, lx+5,  ty+8,  8);
  px(buf, lx+6,  ty+9,  8);
  px(buf, lx+7,  ty+10, 8);
  px(buf, lx+8,  ty+10, 8);
  px(buf, lx+9,  ty+10, 8);
  px(buf, lx+10, ty+10, 8);
  px(buf, lx+11, ty+9,  8);
  px(buf, lx+12, ty+8,  8);

  // Arms
  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  // Green tick below crab (clear of leg shadows at row 23)
  px(buf, 12, 30, 15); px(buf, 13, 31, 15); px(buf, 14, 32, 15);  // short left leg
  px(buf, 15, 31, 15); px(buf, 16, 30, 15); px(buf, 17, 29, 15);  // right leg
  px(buf, 18, 28, 15); px(buf, 19, 27, 15); px(buf, 20, 26, 15);
  px(buf, 21, 25, 15); px(buf, 22, 24, 15);

  // Sparkles: cross shape (+) around the crab, twinkling between frames
  function sparkle(cx, cy) {
    px(buf, cx,   cy,   sparkleCol);
    px(buf, cx-1, cy,   sparkleCol);
    px(buf, cx+1, cy,   sparkleCol);
    px(buf, cx,   cy-1, sparkleCol);
    px(buf, cx,   cy+1, sparkleCol);
  }
  sparkle(4,  5);
  sparkle(30, 4);
  sparkle(3,  14);
  sparkle(32, 13);
  sparkle(7,  25);
  sparkle(28, 25);

  return buf;
}

function makeSuccessAnim() {
  const f1 = makeSuccessCrab(10);  // yellow sparkles
  const f2 = makeSuccessCrab(16);  // light green sparkles
  return [
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
  ];
}

function makeActuallyCrab(oy) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  // Body
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);

  // Eyes: wide/alert
  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  px(buf, lx+4,  ty+3, 13);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+13, ty+3, 13);

  // Open O-mouth (surprise)
  px(buf, lx+8,  ty+8,  8); px(buf, lx+9,  ty+8,  8);  // top
  px(buf, lx+7,  ty+9,  8);                              // left
  px(buf, lx+10, ty+9,  8);                              // right
  px(buf, lx+8,  ty+10, 8); px(buf, lx+9,  ty+10, 8);  // bottom

  // Left arm: normal
  fillRect(buf, lx-2, ty+5, 2, 4, 3);
  fillRect(buf, lx-2, ty+8, 2, 1, 2);

  // Right arm: 1px horizontal extension then pointing up
  fillRect(buf, lx+18, ty+5, 3, 1, 3);  // shoulder + 1px right (cols 27-29)
  fillRect(buf, lx+20, ty+1, 1, 4, 3);  // vertical arm up (col 29, 4px)

  // Legs
  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  // Exclamation mark above raised arm (cols 28-29, aligned with arm tip)
  fillRect(buf, 28, 1, 2, 4, 10);  // bar
  fillRect(buf, 28, 6, 2, 2, 10);  // dot

  return buf;
}

function makeActuallyAnim() {
  return [
    { buf: makeActuallyCrab(0), dur: 400 },
    { buf: makeActuallyCrab(1), dur: 400 },
  ];
}

const ANIMS = {
  idle:            makeCrabBob(),
  thinking:        makeThinkingAnim(),
  reading:         makeReadingAnim(),
  writing:         makeWritingAnim(),
  running_command: makeCommandAnim(),
  error:           makeErrorAnim(),
  success:         makeSuccessAnim(),
  uncertain:       makeUncertainAnim(),
  actually:        makeActuallyAnim(),
};

playAnim(ANIMS.idle);

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────
// States listed here auto-reset to idle after their duration (ms).
const TEMP_STATES = {
  error:     4000,
  success:   3000,
  uncertain: 4000,
  actually:  3000,
};

let resetTimer = null;

window.addEventListener('message', e => {
  if (e.data?.type === 'setState') {
    const state = e.data.state;
    clearTimeout(resetTimer);
    playAnim(ANIMS[state] ?? ANIMS.idle);
    if (TEMP_STATES[state]) {
      resetTimer = setTimeout(() => playAnim(ANIMS.idle), TEMP_STATES[state]);
    }
  }
});

</script>
</body>
</html>`;
}

export function deactivate() {
  server?.close();
}
