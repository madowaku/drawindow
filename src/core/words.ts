import type { GirlSketch } from './types';

export function normalizeWord(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 80 || /[0-9<>{}\[\]\/\\]/.test(value)) return null;
  const normalized = value.toLowerCase().trim().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/\s+/g, ' ');
  return normalized.length <= 64 && /^[a-z]+(?:[ '-][a-z]+)*$/.test(normalized) ? normalized : null;
}

export function firstLetter(value: unknown): string | null {
  return normalizeWord(value)?.[0] ?? null;
}

export function lastLetter(value: unknown): string | null {
  return normalizeWord(value)?.slice(-1) ?? null;
}

export function selectGirlSketch(
  sketches: readonly GirlSketch[],
  requiredFirstLetter: string,
  usedTemplateIds: readonly string[] = [],
): GirlSketch | null {
  const letter = normalizeWord(requiredFirstLetter);
  if (!letter || letter.length !== 1) return null;
  const matches = sketches.filter(sketch => firstLetter(sketch.word) === letter &&
    (!sketch.readability || sketch.readability === 'safe' || sketch.readability === 'soft'));
  const safe = matches.filter(sketch => !sketch.readability || sketch.readability === 'safe');
  const pool = safe.length ? safe : matches;
  const byId = new Map(sketches.map(sketch => [sketch.id, normalizeWord(sketch.word)]));
  const recentWords = usedTemplateIds.map(id => byId.get(id));
  // Word recency comes before variant recency: two drawings of one noun still
  // count as a repeat. Stable ordering keeps reducers/replays deterministic.
  return [...pool].sort((a, b) =>
    recentWords.lastIndexOf(normalizeWord(a.word)) - recentWords.lastIndexOf(normalizeWord(b.word)) ||
    usedTemplateIds.lastIndexOf(a.id) - usedTemplateIds.lastIndexOf(b.id))[0] ?? null;
}
