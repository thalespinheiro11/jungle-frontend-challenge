import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

const BANNERS: Array<{
  title: string
  text: string
  image: string
  link: Pick<LinkProps, 'to' | 'search' | 'hash'>
}> = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/nfts/ape-emerald.webp',
    link: { to: '/', search: { tab: 'new' }, hash: 'catalogo' },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/nfts/gorilla-ivory.webp',
    link: { to: '/', search: { category: ['digital-art'] }, hash: 'catalogo' },
  },
]

/** Two launch banners under the catalog (they filter the catalog itself). */
export function LaunchBanners() {
  return (
    <section aria-label="Lançamentos" className="container-page grid gap-7 py-10 md:grid-cols-2 md:py-16">
      {BANNERS.map((banner) => (
        <article key={banner.title} className="bg-card grid grid-cols-[minmax(0,38%)_1fr] items-center overflow-hidden rounded-lg md:grid-cols-[minmax(0,287px)_1fr]">
          <img src={banner.image} alt="" width={287} height={250} loading="lazy" className="aspect-square h-full w-full rounded-r-3xl object-cover md:aspect-auto" />
          <div className="p-4 text-left md:p-6 md:text-right">
            <h2 className="font-bold md:text-lg">{banner.title}</h2>
            <p className="text-muted-foreground mt-3 text-xs leading-6 md:text-sm">{banner.text}</p>
            <Button asChild size="sm" className="mt-3 font-bold">
              <Link {...banner.link}>
                Explorar <ArrowRight aria-hidden />
                <span className="sr-only">: {banner.title}</span>
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const ARTICLES = [
  {
    date: '12 de setembro',
    read: '6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/nfts/gorilla-ivory.webp',
  },
  {
    date: '13 de setembro',
    read: '2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/nfts/ape-emerald.webp',
  },
  {
    date: '15 de setembro',
    read: '3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/nfts/gorilla-sage.webp',
  },
  {
    date: '15 de setembro',
    read: '2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/nfts/ape-golden.webp',
  },
]

/**
 * "Diário da Cunhagem". Editorial pages are out of the brief's scope, so "Ler mais" is shown
 * as coming soon instead of linking to a page that doesn't exist.
 */
export function MintJournal() {
  return (
    <section aria-labelledby="journal-title" className="container-page py-10 md:py-16">
      <div className="text-center">
        <h2 id="journal-title" className="text-2xl font-bold md:text-3xl">
          Diário da Cunhagem
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ARTICLES.map((article) => (
          <li key={article.title}>
            <article className="bg-card h-full overflow-hidden rounded-lg">
              <img src={article.image} alt="" width={268} height={195} loading="lazy" className="aspect-[268/195] w-full object-cover" />
              <div className="space-y-2 p-4">
                <p className="text-muted-foreground text-xs">
                  {article.date} <span aria-hidden>|</span> <span className="sr-only">·</span> Leitura de {article.read}
                </p>
                <h3 className="font-bold">{article.title}</h3>
                <p className="text-muted-foreground text-xs leading-5">{article.text}</p>
                <p className="text-primary/70 text-xs" aria-disabled="true" title="Em breve">
                  Ler mais <span aria-hidden>→</span> <span className="text-subtle-foreground">(em breve)</span>
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
