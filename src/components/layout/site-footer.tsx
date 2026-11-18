import { useMutation } from '@tanstack/react-query'
import { Link, type LinkProps } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons/social'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emailSchema } from '@/features/session/schemas'
import type { NewsletterRequest } from '@/lib/api/contracts'
import { ApiError, api } from '@/lib/api/http'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

type FooterLink = { label: string; link?: Pick<LinkProps, 'to' | 'search' | 'hash'> }

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', link: { to: '/account/profile' } },
      { label: 'Minha coleção' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', link: { to: '/account/favorites' } },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', link: { to: '/', search: { category: ['digital-art'] }, hash: 'catalogo' } },
      { label: 'Fotografia', link: { to: '/', search: { category: ['photography'] }, hash: 'catalogo' } },
      { label: 'Música', link: { to: '/', search: { category: ['music'] }, hash: 'catalogo' } },
      { label: 'Arte 3D', link: { to: '/', search: { category: ['3d-art'] }, hash: 'catalogo' } },
      { label: 'Utilidade', link: { to: '/', search: { category: ['utility'] }, hash: 'catalogo' } },
    ],
  },
]

const SOCIAL = [
  { label: 'Facebook', icon: FacebookIcon },
  { label: 'Instagram', icon: InstagramIcon },
  { label: 'Twitter', icon: TwitterIcon },
  { label: 'LinkedIn', icon: LinkedinIcon },
  { label: 'YouTube', icon: YoutubeIcon },
]

/** Out-of-scope destination (editorial/support pages): shown, never pretending to work. */
function Soon({ children }: { children: ReactNode }) {
  return (
    <span aria-disabled="true" title="Em breve" className="text-foreground/50 cursor-not-allowed">
      {children}
      <span className="sr-only"> (em breve)</span>
    </span>
  )
}

/** Full footer from the Figma: features + newsletter, contact bar, link columns. */
export function SiteFooter() {
  return (
    <footer className="mt-10 pb-20 md:mt-16 md:pb-0">
      <div className="container-page">
        <div className="bg-card grid gap-8 px-6 py-8 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)] md:px-12">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="md:border-primary md:border-r md:pr-6">
              <span aria-hidden className="bg-primary text-primary-foreground grid size-[74px] place-items-center rounded-full text-2xl font-bold">
                {feature.letter}
              </span>
              <h2 className="mt-5 font-bold">{feature.title}</h2>
              <p className="text-muted-foreground mt-3 text-sm leading-[22px]">{feature.text}</p>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid gap-3 bg-[#3a2212] px-6 py-6 text-sm sm:grid-cols-2 md:grid-cols-4 md:px-8">
          <p className="font-bold tracking-wider">KURIO</p>
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>
            <a href="mailto:contato@email.com" className="hover:underline">
              contato@email.com
            </a>
          </p>
          <p>
            <a href="tel:+551140028922" className="hover:underline">
              +55 11 4002 8922
            </a>
          </p>
        </div>

        <div className="bg-card grid gap-8 px-6 py-8 sm:grid-cols-2 md:grid-cols-4 md:px-8">
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-lg font-bold">{column.title}</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {column.links.map((item) => (
                  <li key={item.label}>
                    {item.link ? (
                      <Link {...item.link} className="hover:text-primary">
                        {item.label}
                      </Link>
                    ) : (
                      <Soon>{item.label}</Soon>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="text-lg font-bold">Redes sociais</h2>
            <ul className="mt-3 flex gap-2">
              {SOCIAL.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <span
                    aria-disabled="true"
                    title={`${label} — em breve`}
                    className="border-primary text-primary/70 grid size-8 place-items-center rounded border"
                  >
                    <Icon className="size-4" aria-hidden />
                    <span className="sr-only">{label} (em breve)</span>
                  </span>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-lg font-bold">Carteiras compatíveis</h2>
            <p className="border-primary/60 text-primary mt-2 inline-block rounded-md border bg-[#3a2212] px-2 py-1 text-[10px] font-bold tracking-wide">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground py-6 text-center text-sm">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function Newsletter() {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const subscribe = useMutation({
    mutationFn: (body: NewsletterRequest) => api.post<void>('/newsletter', body),
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = emailSchema.safeParse(new FormData(form).get('email'))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Informe um e-mail válido.')
      return
    }
    setError(null)
    subscribe.mutate(
      { email: parsed.data },
      {
        onSuccess: () => {
          setDone(true)
          form.reset()
          toast.success('Inscrição confirmada! Você receberá os próximos lançamentos.')
        },
        onError: (e) =>
          setError(e instanceof ApiError ? (e.fieldErrors.email ?? e.message) : 'Não foi possível inscrever agora.'),
      },
    )
  }

  return (
    <section aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className="text-lg leading-5 font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-4 flex">
        <label htmlFor={inputId} className="sr-only">
          Seu e-mail
        </label>
        <Input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={() => error && setError(null)}
          className="h-10 rounded-r-none border-none bg-[#3a2212] text-sm"
        />
        <Button type="submit" className="h-10 rounded-l-none px-4 text-base font-bold" disabled={subscribe.isPending}>
          {subscribe.isPending ? <Loader2 className="animate-spin" aria-label="Enviando" /> : 'Enviar'}
        </Button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="text-destructive mt-2 text-xs">
          ⚠ {error}
        </p>
      )}
      <p className="text-muted-foreground mt-4 text-sm leading-[22px]" role={done ? 'status' : undefined}>
        {done ? 'Inscrição confirmada. Obrigado!' : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </section>
  )
}
