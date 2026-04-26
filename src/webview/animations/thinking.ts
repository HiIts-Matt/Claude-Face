import { W, H, Frame, drawCrabBase, drawEyesThinking, drawMouthSmile, drawThoughtBubble } from '../drawing';

function makeThinkingCrab(showDot1: boolean, showDot2: boolean, showBubble: boolean): Uint8Array {
  const buf = new Uint8Array(W * H);
  const lx = 9, ty = 14;
  drawCrabBase(buf, lx, ty);
  drawEyesThinking(buf, lx, ty);
  drawMouthSmile(buf, lx, ty);
  drawThoughtBubble(buf, showDot1, showDot2, showBubble);
  return buf;
}

export function makeThinkingAnim(): Frame[] {
  const f0 = makeThinkingCrab(false, false, false);
  const f1 = makeThinkingCrab(true,  false, false);
  const f2 = makeThinkingCrab(true,  true,  false);
  const f3 = makeThinkingCrab(true,  true,  true);
  return [
    { buf: f0, dur: 400 },
    { buf: f1, dur: 300 },
    { buf: f2, dur: 300 },
    { buf: f3, dur: 500 },
    { buf: f3, dur: 500 },
  ];
}
