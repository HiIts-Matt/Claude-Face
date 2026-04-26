import { W, H, Frame, drawCrabBase, drawEyesHappy, drawMouthGrin, drawSuccessSparkles } from '../drawing';

function makeSuccessCrab(sparkleCol: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 8;
  drawCrabBase(buf, lx, ty);
  drawEyesHappy(buf, lx, ty);
  drawMouthGrin(buf, lx, ty);
  drawSuccessSparkles(buf, sparkleCol);
  return buf;
}

export function makeSuccessAnim(): Frame[] {
  const f1 = makeSuccessCrab(10);
  const f2 = makeSuccessCrab(16);
  return [
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
  ];
}
