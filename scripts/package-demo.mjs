import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

// Local live-integration flags must not leak into the standalone static ZIP.
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio:'inherit',
  env:{ ...process.env, VITE_ENABLE_LIVE_API:'false', VITE_ENABLE_LOCAL_RECOGNITION:'false', VITE_ENABLE_LOCAL_ML:'false', VITE_RECOGNITION_URL:'' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
// Public DEMO must not package experimental model weights, even when the
// developer previously prepared local AI assets in public/local-ml.
await rm('dist/local-ml', { recursive: true, force: true });
await import('./package-itch.mjs');
