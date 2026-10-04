// Serves every documentation page as plain Markdown, generated tables included.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { documentedExitCodes, schemaRows } from '../../data/cli.ts';
import { getClaim } from '../../data/claims.ts';
import { statusLabel } from '../../data/labels.ts';
import { markdownPath, toMarkdownPage } from '../../data/markdown.ts';
import { commands, exitCodes, help, platforms } from '../../data/repo.ts';
import { publicStatus, roadmap } from '../../data/roadmap.ts';
import { outputs } from '../../data/schemas.ts';

const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n');

const renderers = {
  CommandTable: () => table(['Command', 'What it does'], help.usage.map(entry => [
    `\`${entry.synopsis}\``,
    entry.description + (commands.withoutHandler.includes(entry.command) ? ' (in this build, prints the help text)' : ''),
  ])) + `\n\nGlobal options: ${help.options.map(option => `\`${option}\``).join(', ')}.`,
  ExitCodes: () => table(['Code', 'Meaning'], documentedExitCodes
    .filter(entry => entry.code === 0 || exitCodes.includes(entry.code))
    .map(entry => [`\`${entry.code}\``, entry.meaning])),
  JsonOutput: ({ output }: Record<string, string>) => {
    const { command, schema } = outputs[output as keyof typeof outputs];
    return `Produced by \`${command}\`.\n\n` + table(['Field', 'Type', 'Required'],
      schemaRows(schema as Parameters<typeof schemaRows>[0]).map(row => [`\`${row.path}\``, `\`${row.type}\``, row.required ? 'Yes' : 'No']));
  },
  Platforms: () => table(['Platform', 'Status'], platforms.map(platform => [platform, 'Qualified'])),
  Roadmap: () => roadmap.map((plan, index, plans) => `- Plan ${plan.id} — ${plan.title}: ${plan.outcome} (${publicStatus(plan, index, plans)})`).join('\n'),
  Claim: ({ id }: Record<string, string>) => {
    const claim = getClaim(id!);
    return `**${claim.text}** — ${statusLabel(claim.status, claim.plan)}`;
  },
  LinkCard: ({ title, description, href }: Record<string, string>) => `- [${title}](${href}): ${description}`,
};

export const getStaticPaths = (async () => {
  const pages = (await getCollection('docs')).filter(entry => entry.id.startsWith('docs'));
  return pages.map(entry => ({ params: { slug: markdownPath(entry.id).replace(/^\/docs\//, '').replace(/\.md$/, '') }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]['props'];
  const markdown = toMarkdownPage(entry.data, entry.body ?? '', renderers);
  return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
