import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { inspectGeminiCredential } from './gemini-key.mjs';

const root = new URL('../', import.meta.url);
const errorCodes = new Set(['invalid_input', 'rate_limit', 'unavailable', 'timeout', 'invalid_response']);

function localEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)
    || url.pathname !== '/api/recognize' || url.search || url.hash || url.username || url.password) {
    throw new Error('Verification requires a local Worker endpoint.');
  }
  return url.href;
}

/** A single bounded request. Never return raw errors, provider bodies or headers. */
export async function verifyImageRecognition({ imageDataUrl, endpoint = 'http://127.0.0.1:8787/api/recognize', fetchImpl = fetch }) {
  const url = localEndpoint(endpoint);
  const started = performance.now();
  const receipt = {
    inputKind: 'existing-catalogue-sketch',
    realProviderRequested: true,
    httpStatus: null,
    authenticationVerified: false,
    recognizedObjectPresent: false,
    source: null,
    errorCode: null,
    latencyMs: 0,
  };
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ requestId: `${Date.now()}:0:1`, imageDataUrl }),
      signal: AbortSignal.timeout(13000),
      redirect: 'error',
    });
    receipt.httpStatus = response.status;
    const body = await response.json();
    const recognized = response.status === 200 && body.source === 'api'
      && typeof body.guess === 'string' && /^[a-z]{1,32}$/.test(body.guess);
    receipt.authenticationVerified = recognized;
    receipt.recognizedObjectPresent = recognized;
    receipt.source = body.source === 'api' ? 'api' : null;
    receipt.errorCode = recognized ? null : (errorCodes.has(body.errorCode) ? body.errorCode : 'invalid_response');
  } catch {
    // Fetch/JSON exceptions can contain sensitive data. Do not serialize them.
    receipt.errorCode = 'request_failed';
  }
  receipt.latencyMs = Math.round(performance.now() - started);
  return receipt;
}

async function diagnosticImage() {
  const entries = JSON.parse(await readFile(new URL('src/data/quick-draw-sketches.json', root), 'utf8'));
  const sketch = entries.find(entry => entry.word === 'house');
  const paths = sketch.paths.map(points => {
    const d = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x * 512},${y * 512}`).join(' ');
    return `<path d="${d}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="white"/><g fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  // The expected label and catalogue metadata never enter the API request.
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function main() {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--', '.dev.vars'], { cwd: fileURLToPath(root), stdio: 'ignore' });
    const config = parseEnv(await readFile(new URL('.dev.vars', root), 'utf8'));
    if (!inspectGeminiCredential(config.GEMINI_API_KEY).keySafeToStoreAndSend) {
      console.error('A safely stored local credential is required. Run npm run setup:gemini.');
      process.exitCode = 1;
      return;
    }
    const receipt = await verifyImageRecognition({
      imageDataUrl: await diagnosticImage(),
      endpoint: process.env.DRAWINDOW_VERIFY_URL || undefined,
    });
    console.log(JSON.stringify(receipt, null, 2));
    if (!receipt.authenticationVerified) process.exitCode = 1;
  } catch {
    console.error('Verification could not run. Check Git exclusion, local settings and the Worker endpoint. Secret values were not printed.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
