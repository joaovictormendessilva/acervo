# Acervo — instruções para IA

Acervo pessoal de estudos em Astro Starlight. Todo o conteúdo está em português (pt-BR) e fica em `src/content/docs/`.

## Idiomas (i18n)

- Português (pt-BR) é o idioma padrão: fica na raiz de `src/content/docs/`, sem prefixo na URL.
- Inglês fica em `src/content/docs/en/`, com o **mesmo caminho e o mesmo nome de arquivo** da versão em português (ex.: `mobile/react-native/configurando-eslint.md` → `en/mobile/react-native/configurando-eslint.md`). É assim que o Starlight liga as traduções.
- **Toda nota nova ou alterada deve ser escrita nos dois idiomas**, com o mesmo conteúdo e o mesmo código. Só o texto muda; o frontmatter (`tecnologia`, `versao_testada`, `atualizado_em`, `fontes`, `sidebar.order`) é igual nas duas versões.
- Se o `label` de um grupo novo na `sidebar` mudar entre idiomas, use `translations: { en: '...' }` no grupo.

## Organização

- Pastas = categorias: `src/content/docs/<área>/<tecnologia>/<assunto>/<nota>.md`
  - Áreas atuais: `mobile/`, `web/`
  - Assuntos atuais em `mobile/react-native/`: `configuracao/` (ESLint, fontes…), `navegacao/` (Expo Router, tabs, stack, drawer…) e `estilizacao/` (NativeWind…)
  - Ex.: `mobile/react-native/configuracao/configurando-eslint.md`, `mobile/react-native/navegacao/expo-router-custom-tabs.md`
- Agrupe por **assunto**, não por lib: a nota de axios vai em `rede/`, a de otimização de imagem em `imagens/` etc.
- Nome do arquivo e da pasta em kebab-case, sem acentos. Eles viram a URL.
- Um assunto por nota.
- Ordem na sidebar: `sidebar.order` no frontmatter, contado dentro de cada subgrupo.
- **Novo assunto, tecnologia ou área**: além de criar a pasta (nos dois idiomas), adicione o grupo em `sidebar` no `astro.config.mjs` com label em pt-BR e tradução, no formato `{ label: 'Navegação', translations: { en: 'Navigation' }, items: [{ autogenerate: { directory: 'mobile/react-native/navegacao' } }] }`. Não use só o `autogenerate` da pasta-mãe, porque ele usaria o nome da pasta (sem acento) como título. O `label` direto no `autogenerate` foi removido no Starlight 0.39. Não registre pasta vazia, porque o build reclama.

## Template obrigatório de nota

```md
---
title: <Título curto>
description: <Uma frase>
tecnologia: <expo | expo-router | next | ...>
versao_testada: <ex.: Expo SDK 58 · expo-router 58>
atualizado_em: <AAAA-MM-DD>
fontes:
  - <link da doc oficial>
sidebar:
  order: <n>
---

## O que é
## Quando usar
## Quando NÃO usar          (se fizer sentido)
## Passo a passo
## Exemplo completo
## Variações / exemplos avançados   (se fizer sentido)
## Armadilhas comuns
## O que mudou entre versões
```

Os campos do frontmatter estão validados em `src/content.config.ts`.

## Regras de escrita

- **Nunca escreva de memória sobre API de biblioteca.** Consulte a doc oficial da versão em uso (para Expo: `https://docs.expo.dev/versions/v<major>.0.0/` e `https://docs.expo.dev/llms.txt`) e coloque o link em `fontes`.
- **Sem comentários no código**: nem nos exemplos das notas, nem nos arquivos do projeto. A explicação vai no texto, antes ou depois do bloco. Se o código original de um projeto tiver comentários, remova ao copiar.
- Os exemplos devem ser código real e completo, com imports. Use `title="caminho/do/arquivo"` nos blocos e `ins={}`/`del={}` para mostrar diffs.
- **Notas são genéricas**: documente a implementação padrão da ferramenta, com exemplos neutros (ex.: `home`, `settings`). Mesmo quando a nota nasce de um projeto real (ex.: um curso), não use nomes, telas, estilos ou decisões específicas dele.
- Use asides do Starlight para avisos: `:::note`, `:::tip`, `:::caution`, `:::danger`.
- Escreva de forma direta, explicando o *porquê* de cada passo, não só o *como*.

## Atualizando notas quando a tecnologia mudar

1. Encontre as notas pela `tecnologia` e pela `versao_testada` no frontmatter.
2. Compare com a doc oficial atual e com o changelog.
3. Atualize o conteúdo, `versao_testada` e `atualizado_em`, e registre a mudança em "O que mudou entre versões". Não apague o histórico.

## Commits

Mensagem curta em inglês, no padrão conventional commits: `docs: add axios interceptors note`, `fix: broken link in expo router note`, `chore: update starlight`. Não inclua linha de Co-Authored-By nem atribuição de IA.

## Comandos

```bash
npm run dev      # servidor local (http://localhost:4321)
npm run build    # build de produção (rode antes de dar a tarefa como pronta)
```
