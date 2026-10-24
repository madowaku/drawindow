// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OfflineStatus } from './OfflineStatus';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.head.innerHTML = ''; });
function setup() {
  document.head.innerHTML = '<meta name="drawindow-offline-edition" content="current" />';
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const registration = Object.assign(new EventTarget(), { installing: worker, waiting: null as unknown });
  let response: { edition: string; complete: boolean } | null = { edition: 'current', complete: true };
  vi.stubGlobal('MessageChannel', class {
    port1 = { onmessage: null as ((event: { data: unknown }) => void) | null, close: vi.fn() };
    port2 = { close: vi.fn(), deliver: () => { if (response) this.port1.onmessage?.({ data: response }); }, report: (value: unknown) => this.port1.onmessage?.({ data: value }) };
  });
  const controller = { postMessage: vi.fn((_message, ports) => ports[0].deliver()) };
  const container = Object.assign(new EventTarget(), { controller: null as unknown, register: vi.fn().mockResolvedValue(registration) });
  vi.stubGlobal('navigator', { serviceWorker: container });
  vi.stubGlobal('isSecureContext', true);
  return { worker, registration, container, controller, reply: (value: typeof response) => { response = value; } };
}

it('requires a complete current edition handshake, not registration or control alone', async () => {
  const { container, controller } = setup();
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(container.register).toHaveBeenCalled());
  expect(screen.getByRole('status').textContent).toContain('Saving');
  container.controller = controller;
  act(() => { container.dispatchEvent(new Event('controllerchange')); });
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('This edition is saved'));
});

it.each([{ edition: 'old', complete: true }, { edition: 'current', complete: false }])('rejects an old edition or evicted asset: %j', async response => {
  const { container, controller, reply } = setup();
  reply(response); container.controller = controller;
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Could not save this edition'));
});

it('rechecks saved contents when the title returns to the foreground', async () => {
  const { container, controller, reply } = setup();
  container.controller = controller;
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('This edition is saved'));
  reply({ edition: 'current', complete: false });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Could not save this edition'));
});

it('reports failed installation and retries without forcing activation', async () => {
  const { worker, container, controller, reply } = setup();
  reply({ edition: 'old', complete: true }); container.controller = controller;
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(container.register).toHaveBeenCalled());
  worker.state = 'redundant';
  act(() => { worker.dispatchEvent(new Event('statechange')); });
  expect(screen.getByRole('status').textContent).toContain('Could not save');
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(container.register).toHaveBeenCalledTimes(2));
});

it('shows waiting update instructions without sending activation requests', async () => {
  const { registration, container, controller } = setup();
  registration.waiting = Object.assign(new EventTarget(), { state: 'installed', postMessage: controller.postMessage });
  container.controller = controller;
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('close all game tabs'));
  expect(controller.postMessage).toHaveBeenCalledWith({ type: 'DRAWINDOW_OFFLINE_VERIFY' }, expect.any(Array));
});

it('reports registration rejection without claiming offline support', async () => {
  const { container } = setup();
  container.register.mockRejectedValue(new Error('storage unavailable'));
  render(<OfflineStatus language="ja" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('保存ができませんでした'));
});

it('fails closed when the packaging edition marker is missing', async () => {
  setup(); document.head.innerHTML = '';
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Could not save'));
});

it('times out an old controller with no verification protocol', async () => {
  const { container, controller, reply } = setup();
  reply(null); container.controller = controller;
  vi.useFakeTimers();
  try {
    render(<OfflineStatus language="en" />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status').textContent).toContain('Saving');
    await act(async () => { await vi.advanceTimersByTimeAsync(15001); });
    expect(screen.getByRole('status').textContent).toContain('Could not save');
  } finally { vi.useRealTimers(); }
});


it('does not call an evicted waiting update saved', async () => {
  const { registration, container, controller } = setup();
  registration.waiting = Object.assign(new EventTarget(), {
    state: 'installed',
    postMessage: (_message: unknown, ports: { report: (value: unknown) => void }[]) => {
      ports[0].report({ edition: 'next', complete: false });
    },
  });
  container.controller = controller;
  render(<OfflineStatus language="en" />);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Could not save'));
});
