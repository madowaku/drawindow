import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { unzipSync } from 'fflate';

const destination = resolve('artifacts/qa/package-extracted');
const version = JSON.parse(await readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.');
const archive = unzipSync(await readFile(`artifacts/release/DRAWINDOW-v${version}-itch.zip`));
for (const [name, bytes] of Object.entries(archive)) {
  const target = resolve(destination, name);
  if (!target.startsWith(destination + '/') && !target.startsWith(destination + '\\')) throw new Error(`Unsafe archive path: ${name}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };
if (!process.argv.includes('--extract-only')) createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = resolve(destination, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(destination)) throw new Error('Invalid path');
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream' });
    response.end(await readFile(target));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(Number(process.env.DRAWINDOW_ARCHIVE_PORT || 5174), '0.0.0.0', () => console.log(`Extracted itch ZIP at http://localhost:${process.env.DRAWINDOW_ARCHIVE_PORT || 5174}/`));
