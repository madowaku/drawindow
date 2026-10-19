import { spawnSync } from 'node:child_process';

// Local live-integration flags must not leak into the standalone static ZIP.
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio:'inherit',
  env:{ ...process.env, VITE_ENABLE_LIVE_API:'false', VITE_ENABLE_LOCAL_RECOGNITION:'false', VITE_RECOGNITION_URL:'' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import('./package-itch.mjs');
