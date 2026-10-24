import type { GameState } from '../../core/types';
import {usePremonition as useRuntimePremonition} from '../../lib/usePremonition';
export type {PremonitionPresentation} from '../../lib/usePremonition';
export function usePremonition(state:GameState|null,enabled:boolean,reducedMotion:boolean){return useRuntimePremonition(state,enabled,reducedMotion,true);}
