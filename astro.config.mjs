// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'Acervo',
			locales: {
				root: { label: 'Português', lang: 'pt-BR' },
				en: { label: 'English', lang: 'en' },
			},
			lastUpdated: true,
			sidebar: [
				{
					label: 'Mobile',
					items: [
						{
							label: 'React Native',
							items: [{ autogenerate: { directory: 'mobile/react-native' } }],
						},
					],
				},
			],
		}),
	],
});
