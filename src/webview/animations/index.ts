import { Frame } from '../drawing';
import { makeCrabBob }      from './idle';
import { makeThinkingAnim } from './thinking';
import { makeReadingAnim }  from './reading';
import { makeWritingAnim }  from './writing';
import { makeCommandAnim }  from './running_command';
import { makeErrorAnim }    from './error';
import { makeSuccessAnim }  from './success';
import { makeUncertainAnim } from './uncertain';
import { makeActuallyAnim } from './actually';

export const ANIMS: Record<string, Frame[]> = {
  idle:            makeCrabBob(),
  thinking:        makeThinkingAnim(),
  reading:         makeReadingAnim(),
  writing:         makeWritingAnim(),
  running_command: makeCommandAnim(),
  error:           makeErrorAnim(),
  success:         makeSuccessAnim(),
  uncertain:       makeUncertainAnim(),
  actually:        makeActuallyAnim(),
};

export const TEMP_STATES: Record<string, number> = {
  error:     4000,
  success:   3000,
  uncertain: 4000,
  actually:  3000,
};
