---
title: Ícones e splash screen
description: Quais arquivos de ícone e splash um app Expo precisa, como configurar no app.json e como gerar todos a partir de um único ícone vetorial.
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

## O que é

Cada plataforma mostra o ícone do app de um jeito diferente, e por isso o Expo aceita várias versões da mesma arte:

- **iOS** (18+): uma versão para cada aparência da tela inicial (clara, escura e tingida).
- **Android**: um ícone adaptável. O fundo e o desenho ficam separados, e cada fabricante recorta o resultado num formato (círculo, quadrado arredondado, gota).
- **Splash screen**: a tela mostrada enquanto o app carrega. É uma imagem centralizada sobre uma cor de fundo.

## Quando usar

Em todo app que vai ser instalado. Quando não há arte pronta, dá para gerar tudo a partir de um ícone vetorial (por exemplo, do [Google Fonts Icons](https://fonts.google.com/icons)) com o script do acervo, descrito no [passo a passo](#passo-a-passo).

## Os arquivos

| Arquivo | Onde aparece | Tamanho | Regras |
| --- | --- | --- | --- |
| `icon.png` | ícone padrão, usado quando não há versão específica | 1024×1024 | quadrado, sem transparência |
| `ios-light.png` | iPhone na aparência clara | 1024×1024 | quadrado, preenche tudo, sem cantos arredondados e sem transparência |
| `ios-dark.png` | iPhone com ícones escuros | 1024×1024 | mesmas regras; desenho sobre fundo escuro |
| `ios-tinted.png` | iPhone com ícones tingidos | 1024×1024 | tons de cinza: o iOS pinta com a cor escolhida pela pessoa |
| `android-icon-foreground.png` | desenho do ícone adaptável | 1024×1024 | fundo transparente, desenho dentro da área segura |
| `android-icon-monochrome.png` | Android 13+ com ícones temáticos | 1024×1024 | desenho branco, fundo transparente |
| `splash-icon.png` | splash screen | 1024×1024 | fundo transparente; a cor vem do `backgroundColor` |
| `favicon.png` | aba do navegador (web) | 48×48 | quadrado |

O ícone adaptável do Android tem 108dp, mas o sistema mostra só os 72dp do centro (2/3) e ainda recorta esse quadrado no formato do fabricante. A parte que sempre aparece é um círculo de 66dp no meio. Por isso o desenho do foreground ocupa menos da metade da imagem.

## Passo a passo

1. Escolha o ícone no [Google Fonts Icons](https://fonts.google.com/icons), baixe o SVG e copie o valor do atributo `d` do `<path>`.
2. Rode o script do acervo, que fica em `tools/app-icons/generate-icons.cjs`. Ele grava os 8 arquivos em `assets/` do projeto e uma prévia com os recortes de cada plataforma na pasta temporária do sistema:

```bash
node <acervo>/tools/app-icons/generate-icons.cjs <projeto> "<path d do svg>" "#3B82F6" "#111827"
```

Os argumentos são o caminho do projeto, o path do SVG, a cor do desenho e a cor de fundo. Um quinto argumento opcional troca o fundo do ícone claro do iOS (padrão `#F0F6FC`). O script centraliza o desenho pela área que ele ocupa, então funciona com qualquer `viewBox` (o `0 0 24 24` do Material Icons ou o `0 -960 960 960` do Material Symbols).

3. Abra a prévia que o script indicar e confira se nada foi cortado.
4. Configure o `app.json` como no exemplo abaixo.
5. Gere um build novo para ver no aparelho (veja as [armadilhas](#armadilhas-comuns)).

:::note
O script usa o `jimp-compact`, uma biblioteca de imagem que o Expo já instala como dependência. Ele procura a biblioteca no `node_modules` do projeto, então não precisa instalar nada.
:::

## Exemplo completo

```json title="app.json"
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "description": "Uma frase sobre o app.",
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

- `ios.icon` substitui o `icon` no iOS. Se só o `light` existir, ele é usado em todas as aparências.
- `android.adaptiveIcon.backgroundColor` é o fundo do ícone adaptável. Para um fundo com imagem, use `backgroundImage` com o mesmo tamanho do foreground.
- `imageWidth` é a largura do desenho da splash na tela, em pontos (padrão 100).

## Variações / exemplos avançados

### Splash diferente no tema claro e no escuro

O plugin aceita uma chave `dark`, usada quando o **sistema** do celular está no tema escuro:

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

Só faz sentido se o app também troca de tema com o sistema (`userInterfaceStyle: "automatic"`).

### Icon Composer (iOS)

Em vez das três versões, `ios.icon` aceita um arquivo `.icon` criado no Icon Composer da Apple. Ele já trata as aparências clara, escura e tingida. Precisa de um Mac para criar o arquivo.

## Armadilhas comuns

- **Splash clara num app sempre escuro.** A variante `dark` da splash segue o tema do sistema, não o do app. Num app com `userInterfaceStyle: "dark"`, uma splash de fundo branco aparece para quem usa o celular no tema claro e vira um flash branco antes do app abrir. Use uma splash só, com o fundo do app.
- **Nada disso aparece no Expo Go.** O Expo Go é um app já instalado, com ícone e splash próprios. Ícone e splash vão para o código nativo e só aparecem num build do seu projeto: `eas build --profile preview` (na nuvem) ou `npx expo run:android|ios` (local, precisa do SDK nativo).
- **Reload não atualiza o ícone.** Mudou um arquivo ou o `app.json`? Precisa de um build novo.
- **Transparência no ícone do iOS.** O ícone do iOS deve preencher o quadrado inteiro. Use o fundo transparente só no foreground e no monocromático do Android e na splash.
- **Desenho cortado no Android.** Um foreground que ocupa a imagem inteira perde as bordas no recorte. Mantenha o desenho dentro do círculo central de 2/3 da área visível.
- **SVG com arcos.** O script entende retas e curvas (`M L H V C S Q T Z`), mas não arcos (`A`). Os ícones do Google Fonts não usam arcos.

## O que mudou entre versões

- **SDK 54:** `ios.icon` passou a aceitar o arquivo `.icon` do Icon Composer.
