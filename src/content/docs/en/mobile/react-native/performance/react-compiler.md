---
title: React Compiler in Expo
description: How to enable the React Compiler in an Expo app to memoize components and callbacks automatically, and what the risks are.
tecnologia: expo
versao_testada: Expo SDK 58 · React 19
atualizado_em: 2026-11-21
fontes:
  - https://docs.expo.dev/guides/react-compiler/
  - https://react.dev/learn/react-compiler
  - https://react.dev/reference/rules
sidebar:
  order: 1
---

## What it is

The **React Compiler** is a Babel plugin maintained by the React team. At build time, it analyzes each component and hook and adds memoization on its own: the equivalent of `memo`, `useCallback` and `useMemo`, but finer-grained, because it can memoize pieces of JSX and intermediate values inside the component.

In practice, a component only renders again when something it uses has actually changed, without you writing any memoization hook.

## When to use

- When a screen renders again for no reason and it costs, especially with lists. A common case: when switching tabs in Expo Router, the navigator renders **every** mounted tab again, not only the one that became active. If each tab has a `FlatList` with an inline `renderItem`, every mounted cell renders again on each switch.
- In new projects, so you don't have to spread `memo`/`useCallback` across the code.
- When the code follows the [Rules of React](https://react.dev/reference/rules): pure components, no mutation of props or state.

## When NOT to use

- In code that mutates props, state or shared objects during render.
- With libraries that rely on mutation to work (some MobX patterns, for example).
- With class components: they are not optimized. Migrate them to functions first.

## Step by step

### 1. Enable it in app.json

```json title="app.json" ins={4}
{
  "expo": {
    "experiments": {
      "reactCompiler": true
    }
  }
}
```

Since SDK 54, Expo configures Babel on its own. No package needs to be installed.

### 2. Restart Metro clearing the cache

```bash
npx expo start --clear
```

The change is in the Babel configuration. Without clearing the cache, Metro keeps serving the files it already transformed and the compiler doesn't kick in.

### 3. Check with the linter

```bash
npx expo lint
```

Since SDK 55, the compiler rules ship with `eslint-config-expo`. They warn when a piece of code breaks the Rules of React and the compiler can't optimize it safely.

## Full example

With the compiler on, this list needs neither `memo` nor `useCallback`. The inline `renderItem` and each item's `onPress` stay stable between renders as long as `items` and `onPressItem` don't change:

```tsx title="src/components/item-list.tsx"
import { FlatList, Pressable, Text } from 'react-native';

type Item = { id: string; title: string };

type ItemListProps = {
  items: Item[];
  onPressItem: (item: Item) => void;
};

export function ItemList({ items, onPressItem }: ItemListProps) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPressItem(item)}>
          <Text>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}
```

```tsx title="src/app/home.tsx"
import { useRouter } from 'expo-router';

import { ItemList } from '@/components/item-list';

const items = [
  { id: '1', title: 'First' },
  { id: '2', title: 'Second' },
];

export default function Home() {
  const router = useRouter();

  return <ItemList items={items} onPressItem={(item) => router.push(`/details/${item.id}`)} />;
}
```

Without the compiler, getting the same result would take `memo` on the item, `useCallback` on `renderItem` and `onPressItem`, and passing the item instead of a new closure on every render.

## Variations / advanced examples

### Opt a component out

If a component behaves differently with the compiler, use the `"use no memo"` directive at the start of the function (or the file) while you investigate:

```tsx title="src/components/legacy-chart.tsx"
import { View } from 'react-native';

export function LegacyChart() {
  'use no memo';

  return <View />;
}
```

### Incremental adoption

To compile only part of the project, use the `sources` filter in the Babel configuration (`babel.config.js`), as shown in the [Expo docs](https://docs.expo.dev/guides/react-compiler/). After changing it, restart with `npx expo start --clear`.

## Common pitfalls

- **Forgetting `--clear`**: the compiler seems to have no effect because Metro is serving the old cache.
- **Mutating values during render**: with automatic memoization, a mutated object may not trigger a new render and the screen shows a stale value. Create new objects instead of mutating.
- **Reading `ref.current` during render**: the value isn't tracked and may stay memoized. Read refs in effects or handlers.
- **Less visible debugging**: memoization doesn't show in the code. React DevTools marks compiled components, which helps to understand what was optimized.
- **Assuming `node_modules` is compiled**: the compiler only runs on app code.
- **Keeping old `memo`/`useCallback` for no reason**: they still work, but become redundant code. You can remove them gradually.

## What changed between versions

- **SDK 52 and earlier**: you had to install `babel-plugin-react-compiler@beta` and `react-compiler-runtime@beta`.
- **SDK 53**: only `babel-plugin-react-compiler@beta`.
- **SDK 54**: Babel started being configured automatically; `experiments.reactCompiler` in `app.json` is enough. Linting still required installing `eslint-plugin-react-compiler`.
- **SDK 55**: the compiler lint rules started shipping with `eslint-config-expo`, and `eslint-plugin-react-compiler` can be removed.
