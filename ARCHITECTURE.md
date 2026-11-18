# Arquitetura — Kurio

Marketplace de NFTs do desafio frontend da Jungle Gaming. Este documento descreve como a
solução está organizada, os contratos entre as camadas e as decisões tomadas. Setup, comandos
e credenciais estão no [README](README.md).

- Produção: https://jungle-frontend-challenge-sand.vercel.app (deploy automático da `main`)
- Toda a API e o tempo real são simulados pelo MSW, inclusive no build publicado.

## 1. Visão geral

```
                 ┌──────────────────────────── navegador ─────────────────────────────┐
  UI (React +    │  rotas (TanStack Router) ──► hooks de feature ──► TanStack Query    │
  shadcn/ui,     │                                   │                     │           │
  Tailwind)      │                                   ▼                     ▼           │
                 │                         Axios (lib/api/http)   socket.io-client     │
                 │                                   │                     │           │
                 │              ── fetch / WebSocket interceptados pelo MSW ──         │
                 │                                   ▼                     ▼           │
  servidor       │      handlers REST (src/mocks/handlers)   handler WS + binding      │
  simulado       │                     └──────────► db (localStorage) ◄──┘             │
                 └────────────────────────────────────────────────────────────────────┘
```

A aplicação não sabe que está falando com mocks: componentes, hooks e o cliente Axios não têm
respostas fictícias nem caminhos alternativos. O MSW intercepta na camada de rede (Service
Worker para HTTP, interceptor de WebSocket para o Socket.IO) e mantém um "servidor" com estado
em `src/mocks`.

### Como cada tecnologia da stack participa

| Tecnologia                       | Uso                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| React 19 + TypeScript            | UI; `strict` + `noUncheckedIndexedAccess`                                                                       |
| TanStack Router                  | Rotas por arquivo, `validateSearch` (zod) para estado na URL, guarda `/_auth`, loaders que pré-carregam o cache |
| TanStack Query                   | Todas as leituras e escritas; cache por usuário, invalidação, atualização otimista, polling de segurança        |
| Axios                            | Único cliente HTTP: base URL, token, timeout de 10 s, normalização de erros em `ApiError`                       |
| Socket.IO (`socket.io-client`)   | `nft.updated` e `order.updated`; um socket por sessão                                                           |
| MSW + `@mswjs/socket.io-binding` | Servidor simulado REST + Socket.IO, cenários e controles de teste                                               |
| Tailwind CSS v4 + shadcn/ui      | Tokens do Figma em `styles.css`; componentes Radix adaptados (dialog, sheet, select, slider, tabs, dropdown)    |
| Playwright                       | 55 cenários E2E × 2 viewports, contra o build otimizado ou a URL publicada                                      |
| Lighthouse (LHCI)                | Configurações versionadas para mobile e desktop                                                                 |

## 2. Organização do código

```
src/
  routes/            rotas (arquivo = rota). _auth.tsx protege checkout, pedidos e conta
  features/          domínio, cada um com api.ts (queries/mutations), schemas e componentes
    catalog/         listagem, busca/filtros na URL, facets, cards, carrossel, editorial
    nft-detail/      galeria, edições, quantidade, abas
    favorites/       lista e toggle otimista
    cart/            carrinho no servidor, carrinho de visitante, merge
    checkout/        cotação, conexão de carteira, pedido idempotente, rascunho
    orders/          status do pedido e aplicação de order.updated
    session/         login, cadastro, token, expiração
    profile/ wallets/
  lib/
    api/contracts.ts contratos REST e de eventos (compartilhados com os mocks)
    api/http.ts      Axios + ApiError
    realtime/        criação do socket e ponte eventos → cache
    query-client.ts  política de cache e retries
    money.ts         ETH com decimal.js
    search-params.ts serialização legível da URL
  mocks/             servidor simulado: db, fixtures, handlers, cenários, liquidação
  components/        layout, formulários acessíveis, shadcn/ui
e2e/                 testes Playwright
design/              frames e assets recortados do Figma
```

`src/lib/api/contracts.ts` é importado tanto pela aplicação quanto pelos mocks: uma mudança de
contrato quebra os dois lados na compilação. Os schemas zod de validação (`features/*/schemas.ts`)
também são compartilhados — o formulário valida para dar retorno imediato e o mock valida de novo,
como faria um servidor real.

## 3. Rotas

| Rota                                                         | Tela                                              | Acesso                          |
| ------------------------------------------------------------ | ------------------------------------------------- | ------------------------------- |
| `/`                                                          | Início: destaques, catálogo, filtros, editorial   | público                         |
| `/nfts/$nftId`                                               | Detalhe do NFT                                    | público                         |
| `/cart`                                                      | Carrinho                                          | público (carrinho de visitante) |
| `/login`, `/signup`                                          | Autenticação (modal no desktop, página no mobile) | só anônimos                     |
| `/checkout`                                                  | Pagamento                                         | privado                         |
| `/orders/$orderId`                                           | Status / recibo do pedido                         | privado                         |
| `/account/profile`, `/account/wallets`, `/account/favorites` | Conta                                             | privado                         |

- **Guarda:** `/_auth` revalida a sessão na API a cada navegação privada (`fetchQuery` com
  `staleTime: 0`). Sem sessão → `/login?redirect=<url atual>`; com token expirado →
  `&reason=expired`. O login volta para `redirect` (aceita apenas caminhos internos).
- **Acesso direto e refresh:** `vercel.json` reescreve para o `index.html` qualquer caminho sem
  extensão de arquivo; arquivos inexistentes continuam em 404.
- **Rota inexistente / NFT inexistente / pedido de outro usuário:** página 404 própria.

### Estado na URL

Busca, coleções, rede, faixa de preço, aba, ordenação e página vivem na URL e são validados por
zod (`features/catalog/search.ts`); valores inválidos caem no padrão em vez de quebrar a página.
Listas usam chaves repetidas (`?category=music&category=games`), o mesmo formato enviado à API.
Mudar qualquer filtro remove `page` (volta à página 1). Refresh e voltar/avançar restauram tudo.

## 4. Contratos REST

Base `/api`. Autenticação por `Authorization: Bearer <token>`; o carrinho de visitante é
identificado por `X-Cart-Id`. Tipos completos em `src/lib/api/contracts.ts`.

| Recurso                     | Endpoints                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessão e conta              | `POST /auth/signup` · `POST /auth/login` · `GET /session` · `POST /auth/logout`                                                                                           |
| NFTs                        | `GET /nfts?q&category&network&minPrice&maxPrice&sort&tab&page&pageSize` · `GET /nfts/facets` · `GET /nfts/:id` · `GET /nfts/:id/related`                                  |
| Favoritos                   | `GET /me/favorites` · `PUT /me/favorites/:nftId` · `DELETE /me/favorites/:nftId`                                                                                          |
| Carrinho                    | `GET /cart` · `POST /cart/items` · `PATCH /cart/items/:lineId` · `DELETE /cart/items/:lineId` · `PUT/DELETE /cart/coupon` · `POST /cart/acknowledge` · `POST /cart/merge` |
| Cotação                     | `POST /checkout/quote`                                                                                                                                                    |
| Carteira (conexão simulada) | `POST /wallet-connections` · `DELETE /wallet-connections/:id`                                                                                                             |
| Pedidos                     | `POST /orders` (header `Idempotency-Key`) · `GET /me/orders/:id`                                                                                                          |
| Perfil                      | `GET /me/profile` · `PATCH /me/profile` · `PUT/DELETE /me/avatar` · `POST /me/password`                                                                                   |
| Carteiras                   | `GET /me/wallets` · `PUT /me/wallets/:slot` (`primary` \| `secondary`)                                                                                                    |
| Newsletter                  | `POST /newsletter`                                                                                                                                                        |

### Erros

Todas as falhas seguem `{ error: { code, message, fieldErrors? } }`. O Axios converte qualquer
falha (HTTP, rede, timeout, cancelamento) em `ApiError` com `status`, `code`, `fieldErrors` e o
corpo bruto em `details`.

| Situação                      | Status / código                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Validação de formulário       | 422 `VALIDATION_ERROR` (+ `fieldErrors` por campo)                                                                    |
| Credenciais inválidas         | 401 `INVALID_CREDENTIALS` (mesma mensagem para e-mail ou senha errados)                                               |
| Sem sessão / sessão expirada  | 401 `UNAUTHENTICATED` / 401 `SESSION_EXPIRED`                                                                         |
| Falta de permissão            | 403 `WALLET_REJECTED` (a carteira recusou). Recursos de **outro usuário** respondem 404, para não revelar que existem |
| Recurso inexistente           | 404 `NOT_FOUND`                                                                                                       |
| Conflito de cadastro/endereço | 409 `CONFLICT` (+ `fieldErrors`)                                                                                      |
| Conflito de disponibilidade   | 409 `OUT_OF_STOCK`; no pedido, 409 `PRICE_CHANGED` / `OUT_OF_STOCK` / `QUOTE_EXPIRED` com a **nova cotação** no corpo |
| Idempotência                  | 409 `IDEMPOTENCY_CONFLICT` (mesma chave, conteúdo diferente)                                                          |
| Cupom                         | 422 `COUPON_INVALID` / `COUPON_EXPIRED`                                                                               |
| Falha transitória             | 503 `TRANSIENT`, erro de rede (`NETWORK_ERROR`), `TIMEOUT`                                                            |

## 5. Tempo real (Socket.IO)

### Eventos

Todo evento usa o mesmo envelope:

```ts
{ id: string            // identidade estável — duplicatas são ignoradas
  type: 'nft.updated' | 'order.updated'
  resource: { kind: 'nft' | 'order'; id: string }
  version: number       // versão do recurso após a mudança
  occurredAt: string
  payload: … }
```

| Evento          | Payload                                        | Audiência | Efeito no cliente                                                                                           |
| --------------- | ---------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| `nft.updated`   | `id, price, compareAtPrice, editions, version` | todos     | Atualiza catálogo e detalhe em cache (se a versão for maior) e refaz o fetch dos carrinhos que contêm o NFT |
| `order.updated` | `id, status, version, txHash, failureReason`   | só o dono | Atualiza o pedido em cache (se a versão for maior); confirmado → refaz o carrinho                           |

### Garantias

- **Duplicatas:** cada socket guarda os últimos 500 `id` vistos; o mesmo evento não é aplicado duas vezes.
- **Eventos antigos:** só são aplicados se `version` for maior que a do cache. Um `order.updated`
  "pendente" antigo nunca faz um pedido confirmado voltar atrás.
- **Dinheiro do carrinho não é calculado no cliente:** o evento só invalida o carrinho, e a API
  devolve a nova cotação.
- **Reconexão:** no `connect` seguinte ao primeiro, as queries ativas de catálogo, carrinho e
  pedidos são invalidadas — o que se perdeu durante a queda é reconciliado pelo REST.
- **Isolamento por usuário:** o socket envia o token no handshake (`auth`). O servidor simulado
  lê o pacote CONNECT e só entrega `order.updated` às conexões daquele usuário. No cliente, um
  socket novo (com listeners e memória de duplicatas novos) é criado sempre que o token muda —
  login, logout ou troca de usuário encerram o anterior e liberam os listeners.
- **Fallback:** enquanto um pedido está pendente, a query faz polling a cada 10 s como rede de
  segurança. O caminho principal é o evento (os testes verificam a chegada pelo socket).

### Transporte nos mocks e limitações

- O `socket.io-client` real conecta por **WebSocket** (`transports: ['websocket']`); o MSW
  intercepta o WebSocket e `@mswjs/socket.io-binding` codifica/decodifica Engine.IO/Socket.IO.
  Long-polling não é suportado pelo binding.
- O MSW remove o prefixo `/socket.io/` antes de casar URLs, então o handler usa a **origem**
  do servidor (`ws.link(VITE_SOCKET_URL)`).
- O binding faz o handshake mas **não envia heartbeat**; sem ping o cliente cairia após 30 s.
  O handler envia o ping (`"2"`) a cada 20 s.
- O binding não expõe `auth`, salas nem namespaces: o handler lê o `40{…}` do cliente para
  descobrir o usuário e faz o roteamento por usuário manualmente.
- O `engine.io-client` guarda `globalThis.WebSocket` quando o módulo é avaliado. Por isso o app
  só é importado **depois** de `worker.start()` (`main.tsx`).
- Tudo roda na própria aba: "o servidor" é por navegador. Duas abas compartilham o banco
  (localStorage), mas eventos de uma aba não chegam a sockets de outra.

## 6. Estado remoto e cache

### Chaves

| Chave                                                            | Conteúdo                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `['nfts', 'list', params]`                                       | página do catálogo — um cache por combinação de filtros                     |
| `['nfts', 'facets']`, `['nfts', 'detail', id]`, `[…, 'related']` | facets, detalhe, relacionados                                               |
| `['session']`                                                    | sessão atual (`null` para visitante)                                        |
| `['cart', 'guest', guestId]`                                     | carrinho de visitante                                                       |
| `['me', userId, …]`                                              | tudo que é privado: `cart`, `favorites`, `orders/:id`, `profile`, `wallets` |

Dados privados ficam sob `['me', userId]`: nunca são servidos a outro usuário e são apagados de
uma vez no logout, na expiração e na troca de usuário (`clearPrivateData`).

### Política

| Item                   | Valor                                                                         |
| ---------------------- | ----------------------------------------------------------------------------- |
| `staleTime` padrão     | 30 s (eventos atualizam o cache entre um fetch e outro)                       |
| Facets e relacionados  | 5 min · carrinho 15 s · sessão 60 s                                           |
| Retries de query       | só falhas transitórias (rede, timeout, 5xx), até 2 vezes, backoff 0,5 s → 4 s |
| Retries de mutation    | nunca automáticos (pedido usa idempotência — ver §9)                          |
| `refetchOnWindowFocus` | ligado                                                                        |
| Timeout HTTP           | 10 s                                                                          |

### Respostas fora de ordem e cancelamento

- Cada combinação de filtros tem sua própria chave: uma resposta atrasada só pode escrever no
  próprio cache, nunca no que está na tela. O `AbortSignal` do Query é repassado ao Axios e
  cancela requisições superadas. `placeholderData: keepPreviousData` mantém a página anterior
  (esmaecida) durante a troca. O cenário `slow-network` reproduz isso de forma determinística.
- O carrinho tem `version`: tanto as respostas de mutation (`setCart`) quanto os fetches
  (`structuralSharing`) descartam uma resposta com versão menor que a do cache.

### Invalidação

| Gatilho                    | Efeito                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| Mutation de carrinho       | resposta (cotação completa) substitui o cache                    |
| `nft.updated`              | patch em catálogo/detalhe + invalidação dos carrinhos com o NFT  |
| `order.updated` confirmado | patch no pedido + invalidação do carrinho                        |
| Favoritar                  | otimista; ao fim da última mutation pendente, invalida a lista   |
| Perfil/avatar salvos       | atualizam o perfil e o usuário da sessão (cabeçalho) sem refetch |
| Reconexão do socket        | invalida catálogo, carrinho e pedidos ativos                     |

### Atualização otimista

Favoritos (`features/favorites/api.ts`): o coração muda no clique; em falha, a lista anterior
volta e um toast explica. O botão fica desabilitado até sessão e favoritos carregarem — antes
disso o clique poderia ser interpretado de forma errada. Cenário `favorites-error` para testar.

## 7. Sessão

- **Token:** `POST /auth/login|signup` devolve `{ user, accessToken, expiresAt }`. Só o token
  opaco fica no `localStorage`; o usuário é sempre relido de `GET /session`, então o refresh
  recupera a sessão pela API.
- **Senhas:** o mock guarda apenas `SHA-256(sal + senha)` com sal por usuário; a troca de senha
  gera sal novo. Credenciais de demonstração no README.
- **Expiração (30 min):**
  - _Durante a navegação:_ a guarda revalida a sessão em toda rota privada.
  - _Com a página parada:_ um timer revalida a sessão quando `expiresAt` passa.
  - _Em qualquer chamada:_ o interceptor do Axios detecta `UNAUTHENTICATED`/`SESSION_EXPIRED`
    em uma requisição que levava token, encerra a sessão local, avisa e — se a tela é privada —
    leva ao login com `redirect` e `reason=expired`.
- **Retomada no checkout:** o rascunho do pagamento é salvo em `sessionStorage` por usuário;
  depois do novo login, a pessoa volta ao `/checkout` com os campos preenchidos.
- **Logout e troca de usuário:** token e sessão limpos de forma síncrona (a próxima navegação já
  vê um visitante), queries privadas canceladas e removidas, socket encerrado e recriado.
- **Instância única:** router e QueryClient são criados no escopo do módulo (o `StrictMode`
  chamaria um inicializador de `useState` duas vezes e ligaria a sessão a um router descartado).

## 8. Carrinho

- **No servidor para todos.** O usuário tem um carrinho (`cart_<userId>`); o visitante, um
  carrinho identificado por `X-Cart-Id` (`guest_<uuid>`, guardado no `localStorage`). Um id de
  visitante nunca endereça o carrinho de um usuário. Isso dá um único caminho de código e
  mantém o carrinho após refresh.
- **Login preserva os itens:** `POST /cart/merge` soma as linhas (limitadas pelo estoque) e
  apaga o carrinho de visitante. O merge roda **antes** de a sessão ser publicada no cache — do
  contrário, o primeiro fetch do carrinho do usuário (vazio) podia chegar depois e sobrescrever
  o resultado. Se o merge falhar, o id de visitante é mantido e o merge é refeito no próximo login.
- **Toda resposta traz a cotação:** linhas com preço atual, `maxQuantity` (estoque da edição,
  máx. 10 por linha), `lineTotal`, `priceChange` (preço visto × atual) e `issue`
  (`sold_out` / `insufficient`), além de subtotal, desconto, taxa de rede (0,016 ETH) e total.
  O cliente nunca calcula dinheiro.
- **Alterações em tempo real:** preço alterado aparece na linha e bloqueia "Conectar e finalizar"
  até "Aceitar novos preços" (`POST /cart/acknowledge`); falta de estoque pede ajuste da
  quantidade ou remoção.
- **Cupons:** `KURIO10` (10%), `LANCAMENTO` (0,05 ETH), `GENESIS2025` (expirado).

## 9. Checkout e pedidos

1. **Dados e carteira:** colecionador (validado), carteira cadastrada (ou outro endereço),
   tipo de carteira e rede. `POST /wallet-connections` simula a carteira (aprovação, ou
   recusa no cenário `wallet-rejected`). Trocar carteira, tipo ou rede derruba a conexão.
2. **Revisão = revalidação:** `POST /checkout/quote` congela o carrinho em uma cotação válida
   por 2 min (preço, estoque, cupom e taxas conferidos no servidor). Se o total mudou desde o
   carrinho, a revisão mostra "total X → Y".
3. **Mudanças durante a revisão:** se um `nft.updated` deixa o carrinho diferente da cotação, o
   botão "Confirmar" vira "Atualizar cotação" — não dá para confirmar valores desatualizados.
4. **Pedido idempotente:** `POST /orders` com `Idempotency-Key`. A chave é uma por
   (usuário, conteúdo) e fica no `sessionStorage`:
   - clique repetido / reenvio → a mesma chave → o mesmo pedido (200);
   - timeout, queda de rede ou 5xx → o cliente reenvia uma vez com a mesma chave e recupera o
     pedido que o servidor talvez já tenha criado;
   - mesma chave com outro conteúdo → 409 `IDEMPOTENCY_CONFLICT`;
   - cotação vencida ou valores mudaram → 409 com a nova cotação; a pessoa confirma de novo
     (conteúdo novo → chave nova).
5. **Pendente → confirmado/recusado:** o pedido nasce `pending` e reserva o estoque. A
   "liquidação" acontece ~2,5 s depois (o prazo é persistido, então um refresh não perde o
   pedido) e emite `order.updated` para o dono. Confirmado: gera `txHash` simulado e remove do
   carrinho **apenas** as quantidades compradas. Recusado (`payment-declined`): devolve o
   estoque e mantém o carrinho. Estados confirmados e recusados são terminais.
6. **Recuperação:** voltar ao `/checkout` com uma tentativa que já gerou pedido pendente leva ao
   status desse pedido, sem nova compra. A navegação para o pedido fica no callback do próprio
   hook de mutation, que roda mesmo se o checkout já tiver desmontado (o carrinho pode esvaziar
   por causa da confirmação antes de uma resposta lenta chegar).
7. **Recibo:** só aparece para pedido `confirmed`. Mostra o snapshot gravado na criação (linhas,
   cupom, totais) — mudanças posteriores no catálogo não alteram o recibo.

## 10. Dinheiro

Valores em ETH trafegam como **strings decimais** (`"1.19"`) e só são calculados com
`decimal.js` (40 dígitos de precisão), no servidor simulado. A exibição usa `formatEth`
(mínimo 2, máximo 4 casas). Quantidades são inteiros. O slider de preço trabalha em centésimos
inteiros e converte nas pontas, porque passos decimais em ponto flutuante faziam os controles
pararem um passo antes.

## 11. Mocks (MSW)

- **Ativação por configuração:** `VITE_ENABLE_MOCKS=true` — definido no `.env.production`
  versionado, então o build de demonstração (Vercel) já sobe com os mocks.
- **Banco persistido:** `src/mocks/db.ts` guarda NFTs, usuários, sessões, favoritos, carrinhos,
  carteiras, cotações, pedidos, chaves de idempotência e newsletter no `localStorage`, com
  versão de schema. Toda mudança de NFT emite `nft.updated`, então REST e eventos ficam
  coerentes.
- **Fixtures determinísticas:** 42 NFTs gerados por PRNG com semente fixa (9 coleções, 3 redes,
  edições com estoque), 2 usuários com carteiras diferentes.
- **Cenários** (`?scenario=` ou `window.__mocks.setScenario`): `default`, `empty-catalog`,
  `slow-network` (latência de 0,4–2 s derivada da URL → respostas fora de ordem reproduzíveis),
  `server-error`, `offline`, `favorites-error`, `wallet-rejected`, `payment-declined`,
  `order-timeout`. `window.__mocks.reset()` restaura tudo.
- **Controles de teste** (`window.__mocks`): expirar sessões, pausar/retomar a liquidação
  (persistido), derrubar sockets, reemitir eventos duplicados/antigos, alterar preço e estoque.
  Eles mudam o estado do **servidor**; a aplicação só percebe pelos caminhos normais (REST e
  socket).

## 12. Acessibilidade

- Navegação por teclado em tudo; foco visível com `outline` do tema; link "Pular para o conteúdo".
- Diálogos e gavetas (Radix) prendem o foco e fecham com Esc; o login no desktop é um modal
  cujo título é o `h1` da página.
- Formulários: rótulos reais (visualmente ocultos onde o layout só mostra placeholder),
  `aria-invalid`, `aria-describedby` ligando o erro ao campo, `aria-required`, foco no primeiro
  erro. Validação no envio e depois em tempo real — validar no blur deslocava o botão sob o
  ponteiro e o clique se perdia.
- Estados não dependem só de cor: edição esgotada é riscada e tem "(esgotada)"; filtros e
  favoritos usam `aria-pressed`; preço antigo é anunciado.
- Feedback de mutations em toasts (região viva do Sonner) e mudanças em tempo real em regiões
  `aria-live` (preço alterado, item esgotado, status do pedido).
- Skeletons com shimmer reservam o tamanho final do conteúdo e param com
  `prefers-reduced-motion`; o carrossel não gira sozinho.
- Sem overflow horizontal em 390 px (verificado por teste nas telas principais).
- Imagens relevantes têm descrição; decorativas usam `alt=""`.

## 13. Testes

`npm run test:e2e` gera o build otimizado, sobe o preview e roda os testes em Chromium desktop
(1440×900) e mobile (390×844). Cada teste começa em um contexto limpo (banco do mock isolado).
Com `BASE_URL=<url>`, a mesma suíte roda contra o site publicado.

Cobertura: busca/filtros/ordenação/paginação e histórico; detalhe e 404; cadastro, login,
expiração (com relógio controlado), logout e troca de usuário; favoritos com falha e rollback;
carrinho, cupons, refresh e merge no login; compra completa até o recibo; pagamento recusado,
clique repetido e timeout com recuperação; perfil, avatar, senha e carteiras; alteração de
preço/estoque via Socket.IO no carrinho e no checkout; eventos duplicados/antigos, desconexão e
retomada de pedido pendente; teclado e foco em diálogos; carrossel, slider e gaveta; overflow.
Os testes de tempo real esperam a conexão real do socket (`realtimeConnections`) em vez de
tempos fixos. Relatório HTML em `playwright-report/` e traces apenas das falhas.

## 14. Decisões de UX e desvios do Figma

| Onde                                    | Decisão                                                                                                      | Motivo                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Pagamento (desktop)                     | Escolha de carteira cadastrada em cards (como no mobile), em vez de repetir todos os campos da carteira      | Os campos completos ficam na tela Carteiras; evita digitar endereço a cada compra |
| Pagamento                               | "Código de indicação" opcional                                                                               | Obrigatoriedade sem regra de negócio associada                                    |
| Pagamento                               | Etapa explícita "Revisar pedido" antes de "Confirmar compra"                                                 | O enunciado pede revisão e revalidação antes do envio                             |
| Recibo                                  | Página própria em vez de modal sobre o checkout                                                              | Acesso direto e refresh do recibo; o pedido tem URL                               |
| Login/cadastro (desktop)                | Modal sobre os destaques da Início (não sobre a página inteira)                                              | A rota `/login` não renderiza o catálogo completo atrás                           |
| Login                                   | "Google", "Facebook" e "Esqueceu a senha?" avisam que não estão disponíveis                                  | Fora do escopo; não devem aparentar sucesso                                       |
| Início                                  | Campo de busca visível acima do catálogo                                                                     | Busca é requisito; o ícone do cabeçalho leva até ela                              |
| Cards                                   | Sem os atalhos de carrinho/lupa no hover                                                                     | Adicionar ao carrinho exige escolher a edição no detalhe                          |
| Destaques                               | Carrossel manual, sem autoplay                                                                               | Conteúdo que se move sozinho prejudica acessibilidade                             |
| Conta                                   | "Lista de interesse" mostra os favoritos; Atividade, Ofertas, Arquivos e Suporte aparecem "em breve"         | Favoritos são requisito; o resto está fora do escopo                              |
| Diário, Central de ajuda, redes sociais | "Em breve", sem link                                                                                         | Páginas editoriais e externas fora do escopo                                      |
| Mobile                                  | Toasts no topo (abaixo das barras de voltar/favoritar) e sem barra inferior em detalhe, carrinho e pagamento | Toasts e a barra cobriam as ações fixas da parte de baixo                         |
| Imagens                                 | O Figma traz 4 ilustrações, reutilizadas em 42 NFTs; recortadas do frame e convertidas para WebP             | Não havia exportação individual em alta resolução                                 |

## 15. Limitações conhecidas

- O "servidor" vive na aba: eventos não cruzam abas, e limpar o armazenamento do site reinicia
  os dados (equivale a `reset()`).
- O Service Worker do MSW precisa de um navegador comum (não funciona em webviews que bloqueiam
  Service Workers).
- Transações, hashes e o link "Ver no Etherscan" são simulados.
- O cadastro não envia e-mail de confirmação, e a recuperação de senha não existe.
