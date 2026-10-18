import { lazy, Suspense } from 'react';
import App from './App';

const EndingPreview = import.meta.env.DEV ? lazy(() => import('./dev/EndingPreview').then(module => ({ default: module.EndingPreview }))) : null;

// Vite eliminates the module and its imports from every production build.
const Benchmark = import.meta.env.DEV ? lazy(() => import('./dev/RecognitionBenchmarkPage').then(module => ({ default: module.RecognitionBenchmark }))) : null;
const LiveAcceptance = import.meta.env.DEV ? lazy(() => import('./dev/LiveAcceptancePage').then(module => ({ default: module.LiveAcceptancePage }))) : null;
const CharacterPreview = lazy(() => import('./components/CharacterPreview').then(module => ({ default: module.CharacterPreview })));
const GlassPreview = import.meta.env.DEV ? lazy(() => import('./dev/GlassPreview').then(module => ({ default: module.GlassPreview }))) : null;
const CataloguePreview = import.meta.env.DEV ? lazy(() => import('./dev/CataloguePreview').then(module => ({ default: module.CataloguePreview }))) : null;
const ReadabilityStudy = import.meta.env.DEV ? lazy(() => import('./dev/ReadabilityStudy').then(module => ({ default: module.ReadabilityStudy }))) : null;

export function Page() {
  const query = new URLSearchParams(window.location.search);
  const Component = import.meta.env.DEV && EndingPreview && query.has('ending-preview') ? EndingPreview : import.meta.env.DEV && ReadabilityStudy && query.has('readability-study') ? ReadabilityStudy : import.meta.env.DEV && CataloguePreview && (query.has('doodle-catalog-preview') || query.has('catalogue-preview')) ? CataloguePreview : import.meta.env.DEV && GlassPreview && query.has('glass-preview') ? GlassPreview : import.meta.env.DEV && Benchmark && query.has('recognition-benchmark') ? Benchmark : import.meta.env.DEV && LiveAcceptance && query.has('live-acceptance') ? LiveAcceptance : query.has('character-preview') ? CharacterPreview : App;
  return <Suspense fallback={<p>Loading…</p>}><Component /></Suspense>;
}
