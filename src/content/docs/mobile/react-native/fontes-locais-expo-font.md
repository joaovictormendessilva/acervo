---
title: Fontes locais com expo-font
description: Como carregar fontes .ttf/.otf do projeto com useFonts, segurando a splash screen, e quando usar o config plugin.
tecnologia: expo-font
versao_testada: Expo SDK 58 · expo-font 58
atualizado_em: 2026-11-05
fontes:
  - https://docs.expo.dev/versions/v58.0.0/sdk/font/
  - https://docs.expo.dev/develop/user-interface/fonts/
sidebar:
  order: 4
---

## O que é

O **expo-font** permite usar fontes próprias (arquivos `.ttf` ou `.otf` dentro do projeto) no lugar da fonte padrão do sistema. Há duas formas de fazer isso:

| | `useFonts` (em tempo de execução) | Config plugin (embutida no build) |
| --- | --- | --- |
| Como funciona | Carrega os arquivos quando o app abre | Copia as fontes para o código nativo no build |
| Expo Go | ✅ Funciona | ❌ Exige development build |
| Web | ✅ Funciona | ❌ Só nativo |
| Código de carregamento | Precisa esperar carregar (splash screen) | Nenhum: a fonte já está lá quando o app abre |
| Nome da família | Você escolhe (a chave do objeto) | Android: nome do arquivo · iOS: nome dentro da fonte |

## Quando usar cada uma

- **`useFonts`**: quando o app roda no **Expo Go**, quando também roda na **web** ou quando você quer o mesmo nome de fonte em todas as plataformas sem se preocupar com isso. É a forma usada nesta nota.
- **Config plugin**: é o que a doc recomenda quando o app já usa **development build**. A fonte fica disponível desde a abertura, sem código assíncrono e sem segurar a splash screen.

## Passo a passo (useFonts)

### 1. Colocar os arquivos no projeto

```
src/
└── assets/
    └── fonts/
        └── inter/
            ├── Inter_18pt-Regular.ttf
            └── Inter_18pt-Bold.ttf
```

### 2. Instalar as dependências

```bash
npx expo install expo-font expo-splash-screen
```

O `expo-splash-screen` serve para manter a splash na tela enquanto as fontes carregam. Sem ele, o texto apareceria por um instante com a fonte do sistema.

:::note
O `npx expo install` também adiciona `expo-font` e `expo-splash-screen` em `plugins` no `app.json`. Sem opções, o plugin do `expo-font` não embute nenhuma fonte e não muda nada no fluxo com `useFonts`.
:::

### 3. Centralizar os nomes das fontes

```ts title="src/constants/fonts.ts"
export const fonts = {
  regular: 'Inter-Regular',
  bold: 'Inter-Bold',
} as const;
```

Esses nomes são os que você vai usar no `fontFamily`. Deixá-los num só lugar evita erro de digitação, que faz o React Native cair na fonte padrão sem mostrar nenhum aviso.

### 4. Carregar no layout raiz

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

- `preventAutoHideAsync()` fica **fora** do componente, no nível do módulo, para segurar a splash antes da primeira renderização.
- `useFonts` devolve `[loaded, error]`. A chave de cada item do objeto vira o nome da família.
- A splash some quando as fontes carregam **ou dão erro**. Assim, se der erro, o app abre com a fonte do sistema em vez de travar na splash.
- `return null` enquanto carrega: nada é desenhado antes de as fontes estarem prontas.

### 5. Usar nos estilos

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

## Variação: config plugin (development build)

Quando o app já usa development build, você pode embutir as fontes no build e apagar o código do `useFonts` e da splash:

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

Depois disso, é preciso gerar um **novo development build** (`npx expo run:android` / `npx expo run:ios` ou `eas build --profile development`). Só recarregar o JS não basta.

Cuidado com o nome da família, que muda conforme a plataforma:

- **Android**: é o nome do arquivo sem a extensão.
- **iOS**: é o nome gravado dentro da fonte (você vê pelo Font Book ou em fontdrop.info).

A doc recomenda **renomear o arquivo para o PostScript name da fonte** (ex.: `Inter-Bold.ttf`), assim o nome fica igual nas duas plataformas. Se você precisa de outro nome no Android, use a forma de objeto em `android.fonts`, com `fontFamily` e `fontDefinitions`.

## Armadilhas comuns

- **Errar o nome no `fontFamily`**: o React Native não mostra erro e simplesmente usa a fonte do sistema. Por isso os nomes ficam centralizados em `src/constants/fonts.ts`.
- **Usar uma família só com vários pesos e escolher com `fontWeight`**: funciona, mas varia por plataforma. No iOS, o peso vem do arquivo e o que você declara é ignorado. No Android, abaixo da API 29, só carrega o primeiro peso. Registrar cada peso como uma família separada (`Inter-Regular`, `Inter-Bold`) dá o mesmo resultado em todas as plataformas.
- **Chamar `useFonts` de novo para adicionar pesos**: cada família só carrega uma vez. Declare todos os arquivos na mesma chamada.
- **Configurar o config plugin e testar no Expo Go**: a fonte não aparece. O plugin só vale em development build.
- **Esquecer de rebuildar depois de mudar o plugin**: a fonte só entra no app num build novo.

## O que mudou entre versões

- **SDK 58**: `useFonts` e `loadAsync` aceitam tanto o objeto `{ nome: require(...) }` quanto um array de `FontFamilyDefinition`, para declarar vários pesos e estilos numa família.
