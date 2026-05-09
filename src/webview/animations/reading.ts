import { W, H, Frame, drawCrabBase, drawEyesReading, drawMouthFlat, drawFileProp } from '../drawing';

function makeReadingCrab(oy: number, gleamOff: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8 + oy;
  drawCrabBase(buf, lx, ty);
  drawEyesReading(buf, lx, ty, gleamOff);
  drawMouthFlat(buf, lx, ty);
  drawFileProp(buf);
  return buf;
}

export function makeReadingAnim(): Frame[] {
  return [
    { buf: makeReadingCrab(0, 0), dur: 36 },
    { buf: makeReadingCrab(1, 2), dur: 36 },
  ];
}
