---
title: Expo Router — instalação e primeira rota
description: Migrando um app Expo do App.tsx para o Expo Router com rotas em src/app.
tecnologia: expo-router
versao_testada: Expo SDK 58 · expo-router 58
atualizado_em: 2026-11-04
fontes:
  - https://docs.expo.dev/router/introduction/
  - https://docs.expo.dev/router/installation/
sidebar:
  order: 3
---

## O que é

O **Expo Router** é o sistema de navegação do Expo **baseado em arquivos**: cada arquivo dentro de `src/app/` vira uma tela, e arquivos `_layout.tsx` definem o navegador (Stack, Tabs…). É o mesmo modelo do Next.js App Router, só que para mobile.

## Quando usar

- Em **qualquer app Expo com mais de uma tela**. É a forma recomendada de navegar.
- Quando você quer deep links e rotas tipadas sem configurar nada à mão.
- Quando o app também vai rodar na web: cada rota vira uma URL.

## Passo a passo (partindo do template com `App.tsx`)

### 1. Instalar as dependências

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Para rodar também na web:

```bash
npx expo install react-dom react-native-web
```

### 2. Trocar o ponto de entrada

No `package.json`, o `main` passa a apontar para o Expo Router:

```json title="package.json" del={2} ins={3}
{
  "main": "index.ts",
  "main": "expo-router/entry"
}
```

Depois disso, **apague `App.tsx` e `index.ts`**. Quem decide o que renderizar agora é a pasta `src/app/`.

### 3. Configurar o `app.json`

```json title="app.json"
{
  "expo": {
    "scheme": "readerfortabnews",
    "plugins": ["expo-router", "expo-status-bar"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- `scheme`: o prefixo dos deep links (`readerfortabnews://...`).
- `typedRoutes`: gera tipos para que `<Link href="...">` aponte erro em rota inexistente.

### 4. Alias `@/` no TypeScript (opcional, recomendado)

```json title="tsconfig.json"
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

O `.expo/types` no `include` é onde ficam os tipos gerados pelo `typedRoutes`.

### 5. Criar o layout raiz

```tsx title="src/app/_layout.tsx"
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack />
      <StatusBar style="auto" />
    </>
  );
}
```

O `_layout.tsx` envolve todas as rotas da pasta. `<Stack />` empilha as telas com o header nativo.

### 6. Criar a primeira rota

```tsx title="src/app/index.tsx"
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text>Open up src/app/index.tsx to start working on your app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

`index.tsx` é a rota `/`, a primeira tela do app.

### 7. Rodar

```bash
npx expo start
```

## Estrutura final

```
src/
└── app/
    ├── _layout.tsx   → navegador (Stack)
    └── index.tsx     → rota "/"
```

## Armadilhas comuns

- **Esquecer de trocar o `main`**: o app continua abrindo o `App.tsx` antigo, ou quebra se ele foi apagado.
- **Colocar componentes e hooks dentro de `src/app/`**: todo arquivo ali vira rota. Use `src/components/`, `src/hooks/` etc.
- **Instalar com `npm install`**: use `npx expo install` para pegar as versões compatíveis com o SDK.

## Próximos passos

- Rotas dinâmicas (`[id].tsx`) e `useLocalSearchParams`
- Navegação com `Link` e `router`
- Tabs e grupos de rotas `(tabs)`
