import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Usage: node scripts/prepare-bgm.mjs <source-folder> [--ending-only]');
const endingOnly = process.argv.includes('--ending-only');
const tracks = [
  { id: 'title', filename: '物語の幕を.mp3', title: '物語の幕を', artist: 'のる', source: 'https://opentracks.com/bgm/detail/15353', creator: 'https://opentracks.com/creator/detail/432' },
  { id: 'day', filename: 'Coral_Ambience.mp3', title: 'Coral Ambience', artist: 'ハヤシユウ', source: 'https://opentracks.com/bgm/detail/20419', creator: 'https://opentracks.com/creator/detail/59' },
  { id: 'night', filename: 'おやすみの時間.mp3', title: 'おやすみの時間', artist: '蒲鉾さちこ', source: 'https://opentracks.com/bgm/detail/22683', creator: 'https://opentracks.com/creator/detail/418' },
  { id: 'ending', filename: '優花.mp3', title: '優花', artist: 'のる', source: 'https://opentracks.com/bgm/detail/20352', creator: 'https://opentracks.com/creator/detail/432', verifiedDate: '2026-10-18', loop: false },
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir('src/assets/music', { recursive: true });
await mkdir('artifacts/qa/temp/bgm', { recursive: true });
for (const track of endingOnly ? tracks.filter(track => track.id === 'ending') : tracks) {
  const input = join(sourceDir, track.filename);
  const temporary = `artifacts/qa/temp/bgm/${track.id}.mp3`;
  const original = await readFile(input);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-map', '0:a:0', '-vn', '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '2', temporary], { stdio: 'pipe' });
  const converted = await readFile(temporary);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', temporary], { encoding: 'utf8' }));
  // Game container, not a directly playable/downloadable music file. This is not DRM.
  const header = Buffer.from('DRAWBGM1');
  const packed = Buffer.alloc(header.length + converted.length);
  header.copy(packed);
  for (let i = 0; i < converted.length; i++) packed[header.length + i] = converted[i] ^ 0xa7;
  const output = `src/assets/music/${track.id}.bin`;
  await writeFile(output, packed);
  Object.assign(track, { originalBytes: original.length, originalSha256: hash(original), convertedBytes: converted.length, convertedSha256: hash(converted), output, outputBytes: packed.length, outputSha256: hash(packed), durationSeconds: Number(probe.format.duration) });
  await unlink(temporary);
}
const admitted = endingOnly ? [...JSON.parse(await readFile('assets/bgm-manifest.json', 'utf8')).tracks.filter(track => track.id !== 'ending'), tracks.find(track => track.id === 'ending')] : tracks;
await writeFile('assets/bgm-manifest.json', JSON.stringify({
  verifiedDate: '2026-10-18',
  suppliedBy: 'User-supplied local MP3 files; originals retained outside the published repository',
  license: 'OpenTracks sound license plus each composer profile',
  licenseUrl: 'https://opentracks.com/help/articles/license/',
  termsUrl: 'https://opentracks.com/help/articles/terms/',
  processing: 'Full-length stereo MP3,128kbps/44.1kHz; metadata/cover stripped; no rearrangement, trimming or AI processing. DRAWBGM1 container: header plus byte XOR0xa7. Playback uses a temporary in-memory Blob URL; no standalone audio files ship.',
  tracks: admitted,
}, null, 2) + '\n');
console.log(JSON.stringify(admitted.map(({ id, outputBytes, durationSeconds }) => ({ id, outputBytes, durationSeconds }))));
