import type { SessionSnapshot } from '../../lib/sessionStorage';
const NAME='drawindow-window-time-v012';
async function access(write:boolean,value?:SessionSnapshot|null):Promise<unknown>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions');request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('sessions',write?'readwrite':'readonly'),store=tx.objectStore('sessions');let result:unknown;
      if(write){if(value)store.put(value,'current');else store.delete('current');}else{const read=store.get('current');read.onsuccess=()=>{result=read.result;};}
      tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};
    };
  });
}
export const timeSessionStore={read:()=>access(false),write:async(value:SessionSnapshot|null)=>{await access(true,value);}};
