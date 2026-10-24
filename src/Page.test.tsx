// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Page } from './Page';
vi.mock('./App', () => ({ default: () => <p>Normal five-exchange game</p> }));
vi.mock('./dev/RecognitionBenchmarkPage', () => ({ RecognitionBenchmark: () => <p>Developer benchmark</p> }));
vi.mock('./dev/PremonitionStudyPage', () => ({ PremonitionStudyPage: ({tempoC}:{tempoC?:boolean}) => <p>{tempoC?'C-fixed expression study':'Anonymous five-exchange study'}</p> }));
vi.mock('./dev/WindowTimePage',()=>({WindowTimePage:()=> <p>Isolated window time</p>}));
vi.mock('./dev/ContextRecognitionPage', () => ({ ContextRecognitionPage: () => <p>Isolated context comparison</p> }));
vi.mock('./dev/LiveAcceptancePage', () => ({ LiveAcceptancePage: () => <p>Local live acceptance</p> }));
vi.mock('./dev/CataloguePreview', () => ({ CataloguePreview: () => <p>Doodle catalog preview</p> }));
vi.mock('./dev/ReadabilityStudy', () => ({ ReadabilityStudy: () => <p>Blind readability study</p> }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); window.history.replaceState({}, '', '/'); });
it('opens window time only in DEV',async()=>{window.history.replaceState({},'','/?window-time');vi.stubEnv('DEV',true);const view=render(<Page/>);expect(await screen.findByText('Isolated window time')).toBeTruthy();view.unmount();vi.stubEnv('DEV',false);render(<Page/>);expect(screen.getByText('Normal five-exchange game')).toBeTruthy();expect(screen.queryByText('Isolated window time')).toBeNull();});
it('never routes a production URL to the benchmark', () => {
  window.history.replaceState({}, '', '/?recognition-benchmark');
  vi.stubEnv('DEV', false);
  render(<Page />);
  expect(screen.getByText('Normal five-exchange game')).toBeTruthy();
  expect(screen.queryByText('Developer benchmark')).toBeNull();
});
it.each(['character-preview','japanese-doodle-preview','ending-preview','glass-preview','catalogue-preview','doodle-catalog-preview','readability-study'])('keeps %s outside production game routing',query=>{
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

it('keeps context comparison outside the production game even with the query', () => {
  window.history.replaceState({}, '', '/?context-recognition');
  vi.stubEnv('DEV', false);
  render(<Page />);
  expect(screen.getByText('Normal five-exchange game')).toBeTruthy();
  expect(screen.queryByText('Isolated context comparison')).toBeNull();
});
it('opens context comparison only in development', async () => {
  window.history.replaceState({}, '', '/?context-recognition');
  vi.stubEnv('DEV', true);
  render(<Page />);
  expect(await screen.findByText('Isolated context comparison')).toBeTruthy();
});

it('keeps the five-exchange D study outside production routing', () => {
  window.history.replaceState({},'', '/?shizuku-premonition'); vi.stubEnv('DEV',false);
  render(<Page/>);expect(screen.getByText('Normal five-exchange game')).toBeTruthy();
  expect(screen.queryByText('Anonymous five-exchange study')).toBeNull();
});
it('opens the isolated five-exchange study in development', async () => {
  window.history.replaceState({},'', '/?shizuku-premonition');vi.stubEnv('DEV',true);render(<Page/>);
  expect(await screen.findByText('Anonymous five-exchange study')).toBeTruthy();
});

it('opens C-fixed expression study only in development',async()=>{
 window.history.replaceState({},'', '/?window-time-premonition');vi.stubEnv('DEV',true);const view=render(<Page/>);
 expect(await screen.findByText('C-fixed expression study')).toBeTruthy();view.unmount();vi.stubEnv('DEV',false);render(<Page/>);
 expect(screen.getByText('Normal five-exchange game')).toBeTruthy();expect(screen.queryByText('C-fixed expression study')).toBeNull();
});
