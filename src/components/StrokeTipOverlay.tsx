import type { PlaybackTip } from '../lib/playback';
import './StrokeTipOverlay.css';

export interface StrokeTipLayout {
  left: number;
  top: number;
  size: number;
}

interface Props {
  tip: PlaybackTip | null;
  layout: StrokeTipLayout;
  reducedMotion: boolean;
  visible?: boolean;
}

/** A small decorative contact marker; stroke coordinates remain owned by playback. */
export function StrokeTipOverlay({ tip, layout, reducedMotion, visible = true }: Props) {
  if (!tip || !tip.penDown || !visible || reducedMotion || layout.size <= 0) return null;

  return <div
    className="stroke-tip-overlay"
    data-testid="stroke-tip-overlay"
    aria-hidden="true"
    style={{
      left: `${layout.left + tip.x * layout.size}px`,
      top: `${layout.top + tip.y * layout.size}px`,
      pointerEvents: 'none',
    }}
  >
    <span className="stroke-tip-overlay__glow" />
    <span className="stroke-tip-overlay__sleeve" />
    <span className="stroke-tip-overlay__contact" />
  </div>;
}
