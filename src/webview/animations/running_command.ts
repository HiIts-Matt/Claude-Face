import { W, H, Frame, drawCrabBase, drawEyesCommand, drawMouthSmile, drawTerminalProp, drawKeyboardProp } from '../drawing';

function makeCommandCrab(oy: number, frameCount: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 2, ty = 12 + oy - (frameCount % 4 < 2 ? 1 : 0);
  drawCrabBase(buf, lx, ty);
  drawEyesCommand(buf, lx, ty);
  drawMouthSmile(buf, lx, ty);
  drawTerminalProp(buf, frameCount);
  drawKeyboardProp(buf, frameCount);
  return buf;
}

export function makeCommandAnim(): Frame[] {
  const frames: Frame[] = [];
  for (let w = 0; w <= 10; w++) {
    frames.push({ buf: makeCommandCrab(0, w), dur: 80 });
  }
  return frames;
}
