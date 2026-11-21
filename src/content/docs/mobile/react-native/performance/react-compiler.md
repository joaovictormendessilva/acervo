---
title: React Compiler no Expo
description: Como ativar o React Compiler num app Expo para memoizar componentes e callbacks automaticamente, e quais são os riscos.
tecnologia: expo
versao_testada: Expo SDK 58 · React 19
atualizado_em: 2026-11-21
fontes:
  - https://docs.expo.dev/guides/react-compiler/
  - https://react.dev/learn/react-compiler
  - https://react.dev/reference/rules
sidebar:
  order: 1
---

## O que é

O **React Compiler** é um plugin do Babel mantido pelo time do React. Na hora do build, ele analisa cada componente e hook e adiciona memoização sozinho: o equivalente a `memo`, `useCallback` e `useMemo`, só que mais fino, porque consegue memoizar trechos do JSX e valores intermediários dentro do componente.

Na prática, um componente só renderiza de novo quando algo que ele usa mudou de verdade, sem você escrever nenhum hook de memoização.

## Quando usar

- Quando uma tela renderiza de novo sem necessidade e isso pesa, principalmente com listas. Um caso comum: ao trocar de tab no Expo Router, o navegador renderiza de novo **todas** as tabs já montadas, não só a que ficou ativa. Se cada tab tem uma `FlatList` com `renderItem` inline, todas as células montadas renderizam de novo a cada troca.
- Em projetos novos, para não precisar espalhar `memo`/`useCallback` pelo código.
- Quando o código segue as [regras do React](https://react.dev/reference/rules): componentes puros, sem mutar props nem state.

## Quando NÃO usar

- Em código que muta props, state ou objetos compartilhados durante o render.
- Com bibliotecas que dependem de mutação para funcionar (alguns padrões de MobX, por exemplo).
- Com componentes de classe: eles não são otimizados. Migre para função antes.

## Passo a passo

### 1. Ativar no app.json

```json title="app.json" ins={4}
{
  "expo": {
    "experiments": {
      "reactCompiler": true
    }
  }
}
```

A partir do SDK 54, o Expo já configura o Babel sozinho. Não precisa instalar nenhum pacote.

### 2. Reiniciar o Metro limpando o cache

```bash
npx expo start --clear
```

A mudança é na configuração do Babel. Sem limpar o cache, o Metro continua servindo os arquivos já transformados e o compilador não entra em ação.

### 3. Conferir com o lint

```bash
npx expo lint
```

A partir do SDK 55, as regras do compilador já vêm no `eslint-config-expo`. Elas avisam quando um trecho quebra as regras do React e o compilador não consegue otimizá-lo com segurança.

## Exemplo completo

Com o compilador ativo, esta lista não precisa de `memo` nem de `useCallback`. O `renderItem` inline e o `onPress` de cada item ficam estáveis entre renders enquanto `items` e `onPressItem` não mudarem:

```tsx title="src/components/item-list.tsx"
import { FlatList, Pressable, Text } from 'react-native';

type Item = { id: string; title: string };

type ItemListProps = {
  items: Item[];
  onPressItem: (item: Item) => void;
};

export function ItemList({ items, onPressItem }: ItemListProps) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPressItem(item)}>
          <Text>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}
```

```tsx title="src/app/home.tsx"
import { useRouter } from 'expo-router';

import { ItemList } from '@/components/item-list';

const items = [
  { id: '1', title: 'Primeiro' },
  { id: '2', title: 'Segundo' },
];

export default function Home() {
  const router = useRouter();

  return <ItemList items={items} onPressItem={(item) => router.push(`/details/${item.id}`)} />;
}
```

Sem o compilador, chegar no mesmo resultado exigiria `memo` no item, `useCallback` no `renderItem` e no `onPressItem`, e passar o item em vez de uma closure nova a cada render.

## Variações / exemplos avançados

### Desligar o compilador num componente

Se um componente se comportar diferente com o compilador, use a diretiva `"use no memo"` no começo da função (ou do arquivo) enquanto investiga:

```tsx title="src/components/legacy-chart.tsx"
import { View } from 'react-native';

export function LegacyChart() {
  'use no memo';

  return <View />;
}
```

### Adoção gradual

Para compilar só uma parte do projeto, use o filtro `sources` na configuração do Babel (`babel.config.js`), como mostra a [doc do Expo](https://docs.expo.dev/guides/react-compiler/). Depois de mudar, reinicie com `npx expo start --clear`.

## Armadilhas comuns

- **Esquecer o `--clear`**: o compilador parece não fazer efeito porque o Metro está servindo o cache antigo.
- **Mutar valores durante o render**: com memoização automática, um objeto mutado pode não disparar uma nova renderização e a tela fica com valor velho. Crie objetos novos em vez de mutar.
- **Ler `ref.current` durante o render**: o valor não é rastreado e pode ficar memoizado. Leia refs em effects ou handlers.
- **Depuração menos visível**: a memoização não aparece no código. O React DevTools marca os componentes compilados, o que ajuda a entender o que foi otimizado.
- **Achar que `node_modules` é compilado**: o compilador só roda no código do app.
- **Manter `memo`/`useCallback` antigos sem necessidade**: eles continuam funcionando, mas viram código redundante. Dá para remover aos poucos.

## O que mudou entre versões

- **SDK 52 e anteriores**: era preciso instalar `babel-plugin-react-compiler@beta` e `react-compiler-runtime@beta`.
- **SDK 53**: só `babel-plugin-react-compiler@beta`.
- **SDK 54**: o Babel passou a ser configurado automaticamente; basta o `experiments.reactCompiler` no `app.json`. O lint ainda exigia instalar `eslint-plugin-react-compiler`.
- **SDK 55**: as regras de lint do compilador passaram a vir no `eslint-config-expo`, e o `eslint-plugin-react-compiler` pode ser removido.
