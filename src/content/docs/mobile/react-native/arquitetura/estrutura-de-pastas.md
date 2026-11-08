---
title: Estrutura de pastas
description: Padrão de organização de pastas para apps Expo com Expo Router.
tecnologia: expo-router
versao_testada: Expo SDK 58 · expo-router 58
atualizado_em: 2026-11-08
fontes:
  - https://docs.expo.dev/router/basics/core-concepts/
sidebar:
  order: 1
---

## O que é

O padrão de pastas que uso nos meus projetos Expo. A regra principal: **`src/app/` só tem rotas**, e todo o resto fica em `src/shared/`, separado pelo tipo de código.

```
src/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       └── settings.tsx
├── shared/
│   ├── assets/
│   │   └── fonts/
│   ├── components/
│   │   └── tab-button.tsx
│   ├── constants/
│   │   ├── fonts.ts
│   │   └── routes.ts
│   └── theme/
│       └── dark-theme.ts
└── global.css
```

| Pasta | O que vai nela |
| --- | --- |
| `src/app/` | Telas (`index.tsx`, `settings.tsx`) e navegadores (`_layout.tsx`). Nada mais. |
| `src/shared/assets/` | Fontes, imagens e outros arquivos estáticos. |
| `src/shared/components/` | Componentes reutilizáveis. |
| `src/shared/constants/` | Valores fixos: rotas, nomes de fonte, chaves. |
| `src/shared/theme/` | Tokens de tema (cores, tamanhos) para usar fora do `className`. |
| `src/global.css` | CSS global (Tailwind/NativeWind), importado uma vez no layout raiz. |

## Quando usar

- Em qualquer app Expo com Expo Router, desde o começo do projeto.
- Quando você quer que todos os projetos sigam a mesma organização, para achar as coisas sem pensar.

## `shared/` ou `features/`?

As duas pastas existem juntas, e uma não substitui a outra. Quando o app começa a ter código sobre o assunto dele (produtos numa loja, posts num leitor de notícias), esse código vai para `src/features/<assunto>/`, por exemplo `features/products/` com componentes, hooks, services e tipos.

Para decidir, pergunte: **"Esse arquivo funcionaria num app completamente diferente, sem mudar nada?"**

- **Sim** → `shared/`. Ex.: `Header`, `Button`, tema, uma função que formata datas.
- **Não, porque fala do assunto do app** → `features/<assunto>/`. Ex.: `ProductCard`, a busca de produtos na API, o tipo `Product`.

O `shared/` nunca importa nada de `features/`.

## Passo a passo

### 1. Rotas ficam em `src/app/`

O Expo Router usa `src/app/` quando a pasta existe. A doc diz que essa pasta é **exclusiva para rotas**: todo arquivo ali com `export default` vira uma tela, com URL própria.

### 2. Alias `@/` apontando para `src/`

```json title="tsconfig.json"
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Assim todo import do código compartilhado fica igual, não importa de onde ele é feito:

```tsx title="src/app/(tabs)/_layout.tsx"
import { TabButton } from "@/shared/components/tab-button";
import { routes } from "@/shared/constants/routes";
```

### 3. Assets também pelo alias

```tsx title="src/app/_layout.tsx"
import { useFonts } from "expo-font";
import { Stack } from "expo-router";

export default function RootLayout() {
  const [loaded] = useFonts({
    "Inter-Regular": require("@/shared/assets/fonts/inter/Inter_18pt-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return <Stack />;
}
```

### 4. Convenções de nome

- **Arquivos e pastas em kebab-case**: `tab-button.tsx`, `dark-theme.ts`. Isso evita problemas com sistemas de arquivos que não diferenciam maiúsculas (Windows e macOS), onde renomear `TabButton.tsx` para `tabButton.tsx` não é detectado pelo git.
- **Componentes com export nomeado**: `export function TabButton()`. O `export default` fica só para as telas em `src/app/`, porque o Expo Router exige.
- **Constantes com `as const`**: os valores ficam literais e o TypeScript consegue checá-los (ex.: rotas com `satisfies Record<string, Href>`).

## Armadilhas comuns

- **Componente dentro de `src/app/`**: o Expo Router tenta tratar o arquivo como rota. Um `src/app/(tabs)/components/tab-button.tsx` vira a rota `/components/tab-button` e ainda entra como tela no navegador de abas. Componentes vão em `src/shared/components/`.
- **Mover assets sem atualizar o `require`**: o `tsc` não verifica caminhos de `require`, então o erro só aparece quando o Metro monta o bundle. Depois de mover arquivos, rode `npx expo export -p android` (ou abra o app) para confirmar.
- **Import pelo caminho de `src/app/`** (`@/app/...`): sinal de que tem código que não é rota dentro da pasta de rotas.
- **Mover pastas com o Metro rodando**: o cache pode continuar apontando para o caminho antigo. Reinicie com `npx expo start --clear`.

## O que mudou entre versões

- **Expo Router com `src/`**: o diretório de rotas pode ser `app/` na raiz ou `src/app/`. Os templates recentes já usam `src/app/`.
