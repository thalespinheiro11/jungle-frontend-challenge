import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" className="container-page py-6 md:py-8">
      <div className="bg-card grid items-center gap-6 overflow-hidden rounded-3xl p-4 md:grid-cols-[1fr_minmax(0,450px)] md:gap-10 md:rounded-none md:bg-transparent md:p-0">
        <div className="md:pl-10">
          <p className="text-sm font-medium tracking-wide">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="mt-3 text-2xl leading-snug font-bold tracking-wide uppercase md:text-[2.75rem] md:leading-[1.6]"
          >
            Seja dono do futuro da arte digital
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6 tracking-wide">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <Button asChild className="mt-8 h-10 px-7 font-bold">
            <Link to="/" hash="catalogo">
              EXPLORAR
            </Link>
          </Button>
        </div>
        <img
          src="/nfts/ape-emerald.webp"
          alt="Ilustração de um macaco de pelagem marrom com óculos redondos verdes e jaqueta college verde."
          width={450}
          height={450}
          fetchPriority="high"
          className="aspect-square w-full rounded-[28px] object-cover"
        />
      </div>
    </section>
  )
}
