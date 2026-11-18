import { ImageIcon, Loader2 } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/http'

import { useRemoveAvatar, useUpdateAvatar } from '../api'
import { AvatarError, prepareAvatar } from '../avatar-image'

/** Avatar with "Alterar" (file picker → upload) and "Remover", saved immediately. */
export function AvatarField({ profile }: { profile: Profile }) {
  const input = useRef<HTMLInputElement>(null)
  const update = useUpdateAvatar()
  const remove = useRemoveAvatar()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const labelId = useId()
  const errorId = `${labelId}-error`
  const busy = processing || update.isPending || remove.isPending

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const dataUrl = await prepareAvatar(file)
      update.mutate(dataUrl, {
        onSuccess: () => toast.success('Avatar atualizado.'),
        onError: (e) => setError(e instanceof ApiError ? (e.fieldErrors.avatar ?? e.message) : 'Não foi possível enviar o avatar.'),
      })
    } catch (e) {
      setError(e instanceof AvatarError ? e.message : 'Não foi possível processar a imagem.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={error ? errorId : undefined}>
      <p id={labelId} className="mb-2 text-sm font-medium">
        Avatar
      </p>
      <div className="flex items-center gap-6">
        <span className="bg-card border-border grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={`Avatar de ${profile.displayName}`} className="size-full object-cover" />
          ) : (
            <ImageIcon className="text-primary size-6" aria-label="Sem avatar" />
          )}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid="avatar-input"
        />
        <Button type="button" className="h-10 px-6 font-bold" onClick={() => input.current?.click()} disabled={busy}>
          {busy && update.isPending && <Loader2 className="animate-spin" aria-hidden />}
          Alterar
          <span className="sr-only"> avatar</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success('Avatar removido.') })}
          disabled={busy || !profile.avatarUrl}
        >
          Remover
          <span className="sr-only"> avatar</span>
        </Button>
      </div>
      <p className="text-subtle-foreground mt-2 text-xs">PNG, JPG ou WEBP. A imagem é recortada em quadrado.</p>
      {error && (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
