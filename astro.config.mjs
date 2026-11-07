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
							items: [
								{
									label: 'Configuração',
									translations: { en: 'Setup' },
									items: [{ autogenerate: { directory: 'mobile/react-native/configuracao' } }],
								},
								{
									label: 'Navegação',
									translations: { en: 'Navigation' },
									items: [{ autogenerate: { directory: 'mobile/react-native/navegacao' } }],
								},
								{
									label: 'Estilização',
									translations: { en: 'Styling' },
									items: [{ autogenerate: { directory: 'mobile/react-native/estilizacao' } }],
								},
							],
						},
					],
				},
			],
		}),
	],
});
