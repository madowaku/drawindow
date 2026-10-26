export type ShizukuPoseId = 'neutral' | 'thinking' | 'smile' | 'shy' | 'breath' | 'curious' | 'drawing';

export interface PoseAnchor {
  /** Normalized source image coordinate from the top-left. */
  x: number;
  y: number;
}

export interface ShizukuPose {
  id: ShizukuPoseId;
  src: string;
  /** Measured midpoint between the two visible eyes in the source sprite. */
  anchor: PoseAnchor;
  /** Source fingertip location for the one pose that points at the glass. */
  handTipAnchor?: PoseAnchor;
  fallback: ShizukuPoseId | 'hide';
  renderWidth?: number;
  /** Review sprites may use one shared scale around their measured eye anchor. */
  renderScale?: number;
}

export function characterArt(name: string): string {
  return `${import.meta.env.BASE_URL}art/shizuku/${name}.webp`;
}

/**
 * v0.6 user final: all seven A sprites adopted for DAY/NIGHT; B is archive only.
 * The existing 384x512 transparent WebPs are preserved as authored. Eye anchors
 * were measured from the source sprites and normalized to the common 50%, 39.2%
 * scene target by CharacterScene. The tilted thinking pose keeps its gaze angle.
 */
export const SHIZUKU_EYE_TARGET: PoseAnchor = { x: 0.5, y: 0.392 };

export const SHIZUKU_POSES: Record<ShizukuPoseId, ShizukuPose> = {
  neutral: {
    id: 'neutral', src: characterArt('neutral'), anchor: { x: 0.5, y: 0.392 }, fallback: 'hide',
  },
  thinking: {
    id: 'thinking', src: characterArt('thinking'), anchor: { x: 0.539, y: 0.366 }, fallback: 'neutral',
  },
  smile: {
    id: 'smile', src: characterArt('smile'), anchor: { x: 0.495, y: 0.384 }, fallback: 'neutral',
  },
  shy: {
    id: 'shy', src: characterArt('shy'), anchor: { x: 0.495, y: 0.417 }, fallback: 'neutral',
  },
  breath: {
    id: 'breath', src: characterArt('breath'), anchor: { x: 0.497, y: 0.391 }, fallback: 'neutral',
  },
  curious: {
    id: 'curious', src: characterArt('curious'), anchor: { x: 0.497, y: 0.405 }, fallback: 'neutral',
  },
  drawing: {
    id: 'drawing', src: characterArt('drawing'), anchor: { x: 0.493, y: 0.395 },
    handTipAnchor: { x: 0.333, y: 0.5 }, fallback: 'neutral',
  },
};

/** NIGHT owns a complete pajama set; DAY's adopted sources stay intact.
 * Anchors are measured for the generated portraits in the night manifest.
 */
const NIGHT_EYE_ANCHORS: Record<ShizukuPoseId, PoseAnchor> = {
  neutral: { x: .5, y: .397 }, thinking: { x: .521, y: .350 },
  smile: { x: .505, y: .381 }, shy: { x: .479, y: .430 },
  breath: { x: .531, y: .393 }, curious: { x: .505, y: .381 },
  drawing: { x: .549, y: .371 },
};

export const SHIZUKU_NIGHT_POSES: Record<ShizukuPoseId, ShizukuPose> = Object.fromEntries(
  Object.entries(SHIZUKU_POSES).map(([id, pose]) => [id, {
    ...pose,
    anchor: NIGHT_EYE_ANCHORS[id as ShizukuPoseId],
    ...(id === 'drawing' ? { handTipAnchor: { x: .375, y: .5 } } : {}),
    src: `${import.meta.env.BASE_URL}art/shizuku-night/${id}.webp`,
  }]),
) as Record<ShizukuPoseId, ShizukuPose>;
