import { selectVisibleStrokes } from '../../core/gameMachine';
import { replayRecording,type StudyRecording } from '../premonition/recording';
import { planTempo,type Tempo,type TempoControls } from './tempo';

/** Same recorded reducer events/results. Only presentation phase spans change.
 * Player/recognition waits retain their recorded length. Visibility interruptions
 * inside girl phases cannot be reconstructed and are excluded from this clock.
 */
export function tempoReplay(recording:StudyRecording,tempo:Tempo,controls:TempoControls){
  const raw=replayRecording(recording);let at=0;
  return raw.map((frame,index)=>{
    if(index){const previous=raw[index-1],plan=planTempo(selectVisibleStrokes(previous.state),previous.state.mode,tempo,controls);
      at+=previous.state.phase==='girl_breath'?plan.breathMs:previous.state.phase==='girl_drawing'?plan.drawingMs:previous.state.phase==='girl_notice'?700:previous.state.phase==='girl_flustered'?1150:Math.max(0,frame.atMs-previous.atMs);
    }
    return {...frame,playAt:at};
  });
}
