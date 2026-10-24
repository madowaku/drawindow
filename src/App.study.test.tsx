// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from './App';
import type { WindowCanvasProps } from './core/types';
vi.mock('./components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <div data-testid="study-canvas" data-expression={props.expression}>
  {props.phase === 'girl_breath' && <button onClick={props.onBreathDone}>Complete breath</button>}
  {props.phase === 'girl_drawing' && <button onClick={props.onPlaybackDone}>Complete drawing</button>}
</div> }));
vi.mock('./services/quickDrawRecognizer', () => ({ preloadQuickDrawModel: vi.fn(async () => {}), createQuickDrawRecognizer: () => ({ recognize: async () => ({ guess: null, source: 'ml' }) }) }));
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('drawindow-language','en');
  window.scrollTo = vi.fn();
  Object.defineProperty(window,'matchMedia',{writable:true,value:()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})});
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('DEV study uses local A and its isolated save backend while forwarding cosmetic-only expression/events', async () => {
  const api = vi.fn(); const read=vi.fn(async()=>undefined), write=vi.fn(async()=>{}), onEvent=vi.fn();
  render(<App apiRecognizer={{recognize:api}} study={{localOnly:true,expression:'curious',storage:{read,write},onEvent,header:<p>Anonymous X</p>}} />);
  await waitFor(()=>expect(read).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('button',{name:/PLAY DEMO/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/START GAME/}));
  expect(onEvent.mock.calls[0][0].type).toBe('START');
  expect(onEvent.mock.calls[0][0].sessionKind).toBe('ml');
  expect(screen.getByTestId('study-canvas').getAttribute('data-expression')).toBe('curious');
  fireEvent.click(screen.getByRole('button',{name:'Complete breath'}));
  fireEvent.click(screen.getByRole('button',{name:'Complete drawing'}));
  expect(onEvent.mock.calls.map(call=>call[0].type)).toEqual(['START','BREATH_DONE','PLAYBACK_DONE']);
  expect(api).not.toHaveBeenCalled();
  expect(write).toHaveBeenCalledWith(null);
});
it('ignores study controls and expression in production', () => {
  vi.stubEnv('DEV',false);
  const onEvent=vi.fn();
  render(<App study={{localOnly:true,expression:'curious',onEvent,header:<p>Research must not ship</p>}} />);
  expect(screen.queryByText('Research must not ship')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/PLAY DEMO/}));
  expect(screen.getByTestId('study-canvas').getAttribute('data-expression')).toBeNull();
  expect(onEvent).not.toHaveBeenCalled();
});
