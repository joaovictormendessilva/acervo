---
title: Markdown with react-native-markdown-display
description: How to render markdown with native components, customize the styles and fix the image rule on React 19.
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

## What it is

**react-native-markdown-display** turns a markdown string into React Native components (`Text`, `View`, `Image`). It uses the `markdown-it` parser, which already understands GFM tables and strikethrough.

It's pure JavaScript, with no native code. It works in Expo Go and doesn't need a development build.

## When to use

- To display content that comes as markdown from an API: posts, comments, descriptions, changelogs.
- When the look has to follow the app theme, since each element accepts its own style.

## When NOT to use

- When the content has a lot of embedded HTML or needs full syntax highlighting. In those cases, an Expo DOM component (`"use dom"`) with a web markdown library covers more cases, at the cost of running in a webview.
- When you depend on active maintenance: the latest published version is from December 2023. The image rule, for example, needs a fix on React 19 (see below).

## Step by step

### 1. Install

```bash
npx expo install react-native-markdown-display
```

### 2. Render

The markdown goes as `children`, not as a prop:

```tsx
import Markdown from 'react-native-markdown-display';

<Markdown>{content}</Markdown>;
```

### 3. Wrap it in a ScrollView

The component only renders Views, with no scroll of its own. For long content, put it inside a `ScrollView`, otherwise the text is cut off at the bottom of the screen.

### 4. Customize the styles

The `style` prop takes an object with one key per element (`body`, `heading1` to `heading6`, `strong`, `em`, `link`, `blockquote`, `code_inline`, `code_block`, `fence`, `table`, `tr`, `th`, `td`, `hr`, `paragraph` etc.). Each key is **merged** with the library's default style, so you only write what you want to change.

Text styles on `body` (color, font, size) are inherited by text elements, like in CSS.

### 5. Replace the image rule

The `rules` prop lets you change how each element is rendered. The default image rule needs to be replaced on React 19 (see Common pitfalls).

## Full example

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

const content = '# Title\n\nA paragraph with **bold** text and a [link](https://example.com).';

export default function Article() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <MarkdownView content={content} />
    </ScrollView>
  );
}
```

`MarkdownImage` starts with a 16:9 aspect ratio to reserve space and, on `onLoad`, switches to the image's real aspect ratio.

## Variations / advanced examples

### Custom fonts

With fonts loaded through `expo-font`, set the family in the style instead of `fontWeight`. On Android, combining a custom font with `fontWeight: 'bold'` often makes the text fall back to the system font:

```tsx
const styles = StyleSheet.create({
  body: { fontFamily: 'MyFont-Regular' },
  heading1: { fontFamily: 'MyFont-Bold' },
  strong: { fontFamily: 'MyFont-Bold', fontWeight: 'normal' },
});
```

The `fontWeight: 'normal'` on `strong` is needed because the library default is `bold`, and styles are merged.

### Replace the styles entirely

With `mergeStyle={false}`, the library ignores its defaults and uses only what you passed in `style`.

## Common pitfalls

- **Passing the markdown as a prop**: the content goes in `children`.
- **Content cut off**: the surrounding `ScrollView` is missing.
- **Error "A props object containing a "key" prop is being spread into JSX"**: it comes from the library's image rule, which builds the props in an object with `key` and does `<FitImage {...imageProps} />`. React 19 no longer accepts `key` through spread. The fix is the custom `image` rule from the example, passing `key` directly in JSX.
- **Warning "ImageBackground is deprecated"**: it comes from `react-native-fit-image`, which the library uses for images. The same custom rule fixes it, because it uses React Native's `Image`.
- **Relative image URLs**: the default rule only accepts `http://`, `https://` and base64 `data:` images (png, gif and jpeg) and prepends `https://` to the others. The custom rule in the example doesn't do that; if your content source has URLs without a protocol, handle them before passing them to `Image`.
- **Links**: by default they open with React Native's `Linking`. To handle them differently (navigating inside the app, for example), use the `onLinkPress` prop, which receives the URL. If it returns `true`, the library opens the URL with `Linking`; if it returns `false`, it doesn't, and you handle it however you want.

## What changed between versions

- **7.0.2 (Dec 2023)**: latest published version. It works with React 19, but the image rule triggers the `key` spread error and the `ImageBackground` warning; use the custom rule.
