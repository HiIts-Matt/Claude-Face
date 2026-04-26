import { W, H, Frame, drawCrabBase, drawEyesWriting, drawMouthFlat, drawFileProp, drawPencil } from '../drawing';

function makeWritingCrab(oy: number, tipX: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8 + oy;
  drawCrabBase(buf, lx, ty);
  drawEyesWriting(buf, lx, ty);
  drawMouthFlat(buf, lx, ty);
  drawFileProp(buf);
  drawPencil(buf, tipX);
  return buf;
}

export function makeWritingAnim(): Frame[] {
  return [
    { buf: makeWritingCrab(0, 10), dur: 220 },
    { buf: makeWritingCrab(1, 14), dur: 220 },
    { buf: makeWritingCrab(0, 18), dur: 220 },
    { buf: makeWritingCrab(1, 22), dur: 220 },
  ];
}
