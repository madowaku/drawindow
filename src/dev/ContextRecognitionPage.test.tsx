// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WindowCanvasProps } from '../core/types';
import type { ContextInference, inferContextDrawing } from './contextRecognition/inference';
import { PINNED_LABELS } from './contextRecognition/policies';
import { ContextRecognitionPage } from './ContextRecognitionPage';

vi.mock('../components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <button onClick={() => { props.onInputTypeChange?.('pen'); props.onStrokesChange([{ id: 'mark', points: [{ x: .2, y: .3, t: 0 }, { x: .5, y: .6, t: 20 }] }]); }}>Test drawing</button> }));
vi.mock('../components/CharacterScene', () => ({ CharacterScene: () => <div>Static pose</div> }));
const output: ContextInference = { candidates: PINNED_LABELS.map(label => ({ label, score: label === 'cat' ? .52 : label === 'apple' ? .48 : label === 'dog' ? .1 : 0 })), baseline: { guess: 'cat', source: 'ml' }, inferenceMs: 12 };
const mark = () => fireEvent.click(screen.getByRole('button', { name: 'Test drawing' }));
const run = () => fireEvent.click(screen.getByRole('button', { name: '一度だけ認識する' }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('context comparison developer page', () => {
  it('runs once, reuses one ranking for settings and keeps evaluation outside runtime', async () => {
    const infer = vi.fn<typeof inferContextDrawing>(async () => output);
    render(<ContextRecognitionPage infer={infer} />);
    expect(screen.queryByTestId('policy-A')).toBeNull();
    expect(screen.queryByLabelText('意図したことば')).toBeNull();
    fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } });
    fireEvent.change(screen.getByLabelText('直前のしずくの正式名'), { target: { value: 'banana' } });
    mark(); run(); run();
    await screen.findByTestId('policy-A');
    expect(infer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('policy-C').querySelector('h3')?.textContent).toBe('apple');
    fireEvent.change(screen.getByLabelText('C 補正の強さ'), { target: { value: '0' } });
    expect(screen.getByTestId('policy-C').querySelector('h3')?.textContent).toBe('cat');
    expect(screen.getByTestId('policy-A').querySelector('h3')?.textContent).toBe('cat');
    expect(Object.keys(infer.mock.calls[0][0]).sort()).toEqual(['language', 'requestId', 'strokes']);
    fireEvent.change(screen.getByLabelText('意図したことば'), { target: { value: 'apple' } });
    fireEvent.change(screen.getByLabelText('直前の絵を何だと思ったか'), { target: { value: 'pear' } });
    fireEvent.change(screen.getByLabelText('C 方式'), { target: { value: 'bonus' } });
    fireEvent.change(screen.getByLabelText('C 最大スコア差'), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText('C 補正の強さ'), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText('表情だけを比較'), { target: { value: 'thinking' } });
    expect(infer).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'この設定・評価を記録する' }));
    fireEvent.change(screen.getByLabelText('C 最大順位'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'この設定・評価を記録する' }));
    expect(screen.getByRole('heading', { name: '記録 / 2 設定' })).toBeTruthy();
    expect(screen.getByText(/異なる描画 1 枚/)).toBeTruthy();
    mark();
    expect(screen.queryByTestId('policy-A')).toBeNull();
    expect(screen.queryByLabelText('意図したことば')).toBeNull();
    fireEvent.change(screen.getByLabelText('直前のしずくの正式名'), { target: { value: 'pear' } });
    run(); await screen.findByTestId('policy-A');
    fireEvent.click(screen.getByRole('button', { name: 'この設定・評価を記録する' }));
    expect(screen.getByText(/異なる描画 1 枚/)).toBeTruthy();
    expect(infer).toHaveBeenCalledTimes(2);
  });

  it.each(['drawing', 'context', 'language', 'unmount'])('ignores an in-flight result after %s changes', async kind => {
    let resolve!: (value: ContextInference) => void;
    const infer = vi.fn<typeof inferContextDrawing>(() => new Promise<ContextInference>(done => { resolve = done; }));
    const view = render(<ContextRecognitionPage infer={infer} />);
    mark(); run();
    if (kind === 'drawing') mark();
    if (kind === 'context') fireEvent.change(screen.getByLabelText('直前のしずくの正式名'), { target: { value: 'cat' } });
    if (kind === 'language') fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } });
    if (kind === 'unmount') view.unmount();
    expect(infer.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => resolve(output));
    expect(screen.queryByTestId('policy-A')).toBeNull();
  });

  it('exports only explicitly saved settings without geometry, with independent observations and semantic gold', async () => {
    const infer = vi.fn<typeof inferContextDrawing>(async () => output);
    let blob!: Blob;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((value: Blob) => { blob = value; return 'blob:test'; }) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ContextRecognitionPage infer={infer} />);
    fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } });
    fireEvent.change(screen.getByLabelText('直前のしずくの正式名'), { target: { value: '=2+2' } });
    mark(); run(); await screen.findByTestId('policy-A');
    fireEvent.change(screen.getByLabelText('意図したことば'), { target: { value: 'cat' } });
    expect(screen.getByTestId('policy-A').textContent).toContain('意味の正解: 未評価');
    fireEvent.change(screen.getByLabelText('意味の正解を指定'), { target: { value: 'outside' } });
    expect(screen.getByTestId('policy-A').textContent).toContain('対応外の棄却: 既知分類を回答');
    fireEvent.change(screen.getByLabelText('実際の試遊で継続した · A'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'この設定・評価を記録する' }));
    expect(click).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'JSONを書き出す' }));
    expect(click).toHaveBeenCalledTimes(1);
    const readBlob = (value: Blob) => new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(value); });
    const exported = await readBlob(blob);
    expect(JSON.parse(exported).records[0].drawingId).toMatch(/^[0-9a-f]{64}$/);
    expect(exported).toContain('__out_of_vocabulary__');
    expect(exported).not.toMatch(/"strokes"|"points"|imageDataUrl/);
    expect(exported).toContain('"inputTypes": "pen"');
    expect(exported).toContain('"observedContinuation": true');
    expect(exported).toContain('"observedContinuation": null');
    fireEvent.click(screen.getByRole('button', { name: 'CSVを書き出す' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(2));
    const csv = await readBlob(blob);
    expect(csv).toContain('sampleId,drawingId,participant,language');
    expect(csv).toContain('"\'=2+2"');
    expect(infer).toHaveBeenCalledTimes(1);
  });

  it('can hide the operator context before handing over and protects memory-only work on reload', () => {
    render(<ContextRecognitionPage infer={vi.fn<typeof inferContextDrawing>(async () => output)} />);
    fireEvent.click(screen.getByLabelText('描き手に正式名を隠す'));
    expect(screen.queryByLabelText('直前のしずくの正式名')).toBeNull();
    expect(screen.queryByText(/語頭の仮説:/)).toBeNull();
    mark();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
