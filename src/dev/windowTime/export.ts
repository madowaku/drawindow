import type {StudyRecording} from '../premonition/recording';
import type {Tempo,TempoControls} from './tempo';
interface Condition {tempo:Tempo;controls:TempoControls;}
/** Explicit opt-in only; this contains drawings and names. The default
 * evaluation export remains separate and never serializes this object.
 */
export function exportTimeReplay(recording:StudyRecording,runCondition:Condition,comparisonCondition:Condition):string{
  return JSON.stringify({format:'drawindow-window-time-local-replay-v1',privacy:'local-only; contains drawing geometry, names and recorded A recognition',runCondition,comparisonCondition,recording},null,2);
}
