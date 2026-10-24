import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Inspect shipped executable/configuration resources, not provenance or licenses.
export function inspectRuntime(path, text) {
  if (!/\.(?:[cm]?js|css|html|webmanifest)$/i.test(path)) return [];
  const rules = [
    ['credential', /(?:AIza[\w-]{30,}|sk-(?:proj-)?[\w-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_-]?key|authorization)["']?\s*[:=]\s*["'](?:Bearer\s+)?[\w-]{20,})/i],
    ['embedded API endpoint', /(?:https?:\/\/[^\s"'`<>]*(?:\/api(?:\/|\b)|generativelanguage\.googleapis\.com|api\.openai\.com|workers\.dev)|["'`]\/?api\/(?:recognize|generate|v\d)[^"'`]*["'`])/i],
    ['external runtime call', /\b(?:fetch|import|importScripts|Worker|WebSocket|EventSource)\s*\(\s*["'`](?:https?:)?\/\//i],
    ['external runtime resource', /(?:<(?:script|link|img|iframe|audio|video|source)\b[^>]*\b(?:src|href)\s*=\s*["'](?:https?:)?\/\/|\b(?:from|import)\s*["'](?:https?:)?\/\/|url\(\s*["']?(?:https?:)?\/\/)/i],
    ['external runtime configuration', /(?:["']?(?:url|endpoint|src|wasmPath|modelPath)["']?)\s*[:=]\s*["'`](?:https?:)?\/\//i],
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([name]) => path + ': ' + name);
}

export async function scanOfflineDistribution(root, files) {
  if (!files) {
    files=[];
    async function walk(dir) {
      for(const entry of await readdir(dir,{withFileTypes:true})) {
        const path=join(dir,entry.name);
        if(entry.isDirectory())await walk(path);
        else files.push(relative(root,path).replaceAll('\\','/'));
      }
    }
    await walk(root);
  }
  const errors=[];
  for(const path of files) {
    if(/(?:^|\/)(?:\.env(?:\.|$)|\.dev\.vars|[^/]*\.(?:pem|key)$)/i.test(path)) errors.push(path+': private configuration');
    if(/\.(?:[cm]?js|css|html|webmanifest)$/i.test(path)) errors.push(...inspectRuntime(path,await readFile(join(root,path),'utf8')));
  }
  if(errors.length)throw Error('Offline distribution rejected:\n'+errors.join('\n'));
  console.log('Offline runtime distribution scan passed ('+files.length+' shipped assets).');
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) await scanOfflineDistribution(process.argv[2] || 'dist');
