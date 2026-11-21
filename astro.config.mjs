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
									label: 'Arquitetura',
									translations: { en: 'Architecture' },
									items: [{ autogenerate: { directory: 'mobile/react-native/arquitetura' } }],
								},
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
								{
									label: 'Datas',
									translations: { en: 'Dates' },
									items: [{ autogenerate: { directory: 'mobile/react-native/datas' } }],
								},
								{
									label: 'Rede',
									translations: { en: 'Networking' },
									items: [{ autogenerate: { directory: 'mobile/react-native/rede' } }],
								},
								{
									label: 'Conteúdo',
									translations: { en: 'Content' },
									items: [{ autogenerate: { directory: 'mobile/react-native/conteudo' } }],
								},
								{
									label: 'Performance',
									translations: { en: 'Performance' },
									items: [{ autogenerate: { directory: 'mobile/react-native/performance' } }],
								},
							],
						},
					],
				},
			],
		}),
	],
});
