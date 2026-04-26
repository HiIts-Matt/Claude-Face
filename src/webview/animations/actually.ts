import { W, H, Frame, drawBody, drawLeftArm, drawRightArmRaised, drawLegs, drawEyesSurprised, drawMouthO, drawExclamation } from '../drawing';

function makeActuallyCrab(oy: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8 + oy;
  drawBody(buf, lx, ty);
  drawLeftArm(buf, lx, ty);
  drawRightArmRaised(buf, lx, ty);
  drawLegs(buf, lx, ty);
  drawEyesSurprised(buf, lx, ty);
  drawMouthO(buf, lx, ty);
  drawExclamation(buf);
  return buf;
}

export function makeActuallyAnim(): Frame[] {
  return [
    { buf: makeActuallyCrab(0), dur: 400 },
    { buf: makeActuallyCrab(1), dur: 400 },
  ];
}
