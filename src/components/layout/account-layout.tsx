import { Link } from '@tanstack/react-router'
import {
  Download,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  ShoppingCart,
  TrendingUp,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { useLogout } from '@/features/session/hooks'
import { cn } from '@/lib/utils'

const UNAVAILABLE = [
  { label: 'Atividade', icon: ShoppingCart },
  { label: 'Ofertas', icon: TrendingUp },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: LifeBuoy },
] as const

/** "Meu perfil" side menu + content, shared by profile and wallets (Figma frames 08/09). */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const logout = useLogout()
  const item =
    'relative flex items-center gap-3 px-3 py-2.5 text-sm data-[status=active]:text-foreground data-[status=active]:before:bg-primary before:absolute before:inset-y-1 before:left-0 before:w-1'

  return (
    <div className="container-page grid gap-8 py-6 md:grid-cols-[310px_1fr] md:py-10">
      <aside className="bg-card h-fit py-4" aria-label="Minha conta">
        <h2 className="px-3 pb-3 text-lg font-bold">Meu perfil</h2>
        <nav>
          <ul className="text-primary">
            <li>
              <Link to="/account/profile" className={item}>
                <User className="size-4" aria-hidden /> Dados do perfil
              </Link>
            </li>
            <li>
              <Link to="/account/wallets" className={item}>
                <MapPin className="size-4" aria-hidden /> Carteiras
              </Link>
            </li>
            <li>
              <Link to="/account/favorites" className={item}>
                <Heart className="size-4" aria-hidden /> Lista de interesse
              </Link>
            </li>
            {UNAVAILABLE.map(({ label, icon: Icon }) => (
              // Out of scope per the brief: shown as unavailable, never pretending to work.
              <li key={label}>
                <span aria-disabled="true" title="Em breve" className={cn(item, 'text-primary/50 cursor-not-allowed')}>
                  <Icon className="size-4" aria-hidden /> {label}
                  <span className="sr-only"> (em breve)</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="border-border text-primary mt-2 flex w-full items-center gap-3 border-t px-3 pt-3 text-sm font-bold"
          >
            <LogOut className="size-4" aria-hidden /> Sair
          </button>
        </nav>
      </aside>
      <section aria-labelledby="account-title">
        <h1 id="account-title" className="sr-only">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
