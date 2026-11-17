import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

/** Temporary page for routes whose feature is not built yet. Clearly not a working flow. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="container-page flex flex-col items-start gap-3 py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <p className="text-subtle-foreground text-sm">Tela em construção.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
