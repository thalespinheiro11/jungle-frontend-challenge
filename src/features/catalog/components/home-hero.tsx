import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Slide {
  eyebrow: string
  title: string
  description: string
  /** Short copy for the compact mobile card (as in the mobile frame). */
  short: string
  cta: string
  link: Pick<LinkProps, 'to' | 'search' | 'hash'>
  image: { src: string; alt: string }
  /** Small overlapping image on the mobile card. */
  thumb: { src: string; alt: string }
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: 'Seja dono do futuro da arte digital',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    short: 'Descubra NFTs selecionados de criadores do mundo todo.',
    cta: 'Explorar',
    link: { to: '/', hash: 'catalogo' },
    image: {
      src: '/nfts/ape-emerald.webp',
      alt: 'Ilustração de um macaco de pelagem marrom com óculos redondos verdes e jaqueta college verde.',
    },
    thumb: { src: '/nfts/gorilla-sage.webp', alt: '' },
  },
  {
    eyebrow: 'Novos lançamentos',
    title: 'Edições gênesis por tempo limitado',
    description:
      'Colecione edições escassas diretamente dos criadores antes da revelação pública, com procedência verificada na rede.',
    short: 'Edições escassas direto dos criadores.',
    cta: 'Ver lançamentos',
    link: { to: '/', search: { tab: 'new' }, hash: 'catalogo' },
    image: {
      src: '/nfts/gorilla-sage.webp',
      alt: 'Ilustração de um gorila cinza sorridente com chapéu bucket verde-claro e moletom lilás.',
    },
    thumb: { src: '/nfts/ape-golden.webp', alt: '' },
  },
  {
    eyebrow: 'Curadoria Kurio',
    title: 'Arte digital selecionada e muito mais',
    description:
      'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura da internet.',
    short: 'Novos artistas e coleções verificadas.',
    cta: 'Ver arte digital',
    link: { to: '/', search: { category: ['digital-art'] }, hash: 'catalogo' },
    image: {
      src: '/nfts/gorilla-ivory.webp',
      alt: 'Ilustração de um gorila de pelagem preta com blazer bege e gola alta verde-escura.',
    },
    thumb: { src: '/nfts/ape-emerald.webp', alt: '' },
  },
]

/**
 * Home highlights (Figma: hero with three dots). Manual carousel — no autoplay, so content
 * never moves on its own (WCAG 2.2.2) — with labelled dot controls. Mobile uses the card
 * variant of the mobile frame.
 */
export function HomeHero() {
  const [index, setIndex] = useState(0)
  const regionId = useId()
  const slide = SLIDES[index]!

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da Kurio"
      className="container-page py-4 md:py-8"
    >
      <h1 className="sr-only">Kurio — marketplace de NFTs</h1>
      <div
        id={regionId}
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} de ${SLIDES.length}: ${slide.title}`}
        className="bg-card relative grid items-center gap-4 overflow-hidden rounded-3xl p-4 md:grid-cols-[1fr_minmax(0,450px)] md:gap-10 md:rounded-none md:bg-transparent md:p-0"
      >
        {/* Decorative glow of the mobile card */}
        <span aria-hidden className="bg-primary/25 pointer-events-none absolute -top-16 -left-10 size-56 rounded-full blur-3xl md:hidden" />

        <div className="relative grid grid-cols-[1fr_auto] items-center gap-3 md:block md:pl-10">
          <div>
            <p className="text-sm font-medium tracking-wide">{slide.eyebrow}</p>
            <h2 className="mt-2 text-lg leading-snug font-bold tracking-wide uppercase md:mt-3 md:text-[2.75rem] md:leading-[1.6]">
              {slide.title}
            </h2>
            <p className="text-muted-foreground mt-2 text-xs leading-5 tracking-wide md:hidden">{slide.short}</p>
            <p className="text-muted-foreground mt-3 hidden max-w-xl text-sm leading-6 tracking-wide md:block">
              {slide.description}
            </p>
            <Button asChild className="mt-6 hidden h-10 px-7 font-bold uppercase md:inline-flex md:mt-8">
              <Link {...slide.link}>{slide.cta}</Link>
            </Button>
            <Link {...slide.link} className="text-primary mt-2 inline-flex items-center gap-2 text-sm font-bold uppercase md:hidden">
              {slide.cta} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Mobile: main image + small overlapping thumb */}
          <div className="relative w-[120px] md:hidden">
            <img
              src={slide.image.src}
              alt={slide.image.alt}
              width={120}
              height={120}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              className="aspect-square w-full rounded-2xl object-cover"
            />
            <img
              src={slide.thumb.src}
              alt={slide.thumb.alt}
              width={56}
              height={56}
              className="border-card absolute -bottom-2 -left-3 size-14 rounded-xl border-2 object-cover"
            />
          </div>
        </div>

        <img
          src={slide.image.src}
          alt={slide.image.alt}
          width={450}
          height={450}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          className="hidden aspect-square w-full rounded-[28px] object-cover md:block"
        />

        <div className="relative flex justify-center gap-2 md:absolute md:bottom-12 md:left-[calc(50%-120px)]">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-controls={regionId}
              aria-current={i === index ? 'true' : undefined}
              aria-label={`Destaque ${i + 1} de ${SLIDES.length}`}
              className="grid size-6 place-items-center"
            >
              <span
                aria-hidden
                className={cn(
                  'size-2 rounded-full transition-colors',
                  i === index ? 'bg-primary' : 'bg-primary/35',
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
