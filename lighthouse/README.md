# Auditoria Lighthouse

- **Resultados (medianas):** [SUMMARY.md](SUMMARY.md)
- **Relatórios completos:** `mobile/*.report.html|json` e `desktop/*.report.html|json` (3 execuções
  por página), mais o `manifest.json` de cada perfil.
- **Como reproduzir:** `npm run lighthouse` (build otimizado → `vite preview` → 3 execuções por
  página em cada perfil → `SUMMARY.md`). Configuração em `lighthouserc.mobile.json` e
  `lighthouserc.desktop.json`.

Páginas auditadas: Início (`/`) e detalhe do NFT (`/nfts/emerald-ape-042`), com o cenário padrão
dos mocks, carregando as imagens, fontes e funcionalidades reais da entrega.

## Resultado

Accessibility, Best Practices e SEO atingem a meta nos dois perfis. Performance atinge a meta no
desktop (99/99). **No mobile, Performance fica abaixo de 90 (Início 78, detalhe 84).**

## Por que o mobile fica abaixo de 90

O perfil mobile simula 4G lento (RTT 150 ms, 1,6 Mbps) e CPU 4× mais lenta. Nas duas páginas, o
**LCP é uma imagem que depende de dados** (o primeiro card do catálogo; no detalhe, a imagem do
NFT), e esses dados só podem ser pedidos depois que a camada de mocks está ativa:

```
HTML ─► JS de entrada ─► chunk do MSW ─► registro e ativação do Service Worker ─► GET /api/... ─► render da imagem
```

- **O Service Worker é instalado a cada auditoria.** Cada execução do Lighthouse começa com o
  armazenamento limpo, então toda medição é uma primeira visita: o worker do MSW precisa ser
  baixado, registrado e ativado antes da primeira requisição de dados. Esse passo não existiria
  com uma API real.
- **O tempo está no "render delay" do LCP, não no download da imagem.** Na execução observada da
  Início, a imagem já está baixada aos ~210 ms (é o mesmo arquivo do destaque, carregado com
  prioridade alta), mas só é pintada ~500 ms depois, quando `/api/nfts` responde. A simulação do
  Lighthouse projeta essa cadeia inteira para a rede lenta (LCP simulado ~4 s contra ~0,7 s
  observado sem limitação).
- **TBT (~250–310 ms):** avaliação do JavaScript de entrada (React, roteador, Query) somada à do
  MSW, com a CPU desacelerada 4×.

Não foram usadas "otimizações" que mudariam o que é medido — empurrar o catálogo para fora da
primeira dobra, embutir dados no HTML, adiar os mocks para depois do LCP ou auditar sem eles. O
enunciado pede a auditoria com as imagens, fontes e funcionalidades da entrega.

**Com um backend real**, a cadeia perde o chunk do MSW (62 KB gz), o registro do Service Worker e
a execução dos handlers no navegador, e a primeira requisição sai assim que o JS de entrada roda.

## Otimizações aplicadas

| Mudança                                                                                                                                  | Efeito medido                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `<main>` com altura mínima da tela: o rodapé não aparece acima da dobra durante os skeletons                                             | CLS do detalhe no desktop **0,252 → 0** (Performance 86 → 99)                 |
| Shell estático no HTML (barra com a marca) pintado antes do JS                                                                           | FCP mobile da Início **2,9 s → 0,8 s**                                        |
| App e mocks carregados em paralelo, com um portão de rede (`lib/network-ready.ts`) que segura Axios e socket até os mocks estarem ativos | A interface aparece sem esperar o MSW                                         |
| `socket.io-client` carregado sob demanda, depois do portão                                                                               | Sai do caminho crítico (9,5 KB gz) e continua usando o WebSocket interceptado |
| `tldts` (Public Suffix List puxada pelo cookie jar do MSW) substituído por um shim — o app não usa cookies                               | Chunk do MSW **175,9 → 61,8 KB gz** (−65%)                                    |
| `modulepreload` do chunk do MSW no HTML (só quando os mocks estão ligados)                                                               | O chunk baixa em paralelo com o JS de entrada                                 |
| Imagens em WebP com dimensões explícitas, `fetchpriority="high"` no destaque e nos primeiros cards, `loading="lazy"` no resto            | Sem deslocamento por imagens; LCP não espera o download                       |
| Fonte apenas no subconjunto latino, 3 pesos, `font-display: swap`                                                                        | Sem texto invisível                                                           |

## Evolução durante a auditoria (mobile, 1 execução por medição)

| Etapa                                                      | Início | Detalhe |
| ---------------------------------------------------------- | -----: | ------: |
| Linha de base                                              |     73 |      83 |
| App e mocks em paralelo (sem reduzir bytes)                |     69 |      75 |
| Shim do `tldts` (MSW −65%)                                 |     73 |      83 |
| Shell no HTML, import estático do app, `min-h` no `<main>` |     80 |      82 |
| `modulepreload` do MSW                                     |     83 |      82 |
| **Final (mediana de 3)**                                   | **78** |  **84** |

O carregamento em paralelo sozinho piorou o resultado: sob 1,6 Mbps, os dois downloads disputam
banda e o app chegava mais tarde. O ganho veio da redução de bytes do MSW e do HTML com conteúdo
imediato. A variação entre execuções do mobile (75–85) é da própria simulação.
