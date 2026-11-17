import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, LogIn, Search, ShoppingCart, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/api'
import { useSession } from '@/features/session/hooks'
import { UserMenu } from '@/features/session/components/user-menu'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Início', to: '/' },
  { label: 'Mercado', to: '/', hash: 'catalogo' },
  // Out of scope per the brief: rendered as disabled, never pretending to work.
  { label: 'Criadores', disabled: true },
  { label: 'Aprenda', disabled: true },
] as const

function CartLink({ className }: { className?: string }) {
  const count = useCart().data?.summary.itemCount ?? 0
  return (
    <Link
      to="/cart"
      className={cn('relative inline-flex size-10 items-center justify-center rounded-md', className)}
      aria-label={count ? `Carrinho, ${count} itens` : 'Carrinho'}
    >
      <ShoppingCart className="size-6" aria-hidden />
      {count > 0 && (
        <span className="bg-primary text-primary-foreground absolute top-1 right-0 grid size-4 place-items-center rounded-full text-[10px] font-bold">
          {count}
        </span>
      )}
    </Link>
  )
}

export function SiteHeader() {
  const { user, isPending } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Auth screens and the NFT detail (own sticky purchase bar) have no bottom nav on mobile.
  const hideMobileNav = pathname === '/login' || pathname === '/signup' || pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/nfts/')

  return (
    <>
      {/* Desktop / tablet header */}
      <header className="hidden md:block">
        <div className="container-page border-border flex h-[75px] items-center justify-between border-b">
          <Link to="/" className="text-sm font-bold tracking-wider">
            KURIO
          </Link>

          <nav aria-label="Principal" className="flex h-full items-stretch gap-10">
            {NAV.map((item) =>
              'disabled' in item ? (
                <span
                  key={item.label}
                  aria-disabled="true"
                  title="Em breve"
                  className="text-foreground/60 flex cursor-not-allowed items-center"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  hash={'hash' in item ? item.hash : undefined}
                  activeOptions={{ exact: true, includeHash: true }}
                  className="data-[status=active]:text-primary data-[status=active]:after:bg-primary relative flex items-center after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              hash="catalogo"
              className="inline-flex size-10 items-center justify-center rounded-md"
              aria-label="Buscar NFTs"
            >
              <Search className="size-6" aria-hidden />
            </Link>
            <CartLink />
            {user ? (
              <UserMenu user={user} />
            ) : isPending ? (
              // Reserve the button's space while a stored session is re-validated (no CLS).
              <span className="ml-3 h-9 w-[92px]" aria-hidden />
            ) : (
              <Button asChild className="ml-3 h-9 px-3">
                <Link to="/login" search={{ redirect: undefined }}>
                  <LogIn aria-hidden />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation (mobile frames have no top header; auth screens have none) */}
      {!hideMobileNav && <nav
        aria-label="Principal"
        className="bg-card fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Link to="/" aria-label="Início" className="text-foreground data-[status=active]:text-primary p-3" activeOptions={{ exact: true }}>
          <Home className="size-5" aria-hidden />
        </Link>
        <Link to="/account/profile" hash="favoritos" aria-label="Favoritos" className="p-3">
          <Heart className="size-5" aria-hidden />
        </Link>
        <CartLink className="data-[status=active]:text-primary" />
        <Link to="/account/profile" aria-label="Minha conta" className="data-[status=active]:text-primary p-3">
          <User className="size-5" aria-hidden />
        </Link>
      </nav>}
    </>
  )
}
