---
title: Tempo relativo com date-fns
description: Como mostrar datas como "há 5 minutos" com formatDistanceToNow, em português e com sufixo.
tecnologia: date-fns
versao_testada: date-fns 4.4.0
atualizado_em: 2026-11-14
fontes:
  - https://date-fns.org/docs/formatDistanceToNow
  - https://date-fns.org/docs/formatDistanceStrict
  - https://date-fns.org/docs/I18n
  - https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md
sidebar:
  order: 1
---

## O que é

O **date-fns** é uma biblioteca de funções puras para trabalhar com datas em JavaScript. Ela usa o `Date` nativo, sem criar um objeto próprio. Cada função é importada separadamente, então só entra no bundle o que você usa.

O `formatDistanceToNow` calcula a distância entre uma data e o momento atual e devolve o resultado por extenso:

| Distância até agora | Sem sufixo | Com `addSuffix: true` |
| --- | --- | --- |
| 0 a 30 segundos | `menos de um minuto` | `há menos de um minuto` |
| 5 minutos atrás | `5 minutos` | `há 5 minutos` |
| 3 horas atrás | `cerca de 3 horas` | `há cerca de 3 horas` |
| 2 dias atrás | `2 dias` | `há 2 dias` |
| daqui a 3 dias | `3 dias` | `em 3 dias` |

Esses textos saem do locale `ptBR`. Sem locale, a saída fica em inglês (`5 minutes ago`).

## Quando usar

- Em listas de posts, comentários, notificações ou mensagens, onde "há 2 horas" é mais útil do que "14/11/2026 10:32".
- Quando um texto aproximado basta. A função arredonda de propósito ("cerca de 3 horas").

## Quando NÃO usar

- Quando a data exata importa (comprovantes, agendamentos). Nesses casos, use `format` com um padrão fixo.
- Quando o texto não pode ter "cerca de" ou "menos de". Para isso existe o `formatDistanceStrict`, que devolve valores exatos numa unidade só (`há 3 horas`).

## Passo a passo

### 1. Instalar

```bash
npx expo install date-fns
```

O date-fns é JavaScript puro, sem código nativo. Funciona no Expo Go e não precisa de development build. O `npx expo install` é o comando padrão do Expo para adicionar dependências, mesmo em libs que não são do Expo.

### 2. Importar a função e o locale

```ts
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
```

O locale vem de `date-fns/locale`, não de `date-fns`. O nome é `ptBR`, em camelCase. Existe também o `pt` (português de Portugal), que usa outras palavras.

### 3. Chamar com as opções

```ts
formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
```

- `locale`: idioma do texto.
- `addSuffix`: acrescenta "há" para datas no passado e "em" para datas no futuro. Sem ele, a saída é só a distância (`5 minutos`), sem dizer se é antes ou depois.
- `includeSeconds`: detalha distâncias menores que um minuto (`há menos de 20 segundos`, `há meio minuto`).

## Exemplo completo

Um componente que recebe a data e mostra o tempo relativo:

```tsx title="src/components/relative-time.tsx"
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Text } from 'react-native';

type RelativeTimeProps = {
  date: Date;
};

export function RelativeTime({ date }: RelativeTimeProps) {
  return <Text>{formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}</Text>;
}
```

```tsx title="src/app/index.tsx"
import { View } from 'react-native';

import { RelativeTime } from '@/components/relative-time';

export default function Index() {
  return (
    <View>
      <RelativeTime date={new Date('2026-01-01T12:00:00Z')} />
    </View>
  );
}
```

## Variações / exemplos avançados

### Centralizar o locale num helper

Para não repetir `{ locale: ptBR, addSuffix: true }` em toda chamada, crie uma função própria:

```ts title="src/utils/date.ts"
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function timeAgo(date: Date | string | number) {
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
}
```

Desde a v4, as funções aceitam `Date`, número (timestamp) ou string. Mesmo assim, uma string ISO de API (`"2026-01-01T12:00:00.000Z"`) é mais segura com `parseISO`, que lê o formato de forma previsível.

### Valor exato com formatDistanceStrict

```ts
import { formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

formatDistanceStrict(date, new Date(), { locale: ptBR, addSuffix: true });
```

Ele recebe duas datas (não compara com o "agora" sozinho) e aceita `unit` (`'second'`, `'minute'`, `'hour'`, `'day'`, `'month'`, `'year'`) para fixar a unidade.

## Armadilhas comuns

- **Importar `ptBR` de `date-fns`**: o locale fica em `date-fns/locale`.
- **Usar `pt` achando que é pt-BR**: são locales diferentes. Para o Brasil, use `ptBR`.
- **Esquecer o `addSuffix`**: aparece só `5 minutos`, sem "há", e o usuário não sabe se é passado ou futuro.
- **Achar que o texto se atualiza sozinho**: o valor é calculado na renderização. Se a tela ficar aberta, "há 1 minuto" não muda até o componente renderizar de novo (com um `setInterval`, ao voltar para a tela ou ao recarregar a lista).
- **Data inválida**: se a string não puder ser convertida, a função lança `RangeError: Invalid time value`. Valide com `isValid` quando o dado vier de fora.

## O que mudou entre versões

- **v4.0**: suporte a fusos horários com `@date-fns/tz` e a opção `in`. As funções passaram a aceitar tipos diferentes de data nos argumentos (`Date`, número, string). As mudanças que quebram compatibilidade são só de tipos internos, e o uso do `formatDistanceToNow` continua igual à v3.
- **v4.3**: o locale `pt` passou a ter domingo como primeiro dia da semana.
- **v4.4**: os scripts de CDN ficaram obsoletos (substituídos pelo pacote `@date-fns/cdn`) e o pacote ficou menor. Não muda nada para quem instala via npm.
