import { W, H, Frame, px, fillRect, drawBody, drawLeftArm, drawRightArm, drawLegs, drawEyesHappy, drawEyesSurprised, drawMouthGrin, drawMouthO, drawCardboardBox } from '../drawing';

const BOX_X = 10;
const BOX_BASE_Y = 28;
const BOX_W = 16;
const BOX_FULL_H = 8;

function makeJumpUp(phase: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  // box at full size
  drawCardboardBox(buf, BOX_X, BOX_BASE_Y, BOX_W, BOX_FULL_H);
  // crab rising above box
  const crabY = BOX_BASE_Y - 16 - phase * 3;
  const lx = 10;
  drawBody(buf, lx, crabY);
  drawLeftArm(buf, lx, crabY);
  drawRightArm(buf, lx, crabY);
  drawLegs(buf, lx, crabY);
  drawEyesSurprised(buf, lx, crabY);
  drawMouthO(buf, lx, crabY);
  return buf;
}

function makeLanding(crushStage: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  // box gets progressively shorter
  const boxH = Math.max(2, BOX_FULL_H - crushStage * 2);
  const boxY = BOX_BASE_Y + (BOX_FULL_H - boxH);
  drawCardboardBox(buf, BOX_X, boxY, BOX_W, boxH);
  // crab lands on top of box
  const crabY = boxY - 14;
  const lx = 10;
  drawBody(buf, lx, crabY);
  drawLeftArm(buf, lx, crabY);
  drawRightArm(buf, lx, crabY);
  drawLegs(buf, lx, crabY);
  drawEyesHappy(buf, lx, crabY);
  drawMouthGrin(buf, lx, crabY);
  // impact lines on first landing
  if (crushStage === 1) {
    px(buf, BOX_X - 2, boxY + 1, 19);
    px(buf, BOX_X - 3, boxY + 2, 19);
    px(buf, BOX_X + BOX_W + 1, boxY + 1, 19);
    px(buf, BOX_X + BOX_W + 2, boxY + 2, 19);
  }
  return buf;
}

function makePreJump(crushStage: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  // box stays at current crushed size
  const boxH = Math.max(2, BOX_FULL_H - crushStage * 2);
  const boxY = BOX_BASE_Y + (BOX_FULL_H - boxH);
  drawCardboardBox(buf, BOX_X, boxY, BOX_W, boxH);
  // crab crouching on box (preparing to jump)
  const crabY = boxY - 13;
  const lx = 10;
  drawBody(buf, lx, crabY);
  drawLeftArm(buf, lx, crabY);
  drawRightArm(buf, lx, crabY);
  drawLegs(buf, lx, crabY);
  drawEyesSurprised(buf, lx, crabY);
  drawMouthGrin(buf, lx, crabY);
  return buf;
}

function makeAirborne(crushStage: number, height: number): Uint8Array {
  const buf = new Uint8Array(W * H);
  // box stays at current crushed size
  const boxH = Math.max(2, BOX_FULL_H - crushStage * 2);
  const boxY = BOX_BASE_Y + (BOX_FULL_H - boxH);
  drawCardboardBox(buf, BOX_X, boxY, BOX_W, boxH);
  // crab in the air
  const crabY = boxY - 14 - height;
  const lx = 10;
  drawBody(buf, lx, crabY);
  drawLeftArm(buf, lx, crabY);
  drawRightArm(buf, lx, crabY);
  drawLegs(buf, lx, crabY);
  drawEyesSurprised(buf, lx, crabY);
  drawMouthO(buf, lx, crabY);
  return buf;
}

function makeFlatBox(): Uint8Array {
  const buf = new Uint8Array(W * H);
  // completely flat box
  const boxY = BOX_BASE_Y + BOX_FULL_H - 2;
  fillRect(buf, BOX_X, boxY, BOX_W, 2, 17);
  fillRect(buf, BOX_X, boxY, BOX_W, 1, 18);
  fillRect(buf, BOX_X + Math.floor(BOX_W / 2) - 1, boxY + 1, 2, 1, 19);
  // crab standing triumphantly on flat box
  const crabY = boxY - 14;
  const lx = 10;
  drawBody(buf, lx, crabY);
  drawLeftArm(buf, lx, crabY);
  drawRightArm(buf, lx, crabY);
  drawLegs(buf, lx, crabY);
  drawEyesHappy(buf, lx, crabY);
  drawMouthGrin(buf, lx, crabY);
  return buf;
}

export function makeCompactingAnim(): Frame[] {
  const frames: Frame[] = [];

  // Initial jump onto box
  frames.push({ buf: makeJumpUp(0), dur: 7 });
  frames.push({ buf: makeJumpUp(1), dur: 7 });
  frames.push({ buf: makeJumpUp(2), dur: 6 });
  // first landing — box crushes from 8 to 6
  frames.push({ buf: makeLanding(1), dur: 12 });

  // second jump
  frames.push({ buf: makePreJump(1), dur: 9 });
  frames.push({ buf: makeAirborne(1, 3), dur: 7 });
  frames.push({ buf: makeAirborne(1, 5), dur: 7 });
  frames.push({ buf: makeAirborne(1, 3), dur: 6 });
  // second landing — box crushes from 6 to 4
  frames.push({ buf: makeLanding(2), dur: 12 });

  // third jump
  frames.push({ buf: makePreJump(2), dur: 9 });
  frames.push({ buf: makeAirborne(2, 3), dur: 7 });
  frames.push({ buf: makeAirborne(2, 5), dur: 7 });
  frames.push({ buf: makeAirborne(2, 3), dur: 6 });
  // final landing — box is flat
  frames.push({ buf: makeLanding(3), dur: 12 });

  // triumphant pose on flat box
  frames.push({ buf: makeFlatBox(), dur: 36 });

  return frames;
}
