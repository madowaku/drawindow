// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FreehandRecognition } from './FreehandRecognition';
import type { WindowCanvasProps } from '../core/types';
const { compare, exported } = vi.hoisted(() => ({ compare: vi.fn(), exported: vi.fn((_samples: unknown, _includeStrokes?: boolean) => ({})) }));
vi.mock('./freehandComparison', () => ({ compareFreehand: compare, freehandExport: exported, freehandCsv: () => '' }));
vi.mock('../components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <button onClick={() => { props.onInputTypeChange?.('mouse'); props.onStrokesChange([{ id: 'synthetic', points: [{ x: .1, y: .2, t: 0 }, { x: .6, y: .7, t: 1 }] }]); }}>Test ink</button> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('revoking and rechecking consent during pending inference cannot retain the revoked drawing', async () => {
  let finish!: (value: unknown) => void;
  compare.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:synthetic', revokeObjectURL: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<FreehandRecognition />);
  fireEvent.change(screen.getByRole('textbox', { name: '描くつもりの物' }), { target: { value: 'synthetic, not human' } });
  fireEvent.click(screen.getByRole('button', { name: 'Test ink' }));
  const consent = screen.getByRole('checkbox');
  fireEvent.click(consent); fireEvent.click(screen.getByRole('button', { name: '同じ絵を6条件で比較' }));
  fireEvent.click(consent); fireEvent.click(consent);
  finish({ loadMs: 1, variants: [] });
  await waitFor(() => expect(screen.getByText(/1枚の独立した絵/)).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: '自由描画JSON' }));
  const samples = exported.mock.calls.at(-1)![0] as unknown as {strokes?: unknown}[];
  expect(samples[0].strokes).toBeUndefined();
});
