import { useEffect, useRef } from 'react';

/** A finite visible beat: hidden tabs pause it, unmounts cancel it. */
export function GirlOopsReaction({ phase, onDone }: {
  phase: 'girl_notice' | 'girl_flustered'; onDone: () => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let remaining = phase === 'girl_notice' ? 700 : 1150;
    let started = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let complete = false;
    const update = () => {
      if (timer !== undefined) {
        clearTimeout(timer); timer = undefined;
        remaining = Math.max(0, remaining - (performance.now() - started));
      }
      if (!document.hidden && !complete) {
        started = performance.now();
        timer = setTimeout(() => { timer = undefined; complete = true; done.current(); }, remaining);
      }
    };
    document.addEventListener('visibilitychange', update);
    update();
    return () => { complete = true; clearTimeout(timer); document.removeEventListener('visibilitychange', update); };
  }, [phase]);
  return <span className="girl-oops" role="status">{phase === 'girl_notice' ? 'あっ。' : '……もう一回。'}</span>;
}
