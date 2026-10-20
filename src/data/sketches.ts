import { doodleCandidates } from './doodleLibrary';
import { adoptShizukuSketches } from './shizuku-doodles/adopted';

/** Approved originals plus the existing vocabulary fallback. */
export const girlSketches = adoptShizukuSketches(doodleCandidates);
