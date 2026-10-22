import { spawnSync } from 'node:child_process';

const endpoint = process.env.VITE_RECOGNITION_URL?.trim();
let url;
try { url = new URL(endpoint); } catch { throw new Error('Set VITE_RECOGNITION_URL to the deployed HTTPS /api/recognize endpoint.'); }
if (url.protocol !== 'https:' || url.pathname !== '/api/recognize' || url.username || url.password || url.search || url.hash || ['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('A public HTTPS /api/recognize URL without credentials or query parameters is required.');
}
for (const args of [['node_modules/typescript/bin/tsc', '--noEmit'], ['node_modules/vite/bin/vite.js', 'build']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, VITE_RECOGNITION_URL: url.href, VITE_ENABLE_LIVE_API: 'true', VITE_DEFAULT_LIVE: 'true' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
process.env.DRAWINDOW_PACKAGE_MODE = 'live';
process.env.DRAWINDOW_PACKAGE_ENDPOINT = url.href;
await import('./package-itch.mjs');
