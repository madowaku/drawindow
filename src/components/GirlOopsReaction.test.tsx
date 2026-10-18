// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GirlOopsReaction } from './GirlOopsReaction';
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
it('pauses the finite beat while hidden, and cancels it on unmount',()=>{
  vi.useFakeTimers(); const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(false); const done=vi.fn();
  const {unmount}=render(<GirlOopsReaction phase="girl_notice" onDone={done}/>);
  expect(screen.getByRole('status').textContent).toBe('あっ。');
  act(()=>vi.advanceTimersByTime(300)); hidden.mockReturnValue(true);
  act(()=>document.dispatchEvent(new Event('visibilitychange')));
  act(()=>vi.advanceTimersByTime(5000)); expect(done).not.toHaveBeenCalled();
  hidden.mockReturnValue(false); act(()=>document.dispatchEvent(new Event('visibilitychange')));
  act(()=>vi.advanceTimersByTime(400)); expect(done).toHaveBeenCalledTimes(1);
  unmount(); act(()=>vi.advanceTimersByTime(5000)); expect(done).toHaveBeenCalledTimes(1);
});
it('shows the shy beat without revealing the word and clears its timer on exit',()=>{
  vi.useFakeTimers();vi.spyOn(document,'hidden','get').mockReturnValue(false); const done=vi.fn();
  const {unmount}=render(<GirlOopsReaction phase="girl_flustered" onDone={done}/>);
  expect(screen.getByRole('status').textContent).toBe('……もう一回。');
  unmount();act(()=>vi.advanceTimersByTime(2000));expect(done).not.toHaveBeenCalled();
});
