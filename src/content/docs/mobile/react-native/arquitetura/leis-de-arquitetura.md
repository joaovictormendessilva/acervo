---
title: Leis de arquitetura
description: As regras de organização, camadas, tipos, funções e duplicação que todo app React Native segue, com o porquê de cada uma.
tecnologia: react-native
versao_testada: Expo SDK 58 · TypeScript 6.0 · TanStack Query 5
atualizado_em: 2026-11-22
fontes:
  - https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-annotations-on-variables
  - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator
  - https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
  - https://docs.expo.dev/guides/react-compiler/
sidebar:
  order: 0
---

## O que é

As regras de arquitetura que valem para **todo** app React Native, independente do projeto. Cada regra tem um código (`L2.3`) para ser citada numa revisão de código.

Esta nota é a fonte das regras. As notas detalhadas mostram os exemplos completos:

- [Estrutura de pastas](/mobile/react-native/arquitetura/estrutura-de-pastas/)
- [Convenções de nomes de tipos](/mobile/react-native/arquitetura/convencoes-de-nomes-de-tipos/)
- [Camadas de acesso à API](/mobile/react-native/rede/camadas-de-acesso-a-api/)

Estilo de código (ordem de imports, formatação) **não** entra aqui: isso é cobrado pelas ferramentas. Veja [Configurando ESLint](/mobile/react-native/configuracao/configurando-eslint/).

## Quando usar

- Ao criar qualquer arquivo novo num app: para decidir onde ele fica, como se chama e o que pode importar.
- Ao revisar código, seu ou gerado por IA.

## Quando NÃO usar

As leis não têm exceção automática. Quando uma regra parecer atrapalhar, a exceção é uma **decisão consciente**: discuta antes, confirme que a regra realmente não serve para aquele caso e registre o motivo no commit. Se a mesma exceção aparecer várias vezes, o problema é a regra, e ela deve mudar aqui.

## Passo a passo

### Lei 1: Organização

- **L1.1 `src/app/` só tem rotas e layouts.** Todo arquivo ali vira uma tela no Expo Router. Componentes, hooks e lógica ficam fora.
- **L1.2 Código de domínio fica em `src/features/<assunto>/`, código sem domínio fica em `src/shared/`.**
- **L1.3 As dependências só descem: `app → features → shared`.** O `shared` nunca importa de `features`. Se descesse e subisse, mudar uma feature poderia quebrar código que deveria ser genérico.
- **L1.4 Uma feature não importa de outra.** Features que se importam viram uma teia, e não dá para mexer numa sem quebrar a outra. Quando duas features precisam conversar:
  - a tela (`src/app/`) junta as duas, porque ela pode importar de qualquer feature;
  - ou o que é comum desce para o `shared`;
  - ou uma delas não é uma feature, e sim parte da outra. Uma entidade que só existe dentro de outra (comentários de um post, itens de um pedido) fica na feature da entidade principal.
- **L1.5 O teste do shared é "esse código sabe o que é uma entidade do domínio?".** Se sabe, ele é da feature. Um shared **pode** depender da infraestrutura do app (tema, fontes, constantes, client HTTP). Ser shared não exige funcionar em outro app sem levar nada.
- **L1.6 Subpasta só existe quando agrupa 2 ou mais arquivos.** Uma pasta com um arquivo só cria um nível a mais de navegação.
- **L1.7 Arquivos em kebab-case, com o prefixo da feature:** `<feature>-types.ts`, `<feature>-adapter.ts`, `<feature>-service.ts`, `api/<feature>-api.ts`, `api/<feature>-api-types.ts`. O prefixo segue a feature mesmo quando a API usa outro vocabulário: o arquivo diz a quem ele pertence, e os tipos dentro dele dizem o que a API fala.

### Lei 2: Camadas de dados

O fluxo é `tela → hook → service → api → client`, sempre nesse sentido.

| Camada | Responsabilidade | Nunca faz |
| --- | --- | --- |
| **client** (`shared/api/`) | instância HTTP: baseURL, timeout, interceptors | conhecer um endpoint |
| **api** | endpoint, params e resposta crua | importar o adapter ou o modelo |
| **adapter** | converter a resposta no modelo | chamar a API |
| **service** | traduzir os params do app para os da API, chamar a api, converter com o adapter e decidir regras do app (tamanho da página, por exemplo) | ser chamado pela api ou pela tela |
| **hook** | a query: chave, cache, paginação | chamar a api direto ou mexer no resultado da query |

- **L2.1 Nenhuma camada pula outra.** A tela não chama o service, e o hook não chama a api. Pular uma camada leva o vocabulário da API até a tela.
- **L2.2 A api devolve o formato cru.** Quem converte é o service, com o adapter.
- **L2.3 O hook devolve a query sem mexer.** Transformação de dado vai no `select`. Espalhar a query (`{ ...query, items }`) desliga a otimização de renderização do React Query.
- **L2.4 A `queryKey` é hierárquica: `[feature, tipo, params]`**, com os params inteiros dentro. Tudo da feature começa com o mesmo prefixo, inclusive as entidades filhas (`["products", "list", params]`, `["products", "detail", params]`, `["products", "reviews", params]`), para que `invalidateQueries({ queryKey: ["products"] })` atualize tudo de uma vez.

### Lei 3: Tipos

- **L3.1 Sufixo por papel:**

  | Papel | Convenção |
  | --- | --- |
  | Modelo do domínio, completo | nome puro (`Product`) |
  | Versão resumida | `Summary` |
  | Resposta crua da API | `Response` |
  | Enviado à API | `Request` |
  | Entrada de função do app | `Params` |
  | Saída de função | `Result` |
  | Props de componente | `Props` |

- **L3.2 Sempre `type`, sem prefixo `I` ou `T`.** Uma regra só, que cobre também as uniões.
- **L3.3 O tipo da resposta da API é fiel a ela:** todos os campos, com os nomes originais. Ele documenta a API dentro do código. Quem enxuga é o adapter.
- **L3.4 O modelo fala a língua do app:** camelCase e datas como string ISO, para o tipo continuar certo depois de passar por um cache salvo em JSON.
- **L3.5 O resumo tem os campos que todas as respostas trazem.** O completo estende o resumo, e um campo que só o detalhe tem fica só no completo.
- **L3.6 A mesma forma em camadas diferentes não é duplicação.** `GetProductsRequest` (API) e `GetProductsParams` (app) continuam separados mesmo quando são iguais, porque mudam por motivos diferentes: um quando o servidor muda, o outro quando o app muda.
- **L3.7 A mesma forma na mesma camada, representando o mesmo conceito, é duplicação.** Vira um tipo só, com o nome do conceito, e não um tipo por função. Se `getProduct` e `getReviews` recebem "qual produto", os dois usam `ProductParams`. Na API, os dois endpoints usam `ProductRequest`.
- **L3.8 Componente nunca redeclara um tipo do modelo.** Ele importa da própria feature. Uma cópia local não desacopla nada: só cria uma segunda versão que precisa ser mantida igual na mão.
- **L3.9 Tipar as fronteiras e deixar o TypeScript inferir o miolo.** Se cada função tem entrada e saída tipadas, o código dentro dela herda a checagem.

  | Onde | Anotar? |
  | --- | --- |
  | Parâmetros de função | sempre |
  | Retorno do adapter | sempre: é o contrato do modelo, e um campo faltando ou sobrando dá erro ali |
  | Retorno de função exportada (service, api) | quando o tipo não for óbvio |
  | Resposta HTTP (`get<ProductResponse[]>`) | sempre: o TypeScript não sabe o que o servidor devolve |
  | Constantes de configuração | `as const satisfies Tipo`: checa contra o tipo sem perder o valor literal |
  | Variável local com valor literal | nunca: além de ruído, alarga o tipo (`const s: string = "new"` deixa de ser aceito onde se espera `"new" \| "old"`) |
  | Variável local que recebe o retorno de uma função | não: a função já tem o retorno tipado |

- **L3.10 Singular e plural refletem o que o nome guarda.** Um item de lista tem nome no singular (`ChildResponse`, não `ChildrenResponse`), uma lista no plural, e o parâmetro de um `.map` é o singular da lista, sem repetir o nome dela.

### Lei 4: Funções

- **L4.1 Params sempre num objeto com tipo nomeado.** Um parâmetro novo muda só os tipos, e não a assinatura em todas as camadas.
- **L4.2 Componentes são declarados com `function` e exportados com nome.** Todo o resto (api, adapter, service, hooks, helpers) usa `const` com arrow function. O `export default` só existe nas rotas, porque o Expo Router exige.
- **L4.3 As funções de uma camada são agrupadas num objeto exportado no fim do arquivo** (`productApi`, `productAdapter`, `productService`). Quem usa lê `productService.getProducts`, e o nome já diz a camada.
- **L4.4 Adapter tem uma função `to<Modelo>` por modelo.** O completo reaproveita o resumo com spread, para um campo comum ser mapeado num lugar só. Estruturas aninhadas (respostas com filhos) chamam a própria função de forma recursiva.
- **L4.5 Cada lógica tem o seu lugar:**
  - formatar para exibir (data relativa, moeda) fica na tela ou no componente;
  - um dado derivado do modelo (tempo de leitura, total do pedido) pode ficar inline enquanto tiver um uso só, e vai para o adapter quando aparecer o segundo.

### Lei 5: Componentes

- **L5.1 Componente da feature recebe o modelo; componente do shared recebe props soltas.**
  - Na feature, o componente pode conhecer o tipo. Receber `product: ProductSummary` é menos código, e um campo novo no visual muda só o componente.
  - No shared, o componente não pode conhecer o modelo (L1.3), então recebe valores simples (`title`, `subtitle`).

  Não é gosto pessoal: o lugar do componente decide.

### Lei 6: Duplicação

- **L6.1 O teste é "se um mudar, o outro muda junto?".** Se sim, é a mesma coisa e fica num lugar só. Se não, a semelhança é coincidência e os dois ficam separados (como em L3.6). Vale para tipos, componentes e valores.
- **L6.2 Abstração só aparece com o segundo uso.** Um helper ou componente extraído para um uso só é antecipação.
- **L6.3 Um valor usado por mais de um consumidor é montado uma vez.** Se dois hooks recebem os mesmos params, a tela monta o objeto uma vez e passa para os dois.

### Lei 7: Performance

- **L7.1 React Compiler ligado por padrão.** Ele memoiza componentes e callbacks sozinho, então `memo`, `useCallback` e `useMemo` manuais só entram com um motivo medido. As ressalvas estão em [React Compiler no Expo](/mobile/react-native/performance/react-compiler/).

## Exemplo completo

Uma feature seguindo as leis:

```
src/features/products/
├── api/
│   ├── product-api.ts          → productApi.getProducts(GetProductsRequest)
│   └── product-api-types.ts    → GetProductsRequest, ProductRequest, ProductResponse
├── components/
│   ├── product-card.tsx        → recebe product: ProductSummary
│   └── product-list.tsx
├── hooks/
│   ├── use-product.ts          → ["products", "detail", params]
│   └── use-product-list.ts     → ["products", "list", params]
├── product-adapter.ts          → toProductSummary, toProduct
├── product-service.ts          → traduz Params em Request
└── product-types.ts            → Product, ProductSummary, ProductParams, GetProductsParams
```

O código de cada arquivo está nas notas de [camadas](/mobile/react-native/rede/camadas-de-acesso-a-api/) e de [nomes de tipos](/mobile/react-native/arquitetura/convencoes-de-nomes-de-tipos/).

## Armadilhas comuns

- **Confundir as duas duplicações**: tipos iguais em camadas diferentes ficam separados (L3.6), e tipos iguais na mesma camada viram um só (L3.7). Para decidir, use L6.1.
- **Tipar tudo "para garantir"**: quem pega o erro é o `tsc`, com ou sem anotação. A anotação só muda **onde** o erro aparece, e no miolo ela alarga tipos e repete contratos (L3.9).
- **Criar uma feature para uma entidade que só existe dentro de outra**: ela vai precisar importar da feature principal, e isso quebra L1.4.
- **Usar o critério "funciona em outro app?" para o shared**: quase nada passa, porque todo componente usa o tema. O critério é saber ou não do domínio (L1.5).

## O que mudou entre versões

- **2026-11-22**: primeira versão. Entraram a duplicação dentro da mesma camada (L3.7), a regra de tipar as fronteiras (L3.9), a proibição de import entre features (L1.4), a regra de props por camada (L5.1) e o critério do shared por domínio (L1.5), que substituiu o teste "funciona em outro app?".
