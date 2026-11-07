---
title: Expo Router — custom tabs
description: Your own tab bar with Tabs, TabSlot, TabList and TabTrigger from expo-router/ui.
tecnologia: expo-router
versao_testada: Expo SDK 58 · expo-router 58 · React Native 0.88
atualizado_em: 2026-11-06
fontes:
  - https://docs.expo.dev/router/advanced/custom-tabs/
  - https://docs.expo.dev/router/basics/redirects/
  - https://docs.expo.dev/router/reference/typed-routes/
sidebar:
  order: 2
---

## What it is

`expo-router/ui` ships tab components with **no styling at all**. You build the bar however you want, and Expo Router still handles navigation, URLs and each tab's state.

| Component | Renders | Role |
| --- | --- | --- |
| `Tabs` | `View` | Wraps everything and creates the tab navigator |
| `TabSlot` | the current screen | Where the active route is shown |
| `TabList` | `View` | Holds the `TabTrigger`s and defines which tabs exist |
| `TabTrigger` | `Pressable` | A tab button. Inside `TabList`, it requires `name` and `href` |

## When to use

- When the bar's look needs to break from the default (a highlighted center button, a floating bar, tabs at the top, animations).
- When you want the same layout on web and mobile without relying on the native tab bar.

## When NOT to use

- If the default bar works for you, use `Tabs` from `expo-router` (JavaScript tabs) or `NativeTabs`. They already come with icons, badges and safe area.
- The docs mark custom tabs as **experimental**.

## Step by step

### 1. File structure

```
src/app/
├── _layout.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── index.tsx
    └── settings.tsx
```

The `(tabs)` group is not part of the URL: `(tabs)/index.tsx` becomes `/` and `(tabs)/settings.tsx` becomes `/settings`. The name `(tabs)` is just a convention. Any name in parentheses works.

### 2. Hide the root Stack header

The root layout is still a `Stack`. Since the tabs have their own bar, the Stack header usually goes away:

```tsx title="src/app/_layout.tsx"
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 3. Create the tab button

With `asChild`, `TabTrigger` doesn't render its own `Pressable`. It forwards its props (`onPress`, `href`, etc.) and **`isFocused`** to its direct child. The button only needs to accept those props and spread them onto a `Pressable`:

```tsx title="src/components/tab-button.tsx"
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type TabButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  children: string;
  isFocused?: boolean;
};

export function TabButton({ children, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} style={styles.button}>
      <Text style={[styles.label, isFocused && styles.labelFocused]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    color: '#6b7280',
  },
  labelFocused: {
    color: '#000',
    fontWeight: 'bold',
  },
});
```

:::caution[Button type on RN 0.88]
The docs type the button with `TabTriggerSlotProps`. In React Native 0.88, `View` became a function component, and that type's `ref` no longer matches `Pressable`'s, so `tsc` fails. Typing it as `ComponentProps<typeof Pressable>` plus `isFocused` fixes this and accepts the same props.
:::

### 4. Build the tabs layout

```tsx title="src/app/(tabs)/_layout.tsx"
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabButton } from '@/components/tab-button';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={{ flex: 1, paddingTop: insets.top }}>
      <TabSlot />

      <TabList style={[styles.tabList, { paddingBottom: insets.bottom }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton>Home</TabButton>
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabButton>Settings</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabList: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
});
```

- The order of the `TabTrigger`s is the order of the tabs. Not rendering a trigger removes that tab and its navigation state.
- `TabSlot` before `TabList` puts the bar at the bottom. Swap them and the bar goes to the top.
- `name` identifies the tab. `href` is the route it opens.

### 5. Create the screens

```tsx title="src/app/(tabs)/index.tsx"
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text>Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

`settings.tsx` follows the same shape.

## Which tab opens first

Expo Router has no notion of an "initial tab". It opens the URL `/` and shows the file that matches it. The `Tabs` from `expo-router/ui` also **doesn't accept `initialRouteName`**: the active tab is always the one that matches the current URL. There are two ways to choose the first screen:

| | `(tabs)/index.tsx` | `Redirect` in `app/index.tsx` |
| --- | --- | --- |
| Main screen URL | `/` | the tab's route (e.g. `/feed`) |
| Files | one fewer | an `index.tsx` just to redirect |
| Changing the main screen | rename files | change one line |

The redirect version:

```tsx title="src/app/index.tsx"
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/feed" />;
}
```

Without either one, `/` matches no screen and the app opens on the route-not-found screen.

## Variations

### Routes in a typed constant

To avoid scattering route strings across the app, centralize them in a constant. `satisfies Record<string, Href>` checks each value against the routes that `typedRoutes` generates. If a route file is renamed or deleted, `tsc` reports the error here.

```ts title="src/constants/routes.ts"
import type { Href } from 'expo-router';

export const routes = {
  home: '/',
  settings: '/settings',
} as const satisfies Record<string, Href>;
```

```tsx title="src/app/(tabs)/_layout.tsx" del={1,4} ins={2,5}
        <TabTrigger name="index" href="/" asChild>
        <TabTrigger name="index" href={routes.home} asChild>
        ...
        <TabTrigger name="settings" href="/settings" asChild>
        <TabTrigger name="settings" href={routes.settings} asChild>
```

`as const` keeps the literal value (`'/settings'`) instead of `string`. This requires `experiments.typedRoutes: true` in `app.json`.

### Fully custom bar

With `style={{ display: 'none' }}` on `TabList`, the list only registers the tabs. Outside it, inside `Tabs`, you place `TabTrigger`s **without `href`**, which do the same thing as the trigger with the same `name`.

## Common pitfalls

- **Top and bottom insets**: `TabList` only applies the side insets. Without `paddingBottom: insets.bottom`, the bar sits under the iOS home indicator. Without `paddingTop` on `Tabs`, the screen sits under the status bar.
- **`TabList` must be a direct child of `Tabs`.** `TabSlot` can go elsewhere inside `Tabs`, but not inside `TabList`.
- **Forgetting `asChild`**: `TabTrigger` renders its own `Pressable` around your component, and `isFocused` never reaches it.
- **Relative `href`**: it resolves from where `Tabs` is rendered. The docs recommend absolute `href`s only.
- **Route in a shared group** `(a,b)`: the `href` must include the group so it points to a single route.

## What changed between versions

- **SDK 52 and earlier (React 18)**: the custom button needed `forwardRef` to receive the `ref`. From React 19 on, `ref` arrives as a regular prop.
- **React Native 0.88**: `View` became a function component, and the `ref` in `TabTriggerSlotProps` started failing type checks against `Pressable`. That's why the button is typed with `ComponentProps<typeof Pressable>`.
