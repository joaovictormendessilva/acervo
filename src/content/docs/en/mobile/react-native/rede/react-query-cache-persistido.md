---
title: Persisted React Query cache
description: What staleTime and gcTime are, and how to save the React Query cache to AsyncStorage so the app opens with data on screen.
tecnologia: "@tanstack/react-query"
versao_testada: Expo SDK 58 · @tanstack/react-query 5.107 · async-storage 2.2
atualizado_em: 2026-11-15
fontes:
  - https://tanstack.com/query/v5/docs/framework/react/guides/caching
  - https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults
  - https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient
  - https://tanstack.com/query/v5/docs/framework/react/plugins/createAsyncStoragePersister
  - https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/
sidebar:
  order: 2
---

## What it is

By default, the React Query cache lives **only in memory**: when the app closes it's gone, and on the next launch every screen starts with a loading state. **Persistence** saves that cache to AsyncStorage and restores it when the app opens, so the last list shows up right away, with no loading, and gets updated in the background.

To set this up properly, you need to understand two times: `staleTime` and `gcTime`.

## `staleTime` and `gcTime`

**Neither one makes a request by itself when time passes.** React Query only fetches when something happens: the screen mounts, the user pulls to refresh, the app comes back to the foreground. The times only help it decide what to do at those moments.

| | What it decides | Default |
| --- | --- | --- |
| **`staleTime`** | **When to fetch again**: is the data still trustworthy? | `0` |
| **`gcTime`** | **When to forget**: how long to keep data nobody is using? | 5 minutes |

### `staleTime`: do I need to fetch again?

When data arrives from the API, it's **fresh**. After `staleTime`, it becomes **stale**. When a screen that uses that data mounts:

- **Fresh data**: shows the cache and **makes no request**.
- **Stale data**: shows the cache **right away** and fetches the new version in the background. When it arrives, the screen updates by itself.

Stale data doesn't mean an empty screen. It means "show what you have, but check if it changed". With the default `0`, all data is born stale, so every screen that mounts fetches again.

If the user just sits on the screen, nothing happens when `staleTime` runs out. The fetch only comes on the next trigger: leaving and coming back, pulling to refresh or reopening the app.

### `gcTime`: how long to keep it?

`gcTime` **never fetches anything**, it only deletes. And it only starts counting when **no component** is using the query (the query becomes *inactive*):

- While any screen uses the query, it's never deleted.
- When the last screen using it leaves, the countdown starts.
- If a screen uses it again before the end, the countdown stops. When that screen leaves again, it restarts from zero.
- If time runs out with nobody using it, the data leaves the cache, and the next screen starts from scratch, with loading.

### Example with a 1 min `staleTime` and a 24h `gcTime`

The list is fetched at 10:00.

| The user comes back to the screen at… | What happens |
| --- | --- |
| 10:00:30 | Shows the cache. No request. |
| 10:05 | Shows the cache right away and fetches the new version in the background. |
| Next day, after 24h with nobody using it | The cache was deleted. Loading and a fetch from scratch. |

## When to use

- In reading apps (news, feeds, catalogs), where showing the last list right away beats a loading state on launch.
- When users tend to open the app several times a day.

## When NOT to use

- For sensitive data (tokens, personal or financial data): AsyncStorage isn't encrypted. Use `expo-secure-store` for secrets and don't persist those queries.
- When showing old data, even for a moment, causes problems (balance, real-time stock).

## Step by step

### 1. Install

```bash
npx expo install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @react-native-async-storage/async-storage
```

`npx expo install` picks the AsyncStorage version compatible with the SDK. AsyncStorage has native code: it's already included in Expo Go, and in a development build you need a new build after installing it.

### 2. Configure the client and the persister

```ts title="src/shared/api/query-client.ts"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE = 60 * 1000;
export const ONE_DAY = 24 * 60 * ONE_MINUTE;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE,
      gcTime: ONE_DAY,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage });
```

- In `defaultOptions.queries`, the times apply to **every** query in the app. A specific query can still pass its own values.
- The persister saves the cache as JSON in AsyncStorage. It waits 1 second between saves (`throttleTime`), so it doesn't write on every change.

### 3. Swap the provider

```tsx title="src/app/_layout.tsx"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";

import { ONE_DAY, queryClient, queryPersister } from "@/shared/api/query-client";

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: ONE_DAY }}>
      <Stack />
    </PersistQueryClientProvider>
  );
}
```

`PersistQueryClientProvider` replaces `QueryClientProvider`. It restores the cache when the app opens and saves whenever the cache changes.

**`maxAge`** is the maximum age of a saved cache: when the app opens, a saved cache older than that is discarded. The default is already 24h, but passing it explicitly with the same constant as `gcTime` makes it clear the two go together.

### Why `gcTime` must be ≥ `maxAge`

Persistence saves **what's in memory**. If `gcTime` were 5 minutes, the query would leave memory 5 minutes after becoming inactive, and there'd be nothing left to save. The 24h `maxAge` would be pointless. The docs recommend a `gcTime` **equal to or greater than** `maxAge`.

## Full example

With the two files above, no query needs to change. To test it:

1. Open the app and wait for a list to load.
2. Fully close the app and open it again.
3. The list shows up right away, with no loading. If more than 1 minute has passed, it's also updated in the background.

## Variations / advanced examples

### Discard the cache when the data shape changes

If a new app version changes a model's shape (a renamed field, for example), the cache saved by the old version comes back in the old shape. `buster` solves this: a cache saved with a different `buster` is discarded.

```tsx title="src/app/_layout.tsx"
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister: queryPersister, maxAge: ONE_DAY, buster: "v2" }}
>
```

Change the value whenever you change the shape of something that lives in the cache.

## Common pitfalls

- **`Date` in the cache**: the persister uses `JSON.stringify`, and JSON has no `Date`. A `Date` in the model becomes a string when saved and comes back as a string when restored, even though the type says `Date`. The error only shows up when the data comes from the cache. Store dates as ISO strings in the model and convert only when displaying.
- **`gcTime` lower than `maxAge`**: the cache is deleted from memory before it's useful, and persistence barely works.
- **Thinking `staleTime` fetches by itself when it runs out**: it only marks the data as stale. The fetch comes on the next trigger (screen mount, returning to the app, pull to refresh).
- **Tabs and `gcTime`**: in a tab navigator, a screen stays mounted after it's visited, so its queries are in use the whole time and `gcTime` doesn't count while the app is open. Persistence makes the difference when the app is reopened.
- **Changing the data shape without changing `buster`**: users who update the app get the cache in the old shape.
- **Persisting sensitive data**: AsyncStorage stores plain text.

## What changed between versions

- **React Query v5**: `cacheTime` was renamed to **`gcTime`**. The behavior is the same: the time only counts when the query isn't in use. The old name suggested it controlled "how long the cache is valid", which is what `staleTime` does.
