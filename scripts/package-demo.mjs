import { spawnSync } from 'node:child_process';

const checked = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], { stdio: 'inherit' });
if (checked.error) throw checked.error;
if (checked.status !== 0) process.exit(checked.status ?? 1);

// Local live-integration flags must not leak into the standalone static ZIP.
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio:'inherit',
  env:{ ...process.env, VITE_ENABLE_LIVE_API:'false', VITE_RECOGNITION_URL:'', VITE_DEFAULT_LIVE:'false' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
process.env.DRAWINDOW_PACKAGE_MODE = 'demo';
await import('./package-itch.mjs');
