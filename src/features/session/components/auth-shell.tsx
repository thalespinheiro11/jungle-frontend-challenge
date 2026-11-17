import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { useIsDesktop } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup'

const COPY: Record<Mode, { title: string; mobileTitle: string; description: string }> = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  signup: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil para colecionar, favoritar e comprar NFTs.',
  },
}

/**
 * Desktop/tablet: modal over the home page (as in the Figma), with focus trapped by the
 * dialog. Mobile: full-screen page. Both render the same form.
 */
export function AuthShell({
  mode,
  redirect,
  notice,
  children,
}: {
  mode: Mode
  redirect?: string
  notice?: ReactNode
  children: ReactNode
}) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const copy = COPY[mode]

  if (isDesktop) {
    return (
      <>
        {/* Decorative backdrop: the home hero, hidden from assistive tech and focus. */}
        <div inert aria-hidden="true">
          <HomeHero />
        </div>
        <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
          <DialogContent className="border-primary bg-card max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-none border-0 border-b-[6px] px-0 pt-12 pb-10 sm:max-w-[500px]">
            <div className="flex items-center justify-center gap-3 text-xl font-medium">
              <ModeLink mode="login" active={mode === 'login'} redirect={redirect} />
              <span aria-hidden className="bg-primary h-6 w-px" />
              <ModeLink mode="signup" active={mode === 'signup'} redirect={redirect} />
            </div>
            {/* The dialog is the page's main content here, so its title is the page h1. */}
            <DialogTitle asChild>
              <h1 className="sr-only">{copy.title}</h1>
            </DialogTitle>
            <DialogDescription className="text-foreground mx-auto mt-2 max-w-[400px] text-center text-sm">
              {copy.description}
            </DialogDescription>
            <div className="mx-auto mt-4 w-full max-w-[340px] space-y-4">
              {notice}
              {children}
            </div>
            <SocialLogin className="mt-2" />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <section aria-labelledby="auth-title" className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-24 pb-10">
      <Link to="/" className="text-center text-3xl font-bold tracking-wider">
        KURIO
      </Link>
      <h1 id="auth-title" className="mt-20 mb-6 text-center text-lg font-bold">
        {copy.mobileTitle}
      </h1>
      <div className="space-y-4">
        {notice}
        {children}
      </div>
      <SocialLogin className="mt-8" />
      <p className="text-muted-foreground mt-10 text-center text-sm">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link to="/signup" search={{ redirect }} className="underline-offset-4 hover:underline">
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link to="/login" search={{ redirect }} className="underline-offset-4 hover:underline">
              Entre
            </Link>
          </>
        )}
      </p>
    </section>
  )
}

function ModeLink({ mode, active, redirect }: { mode: Mode; active: boolean; redirect?: string }) {
  return (
    <Link
      to={mode === 'login' ? '/login' : '/signup'}
      search={{ redirect }}
      replace
      aria-current={active ? 'page' : undefined}
      className={cn(active ? 'text-primary' : 'text-foreground hover:text-primary')}
    >
      {COPY[mode].title}
    </Link>
  )
}

/**
 * Social sign-in is out of the brief's scope. The buttons stay (they are in the layout) but
 * explain they are unavailable instead of pretending to work.
 */
function SocialLogin({ className }: { className?: string }) {
  const unavailable = (provider: string) =>
    toast.info(`Entrar com ${provider} não está disponível nesta demonstração. Use e-mail e senha.`)

  return (
    <div className={cn('w-full', className)}>
      <div className="text-foreground my-5 flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" aria-hidden />
        Ou continue com
        <span className="bg-border h-px flex-1" aria-hidden />
      </div>
      <div className="mx-auto w-full max-w-[340px] space-y-3">
        <Button type="button" variant="outline" className="h-10 w-full bg-transparent text-xs" onClick={() => unavailable('Google')}>
          <GoogleIcon /> Continuar com Google
        </Button>
        <Button type="button" variant="outline" className="h-10 w-full bg-transparent text-xs" onClick={() => unavailable('Facebook')}>
          <FacebookIcon /> Continuar com Facebook
        </Button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#3b5998" d="M14 8V6c0-.9.6-1 1-1h3V1h-4c-4 0-5 3-5 5v2H6v4h3v11h5V12h3.5l.5-4h-4Z" />
    </svg>
  )
}
