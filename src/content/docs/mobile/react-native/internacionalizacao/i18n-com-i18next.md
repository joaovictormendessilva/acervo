---
title: i18n com i18next e expo-localization
description: Como traduzir um app Expo com i18next, seguindo o idioma do celular, com chaves tipadas e plurais.
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

## O que é

**i18n** (*internationalization*) é preparar o app para mais de um idioma: os textos saem do código e ficam em arquivos de tradução, um por idioma. A tela pede o texto por uma chave (`t("home.title")`), e a biblioteca devolve a versão do idioma atual.

As peças:

- **`expo-localization`**: lê o idioma do celular (e também o formato de hora e o primeiro dia da semana).
- **`i18next`**: o motor de tradução. Guarda os textos, troca o idioma, faz interpolação (`{{name}}`) e escolhe a forma certa do plural.
- **`react-i18next`**: liga o i18next ao React. O hook `useTranslation()` entrega o `t`, e a tela renderiza de novo quando o idioma muda.
- **`intl-pluralrules`**: um *polyfill* (código que acrescenta um recurso que falta) do `Intl.PluralRules`, que o i18next exige e o Hermes não tem.

## Quando usar

- Quando o app vai ter mais de um idioma, mesmo que só no futuro: tirar textos do código depois obriga a revisar todas as telas.
- Quando o app precisa de plurais corretos ("1 item", "3 itens") em mais de um idioma, porque cada idioma tem as suas regras.

## Quando NÃO usar

- Num app que vai ter um idioma só, para sempre. Os textos podem ficar direto no componente.

## Passo a passo

### 1. Instalar

```bash
npx expo install expo-localization i18next react-i18next intl-pluralrules
```

O `expo install` adiciona o plugin do `expo-localization` no `app.json` sozinho. Tudo funciona no Expo Go.

### 2. Escrever os textos

Os textos ficam em TypeScript, e não em JSON. Um idioma é a **referência**, e os outros são obrigados a ter as mesmas chaves:

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

- O `TranslationShape` copia a forma da referência, trocando cada texto por `string`. Assim o inglês precisa ter as mesmas chaves, mas com textos diferentes.
- O `satisfies Translation` faz o `tsc` acusar uma chave faltando no `en.ts`. Com JSON essa checagem não existe, e a tradução esquecida só aparece no celular.
- Os plurais usam sufixos: `_one` para 1 e `_other` para o resto. Quem escolhe é o i18next, pela regra do idioma.

### 3. Configurar o i18next

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

- **O polyfill vem na primeira linha**, antes do i18next. Sem ele, os plurais não funcionam no Hermes.
- **`createInstance()`** cria uma instância própria, exportada como `i18n`. O app inteiro usa essa instância, e o `initReactI18next` a entrega para os hooks.
- **`toAppLanguage`** converte o idioma do celular (`"pt"`, `"en"`, `"es"`...) num dos idiomas do app. Qualquer idioma sem tradução cai no inglês.
- **`fallbackLng`** é o idioma usado quando falta uma chave. Desde a v27 ele não tem valor padrão e precisa ser definido.
- **`escapeValue: false`**: o React já escapa o que renderiza, então o i18next não precisa escapar de novo.

### 4. Tipar as chaves

```ts title="src/shared/i18n/i18next-types.d.ts"
import type { defaultNS, resources } from "./i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["pt-BR"];
  }
}
```

Com isso, `t("home.titel")` dá erro no `tsc`, com a sugestão "Did you mean `home.title`?".

Aqui é obrigatório usar `interface`: o i18next pede que você **complete** a `interface CustomTypeOptions` dele (*module augmentation*), e só `interface` soma campos a uma declaração que já existe. É a exceção prevista na [L3.2](/mobile/react-native/arquitetura/leis-de-arquitetura/). O arquivo fica sozinho, e o motivo vai na mensagem do commit.

### 5. Seguir o idioma do celular

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

O iOS reinicia o app quando o idioma do celular muda, mas o Android não: o app continua aberto no idioma antigo. O `useLocales()` renderiza de novo quando o idioma do sistema muda, e o hook troca o idioma do i18next.

### 6. Ligar no layout raiz

```tsx title="src/app/_layout.tsx"
import "@/shared/i18n/i18n";

import { Stack } from "expo-router";

import { useDeviceLanguageSync } from "@/shared/i18n/use-device-language-sync";

export default function RootLayout() {
  useDeviceLanguageSync();

  return <Stack />;
}
```

O import só de efeito inicializa o i18next uma vez, antes de qualquer tela.

## Exemplo completo

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

Em português aparece "Início" e "3 tarefas". Em inglês, "Home" e "3 tasks". Com `count: 1`, "1 tarefa" e "1 task".

## Armadilhas comuns

- **Plurais errados ou quebrados no celular**: falta o `intl-pluralrules`, ou ele foi importado depois do i18next. O Hermes não implementa o `Intl.PluralRules`, e desde a v25 o i18next não tem mais um plano B para isso.
- **Plural sem `count`**: `t("home.tasks")` procura só a chave `home.tasks`, que não existe. O i18next só escolhe entre `_one` e `_other` quando recebe o `count`.
- **Interpolação sem a variável**: desde a v27, `t("greeting")` com o texto `"Olá {{name}}"` é erro de tipo. Passe a variável: `t("greeting", { name })`.
- **`fallbackLng` esquecido**: na v27 o padrão passou a ser `false`. Sem definir, uma chave que falta num idioma não cai no outro.
- **Aviso de lint em `i18next.use(...)`**: com o import padrão (`import i18next from "i18next"`), a regra `import/no-named-as-default-member` avisa, porque `use` também é um export nomeado. Importar o `use` direto também não serve: a regra de hooks do React confunde com o hook `use`. O `createInstance()` resolve os dois.
- **App no idioma antigo no Android** depois de trocar o idioma do celular: falta a sincronização do passo 5.
- **Texto de tradução em JSON**: funciona, mas o `tsc` não acusa uma tradução esquecida em outro idioma.

## O que mudou entre versões

- **i18next v25**: o `Intl` passou a ser obrigatório, sem fallback. Em React Native com Hermes, é preciso o `intl-pluralrules`.
- **i18next v27**: o `fallbackLng` passou a ser `false` por padrão, o `strictInterpolationChecks` passou a ser `true` (variáveis de interpolação viram obrigatórias no TypeScript) e a opção `compatibilityJSON` foi removida.
