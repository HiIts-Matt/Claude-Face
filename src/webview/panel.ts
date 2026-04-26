import { W, H, Frame } from './drawing';
import { ANIMS, TEMP_STATES } from './animations';

// ─── PIXEL RENDERER ──────────────────────────────────────────────────────────

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
  '#c8bfa4',   // 21 Mac platinum beige
  '#9e9080',   // 22 Mac dark beige (screen surround / shadow)
];

const BG = themeVar('--vscode-editor-background', '#1e1e1e');

function drawFrame(buf: Uint8Array): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = buf[y * W + x];
      if (idx === 0) { continue; }
      ctx.fillStyle = PAL[idx] as string;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// ─── ANIMATION ENGINE ────────────────────────────────────────────────────────

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
  if (!activeAnim) { return; }
  const elapsed = now - animLastTime;
  const frame   = activeAnim[animFrameIdx];
  if (elapsed >= frame.dur) {
    animLastTime  = now;
    animFrameIdx  = (animFrameIdx + 1) % activeAnim.length;
  }
  drawFrame(activeAnim[animFrameIdx].buf);
}
requestAnimationFrame(animTick);

playAnim(ANIMS.idle);

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────

let resetTimer: ReturnType<typeof setTimeout> | null = null;

window.addEventListener('message', (e: MessageEvent<{ type: string; state?: string }>) => {
  if (e.data?.type === 'setState') {
    const state = e.data.state!;
    if (resetTimer !== null) { clearTimeout(resetTimer); }
    playAnim(ANIMS[state] ?? ANIMS.idle);
    if (TEMP_STATES[state]) {
      resetTimer = setTimeout(() => playAnim(ANIMS.idle), TEMP_STATES[state]);
    }
  }
  if (e.data?.type === 'toggleDevMode') {
    devMode = !devMode;
    devGrid.style.display   = devMode ? 'block' : 'none';
    if (!devMode) { devCoords.style.display = 'none'; }
  }
});

// ─── DEVELOPER MODE ──────────────────────────────────────────────────────────

let devMode = false;
const devGrid   = document.getElementById('dev-grid')   as HTMLDivElement;
const devCoords = document.getElementById('dev-coords') as HTMLDivElement;

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!devMode) { return; }
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / rect.width  * W);
  const y = Math.floor((e.clientY - rect.top)  / rect.height * H);
  devCoords.textContent  = `${x}, ${y}`;
  devCoords.style.display = 'block';
});

canvas.addEventListener('mouseleave', () => {
  devCoords.style.display = 'none';
});
