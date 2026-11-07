---
title: Expo Router — custom tabs
description: Barra de abas própria com Tabs, TabSlot, TabList e TabTrigger do expo-router/ui.
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

## O que é

O `expo-router/ui` traz componentes de abas **sem estilo nenhum**. Você monta a barra do jeito que quiser, e o Expo Router continua cuidando da navegação, das URLs e do estado de cada aba.

| Componente | Renderiza | Papel |
| --- | --- | --- |
| `Tabs` | `View` | Envolve tudo e cria o navegador de abas |
| `TabSlot` | a tela atual | Onde a rota ativa aparece |
| `TabList` | `View` | Contém os `TabTrigger` e define quais abas existem |
| `TabTrigger` | `Pressable` | Um botão de aba. Dentro do `TabList`, exige `name` e `href` |

## Quando usar

- Quando o visual da barra precisa fugir do padrão (botão central destacado, barra flutuante, abas no topo, animações).
- Quando você quer o mesmo layout na web e no mobile sem depender da tab bar nativa.

## Quando NÃO usar

- Se a barra padrão serve, use o `Tabs` de `expo-router` (JavaScript tabs) ou o `NativeTabs`. Eles já trazem ícones, badges e safe area.
- O custom tabs é marcado como **experimental** na documentação.

## Passo a passo

### 1. Estrutura de arquivos

```
src/app/
├── _layout.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── index.tsx
    └── settings.tsx
```

O grupo `(tabs)` não entra na URL: `(tabs)/index.tsx` vira `/` e `(tabs)/settings.tsx` vira `/settings`. O nome `(tabs)` é só convenção. Qualquer nome entre parênteses funciona.

### 2. Esconder o header do Stack raiz

O layout raiz continua sendo um `Stack`. Como as abas já têm a barra delas, o header do Stack geralmente sai:

```tsx title="src/app/_layout.tsx"
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 3. Criar o botão da aba

Com `asChild`, o `TabTrigger` não renderiza o próprio `Pressable`. Ele repassa as props (`onPress`, `href` etc.) e o **`isFocused`** para o filho direto. O botão só precisa aceitar essas props e espalhá-las num `Pressable`:

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

:::caution[Tipo do botão no RN 0.88]
A doc usa `TabTriggerSlotProps` como tipo do botão. No React Native 0.88, o `View` virou componente de função, e o `ref` desse tipo deixa de bater com o do `Pressable`, então o `tsc` dá erro. Tipar com `ComponentProps<typeof Pressable>` mais `isFocused` resolve o problema e aceita as mesmas props.
:::

### 4. Montar o layout das abas

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

- A ordem dos `TabTrigger` é a ordem das abas. Um trigger que você não renderiza tira a aba e o estado de navegação dela.
- O `TabSlot` antes do `TabList` deixa a barra embaixo. Invertendo a ordem, a barra fica no topo.
- O `name` identifica a aba. O `href` é a rota que ela abre.

### 5. Criar as telas

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

O `settings.tsx` segue o mesmo formato.

## Qual aba abre primeiro

O Expo Router não tem a ideia de "aba inicial". Ele abre a URL `/` e mostra o arquivo que corresponde a ela. O `Tabs` do `expo-router/ui` também **não aceita `initialRouteName`**: a aba ativa é sempre a que bate com a URL atual. Existem duas formas de escolher a primeira tela:

| | `(tabs)/index.tsx` | `Redirect` em `app/index.tsx` |
| --- | --- | --- |
| URL da tela principal | `/` | a rota da aba (ex.: `/feed`) |
| Arquivos | um a menos | um `index.tsx` só para redirecionar |
| Trocar a tela principal | renomear arquivos | mudar uma linha |

A versão com redirect:

```tsx title="src/app/index.tsx"
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/feed" />;
}
```

Sem nenhum dos dois, `/` não corresponde a nenhuma tela e o app abre na tela de rota não encontrada.

## Variações

### Rotas numa constante tipada

Para não espalhar strings de rota pelo app, centralize as rotas numa constante. O `satisfies Record<string, Href>` confere cada valor contra as rotas que o `typedRoutes` gera. Se um arquivo de rota for renomeado ou apagado, o `tsc` acusa o erro aqui.

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

O `as const` guarda o valor literal (`'/settings'`) em vez de `string`. Isso exige `experiments.typedRoutes: true` no `app.json`.

### Barra totalmente customizada

Com `style={{ display: 'none' }}` no `TabList`, a lista só registra as abas. Fora dela, dentro do `Tabs`, você posiciona `TabTrigger`s **sem `href`**, que fazem a mesma ação do trigger com o mesmo `name`.

## Armadilhas comuns

- **Insets de cima e de baixo**: o `TabList` só aplica os insets laterais. Sem `paddingBottom: insets.bottom`, a barra fica embaixo do indicador de home do iOS. Sem `paddingTop` no `Tabs`, a tela fica sob a status bar.
- **`TabList` precisa ser filho direto de `Tabs`.** O `TabSlot` pode ficar em outro lugar dentro do `Tabs`, mas não dentro do `TabList`.
- **Esquecer o `asChild`**: o `TabTrigger` renderiza o próprio `Pressable` em volta do seu componente, e o `isFocused` não chega até ele.
- **`href` relativo**: ele é resolvido a partir de onde o `Tabs` está. A doc recomenda usar só `href` absoluto.
- **Rota em grupo compartilhado** `(a,b)`: o `href` precisa incluir o grupo para apontar para uma rota só.

## O que mudou entre versões

- **SDK 52 e anteriores (React 18)**: o botão customizado precisava de `forwardRef` para receber o `ref`. A partir do React 19, o `ref` chega como prop comum.
- **React Native 0.88**: o `View` virou componente de função e o `ref` de `TabTriggerSlotProps` passou a dar erro de tipo com o `Pressable`. Por isso o botão é tipado com `ComponentProps<typeof Pressable>`.
