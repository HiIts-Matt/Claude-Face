export const W = 36, H = 36;

export interface Frame { buf: Uint8Array; dur: number; }

export function px(buf: Uint8Array, x: number, y: number, c: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) { return; }
  buf[y * W + x] = c;
}

export function fillRect(buf: Uint8Array, x: number, y: number, w: number, h: number, c: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) { px(buf, x + dx, y + dy, c); }
  }
}

// ─── CRAB BODY PARTS ─────────────────────────────────────────────────────────

export function drawBody(buf: Uint8Array, lx: number, ty: number): void {
  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18, 2, 4);
}

export function drawLeftArm(buf: Uint8Array, lx: number, ty: number): void {
  fillRect(buf, lx - 2, ty + 5, 2, 4, 3);
  fillRect(buf, lx - 2, ty + 8, 2, 1, 2);
}

export function drawRightArm(buf: Uint8Array, lx: number, ty: number): void {
  fillRect(buf, lx + 18, ty + 5, 2, 4, 3);
  fillRect(buf, lx + 18, ty + 8, 2, 1, 2);
}

export function drawRightArmRaised(buf: Uint8Array, lx: number, ty: number): void {
  fillRect(buf, lx + 18, ty + 5, 3, 1, 3);
  fillRect(buf, lx + 20, ty + 1, 1, 4, 3);
}

export function drawLegs(buf: Uint8Array, lx: number, ty: number): void {
  for (const legX of [lx, lx + 4, lx + 12, lx + 16]) {
    fillRect(buf, legX, ty + 12, 2, 4, 3);
    fillRect(buf, legX, ty + 15, 2, 1, 2);
  }
}

export function drawCrabBase(buf: Uint8Array, lx: number, ty: number): void {
  drawBody(buf, lx, ty);
  drawLeftArm(buf, lx, ty);
  drawRightArm(buf, lx, ty);
  drawLegs(buf, lx, ty);
}

// ─── EYE STYLES ──────────────────────────────────────────────────────────────

export function drawEyeSockets(buf: Uint8Array, lx: number, ty: number): void {
  fillRect(buf, lx + 3, ty + 3, 3, 3, 8);
  fillRect(buf, lx + 12, ty + 3, 3, 3, 8);
}

export function drawEyesHappy(buf: Uint8Array, lx: number, ty: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 3, ty + 3, 13);
  px(buf, lx + 12, ty + 3, 13);
}

export function drawEyesSurprised(buf: Uint8Array, lx: number, ty: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 4, ty + 3, 13);
  px(buf, lx + 13, ty + 3, 13);
}

export function drawEyesReading(buf: Uint8Array, lx: number, ty: number, gleamOff: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 3 + gleamOff, ty + 5, 11);
  px(buf, lx + 12 + gleamOff, ty + 5, 11);
}

export function drawEyesWriting(buf: Uint8Array, lx: number, ty: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 4, ty + 5, 11);
  px(buf, lx + 13, ty + 5, 11);
}

export function drawEyesCommand(buf: Uint8Array, lx: number, ty: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 5, ty + 4, 11);
  px(buf, lx + 14, ty + 4, 11);
}

export function drawEyesThinking(buf: Uint8Array, lx: number, ty: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 4, ty + 3, 11);
  px(buf, lx + 13, ty + 3, 11);
}

export function drawEyesSideways(buf: Uint8Array, lx: number, ty: number, irisOff: number): void {
  drawEyeSockets(buf, lx, ty);
  px(buf, lx + 3 + irisOff, ty + 4, 11);
  px(buf, lx + 12 + irisOff, ty + 4, 11);
}

export function drawEyesError(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 3, ty + 3, 8); px(buf, lx + 4, ty + 4, 8); px(buf, lx + 5, ty + 5, 8);
  px(buf, lx + 5, ty + 3, 8); px(buf, lx + 3, ty + 5, 8);
  px(buf, lx + 12, ty + 3, 8); px(buf, lx + 13, ty + 4, 8); px(buf, lx + 14, ty + 5, 8);
  px(buf, lx + 14, ty + 3, 8); px(buf, lx + 12, ty + 5, 8);
}

// ─── MOUTH STYLES ────────────────────────────────────────────────────────────

export function drawMouthSmile(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 6, ty + 8, 8);
  px(buf, lx + 7, ty + 9, 8);
  px(buf, lx + 8, ty + 9, 8);
  px(buf, lx + 9, ty + 9, 8);
  px(buf, lx + 10, ty + 9, 8);
  px(buf, lx + 11, ty + 8, 8);
}

export function drawMouthFlat(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 7, ty + 9, 8);
  px(buf, lx + 8, ty + 9, 8);
  px(buf, lx + 9, ty + 9, 8);
  px(buf, lx + 10, ty + 9, 8);
}

export function drawMouthFrown(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 4, ty + 10, 8);
  px(buf, lx + 5, ty + 9, 8);
  px(buf, lx + 6, ty + 8, 8);
  px(buf, lx + 7, ty + 8, 8);
  px(buf, lx + 8, ty + 8, 8);
  px(buf, lx + 9, ty + 8, 8);
  px(buf, lx + 10, ty + 8, 8);
  px(buf, lx + 11, ty + 8, 8);
  px(buf, lx + 12, ty + 9, 8);
  px(buf, lx + 13, ty + 10, 8);
}

export function drawMouthWavy(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 6, ty + 8, 8);
  px(buf, lx + 7, ty + 9, 8);
  px(buf, lx + 8, ty + 8, 8);
  px(buf, lx + 9, ty + 9, 8);
  px(buf, lx + 10, ty + 8, 8);
  px(buf, lx + 11, ty + 9, 8);
}

export function drawMouthGrin(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 5, ty + 8, 8);
  px(buf, lx + 6, ty + 9, 8);
  px(buf, lx + 7, ty + 10, 8);
  px(buf, lx + 8, ty + 10, 8);
  px(buf, lx + 9, ty + 10, 8);
  px(buf, lx + 10, ty + 10, 8);
  px(buf, lx + 11, ty + 9, 8);
  px(buf, lx + 12, ty + 8, 8);
}

export function drawMouthO(buf: Uint8Array, lx: number, ty: number): void {
  px(buf, lx + 8, ty + 8, 8); px(buf, lx + 9, ty + 8, 8);
  px(buf, lx + 7, ty + 9, 8); px(buf, lx + 10, ty + 9, 8);
  px(buf, lx + 8, ty + 10, 8); px(buf, lx + 9, ty + 10, 8);
}

// ─── PROPS ───────────────────────────────────────────────────────────────────

export function drawFileProp(buf: Uint8Array): void {
  fillRect(buf, 8, 25, 20, 11, 7);
  fillRect(buf, 8, 25, 20, 1, 14);
  fillRect(buf, 8, 35, 20, 1, 14);
  fillRect(buf, 8, 25, 1, 11, 14);
  fillRect(buf, 27, 25, 1, 11, 14);
  fillRect(buf, 10, 27, 12, 1, 14);
  fillRect(buf, 10, 29, 15, 1, 14);
  fillRect(buf, 12, 31, 10, 1, 14);
  fillRect(buf, 12, 33, 8, 1, 14);
}

export function drawPencil(buf: Uint8Array, tipX: number): void {
  if (tipX > 10) { fillRect(buf, 10, 27, tipX - 10, 1, 14); }
  px(buf, tipX, 27, 17);
  px(buf, tipX + 1, 26, 10);
  px(buf, tipX + 2, 25, 10);
  px(buf, tipX + 3, 24, 10);
  px(buf, tipX + 4, 23, 20);
}

export function drawTerminalProp(buf: Uint8Array, lineWidth: number): void {
  // computer body
  fillRect(buf, 24, 10, 10, 1, 21); 
  fillRect(buf, 23, 11, 12, 16, 21);

  // screen border
  fillRect(buf, 24, 12, 10, 9, 22);

  // screen
  fillRect(buf, 25, 13, 8, 7, 8);

  // terminal lines
  fillRect(buf, 26, 14, 6, 1, 15);
  fillRect(buf, 26, 16, 4, 1, 15);

  // cursor
  const cur = Math.min(lineWidth, 6);
  if (cur > 0) { fillRect(buf, 26, 18, cur, 1, 15); }

  // floppy disk
  fillRect(buf, 27, 23, 6, 1, 8);

  // shadow
  fillRect(buf, 23, 27, 12, 1, 22);
}

export function drawKeyboardProp(buf: Uint8Array, frameCount: number): void {
  const keyboardWidth = 20;
  const keyboardX = 1;
  const keyboardY = 28;

  //keyboard body
  fillRect(buf, keyboardX, keyboardY + 1, keyboardWidth, 2, 21);

  //keyboard keys
  fillRect(buf, keyboardX + 1, keyboardY, keyboardWidth - 2, 1, 22);

  //cable
  fillRect(buf, keyboardX - 1 + keyboardWidth / 2, keyboardY + 3, 1, 2, 22);
  fillRect(buf, keyboardX - 1 + keyboardWidth / 2, keyboardY + 5, 18, 1, 22);
  fillRect(buf, 28, 28, 1, 6, 22);
}

export function drawThoughtBubble(buf: Uint8Array, showDot1: boolean, showDot2: boolean, showBubble: boolean): void {
  if (showDot1) { px(buf, 11, 12, 14); }
  if (showDot2) { fillRect(buf, 9, 9, 2, 2, 14); }
  if (showBubble) {
    fillRect(buf, 9, 2, 18, 1, 14);
    fillRect(buf, 8, 3, 20, 4, 14);
    fillRect(buf, 9, 7, 18, 1, 14);
  }
}

export function drawSparkle(buf: Uint8Array, cx: number, cy: number, col: number): void {
  px(buf, cx, cy, col);
  px(buf, cx - 1, cy, col);
  px(buf, cx + 1, cy, col);
  px(buf, cx, cy - 1, col);
  px(buf, cx, cy + 1, col);
}

export function drawSuccessSparkles(buf: Uint8Array, col: number): void {
  px(buf, 12, 30, 15); px(buf, 13, 31, 15); px(buf, 14, 32, 15);
  px(buf, 15, 31, 15); px(buf, 16, 30, 15); px(buf, 17, 29, 15);
  px(buf, 18, 28, 15); px(buf, 19, 27, 15); px(buf, 20, 26, 15);
  px(buf, 21, 25, 15); px(buf, 22, 24, 15);
  drawSparkle(buf, 4, 5, col);
  drawSparkle(buf, 30, 4, col);
  drawSparkle(buf, 3, 14, col);
  drawSparkle(buf, 32, 13, col);
  drawSparkle(buf, 7, 25, col);
  drawSparkle(buf, 28, 25, col);
}

export function drawExclamation(buf: Uint8Array): void {
  fillRect(buf, 28, 1, 2, 4, 10);
  fillRect(buf, 28, 6, 2, 2, 10);
}
