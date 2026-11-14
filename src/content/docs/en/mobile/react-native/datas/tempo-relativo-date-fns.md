---
title: Relative time with date-fns
description: How to show dates as "5 minutes ago" with formatDistanceToNow, in Portuguese and with a suffix.
tecnologia: date-fns
versao_testada: date-fns 4.4.0
atualizado_em: 2026-11-14
fontes:
  - https://date-fns.org/docs/formatDistanceToNow
  - https://date-fns.org/docs/formatDistanceStrict
  - https://date-fns.org/docs/I18n
  - https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md
sidebar:
  order: 1
---

## What it is

**date-fns** is a library of pure functions for working with dates in JavaScript. It uses the native `Date` instead of its own object. Each function is imported separately, so only what you use ends up in the bundle.

`formatDistanceToNow` measures the distance between a date and the current moment and returns it in words:

| Distance to now | No suffix | With `addSuffix: true` |
| --- | --- | --- |
| 0 to 30 seconds | `menos de um minuto` | `há menos de um minuto` |
| 5 minutes ago | `5 minutos` | `há 5 minutos` |
| 3 hours ago | `cerca de 3 horas` | `há cerca de 3 horas` |
| 2 days ago | `2 dias` | `há 2 dias` |
| 3 days from now | `3 dias` | `em 3 dias` |

These strings come from the `ptBR` locale. Without a locale, the output is in English (`5 minutes ago`).

## When to use

- In lists of posts, comments, notifications or messages, where "2 hours ago" is more useful than "11/14/2026 10:32".
- When approximate text is enough. The function rounds on purpose ("about 3 hours").

## When NOT to use

- When the exact date matters (receipts, appointments). Use `format` with a fixed pattern instead.
- When the text can't contain "about" or "less than". That's what `formatDistanceStrict` is for: it returns exact values in a single unit (`3 hours ago`).

## Step by step

### 1. Install

```bash
npx expo install date-fns
```

date-fns is plain JavaScript with no native code. It works in Expo Go and doesn't need a development build. `npx expo install` is Expo's default command for adding dependencies, even for libraries that aren't part of Expo.

### 2. Import the function and the locale

```ts
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
```

The locale comes from `date-fns/locale`, not from `date-fns`. It's named `ptBR`, in camelCase. There's also `pt` (European Portuguese), which uses different words.

### 3. Call it with the options

```ts
formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
```

- `locale`: the language of the text.
- `addSuffix`: adds "há" ("ago") for past dates and "em" ("in") for future dates. Without it, the output is just the distance (`5 minutos`), with no hint of before or after.
- `includeSeconds`: gives more detail for distances under a minute (`há menos de 20 segundos`, `há meio minuto`).

## Full example

A component that receives a date and shows the relative time:

```tsx title="src/components/relative-time.tsx"
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Text } from 'react-native';

type RelativeTimeProps = {
  date: Date;
};

export function RelativeTime({ date }: RelativeTimeProps) {
  return <Text>{formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}</Text>;
}
```

```tsx title="src/app/index.tsx"
import { View } from 'react-native';

import { RelativeTime } from '@/components/relative-time';

export default function Index() {
  return (
    <View>
      <RelativeTime date={new Date('2026-01-01T12:00:00Z')} />
    </View>
  );
}
```

## Variations / advanced examples

### Keep the locale in a helper

To avoid repeating `{ locale: ptBR, addSuffix: true }` on every call, write your own function:

```ts title="src/utils/date.ts"
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function timeAgo(date: Date | string | number) {
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
}
```

Since v4, functions accept a `Date`, a number (timestamp) or a string. Even so, an ISO string from an API (`"2026-01-01T12:00:00.000Z"`) is safer with `parseISO`, which reads the format predictably.

### Exact value with formatDistanceStrict

```ts
import { formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

formatDistanceStrict(date, new Date(), { locale: ptBR, addSuffix: true });
```

It takes two dates (it doesn't compare against "now" on its own) and accepts `unit` (`'second'`, `'minute'`, `'hour'`, `'day'`, `'month'`, `'year'`) to lock the unit.

## Common pitfalls

- **Importing `ptBR` from `date-fns`**: the locale lives in `date-fns/locale`.
- **Using `pt` thinking it's pt-BR**: they are different locales. For Brazil, use `ptBR`.
- **Forgetting `addSuffix`**: you get only `5 minutos`, without "há", and the user can't tell past from future.
- **Expecting the text to update by itself**: the value is computed at render time. If the screen stays open, "1 minute ago" won't change until the component renders again (with a `setInterval`, when coming back to the screen, or when the list reloads).
- **Invalid date**: if the string can't be converted, the function throws `RangeError: Invalid time value`. Check it with `isValid` when the data comes from outside.

## What changed between versions

- **v4.0**: time zone support with `@date-fns/tz` and the `in` option. Functions now accept mixed date types in their arguments (`Date`, number, string). The breaking changes only affect internal types, and using `formatDistanceToNow` works the same as in v3.
- **v4.3**: the `pt` locale now has Sunday as the first day of the week.
- **v4.4**: the CDN scripts were deprecated (replaced by the `@date-fns/cdn` package) and the package got smaller. Nothing changes if you install from npm.
