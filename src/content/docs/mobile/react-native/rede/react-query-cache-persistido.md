---
title: Cache do React Query persistido
description: O que são staleTime e gcTime e como salvar o cache do React Query no AsyncStorage para o app abrir com os dados na tela.
tecnologia: "@tanstack/react-query"
versao_testada: Expo SDK 58 · @tanstack/react-query 5.107 · async-storage 2.2
atualizado_em: 2026-11-15
fontes:
  - https://tanstack.com/query/v5/docs/framework/react/guides/caching
  - https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults
  - https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient
  - https://tanstack.com/query/v5/docs/framework/react/plugins/createAsyncStoragePersister
  - https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/
sidebar:
  order: 2
---

## O que é

Por padrão, o cache do React Query vive **só na memória**: quando o app fecha, ele some, e na próxima abertura toda tela começa com loading. A **persistência** salva esse cache no AsyncStorage e o restaura quando o app abre, então a última lista aparece na hora, sem loading, e é atualizada por trás.

Para configurar isso direito, você precisa entender dois tempos: `staleTime` e `gcTime`.

## `staleTime` e `gcTime`

**Nenhum dos dois faz requisição sozinho quando o tempo passa.** O React Query só busca quando acontece alguma coisa: a tela monta, o usuário puxa para atualizar, o app volta para a frente. Os tempos só servem para ele decidir o que fazer nessas horas.

| | O que decide | Padrão |
| --- | --- | --- |
| **`staleTime`** | **Quando buscar de novo**: o dado ainda é confiável? | `0` |
| **`gcTime`** | **Quando esquecer**: quanto tempo guardar um dado que ninguém está usando? | 5 minutos |

### `staleTime`: preciso buscar de novo?

Quando o dado chega da API, ele é **fresco**. Depois do `staleTime`, ele passa a ser **velho**. Quando uma tela que usa esse dado monta:

- **Dado fresco**: mostra o cache e **não faz requisição**.
- **Dado velho**: mostra o cache **na hora** e busca a versão nova por trás. Quando ela chega, a tela atualiza sozinha.

Dado velho não significa tela vazia. Significa "mostra o que tem, mas confere se mudou". Com o padrão `0`, todo dado nasce velho, então toda tela que monta busca de novo.

Se o usuário ficar parado na tela, nada acontece quando o `staleTime` vence. A busca só vem no próximo gatilho: sair e voltar, puxar para atualizar ou reabrir o app.

### `gcTime`: quanto tempo guardar?

O `gcTime` **nunca busca nada**, ele só apaga. E ele só começa a contar quando **nenhum componente** está usando a query (a query fica *inativa*):

- Enquanto alguma tela usa a query, ela nunca é apagada.
- Quando a última tela que usava sai, começa a contagem.
- Se uma tela volta a usar antes do fim, a contagem para. Quando ela sair de novo, recomeça do zero.
- Se o tempo acabar sem ninguém usar, o dado sai do cache, e a próxima tela começa do zero, com loading.

### Exemplo com `staleTime` de 1 min e `gcTime` de 24h

A lista é buscada às 10:00.

| O usuário volta para a tela às… | O que acontece |
| --- | --- |
| 10:00:30 | Mostra o cache. Nenhuma requisição. |
| 10:05 | Mostra o cache na hora e busca a versão nova por trás. |
| Dia seguinte, depois de 24h sem ninguém usar | O cache foi apagado. Loading e busca do zero. |

## Quando usar

- Em apps de leitura (notícias, feeds, catálogos), onde mostrar a última lista na hora é melhor do que um loading ao abrir.
- Quando o usuário costuma abrir o app várias vezes ao dia.

## Quando NÃO usar

- Para dados sensíveis (tokens, dados pessoais, financeiros): o AsyncStorage não é criptografado. Use o `expo-secure-store` para segredos e não persista essas queries.
- Quando mostrar um dado antigo, mesmo por um instante, causa problema (saldo, estoque em tempo real).

## Passo a passo

### 1. Instalar

```bash
npx expo install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @react-native-async-storage/async-storage
```

O `npx expo install` escolhe a versão do AsyncStorage compatível com o SDK. O AsyncStorage tem código nativo: no Expo Go ele já vem incluído, e num development build é preciso gerar um build novo depois de instalar.

### 2. Configurar o client e o persister

```ts title="src/shared/api/query-client.ts"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE = 60 * 1000;
export const ONE_DAY = 24 * 60 * ONE_MINUTE;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE,
      gcTime: ONE_DAY,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage });
```

- Em `defaultOptions.queries`, os tempos valem para **todas** as queries do app. Uma query específica ainda pode passar os seus próprios valores.
- O persister salva o cache como JSON no AsyncStorage. Ele espera 1 segundo entre um salvamento e outro (`throttleTime`), para não gravar a cada mudança.

### 3. Trocar o provider

```tsx title="src/app/_layout.tsx"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";

import { ONE_DAY, queryClient, queryPersister } from "@/shared/api/query-client";

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: ONE_DAY }}>
      <Stack />
    </PersistQueryClientProvider>
  );
}
```

O `PersistQueryClientProvider` substitui o `QueryClientProvider`. Ele restaura o cache quando o app abre e salva sempre que o cache muda.

O **`maxAge`** é a idade máxima de um cache salvo: ao abrir o app, se o cache salvo for mais velho que isso, ele é descartado. O padrão já é 24h, mas passar explícito com a mesma constante do `gcTime` deixa claro que os dois andam juntos.

### Por que o `gcTime` precisa ser ≥ `maxAge`

A persistência salva **o que está na memória**. Se o `gcTime` fosse de 5 minutos, a query sairia da memória 5 minutos depois de ficar inativa, e não sobraria nada para salvar. O `maxAge` de 24h não serviria para nada. A doc recomenda `gcTime` **igual ou maior** que o `maxAge`.

## Exemplo completo

Com os dois arquivos acima, nenhuma query precisa mudar. Para testar:

1. Abra o app e espere uma lista carregar.
2. Feche o app completamente e abra de novo.
3. A lista aparece na hora, sem loading. Se já passou mais de 1 minuto, ela também é atualizada por trás.

## Variações / exemplos avançados

### Descartar o cache quando o formato dos dados mudar

Se uma versão nova do app muda o formato de um modelo (um campo renomeado, por exemplo), o cache salvo pela versão antiga volta com o formato velho. O `buster` resolve: o cache salvo com um `buster` diferente é descartado.

```tsx title="src/app/_layout.tsx"
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister: queryPersister, maxAge: ONE_DAY, buster: "v2" }}
>
```

Troque o valor sempre que mudar o formato de algo que fica no cache.

## Armadilhas comuns

- **`Date` no cache**: o persister usa `JSON.stringify`, e JSON não tem `Date`. Um `Date` no modelo vira string ao ser salvo e volta como string ao ser restaurado, mesmo com o tipo dizendo `Date`. O erro só aparece quando o dado vem do cache. Guarde datas como string ISO no modelo e converta só na hora de exibir.
- **`gcTime` menor que o `maxAge`**: o cache é apagado da memória antes de ser útil, e a persistência praticamente não funciona.
- **Achar que o `staleTime` busca sozinho quando vence**: ele só marca o dado como velho. A busca vem no próximo gatilho (montar a tela, voltar para o app, puxar para atualizar).
- **Abas e o `gcTime`**: num navegador de abas, uma tela continua montada depois de visitada, então as queries dela ficam em uso o tempo todo e o `gcTime` não conta enquanto o app está aberto. É na reabertura do app que a persistência faz diferença.
- **Mudar o formato dos dados sem trocar o `buster`**: os usuários que atualizarem o app recebem o cache no formato antigo.
- **Persistir dados sensíveis**: o AsyncStorage guarda texto puro.

## O que mudou entre versões

- **React Query v5**: `cacheTime` foi renomeado para **`gcTime`**. O comportamento é o mesmo: o tempo só conta quando a query não está em uso. O nome antigo dava a entender que ele controlava "quanto tempo o cache vale", e quem faz isso é o `staleTime`.
