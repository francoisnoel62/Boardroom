// The downloadable marks, drawn from the published palette (see src/data/brand.ts).
import type { APIRoute, GetStaticPaths } from 'astro';
import { markFiles, markSvg } from '../../data/brand.ts';

export const getStaticPaths = (() => markFiles.map(mark => ({ params: { file: mark.file }, props: { mark } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { mark } = props as { mark: (typeof markFiles)[number] };
  return new Response(markSvg(mark.theme, { background: mark.background }), { headers: { 'Content-Type': 'image/svg+xml' } });
};
