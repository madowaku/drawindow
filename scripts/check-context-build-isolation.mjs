import {build} from 'vite';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
// Negative canary: an executable research module must make production build fail.
await mkdir('artifacts/local',{recursive:true});
const root=await mkdtemp(resolve('artifacts/local/dev-isolation-'));
await mkdir(join(root,'src/dev'),{recursive:true});
await writeFile(join(root,'src/main.ts'),"import { marker } from './dev/canary'; console.log(marker);\n");
await writeFile(join(root,'src/dev/canary.ts'),"export const marker='DEVELOPMENT_CANARY_NOT_FOR_SHIPPING';\n");
let blocked=false;
try {
  await build({configFile:resolve('vite.config.ts'),root,logLevel:'silent',build:{write:false,emptyOutDir:false,rolldownOptions:{input:join(root,'src/main.ts')}}});
} catch(error) {
  if(String(error).includes('Development research entered production'))blocked=true;
  else throw error;
}
if(!blocked)throw Error('Production build accepted a development research module');
console.log('Production isolation canary passed: executable src/dev module rejected.');
