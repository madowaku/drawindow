import { describe, expect, it, vi } from 'vitest';
const { calls } = vi.hoisted(() => ({ calls: vi.fn() }));
vi.mock('../../services/quickDrawRecognizer', () => ({ createQuickDrawRecognizer: (options: { onRanking: (ranked: { label: string; score: number }[]) => void }) => ({ recognize: async (...args: unknown[]) => { calls(...args); options.onRanking([{ label: 'cat', score: .7 }]); return { guess: 'cat', source: 'ml' }; } }) }));
import { inferContextDrawing } from './inference';
describe('one-inference comparison adapter', () => {
  it('forwards only drawing runtime fields, never context or evaluation gold', async () => {
    const controller = new AbortController();
    const input = { requestId: 'sample', language: 'ja' as const, strokes: [], intendedWord: 'いぬ', perceivedPreviousWord: 'とけい', previousWord: 'とけい' };
    const result = await inferContextDrawing(input, { signal: controller.signal });
    expect(calls).toHaveBeenCalledExactlyOnceWith({ requestId: 'sample', language: 'ja', strokes: [] }, { signal: controller.signal });
    expect(result).toMatchObject({ candidates: [{ label: 'cat', score: .7 }], baseline: { guess: 'cat', source: 'ml' } });
    expect(result.inferenceMs).toBeGreaterThanOrEqual(0);
  });
});
