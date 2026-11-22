---
title: EAS Build profiles
description: How to configure eas.json with development, preview and production profiles, and build an APK to install on your phone without Android Studio.
tecnologia: eas
versao_testada: Expo SDK 58 · eas-cli 27
atualizado_em: 2026-11-22
fontes:
  - https://docs.expo.dev/build/setup/
  - https://docs.expo.dev/build/eas-json/
  - https://docs.expo.dev/build-reference/apk/
sidebar:
  order: 1
---

## What it is

EAS Build compiles the app in Expo's cloud. You do not need Android Studio, Xcode or a Mac. `eas.json`, at the project root next to `package.json`, defines **profiles**: each profile is a build recipe with a different purpose.

| Profile | What it is for | Android format |
| --- | --- | --- |
| `development` | your own app that replaces Expo Go, with live reload and the project's native libraries | `.apk` |
| `preview` | the real app, to install on a phone and test the way users will see it | `.apk` |
| `production` | the version sent to the store | `.aab` |

## When to use

- **preview**: to see what Expo Go does not show (icon, splash, app name) or to send the app to someone for testing.
- **development**: when the project gets a library with native code that Expo Go does not include.
- **production**: to publish on the Play Store or the App Store.

## When NOT to use

For day-to-day development, while Expo Go is enough. A build takes minutes, and Expo Go reloads instantly.

## Step by step

1. Create an account at expo.dev and log in:

```bash
npx eas-cli@latest login
```

2. Configure the project. The command creates `eas.json`, if it does not exist yet, and links the project to your account:

```bash
npx eas-cli@latest build:configure
```

3. Adjust `eas.json` as in the example below.
4. Build the APK:

```bash
npx eas-cli@latest build -p android --profile preview
```

5. At the end, the terminal shows a link. Open it on the phone, download and install the `.apk`. The link is also on the build page at expo.dev, with an **Install** button.

:::note
In a project with `bun.lock`, replace `npx eas-cli@latest` with `bunx eas-cli`.
:::

## Full example

```json title="eas.json"
{
  "cli": {
    "version": ">= 27.11.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

- **`cli.version`**: minimum `eas-cli` version. It stops anyone from building the project with an old, incompatible version.
- **`cli.appVersionSource: "remote"`**: the build number (Android's `versionCode` and iOS's `buildNumber`) is stored on the EAS server, not in `app.json`.
- **`developmentClient: true`**: the build includes `expo-dev-client`. Install it first with `npx expo install expo-dev-client`.
- **`distribution: "internal"`**: the build is meant to be installed directly on a device, not sent to the store.
- **`android.buildType: "apk"`**: builds an `.apk`, which installs directly on the phone. The Android default is `.aab`, which only the Play Store accepts.
- **`autoIncrement: true`**: on every production build, EAS bumps the build number by itself. Stores reject a submission with a repeated number.
- **`submit.production`**: configuration for `eas submit`, which sends the build to the store. When empty, it asks for whatever it needs at submit time.

## Variations / advanced examples

### Making the defaults explicit

The `development` profile already builds an `.apk` because of `developmentClient`, and `production` already builds an `.aab`. Some setups write it anyway, to make clear what each profile produces:

```json title="eas.json"
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "android": { "buildType": "apk" }
},
"production": {
  "autoIncrement": true,
  "android": { "buildType": "app-bundle" }
}
```

The result is the same.

### Installing on the emulator

```bash
npx eas-cli@latest build:run -p android --latest
```

Downloads the latest build and installs it on the open emulator.

## Common pitfalls

- **Trying to install the `.aab`.** The store format does not install directly on a phone. For testing, use a profile with `buildType: "apk"`.
- **The `development` profile without `expo-dev-client`.** The build depends on it. Install it before building.
- **Picking the package name in a hurry.** `android.package` (e.g. `com.company.app`) identifies the app on the store and cannot change after publishing.
- **Thinking you need Android Studio.** EAS builds in the cloud. Android Studio, or at least the Android SDK and the JDK, is only needed to build on your own computer (`npx expo run:android`).
- **Expecting an instant build.** The free plan has a queue. A build can take a few minutes or longer, depending on demand.

## What changed between versions

No changes recorded since the first version of this note.
