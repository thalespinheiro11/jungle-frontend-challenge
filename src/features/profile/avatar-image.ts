import { AVATAR_MAX_BYTES, AVATAR_TYPES } from './schemas'

/** Larger source files are rejected before decoding (they'd be slow to process). */
const SOURCE_MAX_BYTES = 8 * 1024 * 1024
const SIZE = 256

export class AvatarError extends Error {}

/**
 * Validates the chosen file and turns it into a small square WEBP data URL (256×256,
 * center-cropped) — the API stores data URLs, so avatars stay well under its 1 MB limit.
 */
export async function prepareAvatar(file: File): Promise<string> {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    throw new AvatarError('Use uma imagem PNG, JPG ou WEBP.')
  }
  if (file.size > SOURCE_MAX_BYTES) throw new AvatarError('A imagem deve ter no máximo 8 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarError('Não foi possível ler esta imagem.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new AvatarError('Não foi possível processar a imagem.')
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  )
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/webp', 0.85)
  if (dataUrl.length > AVATAR_MAX_BYTES) throw new AvatarError('A imagem deve ter no máximo 1 MB.')
  return dataUrl
}
