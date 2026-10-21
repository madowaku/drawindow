// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { DrawingEntry } from '../core/types';
import { calculateScore } from '../core/score';
import { createSouvenir } from './souvenir';
afterEach(() => vi.restoreAllMocks());
it('exports ten drawings/nine states locally, omits private data and optional words, and handles encoder failure', async () => {
  const texts: string[] = [];
  const context = { fillRect: vi.fn(), strokeRect: vi.fn(), fillText: (s: string) => texts.push(s), measureText: (s: string) => ({ width: s.length * 12 }), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb => cb(new Blob(['png'], { type: 'image/png' })));
  const entries: DrawingEntry[] = Array.from({ length: 10 }, (_, i) => ({ id: `private-id-${i}`, actor: i % 2 ? 'player' : 'girl', round: Math.floor(i / 2) + 1, intendedWord: 'secretword', recognition: i % 2 && i < 9 ? { guess: 'privateguess', alternatives: ['privatealt'], source: 'api' } : null, comparable: true, strokes: [{ id: 'private-stroke', points: [{ x: .2, y: .3, t: 0 }] }] }));
  const options = { entries, score: calculateScore(entries), mode: 'night' as const, language: 'en' as const, sessionKind: 'api' as const, includeWords: false };
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  expect((await createSouvenir(options)).type).toBe('image/png');
  expect(texts.filter(t => /SHIZUKU|YOU ·/.test(t))).toHaveLength(10);
  expect(texts.filter(t => /A DIFFERENT DIRECTION/.test(t))).toHaveLength(9);
  expect(texts.join(' ')).not.toMatch(/secretword|privateguess|private-id|privatealt|private-stroke/);
  expect(texts.join(' ')).toContain('CC BY 4.0');
  expect(texts.join(' ')).toContain('Final drawing');
  expect(fetchSpy).not.toHaveBeenCalled();
  texts.length = 0;
  await createSouvenir({ ...options, includeWords: true });
  expect(texts.join(' ')).toContain('secretword');
  expect(texts.join(' ')).toContain('privateguess');
  expect(texts.join(' ')).not.toMatch(/private-id|privatealt|private-stroke/);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb => cb(null));
  await expect(createSouvenir(options)).rejects.toThrow();
});
