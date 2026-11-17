import { Link, type ErrorComponentProps } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/http'

export function NotFound({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe.',
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-primary text-sm font-bold">404</p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}

export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiError ? error.message : 'Não foi possível carregar este conteúdo.'
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="font-bold">Algo deu errado</p>
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="container-page">
      <QueryError error={error} onRetry={reset} />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="container-page grid gap-8 py-8 md:grid-cols-2" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando…
      </span>
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-7 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
