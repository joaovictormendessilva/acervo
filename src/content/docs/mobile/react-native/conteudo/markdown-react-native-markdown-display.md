---
title: Markdown com react-native-markdown-display
description: Como renderizar markdown com componentes nativos, personalizar os estilos e corrigir a regra de imagem no React 19.
tecnologia: react-native-markdown-display
versao_testada: react-native-markdown-display 7.0.2 · Expo SDK 58 · React 19
atualizado_em: 2026-11-21
fontes:
  - https://github.com/iamacup/react-native-markdown-display
  - https://github.com/iamacup/react-native-markdown-display/blob/master/src/lib/styles.js
  - https://github.com/iamacup/react-native-markdown-display/blob/master/src/lib/renderRules.js
  - https://reactnative.dev/docs/image#onload
  - https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
sidebar:
  order: 1
---

## O que é

O **react-native-markdown-display** transforma uma string em markdown em componentes do React Native (`Text`, `View`, `Image`). Ele usa o parser `markdown-it`, que já entende tabelas e texto riscado do GFM.

É JavaScript puro, sem código nativo. Funciona no Expo Go e não precisa de development build.

## Quando usar

- Para exibir conteúdo que chega em markdown de uma API: posts, comentários, descrições, changelogs.
- Quando o visual precisa seguir o tema do app, já que cada elemento aceita estilo próprio.

## Quando NÃO usar

- Quando o conteúdo tem muito HTML embutido ou precisa de syntax highlight completo. Nesses casos, um DOM component do Expo (`"use dom"`) com uma lib web de markdown cobre mais casos, com o custo de rodar numa webview.
- Quando você depende de manutenção ativa: a última versão publicada é de dezembro de 2023. A regra de imagem, por exemplo, precisa de correção no React 19 (veja abaixo).

## Passo a passo

### 1. Instalar

```bash
npx expo install react-native-markdown-display
```

### 2. Renderizar

O markdown vai como `children`, não como prop:

```tsx
import Markdown from 'react-native-markdown-display';

<Markdown>{content}</Markdown>;
```

### 3. Envolver num ScrollView

O componente só renderiza Views, sem scroll próprio. Em conteúdo longo, coloque-o dentro de um `ScrollView`, senão o texto é cortado no fim da tela.

### 4. Personalizar os estilos

A prop `style` recebe um objeto com uma chave por elemento (`body`, `heading1` a `heading6`, `strong`, `em`, `link`, `blockquote`, `code_inline`, `code_block`, `fence`, `table`, `tr`, `th`, `td`, `hr`, `paragraph` etc.). Cada chave é **mesclada** com o estilo padrão da lib, então você só escreve o que quer mudar.

Os estilos de texto do `body` (cor, fonte, tamanho) são herdados pelos elementos de texto, como num CSS.

### 5. Substituir a regra de imagem

A prop `rules` permite trocar como cada elemento é renderizado. A regra de imagem padrão precisa ser substituída no React 19 (veja em Armadilhas comuns).

## Exemplo completo

```tsx title="src/components/markdown-view.tsx"
import { useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import Markdown, { RenderRules } from 'react-native-markdown-display';

type MarkdownViewProps = { content: string };

export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <Markdown style={styles} rules={rules}>
      {content}
    </Markdown>
  );
}

const rules: RenderRules = {
  image: (node) => <MarkdownImage key={node.key} uri={node.attributes.src} alt={node.attributes.alt} />,
};

function MarkdownImage({ uri, alt }: { uri: string; alt?: string }) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  return (
    <Image
      source={{ uri }}
      accessibilityLabel={alt}
      resizeMode="contain"
      style={{ width: '100%', aspectRatio, marginVertical: 8 }}
      onLoad={({ nativeEvent: { source } }) => setAspectRatio(source.width / source.height)}
    />
  );
}

const styles = StyleSheet.create({
  body: { color: '#f5f5f5', fontSize: 16, lineHeight: 24 },
  heading1: { fontSize: 24, fontWeight: 'bold', marginVertical: 12 },
  heading2: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  link: { color: '#3b82f6', textDecorationLine: 'none' },
  blockquote: { backgroundColor: '#1a1a1a', borderColor: '#333333', borderLeftWidth: 4, marginLeft: 0 },
  code_inline: { backgroundColor: '#1a1a1a', borderColor: '#333333', color: '#f5f5f5' },
  fence: { backgroundColor: '#1a1a1a', borderColor: '#333333', color: '#f5f5f5' },
  hr: { backgroundColor: '#333333' },
});
```

```tsx title="src/app/article.tsx"
import { ScrollView } from 'react-native';

import { MarkdownView } from '@/components/markdown-view';

const content = '# Título\n\nUm parágrafo com **negrito** e um [link](https://example.com).';

export default function Article() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <MarkdownView content={content} />
    </ScrollView>
  );
}
```

O `MarkdownImage` começa com proporção 16:9 para reservar espaço e, no `onLoad`, passa a usar a proporção real da imagem.

## Variações / exemplos avançados

### Fontes customizadas

Com fontes carregadas pelo `expo-font`, use a família no estilo em vez de `fontWeight`. No Android, combinar fonte customizada com `fontWeight: 'bold'` costuma fazer o texto cair na fonte do sistema:

```tsx
const styles = StyleSheet.create({
  body: { fontFamily: 'MyFont-Regular' },
  heading1: { fontFamily: 'MyFont-Bold' },
  strong: { fontFamily: 'MyFont-Bold', fontWeight: 'normal' },
});
```

O `fontWeight: 'normal'` no `strong` é necessário porque o padrão da lib é `bold`, e os estilos são mesclados.

### Substituir os estilos por completo

Com `mergeStyle={false}`, a lib ignora os padrões e usa só o que você passou em `style`.

## Armadilhas comuns

- **Passar o markdown como prop**: o conteúdo vai em `children`.
- **Conteúdo cortado**: falta o `ScrollView` em volta.
- **Erro "A props object containing a "key" prop is being spread into JSX"**: vem da regra de imagem da lib, que monta as props num objeto com `key` e faz `<FitImage {...imageProps} />`. O React 19 não aceita mais `key` por spread. A correção é a regra `image` customizada do exemplo, passando o `key` direto no JSX.
- **Aviso "ImageBackground is deprecated"**: vem do `react-native-fit-image`, que a lib usa para imagens. A mesma regra customizada resolve, porque usa o `Image` do React Native.
- **URLs relativas de imagem**: a regra padrão aceita só `http://`, `https://` e imagens `data:` em base64 (png, gif e jpeg) e acrescenta `https://` nas outras. A regra customizada do exemplo não faz isso; se a fonte do conteúdo tiver URLs sem protocolo, trate antes de passar para o `Image`.
- **Links**: por padrão abrem com o `Linking` do React Native. Para tratar de outro jeito (navegar dentro do app, por exemplo), use a prop `onLinkPress`, que recebe a URL. Se ela devolver `true`, a lib abre a URL com o `Linking`; se devolver `false`, não abre, e você trata como quiser.

## O que mudou entre versões

- **7.0.2 (dez/2023)**: última versão publicada. Funciona com React 19, mas a regra de imagem gera o erro de `key` em spread e o aviso de `ImageBackground`; use a regra customizada.
