---
title: Expo Router — instalação e primeira rota
description: Migrando um app Expo do App.tsx para o Expo Router com rotas em src/app.
tecnologia: expo-router
versao_testada: Expo SDK 58 · expo-router 58
atualizado_em: 2026-11-26
fontes:
  - https://docs.expo.dev/router/introduction/
  - https://docs.expo.dev/router/installation/
sidebar:
  order: 1
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
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar react-dom
```

O `react-dom` entra mesmo num app só mobile. O `expo-router` traz dependências da web que pedem o `react-dom` como *peer dependency*. Sem ele no projeto, o npm tenta a versão mais nova do `react-dom`, que exige um React mais novo que o do SDK, e o próximo `npm install` quebra com `ERESOLVE`. Instalando pelo `npx expo install`, ele fica na versão do SDK.

Para rodar também na web:

```bash
npx expo install react-native-web
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
    "scheme": "myapp",
    "plugins": ["expo-router", "expo-status-bar"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- `scheme`: o prefixo dos deep links (`myapp://...`).
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
- **Colocar componentes e hooks dentro de `src/app/`**: todo arquivo ali vira rota. Use `src/shared/` ou `src/features/`, como em [Estrutura de pastas](/mobile/react-native/arquitetura/estrutura-de-pastas/).
- **Instalar com `npm install`**: use `npx expo install` para pegar as versões compatíveis com o SDK.
- **`ERESOLVE` envolvendo `react-dom` e `react`** no primeiro `npm install` depois do Expo Router (por exemplo, `react-dom@19.3.1` pedindo `react@^19.3.1` num projeto com `react@19.3.0`): falta o `react-dom` no projeto. Rode `npx expo install react-dom`.

## Próximos passos

- Rotas dinâmicas (`[id].tsx`) e `useLocalSearchParams`
- Navegação com `Link` e `router`
- Tabs e grupos de rotas `(tabs)`

## O que mudou entre versões

- **2026-11-26**: o `react-dom` passou a ser instalado junto no passo 1, mesmo sem web, para evitar o `ERESOLVE` do npm. Os componentes e hooks passaram a apontar para `src/shared/` e `src/features/`.
