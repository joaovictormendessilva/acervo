---
title: Folder structure
description: Folder organization pattern for Expo apps with Expo Router.
tecnologia: expo-router
versao_testada: Expo SDK 58 · expo-router 58
atualizado_em: 2026-11-22
fontes:
  - https://docs.expo.dev/router/basics/core-concepts/
sidebar:
  order: 1
---

## What it is

The folder pattern I use in my Expo projects. The main rule: **`src/app/` only holds routes**, and everything else lives in `src/shared/`, split by kind of code.

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

| Folder | What goes in it |
| --- | --- |
| `src/app/` | Screens (`index.tsx`, `settings.tsx`) and navigators (`_layout.tsx`). Nothing else. |
| `src/shared/assets/` | Fonts, images and other static files. |
| `src/shared/components/` | Reusable components. |
| `src/shared/constants/` | Fixed values: routes, font names, keys. |
| `src/shared/theme/` | Theme tokens (colors, sizes) to use outside `className`. |
| `src/global.css` | Global CSS (Tailwind/NativeWind), imported once in the root layout. |

## When to use

- In any Expo app with Expo Router, from the start of the project.
- When you want every project to follow the same organization, so you find things without thinking.

## `shared/` or `features/`?

Both folders exist together, and one doesn't replace the other. Once the app has code about its subject (products in a store, posts in a news reader), that code goes into `src/features/<subject>/`, for example `features/products/` with components, hooks, services and types.

To decide, ask: **"Does this file know what a domain entity is?"**

- **No** → `shared/`. E.g. `Header`, `Button`, the theme, a date formatting function.
- **Yes, because it's about the app's subject** → `features/<subject>/`. E.g. `ProductCard`, fetching products from the API, the `Product` type.

A `shared/` file **may** depend on app infrastructure: a `Header` that uses the theme colors is still shared. What it can't do is know what a product is.

Dependencies only flow down: `app → features → shared`. `shared/` never imports anything from `features/`, and a feature doesn't import from another. The full rules are in [Architecture laws](/en/mobile/react-native/arquitetura/leis-de-arquitetura/).

## When to create a subfolder

Create a subfolder **only when it will group more than one file**. A single file stays loose, and its name already says what it is:

```
src/features/products/
├── api/
│   ├── product-api.ts
│   └── product-api-types.ts
├── components/
│   ├── product-card.tsx
│   └── product-list.tsx
├── product-adapter.ts
├── product-service.ts
└── product-types.ts
```

- `api/` and `components/` are folders because each one has more than one file.
- `product-service.ts` stays loose because it's the only service. A `services/` folder with a single file adds one more level to navigate with no gain: the `product-` prefix and the `-service` suffix already say what the file is.
- When the second file of the same kind shows up (two services, several hooks), that's when it's worth creating the folder and moving both into it.

## Step by step

### 1. Routes live in `src/app/`

Expo Router uses `src/app/` when the folder exists. The docs say this folder is **exclusively for routes**: every file there with an `export default` becomes a screen with its own URL.

### 2. `@/` alias pointing to `src/`

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

This way every import of shared code looks the same, no matter where it's made from:

```tsx title="src/app/(tabs)/_layout.tsx"
import { TabButton } from "@/shared/components/tab-button";
import { routes } from "@/shared/constants/routes";
```

### 3. Assets through the alias too

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

### 4. Naming conventions

- **Files and folders in kebab-case**: `tab-button.tsx`, `dark-theme.ts`. This avoids problems with case-insensitive file systems (Windows and macOS), where renaming `TabButton.tsx` to `tabButton.tsx` isn't picked up by git.
- **Components with named exports**: `export function TabButton()`. `export default` is only for screens in `src/app/`, because Expo Router requires it.
- **`function` for components, `const` for everything else**: components and screens are declared with `function`, and everything else (hooks, services, adapters, helpers and handlers inside components) uses `const` with an arrow function. That way you can tell at a glance whether something renders. Since `const` isn't hoisted, it has to be declared before the code that uses it when the file loads. That's why the object grouping the functions goes at the end of the file.

```ts title="src/features/products/product-adapter.ts"
import { ProductResponse } from "./api/product-api-types";
import { ProductSummary } from "./product-types";

const toProductSummary = (response: ProductResponse): ProductSummary => ({
  id: response.id,
  name: response.name,
  price: response.price_in_cents / 100,
});

export const productAdapter = {
  toProductSummary,
};
```
- **Constants with `as const`**: values stay literal and TypeScript can check them (e.g. routes with `satisfies Record<string, Href>`).
- **Type names**: see [Type naming conventions](/en/mobile/react-native/arquitetura/convencoes-de-nomes-de-tipos/).

## Common pitfalls

- **Component inside `src/app/`**: Expo Router tries to treat the file as a route. A `src/app/(tabs)/components/tab-button.tsx` becomes the `/components/tab-button` route and even shows up as a screen in the tab navigator. Components go in `src/shared/components/`.
- **Moving assets without updating `require`**: `tsc` doesn't check `require` paths, so the error only shows up when Metro builds the bundle. After moving files, run `npx expo export -p android` (or open the app) to confirm.
- **Importing through `src/app/`** (`@/app/...`): a sign that there's non-route code inside the routes folder.
- **Moving folders with Metro running**: the cache may keep pointing to the old path. Restart with `npx expo start --clear`.

## What changed between versions

- **Expo Router with `src/`**: the routes directory can be `app/` at the root or `src/app/`. Recent templates already use `src/app/`.
