import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';
import { inspectGeminiCredential } from './gemini-key.mjs';

let config = {};
try { config = parseEnv(await readFile('.dev.vars', 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') { console.error('Unable to read local secret settings; values were not printed.'); process.exit(1); }
}
let ignored = false;
try { execFileSync('git', ['check-ignore', '--quiet', '--', '.dev.vars'], { stdio:'ignore' }); ignored = true; } catch { /* Report the configuration gap without printing values. */ }
const key = config.GEMINI_API_KEY ?? '';
const report = { ignoredByGit: ignored, ...inspectGeminiCredential(key) };
console.log(JSON.stringify(report, null, 2));
if (!report.ignoredByGit || !report.keySafeToStoreAndSend) process.exitCode = 1;
