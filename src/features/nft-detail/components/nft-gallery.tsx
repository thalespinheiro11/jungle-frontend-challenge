import { Search } from 'lucide-react'
import { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Nft } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

/** Thumbnails + main image + zoom dialog. Thumbnails stack vertically on desktop. */
export function NftGallery({ nft }: { nft: Nft }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const images = nft.gallery.length ? nft.gallery : [nft.image]
  const current = images[active] ?? nft.image

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-7">
      <ul aria-label="Imagens do NFT" className="hidden gap-4 md:flex md:flex-col">
        {images.map((src, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-current={index === active ? 'true' : undefined}
              className={cn(
                'block overflow-hidden rounded-md border-2',
                index === active ? 'border-primary' : 'border-transparent',
              )}
            >
              <img src={src} alt="" width={100} height={100} className="size-[100px] object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div className="bg-card relative flex-1 md:p-5">
        <img
          src={current}
          alt={nft.imageAlt}
          width={404}
          height={404}
          fetchPriority="high"
          className="aspect-square w-full rounded-[28px] object-cover md:rounded-[24px]"
        />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Ampliar imagem"
          className="bg-background/90 absolute top-3 right-3 hidden size-9 place-items-center rounded-full md:grid"
        >
          <Search className="size-5" aria-hidden />
        </button>
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="bg-card max-w-[min(90vw,720px)] p-3 sm:max-w-[min(90vw,720px)]">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{nft.imageAlt}</DialogDescription>
          <img src={current} alt={nft.imageAlt} className="aspect-square w-full rounded-xl object-cover" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
