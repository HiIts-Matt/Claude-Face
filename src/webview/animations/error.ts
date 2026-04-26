import { W, H, Frame, drawCrabBase, drawEyesError, drawMouthFrown } from '../drawing';

function makeErrorCrab(): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8;
  drawCrabBase(buf, lx, ty);
  drawEyesError(buf, lx, ty);
  drawMouthFrown(buf, lx, ty);
  return buf;
}

export function makeErrorAnim(): Frame[] {
  return [{ buf: makeErrorCrab(), dur: 9999 }];
}
