// ─── PIXEL RENDERER ──────────────────────────────────────────────────────────

const W = 36, H = 36;

const canvas = document.getElementById('px') as HTMLCanvasElement;
canvas.width  = W;
canvas.height = H;

const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

function themeVar(v: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;
}

// Palette: index → hex color. 0 = transparent (bg).
// Slots 7, 11, 14 pull from the active VS Code theme so colors feel native.
const PAL: (string | null)[] = [
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

function drawFrame(buf: Uint8Array): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = buf[y * W + x];
      if (idx === 0) {continue;}
      ctx.fillStyle = PAL[idx] as string;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function px(buf: Uint8Array, x: number, y: number, c: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) {return;}
  buf[y * W + x] = c;
}

function fillRect(buf: Uint8Array, x: number, y: number, w: number, h: number, c: number): void {
  for (let dy = 0; dy < h; dy++)
    {for (let dx = 0; dx < w; dx++)
      {px(buf, x + dx, y + dy, c);}}
}

// ─── ANIMATION ENGINE ────────────────────────────────────────────────────────

interface Frame { buf: Uint8Array; dur: number; }

let activeAnim: Frame[] | null = null;
let animFrameIdx = 0;
let animLastTime = 0;

function playAnim(frames: Frame[]): void {
  activeAnim   = frames;
  animFrameIdx = 0;
  animLastTime = performance.now();
}

function animTick(now: number): void {
  requestAnimationFrame(animTick);
  if (!activeAnim) {return;}
  const elapsed = now - animLastTime;
  const frame   = activeAnim[animFrameIdx];
  if (elapsed >= frame.dur) {
    animLastTime  = now;
    animFrameIdx  = (animFrameIdx + 1) % activeAnim.length;
  }
  drawFrame(activeAnim[animFrameIdx].buf);
}
requestAnimationFrame(animTick);

// ─── CRAB SPRITE ─────────────────────────────────────────────────────────────

function makeCrab(oy: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  px(buf, lx+3,  ty+3, 13);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+12, ty+3, 13);

  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);
  px(buf, lx+11, ty+8, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  return buf;
}

function makeCrabBob(): Frame[] {
  return [
    { buf: makeCrab(0), dur: 400 },
    { buf: makeCrab(2), dur: 400 },
  ];
}

function makeReadingCrab(oy: number, gleamOff: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+3  + gleamOff, ty+5, 11);
  px(buf, lx+12 + gleamOff, ty+5, 11);

  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  fillRect(buf, 8,  25, 20, 11, 7);
  fillRect(buf, 8,  25, 20,  1, 14);
  fillRect(buf, 8,  35, 20,  1, 14);
  fillRect(buf, 8,  25,  1, 11, 14);
  fillRect(buf, 27, 25,  1, 11, 14);
  fillRect(buf, 10, 27, 12,  1, 14);
  fillRect(buf, 10, 29, 15,  1, 14);
  fillRect(buf, 12, 31, 10,  1, 14);
  fillRect(buf, 12, 33,  8,  1, 14);

  return buf;
}

function makeReadingAnim(): Frame[] {
  return [
    { buf: makeReadingCrab(0, 0), dur: 600 },
    { buf: makeReadingCrab(1, 2), dur: 600 },
  ];
}

function makeWritingCrab(oy: number, tipX: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+4,  ty+5, 11);
  px(buf, lx+13, ty+5, 11);

  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  fillRect(buf, 8,  25, 20, 11, 7);
  fillRect(buf, 8,  25, 20,  1, 14);
  fillRect(buf, 8,  35, 20,  1, 14);
  fillRect(buf, 8,  25,  1, 11, 14);
  fillRect(buf, 27, 25,  1, 11, 14);
  fillRect(buf, 10, 29, 15,  1, 14);
  fillRect(buf, 12, 31, 10,  1, 14);
  fillRect(buf, 12, 33,  8,  1, 14);

  if (tipX > 10) { fillRect(buf, 10, 27, tipX - 10, 1, 14); }

  px(buf, tipX,   27, 17);
  px(buf, tipX+1, 26, 10);
  px(buf, tipX+2, 25, 10);
  px(buf, tipX+3, 24, 10);
  px(buf, tipX+4, 23, 20);

  return buf;
}

function makeWritingAnim(): Frame[] {
  return [
    { buf: makeWritingCrab(0, 10), dur: 220 },
    { buf: makeWritingCrab(1, 14), dur: 220 },
    { buf: makeWritingCrab(0, 18), dur: 220 },
    { buf: makeWritingCrab(1, 22), dur: 220 },
  ];
}

function makeCommandCrab(oy: number, lineWidth: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 2;
  const ty = 8 + oy;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+5,  ty+4, 11);
  px(buf, lx+14, ty+4, 11);

  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);
  px(buf, lx+11, ty+8, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  fillRect(buf, 22, 8,  14, 20, 8);
  fillRect(buf, 22, 8,  14,  1, 14);
  fillRect(buf, 22, 27, 14,  1, 14);
  fillRect(buf, 22, 8,   1, 20, 14);

  fillRect(buf, 24, 12,  8, 1, 16);
  fillRect(buf, 24, 14, 10, 1, 16);
  fillRect(buf, 24, 17,  5, 1, 16);

  fillRect(buf, 24, 21, lineWidth, 1, 16);

  return buf;
}

function makeCommandAnim(): Frame[] {
  const frames: Frame[] = [];
  for (let w = 0; w <= 11; w++) {
    frames.push({ buf: makeCommandCrab(0, w), dur: 80 });
  }
  return frames;
}

function makeThinkingCrab(showDot1: boolean, showDot2: boolean, showBubble: boolean): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 14;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+4,  ty+3, 11);
  px(buf, lx+13, ty+3, 11);

  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+9, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+9, 8);
  px(buf, lx+11, ty+8, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  if (showDot1)   {px(buf, 18, 12, 14);}
  if (showDot2)   {fillRect(buf, 17, 9, 2, 2, 14);}
  if (showBubble) {
    fillRect(buf, 15, 4, 6, 1, 14);
    fillRect(buf, 14, 5, 8, 2, 14);
    fillRect(buf, 15, 7, 6, 1, 14);
  }

  return buf;
}

function makeThinkingAnim(): Frame[] {
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

function makeErrorCrab(): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  px(buf, lx+3,  ty+3, 8); px(buf, lx+4,  ty+4, 8); px(buf, lx+5,  ty+5, 8);
  px(buf, lx+5,  ty+3, 8);                            px(buf, lx+3,  ty+5, 8);
  px(buf, lx+12, ty+3, 8); px(buf, lx+13, ty+4, 8); px(buf, lx+14, ty+5, 8);
  px(buf, lx+14, ty+3, 8);                            px(buf, lx+12, ty+5, 8);

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

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  return buf;
}

function makeErrorAnim(): Frame[] {
  return [{ buf: makeErrorCrab(), dur: 9999 }];
}

function makeUncertainCrab(irisOff: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+3  + irisOff, ty+4, 11);
  px(buf, lx+12 + irisOff, ty+4, 11);

  px(buf, lx+6,  ty+8, 8);
  px(buf, lx+7,  ty+9, 8);
  px(buf, lx+8,  ty+8, 8);
  px(buf, lx+9,  ty+9, 8);
  px(buf, lx+10, ty+8, 8);
  px(buf, lx+11, ty+9, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  return buf;
}

function makeUncertainAnim(): Frame[] {
  return [
    { buf: makeUncertainCrab(0), dur: 350 },
    { buf: makeUncertainCrab(2), dur: 350 },
  ];
}

function makeSuccessCrab(sparkleCol: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  px(buf, lx+3,  ty+3, 13);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+12, ty+3, 13);

  px(buf, lx+5,  ty+8,  8);
  px(buf, lx+6,  ty+9,  8);
  px(buf, lx+7,  ty+10, 8);
  px(buf, lx+8,  ty+10, 8);
  px(buf, lx+9,  ty+10, 8);
  px(buf, lx+10, ty+10, 8);
  px(buf, lx+11, ty+9,  8);
  px(buf, lx+12, ty+8,  8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);
  fillRect(buf, lx+18, ty+5, 2, 4, 3);
  fillRect(buf, lx+18, ty+8, 2, 1, 2);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  px(buf, 12, 30, 15); px(buf, 13, 31, 15); px(buf, 14, 32, 15);
  px(buf, 15, 31, 15); px(buf, 16, 30, 15); px(buf, 17, 29, 15);
  px(buf, 18, 28, 15); px(buf, 19, 27, 15); px(buf, 20, 26, 15);
  px(buf, 21, 25, 15); px(buf, 22, 24, 15);

  function sparkle(cx: number, cy: number): void {
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

function makeSuccessAnim(): Frame[] {
  const f1 = makeSuccessCrab(10);
  const f2 = makeSuccessCrab(16);
  return [
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
  ];
}

function makeActuallyCrab(oy: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx+3,  ty+3, 3, 3, 8);
  px(buf, lx+4,  ty+3, 13);
  fillRect(buf, lx+12, ty+3, 3, 3, 8);
  px(buf, lx+13, ty+3, 13);

  px(buf, lx+8,  ty+8,  8); px(buf, lx+9,  ty+8,  8);
  px(buf, lx+7,  ty+9,  8);
  px(buf, lx+10, ty+9,  8);
  px(buf, lx+8,  ty+10, 8); px(buf, lx+9,  ty+10, 8);

  fillRect(buf, lx-2,  ty+5, 2, 4, 3);
  fillRect(buf, lx-2,  ty+8, 2, 1, 2);

  fillRect(buf, lx+18, ty+5, 3, 1, 3);
  fillRect(buf, lx+20, ty+1, 1, 4, 3);

  for (const legX of [lx, lx+4, lx+12, lx+16]) {
    fillRect(buf, legX, ty+12, 2, 4, 3);
    fillRect(buf, legX, ty+15, 2, 1, 2);
  }

  fillRect(buf, 28, 1, 2, 4, 10);
  fillRect(buf, 28, 6, 2, 2, 10);

  return buf;
}

function makeActuallyAnim(): Frame[] {
  return [
    { buf: makeActuallyCrab(0), dur: 400 },
    { buf: makeActuallyCrab(1), dur: 400 },
  ];
}

// ─── ANIMATION REGISTRY ──────────────────────────────────────────────────────

const ANIMS: Record<string, Frame[]> = {
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
const TEMP_STATES: Record<string, number> = {
  error:     4000,
  success:   3000,
  uncertain: 4000,
  actually:  3000,
};

let resetTimer: ReturnType<typeof setTimeout> | null = null;

window.addEventListener('message', (e: MessageEvent<{ type: string; state: string }>) => {
  if (e.data?.type === 'setState') {
    const state = e.data.state;
    if (resetTimer !== null) {clearTimeout(resetTimer);}
    playAnim(ANIMS[state] ?? ANIMS.idle);
    if (TEMP_STATES[state]) {
      resetTimer = setTimeout(() => playAnim(ANIMS.idle), TEMP_STATES[state]);
    }
  }
});
