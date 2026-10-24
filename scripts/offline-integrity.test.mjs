import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { offlineWorker } from './offline-worker.mjs';
import { inspectRuntime } from './scan-offline-dist.mjs';

const names=['index.html','model.tflite','music.bin'];
const body=name=>'contents '+name;
const hashes=names.map(name=>createHash('sha256').update(body(name)).digest('hex'));
function lab({active=null,fail=false,corrupt=false}={}) {
  const handlers={}, stores=new Map([['drawindow-offline-old',new Map([['old','keep']])]]);
  const claim={calls:0};
  const cache={
    async addAll(requests) {
      if(fail)throw Error('quota/network failure');
      const next=requests.map(r=>[r.url, new Response(corrupt?'corrupt':body(new URL(r.url).pathname.slice(1)))]);
      for(const [url,response] of next) stores.get('drawindow-offline-new').set(url,response);
    },
    async match(url) { return stores.get('drawindow-offline-new')?.get(typeof url==='string'?url:url.url)?.clone(); },
  };
  const caches={async keys(){return [...stores.keys()];},async open(key){if(!stores.has(key))stores.set(key,new Map());return cache;},async delete(key){return stores.delete(key);}};
  const self={ registration:{scope:'https://local.test/',active}, location:{origin:'https://local.test'}, clients:{async claim(){claim.calls++;}}, addEventListener(name,fn){handlers[name]=fn;} };
  vm.runInNewContext(offlineWorker('new',names,hashes),{self,caches,URL,Request,Response,crypto:webcrypto});
  async function emit(name,extra={}) {
    let waiting;
    handlers[name]({...extra,waitUntil(p){waiting=p;}});
    await waiting;
  }
  async function verify(){let message;await emit('message',{data:{type:'DRAWINDOW_OFFLINE_VERIFY'},ports:[{postMessage(value){message=value;}}]});return message;}
  return {emit,verify,stores,claim};
}

test('complete first install verifies all content and claims its loading page',async()=>{
  const l=lab();await l.emit('install');await l.emit('activate');
  assert.equal(l.claim.calls,1);assert.equal((await l.verify()).complete,true);
});
test('updates do not claim existing games or delete prior edition caches',async()=>{
  const l=lab({active:{}});await l.emit('install');await l.emit('activate');
  assert.equal(l.claim.calls,0);assert.ok(l.stores.has('drawindow-offline-old'));
  assert.doesNotMatch(offlineWorker('new',names,hashes),/skipWaiting/);
});

for(const scenario of [{fail:true},{corrupt:true}])test('failed installation preserves old cache '+JSON.stringify(scenario),async()=>{
  const l=lab({active:{},...scenario});await assert.rejects(l.emit('install'));
  assert.equal(l.stores.has('drawindow-offline-new'),false);
  assert.equal(l.stores.get('drawindow-offline-old').get('old'),'keep');
});
test('readiness fails after a single asset eviction or whole cache removal',async()=>{
  const l=lab();await l.emit('install');
  l.stores.get('drawindow-offline-new').delete('https://local.test/music.bin');
  assert.equal((await l.verify()).complete,false);
  l.stores.delete('drawindow-offline-new');assert.equal((await l.verify()).complete,false);
});
test('unknown same-origin and external resources fail closed',async()=>{
  const l=lab();await l.emit('install');
  for(const url of ['https://elsewhere.test/runtime.js','https://local.test/missing.js']) {
    let response;await l.emit('fetch',{request:new Request(url),respondWith(p){response=Promise.resolve(p);}});
    assert.equal((await response).type,'error');
  }
});

for(const [text,reason] of [
  ['const endpoint="https://drawindow.workers.dev/recognize"','API'],
  ['const endpoint="/api/recognize"','API'],
  ['const key="AIza'+'a'.repeat(35)+'"','credential'],
  ['fetch("https://cdn.example/runtime.js")','runtime'],
  ['import "https://cdn.example/runtime.js"','runtime'],
  ['<script src="//cdn.example/runtime.js"></script>','runtime'],
  ['body{background:url(https://cdn.example/bg.png)}','runtime'],
])test('distribution scan rejects '+reason+' '+text.slice(0,30),()=>{
  assert.ok(inspectRuntime('bundle.js',text).length);
});
test('license and model provenance URLs are not runtime dependencies',()=>{
  assert.deepEqual(inspectRuntime('bundle.js','/* https://react.dev/license */ const info="https://example.test/license";'),[]);
  assert.deepEqual(inspectRuntime('asset-receipt.json','{"source":"https://huggingface.co/model"}'),[]);
});
