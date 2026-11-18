import { useRouter } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { useSession } from '@/features/session/hooks'
import type { NftSummary } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

import { useFavorites, useToggleFavorite } from './api'

/**
 * Toggle button for a NFT's favorite state (aria-pressed conveys it, not only the color).
 * Anonymous visitors are sent to login and brought back to this page afterwards.
 */
export function FavoriteButton({
  nft,
  className,
  children,
}: {
  nft: NftSummary
  className?: string
  /** Optional visible label renderer; icon-only when omitted. */
  children?: (favorite: boolean) => ReactNode
}) {
  const { user, isPending: sessionPending } = useSession()
  const router = useRouter()
  const { isFavorite, query } = useFavorites()
  const toggle = useToggleFavorite()
  const favorite = isFavorite(nft.id)
  // Until we know who the user is (session) and what they favorited, a click could be
  // misread: a signed-in user treated as a visitor (bounced to login), or a favorite
  // "added" again instead of removed. The button waits for both.
  const unresolved = sessionPending || (Boolean(user) && query.isPending)

  const onClick = () => {
    if (unresolved) return
    if (!user) {
      toast.info('Entre na sua conta para salvar favoritos.')
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      return
    }
    toggle.mutate({ nft, favorite: !favorite })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      // Toggle pattern: a stable name (it contains the visible "Favoritar" text) and the
      // state in aria-pressed, so the name doesn't change under the user's focus.
      aria-pressed={favorite}
      aria-label={`Favoritar ${nft.name}`}
      disabled={unresolved}
      className={cn('inline-flex items-center justify-center gap-2 disabled:cursor-wait', className)}
    >
      <Heart className={cn('size-5', favorite && 'fill-primary text-primary')} aria-hidden />
      {children?.(favorite)}
    </button>
  )
}
