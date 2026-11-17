// Converts the NFT illustrations cut from the Figma export (design/assets/nfts/*.png)
// into WebP files served from public/nfts. Run: npm run assets
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const src = path.resolve('design/assets/nfts')
const out = path.resolve('public/nfts')
await mkdir(out, { recursive: true })

for (const file of await readdir(src)) {
  if (!file.endsWith('.png')) continue
  const target = path.join(out, file.replace(/\.png$/, '.webp'))
  const info = await sharp(path.join(src, file)).webp({ quality: 82, effort: 6 }).toFile(target)
  console.log(`${file} -> ${path.relative(process.cwd(), target)} (${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB)`)
}
