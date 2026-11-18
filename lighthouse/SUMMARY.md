# Lighthouse — resultados

Mediana de 3 execuções por página e perfil, sobre o build otimizado (`npm run build` +
`vite preview`) com o cenário padrão dos mocks. Valores abaixo da meta em **negrito**.
Gerado por `npm run lighthouse:summary` a partir dos relatórios desta pasta.

| Perfil  | Página                  | Performance | Accessibility | Best Practices | SEO |   LCP |   CLS |    TBT |   FCP | Performance por execução |
| ------- | ----------------------- | ----------: | ------------: | -------------: | --: | ----: | ----: | -----: | ----: | ------------------------ |
| mobile  | `/`                     |      **78** |           100 |            100 | 100 | 4.5 s | 0.001 | 309 ms | 0.8 s | 78 / 83 / 75             |
| mobile  | `/nfts/emerald-ape-042` |      **84** |            99 |            100 | 100 | 3.7 s | 0.000 | 250 ms | 0.8 s | 84 / 85 / 84             |
| desktop | `/`                     |          99 |           100 |            100 | 100 | 0.9 s | 0.002 |   0 ms | 0.2 s | 99 / 99 / 99             |
| desktop | `/nfts/emerald-ape-042` |          99 |           100 |            100 | 100 | 0.8 s | 0.000 |   0 ms | 0.2 s | 99 / 99 / 99             |

Metas: Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 90.

## Ambiente e condições

- Lighthouse 13.6.0 (via @lhci/cli), Chrome/157.0.0.0 headless
- Sistema: Windows_NT 10.0.26200 (x64), Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz, Node v24.19.0
- Mobile: mobile, simulate: RTT 150 ms, 1.6 Mbps, CPU 4×, tela 412×823
- Desktop: desktop, simulate: RTT 40 ms, 10 Mbps, CPU 1×, tela 1350×940
- Configuração versionada: `lighthouserc.mobile.json` e `lighthouserc.desktop.json`
- Cada execução parte de um navegador limpo (sem cache nem Service Worker registrado).
