---
title: Setting up ESLint in Expo
description: How to add and use ESLint in an Expo project with the official config (flat config).
tecnologia: expo
versao_testada: Expo SDK 58 · ESLint 9
atualizado_em: 2026-11-05
fontes:
  - https://docs.expo.dev/guides/using-eslint/
sidebar:
  order: 2
---

## What it is

**ESLint** analyzes your code and flags errors and bad practices before you run the app: hooks used the wrong way, imports that don't exist, variables that are never used and so on. Expo maintains a ready-made config, `eslint-config-expo`, that already understands React, React Native and TypeScript.

## When to use

- In **every project**, right at the start. The earlier it goes in, the fewer warnings pile up to fix later.
- When you use AI to generate code: lint catches many errors that slip by unnoticed.
- In CI, to block code with errors before merging.

## Step by step

### 1. Run Expo's lint command

```bash
npx expo lint
```

The first time, the command notices the project has no ESLint and offers to install everything: `eslint`, `eslint-config-expo` and the `eslint.config.js` file. After that, it just runs the lint.

### 2. Check what was added

In `package.json`:

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
The `eslint-config-expo` version follows the SDK version (here, `~58`). When upgrading the SDK, run `npx expo install --fix` to align the versions.
:::

### 3. The config file

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

- `defineConfig` is ESLint 9's **flat config** format. The old `.eslintrc` is no longer the default.
- `eslint-config-expo/flat` is the flat config variant of Expo's config.
- `ignores` lists folders that shouldn't be linted, such as the web build in `dist/`.

### 4. Run it

```bash
npm run lint
```

## Full example: adding your own rule

To customize, add an object after `expoConfig`. Later configs override earlier ones:

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

## Common pitfalls

- **Using `npm install eslint` directly**: you may end up with versions incompatible with the SDK. Prefer `npx expo lint` or `npx expo install`.
- **Keeping an old `.eslintrc.*` alongside `eslint.config.js`**: ESLint 9 uses flat config, so delete the old file to avoid confusion.
- **Lint doesn't replace typechecking**: also run `npx tsc --noEmit`.

## What changed between versions

- **ESLint 9 / recent SDKs**: flat config became the default (`eslint.config.js` + `eslint-config-expo/flat`).
