import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				tecnologia: z.string().optional(),
				versao_testada: z.string().optional(),
				atualizado_em: z.coerce.date().optional(),
				fontes: z.array(z.string().url()).optional(),
			}),
		}),
	}),
};
