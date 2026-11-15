---
title: Convenções de nomes de tipos
description: Como nomear tipos no TypeScript (modelo do domínio, resposta da API, props, parâmetros) e por que usar type em tudo.
tecnologia: typescript
versao_testada: TypeScript 6.0
atualizado_em: 2026-11-14
fontes:
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces
sidebar:
  order: 2
---

## O que é

O padrão que uso para nomear tipos. A regra principal: **o modelo do domínio fica com o nome puro, e tudo que é uma variação dele ganha um sufixo que diz o papel.**

| Papel | Convenção | Exemplo |
| --- | --- | --- |
| Modelo do domínio | nome puro | `Product` |
| Resposta crua da API | sufixo `Response` | `ProductResponse` |
| Props de componente | sufixo `Props` | `ProductCardProps` |
| Entrada de função | sufixo `Params` | `GetProductsParams` |
| Saída de função | sufixo `Result` | `GetProductsResult` |
| União de valores possíveis | nome do conceito | `ProductCategory` |

E tudo é declarado com `type`, nunca com `interface`.

## Quando usar

- Em qualquer projeto TypeScript, desde o começo.
- Quando o mesmo conceito aparece em vários formatos (o que vem da API, o que o app usa, o que o componente recebe) e você precisa saber, só pelo nome, qual formato está na sua frente.

## Por que o modelo não tem sufixo

O modelo do domínio é **o conceito em si**: `Product` é o produto, com os nomes e os tipos que o seu app usa. Em DDD (Domain-Driven Design), isso se chama *linguagem ubíqua*, porque o tipo usa a mesma palavra que você usaria falando do app ("o produto tem nome e preço").

As outras formas são derivadas dele, e o sufixo responde "derivado de quê?":

- `ProductResponse` é o formato que **outra pessoa** definiu (a API).
- `ProductCardProps` é o que **um componente** recebe.

O contexto também vem do caminho do import, que diz de onde o tipo é:

```ts
import { Product } from "@/features/products/product-types";
```

## Passo a passo

### 1. O modelo do domínio, com o nome puro

```ts title="src/features/products/product-types.ts"
export type ProductCategory = "clothing" | "electronics" | "books";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  createdAt: Date;
};
```

Ele usa camelCase e tipos de verdade (`Date`, não string), porque é o formato com que o app trabalha.

### 2. A resposta da API, fiel ao que chega

```ts title="src/features/products/api/product-api-types.ts"
export type ProductResponse = {
  id: string;
  name: string;
  price_in_cents: number;
  category: string;
  stock: number;
  created_at: string;
  updated_at: string;
};
```

Esse tipo tem **todos os campos** que a API devolve, mesmo os que o app não usa, com os nomes originais (snake_case) e os tipos originais (datas como string). Assim ele funciona como documentação da API dentro do código: para saber o que vem do servidor, você olha o tipo, sem precisar chamar a API.

### 3. A conversão entre os dois

```ts title="src/features/products/product-adapter.ts"
import { ProductResponse } from "./api/product-api-types";
import { Product, ProductCategory } from "./product-types";

function toProduct(response: ProductResponse): Product {
  return {
    id: response.id,
    name: response.name,
    price: response.price_in_cents / 100,
    category: response.category as ProductCategory,
    createdAt: new Date(response.created_at),
  };
}

export const productAdapter = {
  toProduct,
};
```

É aqui que os campos não usados ficam para trás. Quem enxuga é o adapter, não o tipo da resposta.

## Exemplo completo

`Params` e `Result` numa função, e `Props` num componente:

```ts title="src/features/products/product-service.ts"
import { productApi } from "./api/product-api";
import { productAdapter } from "./product-adapter";
import { Product, ProductCategory } from "./product-types";

type GetProductsParams = {
  category: ProductCategory;
  page: number;
};

type GetProductsResult = {
  products: Product[];
  hasNextPage: boolean;
};

async function getProducts({ category, page }: GetProductsParams): Promise<GetProductsResult> {
  const { items, hasNextPage } = await productApi.getProducts({ category, page });

  return {
    products: items.map(productAdapter.toProduct),
    hasNextPage,
  };
}

export const productService = {
  getProducts,
};
```

```tsx title="src/features/products/components/product-card.tsx"
import { Text, View } from "react-native";

import { Product } from "../product-types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <View>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </View>
  );
}
```

:::tip
Se o TypeScript consegue inferir o retorno, você não precisa declarar o `Result`. Declare quando quiser que o tipo de saída fique explícito e documentado, por exemplo numa função que outras partes do app usam.
:::

## `type` ou `interface`?

A doc oficial do TypeScript trata como **preferência pessoal**. No handbook, a seção *Differences Between Type Aliases and Interfaces* termina assim:

> *"For the most part, you can choose based on personal preference, and TypeScript will tell you if it needs something to be the other kind of declaration. If you would like a heuristic, use `interface` until you need to use features from `type`."*

Ou seja: na maioria dos casos, escolha por preferência. Se quiser uma regra, use `interface` até precisar de algo que só `type` faz.

As diferenças reais são poucas:

- Só `type` declara uniões (`"clothing" | "books"`), apelidos de tipos primitivos e tipos derivados (mapped e conditional types).
- Só `interface` faz **mesclagem de declarações**: declarar a mesma interface duas vezes soma os campos. Com `type`, isso dá erro de `Duplicate identifier`.
- `interface` com `extends` costuma ser mais rápido para o compilador do que `type` com interseção (`&`). Isso só pesa em projetos muito grandes.

Eu uso **`type` em tudo**: é uma regra só, ela cobre as uniões e eu nunca preciso parar para pensar "isso é interface ou type?". As diferenças acima não aparecem num app comum.

### E a regra "interface para contratos, type para o resto"?

É uma opinião comum em vídeos e posts, mas **não é um padrão oficial**, e o critério é subjetivo. Quase tudo é "contrato" de alguma coisa:

- `ProductResponse` é o contrato com a API.
- `ProductCardProps` é o contrato entre o componente e quem o usa.
- `Product` é o contrato do domínio com o resto do app.

Cada pessoa do time traçaria a linha num lugar diferente, e a discussão iria parar no code review. Se você quer dividir, use a regra do handbook, que pelo menos é objetiva.

## Armadilhas comuns

- **Prefixo `I` ou `T`** (`IProduct`, `TProduct`): vem do C# e da notação húngara. A comunidade TypeScript não usa, e o editor já mostra que é um tipo.
- **Sufixos que repetem a palavra-chave** (`ProductType`, `ProductInterface`, `ProductModel`): não estão errados, mas são ruído. O `type` na declaração já diz que é um tipo.
- **Tipar parâmetros direto na assinatura** (`getProducts(params: { page: number; category: string })`): funciona, mas quando entrar um parâmetro novo você mexe na assinatura da função. Com um `GetProductsParams`, o contrato fica num lugar só e com nome, e quem chama a função pode reaproveitar o tipo.
- **Usar o tipo da API nos componentes**: o app passa a "pensar" com o vocabulário de outra pessoa. Se a API renomear um campo, todos os componentes quebram, e não só o adapter.
- **Cortar campos do tipo da resposta "porque não usa"**: na hora que precisar de um campo, você vai ter que consultar a API em vez de olhar o código.
- **Misturar `type` e `interface` sem critério**: qualquer uma das duas regras funciona. O que atrapalha é não ter regra.

## O que mudou entre versões

- **TypeScript 4.2**: os nomes de `type` passaram a aparecer nas mensagens de erro. Antes, às vezes o erro mostrava o tipo expandido no lugar do nome, e essa era uma vantagem antiga de `interface`.
