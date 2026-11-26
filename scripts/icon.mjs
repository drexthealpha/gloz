// The Even Hub store icon: 24x24, transparent, every visible pixel #F4F4F4, drawn in 2x2 blocks
// (the store's rules, checked by `evenhub create`). A "G" on a 12x12 grid.
//   node scripts/icon.mjs   writes app/listing/icon.png
import { writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const G = [
  '............',
  '...######...',
  '..##....##..',
  '.##.........',
  '.##.........',
  '.##...####..',
  '.##.....##..',
  '.##.....##..',
  '..##....##..',
  '...######...',
  '............',
  '............',
]
const png = new PNG({ width: 24, height: 24 })
for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
  const on = G[y >> 1][x >> 1] === '#', i = (y * 24 + x) * 4
  png.data[i] = png.data[i + 1] = png.data[i + 2] = on ? 0xf4 : 0
  png.data[i + 3] = on ? 255 : 0
}
writeFileSync(new URL('../app/listing/icon.png', import.meta.url), PNG.sync.write(png))
console.log('app/listing/icon.png written')
