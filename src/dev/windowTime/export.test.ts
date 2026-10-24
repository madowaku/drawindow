import {expect,it} from 'vitest';
import {createInitialState} from '../../core/gameMachine';
import {exportTimeReplay} from './export';
it('labels the independent tempo study and separates the actual run from replay adjustments',()=>{
  const recording={version:1 as const,initialState:createInitialState(),events:[],completeness:'partial' as const},before=JSON.stringify(recording);
  const data=JSON.parse(exportTimeReplay(recording,{tempo:'B',controls:{speed:1}},{tempo:'C',controls:{speed:.85,hesitationMs:500}}));
  expect(data.format).toBe('drawindow-window-time-local-replay-v1');expect(data.runCondition.tempo).toBe('B');expect(data.comparisonCondition.tempo).toBe('C');expect(data.recording.completeness).toBe('partial');expect(JSON.stringify(recording)).toBe(before);
});
