// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Page } from './Page';
vi.mock('./App', () => ({ default: () => <p>Normal five-exchange game</p> }));
vi.mock('./dev/RecognitionBenchmarkPage', () => ({ RecognitionBenchmark: () => <p>Developer benchmark</p> }));
vi.mock('./dev/LiveAcceptancePage', () => ({ LiveAcceptancePage: () => <p>Local live acceptance</p> }));
vi.mock('./dev/CataloguePreview', () => ({ CataloguePreview: () => <p>Doodle catalog preview</p> }));
vi.mock('./dev/ReadabilityStudy', () => ({ ReadabilityStudy: () => <p>Blind readability study</p> }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); window.history.replaceState({}, '', '/'); });
it('never routes a production URL to the benchmark', () => {
  window.history.replaceState({}, '', '/?recognition-benchmark');
  vi.stubEnv('DEV', false);
  render(<Page />);
  expect(screen.getByText('Normal five-exchange game')).toBeTruthy();
  expect(screen.queryByText('Developer benchmark')).toBeNull();
});
it.each(['ending-preview','glass-preview','catalogue-preview','doodle-catalog-preview','readability-study'])('keeps %s outside production game routing',query=>{
  window.history.replaceState({},'',`/?${query}`);
  vi.stubEnv('DEV',false);
  render(<Page />);
  expect(screen.getByText('Normal five-exchange game')).toBeTruthy();
});
it.each(['catalogue-preview','doodle-catalog-preview'])('opens the official catalog at %s in development', async query => {
  window.history.replaceState({}, '', `/?${query}`);
  vi.stubEnv('DEV', true);
  render(<Page />);
  expect(await screen.findByText('Doodle catalog preview')).toBeTruthy();
});
it('preserves the separate blind study in development', async () => {
  window.history.replaceState({}, '', '/?readability-study');
  vi.stubEnv('DEV', true);
  render(<Page />);
  expect(await screen.findByText('Blind readability study')).toBeTruthy();
});
it('opens the isolated benchmark only in development', async () => {
  window.history.replaceState({}, '', '/?recognition-benchmark');
  vi.stubEnv('DEV', true);
  render(<Page />);
  expect(await screen.findByText('Developer benchmark')).toBeTruthy();
});
it('does not expose the local acceptance recorder in production', () => {
  window.history.replaceState({}, '', '/?live-acceptance');
  vi.stubEnv('DEV', false);
  render(<Page />);
  expect(screen.getByText('Normal five-exchange game')).toBeTruthy();
  expect(screen.queryByText('Local live acceptance')).toBeNull();
});
it('opens local acceptance without replacing the actual game in development', async () => {
  window.history.replaceState({}, '', '/?live-acceptance');
  vi.stubEnv('DEV', true);
  render(<Page />);
  expect(await screen.findByText('Local live acceptance')).toBeTruthy();
});
