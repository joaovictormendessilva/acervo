---
title: Perfis do EAS Build
description: Como configurar o eas.json com os perfis de desenvolvimento, preview e produção, e gerar um APK para instalar no celular sem Android Studio.
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

## O que é

O EAS Build compila o app na nuvem da Expo. Não precisa de Android Studio, Xcode nem Mac. O `eas.json`, na raiz do projeto, ao lado do `package.json`, define **perfis**: cada perfil é uma receita de build com um propósito diferente.

| Perfil | Para que serve | Formato no Android |
| --- | --- | --- |
| `development` | um app seu que substitui o Expo Go, com recarga automática e as bibliotecas nativas do projeto | `.apk` |
| `preview` | o app real, para instalar no celular e testar como o usuário vai ver | `.apk` |
| `production` | a versão enviada para a loja | `.aab` |

## Quando usar

- **preview**: para ver o que o Expo Go não mostra (ícone, splash, nome do app) ou para mandar o app para alguém testar.
- **development**: quando o projeto ganha uma biblioteca com código nativo que o Expo Go não tem.
- **production**: para publicar na Play Store ou na App Store.

## Quando NÃO usar

Para o dia a dia de desenvolvimento, enquanto o Expo Go atende. Um build leva minutos, e o Expo Go recarrega na hora.

## Passo a passo

1. Crie uma conta em expo.dev e faça login:

```bash
npx eas-cli@latest login
```

2. Configure o projeto. O comando cria o `eas.json`, se ainda não existir, e vincula o projeto à sua conta:

```bash
npx eas-cli@latest build:configure
```

3. Ajuste o `eas.json` como no exemplo abaixo.
4. Gere o APK:

```bash
npx eas-cli@latest build -p android --profile preview
```

5. No fim, o terminal mostra um link. Abra no celular, baixe e instale o `.apk`. O link também fica na página do build, em expo.dev, com um botão **Install**.

:::note
Num projeto com `bun.lock`, troque `npx eas-cli@latest` por `bunx eas-cli`.
:::

## Exemplo completo

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

- **`cli.version`**: versão mínima do `eas-cli`. Impede que alguém compile o projeto com uma versão antiga e incompatível.
- **`cli.appVersionSource: "remote"`**: o número do build (o `versionCode` do Android e o `buildNumber` do iOS) fica guardado no servidor do EAS, e não no `app.json`.
- **`developmentClient: true`**: o build inclui o `expo-dev-client`. Instale antes com `npx expo install expo-dev-client`.
- **`distribution: "internal"`**: o build é para instalar direto no aparelho, e não para a loja.
- **`android.buildType: "apk"`**: gera `.apk`, que instala direto no celular. O padrão do Android é `.aab`, que só a Play Store aceita.
- **`autoIncrement: true`**: a cada build de produção, o EAS sobe o número do build sozinho. As lojas recusam um envio com número repetido.
- **`submit.production`**: configuração do `eas submit`, que envia o build para a loja. Vazio, ele pergunta o que precisar na hora.

## Variações / exemplos avançados

### Deixar os padrões explícitos

O perfil `development` já gera `.apk` por causa do `developmentClient`, e o `production` já gera `.aab`. Algumas configurações escrevem isso mesmo assim, para deixar claro o que cada perfil produz:

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

O resultado é o mesmo.

### Instalar no emulador

```bash
npx eas-cli@latest build:run -p android --latest
```

Baixa o último build e instala no emulador aberto.

## Armadilhas comuns

- **Tentar instalar o `.aab`.** O formato da loja não instala direto no celular. Para testar, use um perfil com `buildType: "apk"`.
- **O perfil `development` sem o `expo-dev-client`.** O build depende dele. Instale antes de compilar.
- **Escolher o nome do pacote com pressa.** O `android.package` (ex.: `com.empresa.app`) identifica o app na loja e não muda depois de publicado.
- **Achar que precisa de Android Studio.** O EAS compila na nuvem. O Android Studio, ou pelo menos o SDK do Android e o JDK, só é necessário para compilar no próprio PC (`npx expo run:android`).
- **Esperar um build instantâneo.** O plano grátis tem fila. O build pode levar de alguns minutos até mais tempo, conforme a demanda.

## O que mudou entre versões

Sem mudanças registradas desde a primeira versão desta nota.
