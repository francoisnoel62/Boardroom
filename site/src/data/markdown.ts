// Plain Markdown versions of documentation pages, for reading with an AI assistant or offline.
import type { ClaimStatus } from './claims.ts';
import { statusLabel } from './labels.ts';

export function markdownPath(id: string): string {
  return id === 'docs' ? '/docs/index.md' : `/${id}.md`;
}

type Renderer = (attributes: Record<string, string>) => string;

export function toMarkdownPage(
  meta: { title: string; description?: string | undefined; status: ClaimStatus; plan?: string | undefined },
  body: string,
  renderers: Record<string, Renderer>,
): string {
  const content = body
    .split('\n')
    .filter(line => !/^import\s.+from\s.+;?\s*$/.test(line))
    .join('\n')
    .replace(/<([A-Z][A-Za-z]*)((?:\s+[a-z-]+="[^"]*")*)\s*\/>/g, (_match, name: string, raw: string) => {
      const attributes = Object.fromEntries([...raw.matchAll(/([a-z-]+)="([^"]*)"/g)].map(match => [match[1]!, match[2]!]));
      return renderers[name]?.(attributes) ?? '';
    })
    .replace(/^\s*<Aside\b[^>]*\btitle="([^"]*)"[^>]*>\s*$/gm, '**$1**')
    .replace(/^\s*<\/?[A-Z][A-Za-z]*(?:\s+[a-zA-Z-]+="[^"]*")*\s*>\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const header = [`# ${meta.title}`, meta.description ? `> ${meta.description}` : '', `Status: ${statusLabel(meta.status, meta.plan)}`]
    .filter(Boolean)
    .join('\n\n');
  return `${header}\n\n${content}\n`;
}
