# Kurio — Marketplace de NFTs

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge):
descoberta, compra e conta do colecionador, em desktop e mobile, com API, autenticação, carteiras
e pagamentos simulados pelo MSW (REST + Socket.IO).

- **Demo:** https://jungle-frontend-challenge-sand.vercel.app
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/README.md](lighthouse/README.md) — medianas em [SUMMARY.md](lighthouse/SUMMARY.md)

Stack: React 19 + TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO, Tailwind CSS v4,
shadcn/ui, MSW, Playwright e Lighthouse.

## Setup

Requer Node 22.12+ e npm.

```bash
npm install
cp .env.example .env
npx playwright install chromium
npm run dev
```

Abra http://localhost:5173 em um navegador comum (os mocks dependem de Service Worker).

## Comandos

| Comando                   | O que faz                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`             | Desenvolvimento com mocks em http://localhost:5173                                             |
| `npm run build`           | Build otimizado + verificação de tipos                                                         |
| `npm run preview`         | Serve o build em http://localhost:4173                                                         |
| `npm run typecheck`       | Verificação de tipos                                                                           |
| `npm run lint`            | ESLint                                                                                         |
| `npm run test:e2e`        | Playwright: gera o build, sobe o preview e roda tudo em Chromium desktop (1440) e mobile (390) |
| `npm run test:e2e:ui`     | Playwright em modo interativo                                                                  |
| `npm run test:e2e:update` | Regenera as imagens de referência da regressão visual (revise antes de versionar)              |
| `npm run lighthouse`      | Build + auditoria Lighthouse mobile e desktop (3 execuções por página)                         |
| `npm run assets`          | Converte as ilustrações de `design/assets` em WebP para `public/nfts`                          |

A suíte inclui **regressão visual** (Início, detalhe, carrinho e pagamento, desktop e mobile)
com imagens de referência em `e2e/visual.spec.ts-snapshots/`, geradas no Windows. Em outro
sistema operacional, gere as referências locais com `npm run test:e2e:update -- e2e/visual.spec.ts`
(detalhes no [ARCHITECTURE.md](ARCHITECTURE.md#regressão-visual)).

Rodar a suíte E2E contra o site publicado:

```bash
BASE_URL=https://jungle-frontend-challenge-sand.vercel.app npx playwright test
```

## Variáveis de ambiente

| Variável            | Padrão           | Descrição                     |
| ------------------- | ---------------- | ----------------------------- |
| `VITE_ENABLE_MOCKS` | `true`           | Liga o MSW (REST e Socket.IO) |
| `VITE_API_URL`      | `/api`           | Base das chamadas REST        |
| `VITE_SOCKET_URL`   | origem da página | Servidor Socket.IO            |

O `.env.production` (versionado, sem segredos) liga os mocks no build de demonstração, então o
deploy não exige variáveis.

## Credenciais fictícias

| Usuário                         | E-mail            | Senha       | Observação                           |
| ------------------------------- | ----------------- | ----------- | ------------------------------------ |
| Ana Souza (`ana.colecionadora`) | `ana@kurio.dev`   | `Kurio@123` | Tem carteiras principal e secundária |
| Bruno Lima (`bruno.nft`)        | `bruno@kurio.dev` | `Kurio@123` | Sem carteiras (testa o cadastro)     |

O mock guarda apenas hash SHA-256 com sal. Sessões duram 30 minutos.

### Cupons

| Cupom          | Resultado                   |
| -------------- | --------------------------- |
| `KURIO10`      | 10% de desconto no subtotal |
| `LANCAMENTO`   | 0,05 ETH de desconto        |
| `GENESIS2025`  | Expirado                    |
| qualquer outro | Inválido                    |

## Cenários de mock

Selecione pela URL — `?scenario=<nome>` (fica salvo no navegador) — ou pelo console:
`window.__mocks.setScenario('<nome>')`. **`window.__mocks.reset()`** restaura os dados iniciais e
o cenário `default`.

| Cenário            | Comportamento                                                                       |
| ------------------ | ----------------------------------------------------------------------------------- |
| `default`          | Respostas rápidas e bem-sucedidas                                                   |
| `empty-catalog`    | Catálogo vazio                                                                      |
| `slow-network`     | Latência de 0,4–2 s derivada da URL: respostas fora de ordem, de forma reproduzível |
| `server-error`     | Catálogo responde 503 duas vezes e depois se recupera                               |
| `offline`          | Todas as chamadas REST falham como erro de rede                                     |
| `favorites-error`  | Favoritar/desfavoritar responde 503                                                 |
| `wallet-rejected`  | A carteira recusa a conexão no pagamento                                            |
| `payment-declined` | O pedido é criado, mas o pagamento é recusado na liquidação                         |
| `order-timeout`    | O pedido é criado, mas a resposta chega depois do timeout do cliente (10 s)         |

Controles adicionais em `window.__mocks`:

| Controle                                   | Efeito                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `expireSessions()`                         | Expira todas as sessões ativas                                                                              |
| `updateNft(id, { editions })`              | Altera preço/estoque de um NFT e emite `nft.updated` (ex.: `getNft('emerald-ape-042')` para ver as edições) |
| `pauseSettlement()` / `resumeSettlement()` | Mantém pedidos pendentes / libera a liquidação                                                              |
| `disconnectRealtime()`                     | Derruba os sockets (o cliente reconecta sozinho)                                                            |
| `replayOrderEvent(orderId, versão?)`       | Reemite o último `order.updated` (duplicado) ou uma cópia antiga                                            |

## Como reproduzir os fluxos de falha

| Fluxo                               | Como reproduzir                                                                                              | O que esperar                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Skeletons e respostas fora de ordem | `?scenario=slow-network`, troque filtros rapidamente                                                         | Skeletons; a lista final corresponde aos filtros atuais                |
| Falha e nova tentativa              | `?scenario=server-error` na Início                                                                           | Retries automáticos; se falhar, "Tentar novamente"                     |
| Sem conexão                         | `?scenario=offline`                                                                                          | Mensagem de erro com nova tentativa                                    |
| Rollback otimista                   | Logado, `setScenario('favorites-error')` e clique no coração                                                 | O coração volta e um aviso explica                                     |
| Sessão expirada                     | Logado em `/account/profile`, `expireSessions()` e navegue para `/account/wallets`                           | Login com "Sua sessão expirou"; depois volta à tela                    |
| Cupom inválido/expirado             | No carrinho, `NAOEXISTE` ou `GENESIS2025`                                                                    | Erro no campo                                                          |
| Preço alterado com carrinho aberto  | No carrinho, `updateNft('emerald-ape-042', …)` mudando o preço da edição `1-50`                              | "Preço alterado", resumo atualizado, finalizar bloqueado até aceitar   |
| Edição esgotada durante a compra    | Na revisão do pagamento, `updateNft` com `available: 0`                                                      | Aviso e "Atualizar cotação" — a cotação antiga não pode ser confirmada |
| Carteira recusa                     | `setScenario('wallet-rejected')` e "Conectar" no pagamento                                                   | "A conexão foi recusada na carteira"                                   |
| Pagamento recusado                  | `setScenario('payment-declined')` e conclua a compra                                                         | "Pagamento recusado"; itens continuam no carrinho                      |
| Timeout após criar o pedido         | `setScenario('order-timeout')` e confirme a compra                                                           | ~10 s depois o mesmo pedido é recuperado (um único pedido)             |
| Pedido pendente com queda           | `pauseSettlement()`, confirme, `disconnectRealtime()`, recarregue, volte a `/checkout`, `resumeSettlement()` | Mesmo pedido pendente; confirma pelo socket sem nova compra            |
| Eventos duplicados/antigos          | No recibo, `replayOrderEvent(id)` e `replayOrderEvent(id, 1)`                                                | O recibo não muda                                                      |

## Estrutura

```
src/
  routes/       rotas (TanStack Router, por arquivo); _auth = rotas privadas
  features/     domínios: catalog, nft-detail, favorites, cart, checkout, orders,
                session, profile, wallets (api, schemas e componentes)
  lib/          contratos, Axios, Query client, Socket.IO, dinheiro, URL
  mocks/        MSW: banco persistido, fixtures, cenários, handlers REST e Socket.IO
  components/   layout, formulários acessíveis, shadcn/ui
e2e/            testes Playwright
design/         frames e assets recortados do Figma
```

Detalhes de contratos, cache, sessão, carrinho, idempotência e reconciliação REST × Socket.IO
estão no [ARCHITECTURE.md](ARCHITECTURE.md).
