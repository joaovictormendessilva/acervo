---
title: Local fonts with expo-font
description: How to load .ttf/.otf fonts from the project with useFonts, holding the splash screen, and when to use the config plugin.
tecnologia: expo-font
versao_testada: Expo SDK 58 · expo-font 58
atualizado_em: 2026-11-05
fontes:
  - https://docs.expo.dev/versions/v58.0.0/sdk/font/
  - https://docs.expo.dev/develop/user-interface/fonts/
sidebar:
  order: 4
---

## What it is

**expo-font** lets you use your own fonts (`.ttf` or `.otf` files inside the project) instead of the system default. There are two ways to do it:

| | `useFonts` (runtime) | Config plugin (embedded at build time) |
| --- | --- | --- |
| How it works | Loads the files when the app opens | Copies the fonts into the native code at build time |
| Expo Go | ✅ Works | ❌ Requires a development build |
| Web | ✅ Works | ❌ Native only |
| Loading code | Must wait for loading (splash screen) | None: the font is already there when the app opens |
| Family name | You choose it (the object key) | Android: file name · iOS: name stored in the font |

## When to use each

- **`useFonts`**: when the app runs in **Expo Go**, also runs on the **web**, or when you want the same font name on every platform without worrying about it. This is the approach used in this note.
- **Config plugin**: what the docs recommend once the app uses a **development build**. The font is available from launch, with no async code and no need to hold the splash screen.

## Step by step (useFonts)

### 1. Add the files to the project

```
src/
└── assets/
    └── fonts/
        └── inter/
            ├── Inter_18pt-Regular.ttf
            └── Inter_18pt-Bold.ttf
```

### 2. Install the dependencies

```bash
npx expo install expo-font expo-splash-screen
```

`expo-splash-screen` keeps the splash on screen while the fonts load. Without it, the text would briefly show in the system font.

:::note
`npx expo install` also adds `expo-font` and `expo-splash-screen` to `plugins` in `app.json`. With no options, the `expo-font` plugin embeds no fonts and doesn't change anything in the `useFonts` flow.
:::

### 3. Centralize the font names

```ts title="src/constants/fonts.ts"
export const fonts = {
  regular: 'Inter-Regular',
  bold: 'Inter-Bold',
} as const;
```

These are the names you'll use in `fontFamily`. Keeping them in one place avoids typos, which make React Native fall back to the default font without any warning.

### 4. Load them in the root layout

```tsx title="src/app/_layout.tsx"
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { fonts } from '@/constants/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.regular]: require('@/assets/fonts/inter/Inter_18pt-Regular.ttf'),
    [fonts.bold]: require('@/assets/fonts/inter/Inter_18pt-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

- `preventAutoHideAsync()` sits **outside** the component, at module level, to hold the splash before the first render.
- `useFonts` returns `[loaded, error]`. Each object key becomes the family name.
- The splash hides when the fonts load **or fail**. That way, on error, the app opens with the system font instead of getting stuck on the splash.
- `return null` while loading: nothing is drawn before the fonts are ready.

### 5. Use them in styles

```tsx title="src/app/index.tsx"
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/fonts';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reader for TabNews</Text>
      <Text style={styles.text}>Open up src/app/index.tsx to start working on your app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
```

## Variation: config plugin (development build)

Once the app uses a development build, you can embed the fonts in the build and delete the `useFonts` and splash code:

```json title="app.json"
{
  "expo": {
    "plugins": [
      [
        "expo-font",
        {
          "fonts": [
            "./src/assets/fonts/inter/Inter-Regular.ttf",
            "./src/assets/fonts/inter/Inter-Bold.ttf"
          ]
        }
      ]
    ]
  }
}
```

After that, you need a **new development build** (`npx expo run:android` / `npx expo run:ios` or `eas build --profile development`). Reloading the JS isn't enough.

Watch out for the family name, which differs by platform:

- **Android**: the file name without the extension.
- **iOS**: the name stored inside the font (check it in Font Book or at fontdrop.info).

The docs recommend **renaming the file to the font's PostScript name** (e.g., `Inter-Bold.ttf`) so the name matches on both platforms. If you need a different name on Android, use the object form in `android.fonts`, with `fontFamily` and `fontDefinitions`.

## Common pitfalls

- **Misspelling the name in `fontFamily`**: React Native shows no error and just uses the system font. That's why the names are centralized in `src/constants/fonts.ts`.
- **Using one family with several weights and picking with `fontWeight`**: it works, but varies by platform. On iOS, the weight comes from the file and what you declare is ignored. On Android below API 29, only the first weight loads. Registering each weight as its own family (`Inter-Regular`, `Inter-Bold`) gives the same result on every platform.
- **Calling `useFonts` again to add weights**: each family loads only once. Declare all files in the same call.
- **Configuring the config plugin and testing in Expo Go**: the font doesn't show up. The plugin only applies to development builds.
- **Forgetting to rebuild after changing the plugin**: the font only gets into the app in a new build.

## What changed between versions

- **SDK 58**: `useFonts` and `loadAsync` accept either the `{ name: require(...) }` object or an array of `FontFamilyDefinition`s, for declaring several weights and styles in one family.
