import { W, H, Frame, drawCrabBase, drawEyesSideways, drawMouthWavy } from '../drawing';

function makeUncertainCrab(irisOff: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8;
  drawCrabBase(buf, lx, ty);
  drawEyesSideways(buf, lx, ty, irisOff);
  drawMouthWavy(buf, lx, ty);
  return buf;
}

export function makeUncertainAnim(): Frame[] {
  return [
    { buf: makeUncertainCrab(0), dur: 350 },
    { buf: makeUncertainCrab(2), dur: 350 },
  ];
}
