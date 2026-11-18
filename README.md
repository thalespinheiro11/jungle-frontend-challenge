# Kurio — Marketplace de NFTs

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge).
React + TypeScript, TanStack Router/Query, Axios, Socket.IO, Tailwind, shadcn/ui, MSW, Playwright e Lighthouse.

> Em construção: a base do projeto está pronta; os fluxos de conta, carrinho e checkout ainda serão implementados.

## Setup

Requer Node 22+ e npm.

```bash
npm install
cp .env.example .env
npx playwright install chromium
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks (MSW) em http://localhost:5173 |
| `npm run build` | Build otimizado + verificação de tipos |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (Chromium desktop 1440 e mobile 390) contra o build |
| `npm run lighthouse` | Auditoria Lighthouse mobile e desktop (3 execuções por página) |
| `npm run assets` | Converte as ilustrações de `design/assets` em WebP para `public/nfts` |

## Deploy

Publicado em https://jungle-frontend-challenge-sand.vercel.app a partir da branch `main` (framework Vite, comando `npm run build`, saída `dist`).
O `.env.production` versionado liga os mocks no build de demonstração, então o import não exige variáveis.
O `vercel.json` reescreve as rotas para o `index.html`, permitindo acesso direto e refresh em qualquer tela.

Para rodar os testes E2E contra o site publicado:

```bash
BASE_URL=https://<url-do-deploy> npx playwright test
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (REST e Socket.IO), inclusive no build de demonstração |
| `VITE_API_URL` | `/api` | Base das chamadas REST |
| `VITE_SOCKET_URL` | origem da página | Servidor Socket.IO |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana Souza (`ana.colecionadora`) | `ana@kurio.dev` | `Kurio@123` |
| Bruno Lima (`bruno.nft`) | `bruno@kurio.dev` | `Kurio@123` |

As senhas ficam no mock apenas como hash SHA-256 com sal. Sessões duram 30 minutos; o token
fica no `localStorage` e a sessão é revalidada na API a cada refresh e a cada navegação privada.

## Cupons de demonstração

| Cupom | Resultado |
| --- | --- |
| `KURIO10` | 10% de desconto no subtotal |
| `LANCAMENTO` | 0.05 ETH de desconto |
| `GENESIS2025` | Expirado (erro "Este cupom expirou em 31/01/2026.") |
| qualquer outro | Inválido |

O carrinho fica no servidor (mock): visitantes usam um carrinho identificado pelo header
`X-Cart-Id`, que é mesclado ao carrinho do usuário no login. Subtotal, desconto, taxa de rede
(0.016 ETH) e total vêm sempre da API.

## Cenários de mock

Selecione com `?scenario=<nome>` na URL (fica salvo) ou pelo console com `window.__mocks.setScenario('<nome>')`.
`window.__mocks.reset()` restaura os dados iniciais e o cenário padrão.
`window.__mocks.expireSessions()` expira todas as sessões ativas (simula expiração no meio do uso).

Outros controles em `window.__mocks`: `pauseSettlement()` / `resumeSettlement()` (mantém pedidos pendentes),
`disconnectRealtime()` (derruba os sockets; o cliente reconecta), `replayOrderEvent(id, versão?)` (evento
duplicado ou antigo) e `updateNft(id, patch)` (altera preço/disponibilidade e emite `nft.updated`).

## Fluxo de compra

1. Carrinho → **Conectar e finalizar** (exige login; o carrinho de visitante é mesclado).
2. Pagamento: dados do colecionador, carteira cadastrada (ou outra), tipo de carteira e rede.
   **Conectar** simula a carteira (aprovação ou recusa).
3. **Revisar pedido** pede uma cotação ao servidor (revalida preço, estoque, cupom e taxas).
4. **Confirmar compra** envia o pedido com `Idempotency-Key`. Se os valores mudaram, o servidor
   devolve a nova cotação e a confirmação precisa ser refeita.
5. O pedido fica **pendente** até a liquidação simulada (~2,5 s), que emite `order.updated` só
   para o dono do pedido. O recibo aparece apenas para pedidos **confirmados**.

| Cenário | Comportamento |
| --- | --- |
| `default` | Respostas rápidas e bem-sucedidas |
| `empty-catalog` | Catálogo vazio |
| `slow-network` | Latência de 0,4–2 s derivada da URL (respostas fora de ordem, deterministicamente) |
| `server-error` | Catálogo responde 503 duas vezes e depois se recupera |
| `offline` | Todas as chamadas REST falham como erro de rede |
| `favorites-error` | Favoritar/desfavoritar responde 503 (o coração volta ao estado anterior) |
| `wallet-rejected` | A carteira recusa a conexão no pagamento |
| `payment-declined` | O pedido é criado, mas o pagamento é recusado na liquidação (itens ficam no carrinho) |
| `order-timeout` | O pedido é criado, mas a resposta chega depois do timeout do cliente (10 s); o reenvio automático com a mesma chave recupera o mesmo pedido |

## Estrutura

```
src/
  routes/          rotas (TanStack Router, file-based); _auth = rotas privadas
  features/        domínio: catalog, session, … (api, componentes, search state)
  lib/             axios + contratos, query client, socket, dinheiro (decimal.js)
  mocks/           MSW: fixtures, banco persistido, cenários, handlers REST e Socket.IO
  components/      layout e componentes shadcn/ui adaptados ao tema
e2e/               testes Playwright
design/            frames e assets recortados do Figma
```

## Notas técnicas

- **Socket.IO com MSW:** o MSW remove o prefixo `/socket.io/` antes de comparar URLs, então o handler usa a origem do servidor. O app é importado só depois de o worker iniciar, para o `engine.io-client` ver o `WebSocket` interceptado. O binding não envia heartbeat; o mock envia o ping a cada 20 s.
- **Navegador embutido do app Claude:** não registra service workers. Para ver os mocks funcionando, use um navegador comum.
