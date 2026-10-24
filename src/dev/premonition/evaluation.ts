import type { StudyRecording } from './recording';
import { replayRecording } from './recording';

export type BlindLabel = 'X' | 'Y';
export type Presentation = 'A' | 'D';
export interface BlindAssignment { X: Presentation; Y: Presentation; order: [BlindLabel, BlindLabel]; }
export function createBlindAssignment(random: () => number = Math.random): BlindAssignment {
  const swap = random() < .5;
  return { X: swap ? 'D' : 'A', Y: swap ? 'A' : 'D', order: random() < .5 ? ['X', 'Y'] : ['Y', 'X'] };
}
export const evaluationFields = ['naturalness', 'friendliness', 'noticed', 'blamed', 'intrusive', 'tempo', 'daynight', 'shizuku', 'replay'] as const;
export type EvaluationField = typeof evaluationFields[number];
export type Evaluation = Record<EvaluationField, number | null> & { freeText: string };
/** All answers are optional; null is unanswered, never neutral or a positive vote. */
export function createEvaluation(): Evaluation {
  return { naturalness: null, friendliness: null, noticed: null, blamed: null, intrusive: null, tempo: null, daynight: null, shizuku: null, replay: null, freeText: '' };
}
export interface PresentationMetadata {
  id: string; round: number; mode: 'day' | 'night'; atMs: number;
  expression?: string; durationMs?: number; reason?: string; suppressionReason?: string;
}

/** Whitelist metadata: never serialize state, strokes, intended words, recognition labels or arbitrary objects. */
export function exportMetadata(recording: StudyRecording, evaluation: Record<BlindLabel, Evaluation>, assignment: BlindAssignment, presentation: readonly PresentationMetadata[] = []): string {
  const final = replayRecording(recording).at(-1)!.state;
  const cleanEvaluation = (value: Evaluation) => ({
    ...Object.fromEntries(evaluationFields.map(field => [field, typeof value[field] === 'number' && Number.isInteger(value[field]) && value[field]! >= 1 && value[field]! <= 5 ? value[field] : null])),
    freeText: value.freeText.slice(0, 4000),
  });
  return JSON.stringify({
    format: 'drawindow-premonition-metadata-v1', privacy: 'local-only; excludes drawings and recognition words',
    completeness: recording.completeness,
    finished: final.phase === 'results' && final.entries.length === 10,
    mode: final.mode, language: final.language,
    assignment: { X: assignment.X, Y: assignment.Y, order: [...assignment.order] },
    evaluation: { X: cleanEvaluation(evaluation.X), Y: cleanEvaluation(evaluation.Y) },
    presentation: presentation.map(({ id, round, mode, atMs, expression, durationMs, reason, suppressionReason }) => ({ id, round, mode, atMs, expression, durationMs, reason, suppressionReason })),
  }, null, 2);
}

/** Quoting alone does not protect spreadsheet users from formula interpretation. */
function csvCell(value: string | number | null): string {
  let text = value === null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export interface StudyProvenance { tempo?:'C'; participant: string; completeness: string; finished: boolean; liveLabels: readonly BlindLabel[]; exposureLog: readonly {atMs:number;labels:readonly BlindLabel[];kind:string;phase:string}[]; }
export function evaluationCsv(evaluation: Record<BlindLabel, Evaluation>, assignment: BlindAssignment, provenance?: StudyProvenance): string {
  const prefix=provenance?['participant','completeness','finished','liveLabels','plannedOrder','renderedExposureLog']:[];
  const values=provenance?[provenance.participant,provenance.completeness,String(provenance.finished),provenance.liveLabels.join('|'),assignment.order.join('|'),JSON.stringify(provenance.exposureLog)]:[];
  if(provenance?.tempo==='C'){prefix.unshift('tempo','speed','expressionDayMs','expressionNightMs');values.unshift('C','1','240','160');}
  const columns = [...prefix,'label', 'presentation', 'order', ...evaluationFields, 'freeText'];
  return [columns.map(csvCell).join(','), ...(['X', 'Y'] as const).map(label => [
    ...values,label, assignment[label], assignment.order.indexOf(label) + 1,
    ...evaluationFields.map(field => evaluation[label][field]), evaluation[label].freeText.slice(0, 4000),
  ].map(csvCell).join(','))].join('\r\n');
}
