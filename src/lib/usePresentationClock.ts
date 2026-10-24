import { useEffect, useRef, useState } from 'react';

/** Visible clock: background/offscreen time never catches up on return. */
export function usePresentationClock(duration:number,playing:boolean,key:string,onDone?:()=>void,visible=true) {
  const [at,setAt]=useState(0);
  const epoch=useRef(key);
  const liveKey=useRef(key);liveKey.current=key;
  const value=useRef(0),done=useRef(false),callback=useRef(onDone);callback.current=onDone;
  const [shown,setShown]=useState(()=>!document.hidden);
  useEffect(()=>{const change=()=>setShown(!document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
  useEffect(()=>{epoch.current=key;value.current=0;done.current=false;setAt(0);},[key]);
  useEffect(()=>{
    if(!playing||!shown||!visible)return;
    let handle=0,last:number|undefined;
    const tick=(now:number)=>{
      if(document.hidden||liveKey.current!==key)return;
      if(last!==undefined)value.current=Math.min(duration,value.current+Math.min(100,Math.max(0,now-last)));
      last=now;setAt(value.current);
      if(value.current>=duration){if(!done.current){done.current=true;callback.current?.();}return;}
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
  },[duration,playing,shown,visible,key]);
  const seek=(next:number)=>{value.current=Math.min(duration,Math.max(0,next));setAt(value.current);done.current=false;};
  // A phase change must paint its start, never one frame of the old completed
  // clock. Effects reset the underlying value after that render.
  return {at:epoch.current===key?at:0,seek,shown};
}
