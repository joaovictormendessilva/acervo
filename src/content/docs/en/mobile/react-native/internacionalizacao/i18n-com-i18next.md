---
title: i18n with i18next and expo-localization
description: How to translate an Expo app with i18next, following the device language, with typed keys and plurals.
tecnologia: i18next
versao_testada: Expo SDK 58 · i18next 27.2 · react-i18next 18.0 · expo-localization 58 · intl-pluralrules 2.0
atualizado_em: 2026-11-26
fontes:
  - https://www.i18next.com/react/react-native
  - https://www.i18next.com/overview/typescript
  - https://www.i18next.com/translation-function/plurals
  - https://www.i18next.com/misc/migration-guide
  - https://docs.expo.dev/guides/localization/
  - https://docs.expo.dev/versions/v58.0.0/sdk/localization/
sidebar:
  order: 1
---

## What it is

**i18n** (*internationalization*) means preparing the app for more than one language: texts leave the code and live in translation files, one per language. The screen asks for a text by key (`t("home.title")`), and the library returns the version for the current language.

The pieces:

- **`expo-localization`**: reads the device language (and also the clock format and the first day of the week).
- **`i18next`**: the translation engine. It stores the texts, switches the language, interpolates (`{{name}}`) and picks the right plural form.
- **`react-i18next`**: connects i18next to React. The `useTranslation()` hook provides `t`, and the screen renders again when the language changes.
- **`intl-pluralrules`**: a *polyfill* (code that adds a missing feature) for `Intl.PluralRules`, which i18next requires and Hermes doesn't have.

## When to use

- When the app will have more than one language, even if only in the future: pulling texts out of the code later means reviewing every screen.
- When the app needs correct plurals ("1 item", "3 items") in more than one language, because each language has its own rules.

## When NOT to use

- In an app that will have a single language, forever. Texts can stay right in the component.

## Step by step

### 1. Install

```bash
npx expo install expo-localization i18next react-i18next intl-pluralrules
```

`expo install` adds the `expo-localization` plugin to `app.json` by itself. Everything works in Expo Go.

### 2. Write the texts

Texts live in TypeScript, not JSON. One language is the **reference**, and the others must have the same keys:

```ts title="src/shared/i18n/locales/pt-br.ts"
export const ptBR = {
  home: {
    title: "Início",
    tasks_one: "{{count}} tarefa",
    tasks_other: "{{count}} tarefas",
  },
  settings: {
    title: "Configurações",
  },
} as const;

type TranslationShape<T> = {
  [Key in keyof T]: T[Key] extends string ? string : TranslationShape<T[Key]>;
};

export type Translation = TranslationShape<typeof ptBR>;
```

```ts title="src/shared/i18n/locales/en.ts"
import { Translation } from "./pt-br";

export const en = {
  home: {
    title: "Home",
    tasks_one: "{{count}} task",
    tasks_other: "{{count}} tasks",
  },
  settings: {
    title: "Settings",
  },
} as const satisfies Translation;
```

- `TranslationShape` copies the shape of the reference, replacing each text with `string`. So English must have the same keys, but with different texts.
- `satisfies Translation` makes `tsc` report a key missing from `en.ts`. JSON has no such check, and a forgotten translation only shows up on the device.
- Plurals use suffixes: `_one` for 1 and `_other` for the rest. i18next picks one using the language's rule.

### 3. Configure i18next

```ts title="src/shared/i18n/i18n.ts"
import "intl-pluralrules";

import { getLocales } from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./locales/en";
import { ptBR } from "./locales/pt-br";

export const defaultNS = "translation";

export const resources = {
  "pt-BR": { translation: ptBR },
  en: { translation: en },
} as const;

export type AppLanguage = keyof typeof resources;

export const toAppLanguage = (languageCode: string | null): AppLanguage =>
  languageCode === "pt" ? "pt-BR" : "en";

export const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  lng: toAppLanguage(getLocales()[0]?.languageCode ?? null),
  fallbackLng: "en",
  supportedLngs: ["pt-BR", "en"],
  interpolation: {
    escapeValue: false,
  },
});
```

- **The polyfill comes on the first line**, before i18next. Without it, plurals don't work on Hermes.
- **`createInstance()`** creates a dedicated instance, exported as `i18n`. The whole app uses this instance, and `initReactI18next` hands it to the hooks.
- **`toAppLanguage`** converts the device language (`"pt"`, `"en"`, `"es"`...) into one of the app's languages. Any language without a translation falls back to English.
- **`fallbackLng`** is the language used when a key is missing. Since v27 it has no default and must be set.
- **`escapeValue: false`**: React already escapes what it renders, so i18next doesn't need to escape again.

### 4. Type the keys

```ts title="src/shared/i18n/i18next-types.d.ts"
import type { defaultNS, resources } from "./i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["pt-BR"];
  }
}
```

With this, `t("home.titel")` is a `tsc` error, with the hint "Did you mean `home.title`?".

Here `interface` is required: i18next asks you to **complete** its `interface CustomTypeOptions` (*module augmentation*), and only `interface` adds fields to an existing declaration. It's the expected exception in [L3.2](/en/mobile/react-native/arquitetura/leis-de-arquitetura/). The file stands alone, and the reason goes in the commit message.

### 5. Follow the device language

```ts title="src/shared/i18n/use-device-language-sync.ts"
import { useLocales } from "expo-localization";
import { useEffect } from "react";

import { i18n, toAppLanguage } from "./i18n";

export const useDeviceLanguageSync = () => {
  const [locale] = useLocales();
  const language = toAppLanguage(locale.languageCode);

  useEffect(() => {
    if (i18n.language === language) {
      return;
    }

    i18n.changeLanguage(language);
  }, [language]);
};
```

iOS restarts the app when the device language changes, but Android doesn't: the app stays open in the old language. `useLocales()` renders again when the system language changes, and the hook switches the i18next language.

### 6. Wire it in the root layout

```tsx title="src/app/_layout.tsx"
import "@/shared/i18n/i18n";

import { Stack } from "expo-router";

import { useDeviceLanguageSync } from "@/shared/i18n/use-device-language-sync";

export default function RootLayout() {
  useDeviceLanguageSync();

  return <Stack />;
}
```

The side-effect import initializes i18next once, before any screen.

## Full example

```tsx title="src/app/index.tsx"
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export default function Home() {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t("home.title")}</Text>
      <Text>{t("home.tasks", { count: 3 })}</Text>
    </View>
  );
}
```

In Portuguese it shows "Início" and "3 tarefas". In English, "Home" and "3 tasks". With `count: 1`, "1 tarefa" and "1 task".

## Common pitfalls

- **Wrong or broken plurals on the device**: `intl-pluralrules` is missing, or it was imported after i18next. Hermes doesn't implement `Intl.PluralRules`, and since v25 i18next has no fallback for it.
- **Plural without `count`**: `t("home.tasks")` only looks up the `home.tasks` key, which doesn't exist. i18next only chooses between `_one` and `_other` when it gets `count`.
- **Interpolation without the variable**: since v27, `t("greeting")` with the text `"Hello {{name}}"` is a type error. Pass the variable: `t("greeting", { name })`.
- **Forgotten `fallbackLng`**: in v27 the default became `false`. Without it, a key missing in one language doesn't fall back to the other.
- **Lint warning on `i18next.use(...)`**: with the default import (`import i18next from "i18next"`), the `import/no-named-as-default-member` rule warns, because `use` is also a named export. Importing `use` directly doesn't work either: the React hooks rule mistakes it for the `use` hook. `createInstance()` solves both.
- **App stuck in the old language on Android** after changing the device language: the sync from step 5 is missing.
- **Translation texts in JSON**: it works, but `tsc` won't report a translation forgotten in another language.

## What changed between versions

- **i18next v25**: `Intl` became mandatory, with no fallback. On React Native with Hermes, `intl-pluralrules` is required.
- **i18next v27**: `fallbackLng` defaults to `false`, `strictInterpolationChecks` defaults to `true` (interpolation variables become required in TypeScript) and the `compatibilityJSON` option was removed.
