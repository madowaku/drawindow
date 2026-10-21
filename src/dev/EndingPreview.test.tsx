// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EndingPreview } from './EndingPreview';
import type { EndingSceneProps } from '../components/EndingScene';
vi.mock('../components/EndingScene', () => ({ EndingScene: (p: EndingSceneProps) => <p>{p.entries.length} pictures / {p.score.connectedCount} connected / {p.entries.filter(e => e.chainRestart).length} restarts</p> }));
vi.mock('../lib/useGameAudio', () => ({ useGameAudio: () => ({ sound: false, toggleSound: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); history.replaceState({}, '', '/'); });
it.each(['en', 'ja'])('builds a complete, genuinely connected %s preview from the real catalogue', language => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  history.replaceState({}, '', `/?ending-preview&lang=${language}&case=perfect`);
  render(<EndingPreview />);
  expect(screen.getByText('10 pictures / 9 connected / 0 restarts')).toBeTruthy();
});
