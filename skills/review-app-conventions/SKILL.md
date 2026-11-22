---
name: review-app-conventions
description: Revisa o código de um app React Native contra as leis de arquitetura do acervo (organização, camadas, tipos, funções, componentes, duplicação e performance). Use quando o usuário pedir para revisar convenções, padrões, arquitetura ou rodar /review-app-conventions.
---

# Revisar as leis de arquitetura

As regras **não** estão neste arquivo. Elas ficam numa nota do acervo, que é a única fonte. Nunca revise de memória.

## 1. Encontrar as leis

Esta pasta é um link para `skills/review-app-conventions/` dentro do repositório do acervo. Resolva o caminho **real** dela antes de subir de nível, porque o `..` aplicado no caminho do link aponta para o lugar errado:

```bash
realpath "<pasta desta skill>"
```

As leis ficam em `<caminho real>/../../src/content/docs/mobile/react-native/arquitetura/leis-de-arquitetura.md`. Leia a nota inteira.

Se o arquivo não existir, pergunte ao usuário onde o acervo está clonado. Não continue sem as leis.

## 2. Definir o escopo

- Se o usuário passou um caminho ou uma pasta, revise isso.
- Se não passou nada, revise o que mudou: `git diff HEAD` e os arquivos não rastreados (`git status --short`).
- Se ele pediu o projeto inteiro, revise `src/`.

Para julgar duplicação e camadas, leia também os arquivos **relacionados** ao que mudou, e não só o diff: os `*-types.ts` e `api/*-api-types.ts` da feature, o adapter, o service e quem importa o arquivo alterado. Uma duplicação na mesma camada (L3.7) só aparece olhando o arquivo de tipos inteiro.

## 3. Rodar as ferramentas

Rode o lint e o typecheck do projeto e inclua o resultado no relatório:

```bash
npx expo lint
npx tsc --noEmit
```

Estilo de código (ordem de imports, formatação) é responsabilidade dessas ferramentas. Não revise estilo à mão.

## 4. Revisar

Compare o código com cada lei da nota. Para cada problema, anote:

- o código da lei (`L3.7`);
- o arquivo e a linha;
- o que está fora da regra, em uma frase;
- como fica corrigido, com o trecho de código quando ajudar.

Separe dois tipos de achado:

- **Fora da lei**: a regra se aplica e o código não segue.
- **Ver com dois olhos**: o código quebra uma regra, mas pode ser uma exceção consciente (há motivo aparente ou um comentário no commit). Explique a regra e pergunte se é intencional. Não trate como erro.

Não aponte como violação:

- decisões específicas do projeto que as leis não cobrem (cores, textos, layout);
- código de `node_modules` ou gerado automaticamente.

Se encontrar um caso que as leis não cobrem, ou uma regra que parece errada para o caso, diga isso separadamente e sugira a mudança na nota do acervo. As leis evoluem por aí.

## 5. Responder

1. Resultado do lint e do typecheck.
2. Achados agrupados por lei, na ordem da nota, com os **fora da lei** antes dos **ver com dois olhos**.
3. Sugestões de mudança nas leis, se houver.

Não aplique correções sem o usuário pedir. Se não houver nenhum achado, diga isso em uma linha, junto com o resultado das ferramentas.
