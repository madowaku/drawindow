// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OfflineStatus } from './OfflineStatus';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const registration = Object.assign(new EventTarget(), { installing: worker, waiting: null });
  const container = Object.assign(new EventTarget(), { controller: null as unknown, register: vi.fn().mockResolvedValue(registration) });
  vi.stubGlobal('navigator', { serviceWorker: container });
  vi.stubGlobal('isSecureContext', true);
  return { worker, container };
}

it('does not claim readiness on registration alone, and waits for control', async () => {
  const { container } = setup();
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(container.register).toHaveBeenCalled());
  expect(screen.getByRole('status').textContent).toContain('Saving');
  container.controller = {};
  act(() => { container.dispatchEvent(new Event('controllerchange')); });
  expect(screen.getByRole('status').textContent).toContain('Ready');
});

it('shows a failed cache installation and allows retry', async () => {
  const { worker, container } = setup();
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(container.register).toHaveBeenCalled());
  worker.state = 'redundant';
  act(() => { worker.dispatchEvent(new Event('statechange')); });
  expect(screen.getByRole('status').textContent).toContain('Could not save');
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(container.register).toHaveBeenCalledTimes(2));
});

it('reports registration rejection without claiming offline support', async () => {
  const { container } = setup();
  container.register.mockRejectedValue(new Error('storage unavailable'));
  render(<OfflineStatus language="ja" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('保存ができませんでした'));
});
