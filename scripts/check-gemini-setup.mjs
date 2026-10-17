import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';

let config = {};
try { config = parseEnv(await readFile('.dev.vars', 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let ignored = false;
try { execFileSync('git', ['check-ignore', '--quiet', '--', '.dev.vars'], { stdio:'ignore' }); ignored = true; } catch { /* Report the configuration gap without printing values. */ }
const key = config.GEMINI_API_KEY ?? '';
const report = { ignoredByGit: ignored, keyPresent: Boolean(key), keyLooksConfigured: /^AIza[A-Za-z0-9_-]{30,}$/.test(key) };
console.log(JSON.stringify(report, null, 2));
if (!report.ignoredByGit || !report.keyLooksConfigured) process.exitCode = 1;
