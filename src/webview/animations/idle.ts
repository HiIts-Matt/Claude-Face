import { W, H, Frame, drawCrabBase, drawEyesHappy, drawMouthSmile } from '../drawing';

function makeCrab(oy: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8 + oy;
  drawCrabBase(buf, lx, ty);
  drawEyesHappy(buf, lx, ty);
  drawMouthSmile(buf, lx, ty);
  return buf;
}

export function makeCrabBob(): Frame[] {
  return [
    { buf: makeCrab(0), dur: 400 },
    { buf: makeCrab(2), dur: 400 },
  ];
}
