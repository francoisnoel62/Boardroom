import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Every documentation page states whether what it describes is available today.
        status: z.enum(['available', 'preview', 'planned', 'vision']),
        plan: z.string().regex(/^0[1-9]$/).optional(),
      }),
    }),
  }),
  // Field notes: engineering articles, each built on documents of the repository.
  notes: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/notes' }),
    schema: z.object({
      title: z.string(),
      description: z.string().min(40),
      date: z.coerce.date(),
      sources: z.array(z.string()).min(2),
    }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
