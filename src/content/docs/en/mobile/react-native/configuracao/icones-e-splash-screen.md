---
title: Icons and splash screen
description: Which icon and splash files an Expo app needs, how to configure them in app.json and how to generate all of them from a single vector icon.
tecnologia: expo
versao_testada: Expo SDK 58 · expo-splash-screen 58
atualizado_em: 2026-11-22
fontes:
  - https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
  - https://docs.expo.dev/versions/v58.0.0/config/app/
  - https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/
  - https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
  - https://fonts.google.com/icons
sidebar:
  order: 3
---

## What it is

Each platform shows the app icon differently, so Expo accepts several versions of the same artwork:

- **iOS** (18+): one version per home screen appearance (light, dark and tinted).
- **Android**: an adaptive icon. The background and the drawing are separate, and each manufacturer crops the result into a shape (circle, rounded square, teardrop).
- **Splash screen**: the screen shown while the app loads. It is a centered image on a background color.

## When to use

In every app that will be installed. When there is no ready artwork, you can generate everything from a vector icon (for example, from [Google Fonts Icons](https://fonts.google.com/icons)) with the acervo script described in the [step by step](#step-by-step).

## The files

| File | Where it shows | Size | Rules |
| --- | --- | --- | --- |
| `icon.png` | default icon, used when there is no specific version | 1024×1024 | square, no transparency |
| `ios-light.png` | iPhone in the light appearance | 1024×1024 | square, fills everything, no rounded corners and no transparency |
| `ios-dark.png` | iPhone with dark icons | 1024×1024 | same rules; drawing on a dark background |
| `ios-tinted.png` | iPhone with tinted icons | 1024×1024 | grayscale: iOS paints it with the color the person picked |
| `android-icon-foreground.png` | drawing of the adaptive icon | 1024×1024 | transparent background, drawing inside the safe zone |
| `android-icon-monochrome.png` | Android 13+ with themed icons | 1024×1024 | white drawing, transparent background |
| `splash-icon.png` | splash screen | 1024×1024 | transparent background; the color comes from `backgroundColor` |
| `favicon.png` | browser tab (web) | 48×48 | square |

The Android adaptive icon is 108dp, but the system only shows the center 72dp (2/3) and then crops that square into the manufacturer's shape. The part that always shows is a 66dp circle in the middle. That is why the foreground drawing takes up less than half of the image.

## Step by step

1. Pick the icon on [Google Fonts Icons](https://fonts.google.com/icons), download the SVG and copy the value of the `<path>`'s `d` attribute.
2. Run the acervo script, located at `tools/app-icons/generate-icons.cjs`. It writes the 8 files to the project's `assets/` and a preview with each platform's crops to the system temp folder:

```bash
node <acervo>/tools/app-icons/generate-icons.cjs <project> "<svg path d>" "#3B82F6" "#111827"
```

The arguments are the project path, the SVG path, the drawing color and the background color. An optional fifth argument changes the background of the iOS light icon (default `#F0F6FC`). The script centers the drawing by the area it takes up, so it works with any `viewBox` (Material Icons' `0 0 24 24` or Material Symbols' `0 -960 960 960`).

3. Open the preview the script prints and check that nothing was cut off.
4. Configure `app.json` as in the example below.
5. Create a new build to see it on the device (see the [pitfalls](#common-pitfalls)).

:::note
The script uses `jimp-compact`, an image library Expo already installs as a dependency. It looks for the library in the project's `node_modules`, so there is nothing to install.
:::

## Full example

```json title="app.json"
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "description": "One sentence about the app.",
    "icon": "./assets/icon.png",
    "ios": {
      "icon": {
        "light": "./assets/ios-light.png",
        "dark": "./assets/ios-dark.png",
        "tinted": "./assets/ios-tinted.png"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundColor": "#111827",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#111827"
        }
      ]
    ]
  }
}
```

- `ios.icon` overrides `icon` on iOS. If only `light` exists, it is used for every appearance.
- `android.adaptiveIcon.backgroundColor` is the adaptive icon background. For an image background, use `backgroundImage` with the same size as the foreground.
- `imageWidth` is the width of the splash drawing on screen, in points (default 100).

## Variations / advanced examples

### Different splash in light and dark themes

The plugin accepts a `dark` key, used when the phone's **system** is in dark theme:

```json title="app.json"
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon-light.png",
    "backgroundColor": "#ffffff",
    "dark": {
      "image": "./assets/splash-icon-dark.png",
      "backgroundColor": "#111827"
    }
  }
]
```

It only makes sense if the app also follows the system theme (`userInterfaceStyle: "automatic"`).

### Icon Composer (iOS)

Instead of the three versions, `ios.icon` accepts a `.icon` file made in Apple's Icon Composer. It already handles the light, dark and tinted appearances. You need a Mac to create the file.

## Common pitfalls

- **Light splash in an always-dark app.** The splash `dark` variant follows the system theme, not the app's. In an app with `userInterfaceStyle: "dark"`, a white-background splash shows up for people using the light theme and becomes a white flash before the app opens. Use a single splash with the app background.
- **None of this shows in Expo Go.** Expo Go is an already installed app with its own icon and splash. The icon and splash go into native code and only show in a build of your project: `eas build --profile preview` (in the cloud) or `npx expo run:android|ios` (local, needs the native SDK).
- **Reload does not update the icon.** Changed a file or `app.json`? You need a new build.
- **Transparency in the iOS icon.** The iOS icon must fill the whole square. Use a transparent background only for the Android foreground and monochrome and for the splash.
- **Drawing cut off on Android.** A foreground that fills the whole image loses its edges when cropped. Keep the drawing inside the central circle, 2/3 of the visible area.
- **SVG with arcs.** The script understands lines and curves (`M L H V C S Q T Z`), but not arcs (`A`). Google Fonts icons do not use arcs.

## What changed between versions

- **SDK 54:** `ios.icon` started accepting Icon Composer's `.icon` file.
