// An llms.txt index of the documentation (https://llmstxt.org). Links are absolute once the
// public domain is configured through SITE_URL, relative until then.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const sections = [
  ['Get started', ['docs', 'docs/quickstart', 'docs/install', 'docs/first-real-meeting']],
  ['Concepts', ['docs/concepts/the-room', 'docs/concepts/meeting-lifecycle', 'docs/concepts/verdicts', 'docs/concepts/evidence', 'docs/your-data']],
] as const;

export const GET: APIRoute = async ({ site }) => {
  const pages = (await getCollection('docs')).filter(entry => entry.id.startsWith('docs'));
  const url = (id: string) => (site ? new URL(`/${id}/`, site).href : `/${id}/`);
  const listed = new Set<string>(sections.flatMap(([, ids]) => [...ids]));
  const line = (id: string) => {
    const page = pages.find(entry => entry.id === id);
    if (!page) throw new Error(`llms.txt lists a missing page: ${id}`);
    return `- [${page.data.title}](${url(id)}): ${page.data.description ?? ''} (status: ${page.data.status})`;
  };
  const others = pages.filter(page => !listed.has(page.id)).sort((a, b) => a.id.localeCompare(b.id));
  const body = [
    '# BOARDROOM',
    '',
    '> A local decision workspace where AI advisers examine the evidence, challenge a plan and keep their objections on the record; the human makes the decision. The current build offers a recorded, fictional example and an implemented live workflow. Live calls send selected context to configured providers after authorization. Plan 02 real-account qualification remains pending; durable contributions begin Plan 03, while context revisions and pause/resume remain planned.',
    '',
    ...sections.flatMap(([title, ids]) => [`## ${title}`, '', ...ids.map(line), '']),
    '## Guides and reference',
    '',
    ...others.map(page => line(page.id)),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
