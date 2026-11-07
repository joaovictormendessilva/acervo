---
title: Configurando ESLint no Expo
description: Como adicionar e usar o ESLint num projeto Expo com a config oficial (flat config).
tecnologia: expo
versao_testada: Expo SDK 58 · ESLint 9
atualizado_em: 2026-11-04
fontes:
  - https://docs.expo.dev/guides/using-eslint/
sidebar:
  order: 1
---

## O que é

O **ESLint** analisa o código e aponta erros e más práticas antes de você rodar o app: hooks usados do jeito errado, imports que não existem, variáveis que nunca são usadas e coisas assim. O Expo mantém uma configuração pronta, a `eslint-config-expo`, que já entende React, React Native e TypeScript.

## Quando usar

- Em **todo projeto**, logo no início. Quanto antes entrar, menos aviso acumulado para corrigir depois.
- Quando você usa IA para gerar código: o lint pega muitos erros que passam despercebidos.
- Em CI, para barrar código com erro antes do merge.

## Passo a passo

### 1. Rodar o comando de lint do Expo

```bash
npx expo lint
```

Na primeira vez, o comando percebe que o projeto não tem ESLint e oferece instalar tudo: `eslint`, `eslint-config-expo` e o arquivo `eslint.config.js`. Depois disso, ele só roda o lint.

### 2. Conferir o que foi adicionado

No `package.json`:

```json
{
  "scripts": {
    "lint": "expo lint"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-expo": "~58.0.4"
  }
}
```

:::note
A versão do `eslint-config-expo` acompanha a do SDK (aqui, `~58`). Ao atualizar o SDK, rode `npx expo install --fix` para alinhar as versões.
:::

### 3. O arquivo de configuração

```js title="eslint.config.js"
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
```

- `defineConfig` é o formato **flat config** do ESLint 9. O antigo `.eslintrc` não é mais o padrão.
- `eslint-config-expo/flat` é a variante da config do Expo para flat config.
- `ignores` lista as pastas que não devem passar pelo lint, como o build web em `dist/`.

### 4. Rodar

```bash
npm run lint
```

## Exemplo completo: adicionando uma regra própria

Para personalizar, adicione um objeto depois do `expoConfig`. As configs que vêm depois sobrescrevem as anteriores:

```js title="eslint.config.js" ins={8-13}
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-console': 'warn',
      'react/jsx-key': 'error',
    },
  },
]);
```

## Armadilhas comuns

- **Usar `npm install eslint` direto**: você pode acabar com versões incompatíveis com o SDK. Prefira `npx expo lint` ou `npx expo install`.
- **Ter um `.eslintrc.*` antigo junto com o `eslint.config.js`**: o ESLint 9 usa o flat config, então apague o arquivo antigo para não se confundir.
- **Lint não substitui typecheck**: rode também `npx tsc --noEmit`.

## O que mudou entre versões

- **ESLint 9 / SDKs recentes**: o padrão passou a ser flat config (`eslint.config.js` + `eslint-config-expo/flat`).
