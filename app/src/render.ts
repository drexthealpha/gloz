// Draws one line of a card as an image, so every script the phone can show
// reaches the glasses, at any size. The firmware font drops what it lacks
// (Arabic, Hebrew, Persian, Hindi, Thai in our probe); the phone's own fonts do not.
import { SIZES, type Card } from './core/types.ts'
import { wrap, direction } from './core/layout.ts'

export const W = 576
export const STRIP = 144             // one line lives in a 576 x 144 strip: two 288 x 144 tiles
const PAD = 12
const FONT = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", "Noto Sans Arabic", "Noto Sans Thai", "Noto Sans Devanagari", "Noto Sans Hebrew", "Noto Sans CJK JP", sans-serif'

let measureCtx: CanvasRenderingContext2D | null = null
function ctx2d(): CanvasRenderingContext2D {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!
  return measureCtx
}

function fontPx(size: number) { return SIZES[Math.min(6, Math.max(1, size)) - 1] }

// Hint text sits under the line, small, only where a press needs saying.
const HINT_PX = 20

export interface Lines { lines: string[]; px: number; head?: string }

export function layoutCard(c: Card, size: number): Lines {
  const px = fontPx(size)
  const ctx = ctx2d()
  ctx.font = `${px}px ${FONT}`
  const room = W - PAD * 2
  // The head (sender name or reply mark) goes in front of the first line; a reply's
  // label ("Layla gets this in Arabic, meaning:") is drawn small above the line instead.
  const text = c.head && c.kind !== 'draft' ? `${c.head} ${c.text}` : c.kind === 'draft' ? c.text : c.text
  const measure = (s: string) => ctx.measureText(s).width
  // A status line is read whole: shrink it to one line when it fits at any size, else draw it
  // at the size that needs the fewest lines. Messages and replies keep the wearer's size.
  if (c.kind === 'status') {
    let best: Lines | null = null
    for (let k = size; k >= 1; k--) {
      ctx.font = `${fontPx(k)}px ${FONT}`
      const ls = wrap(text, room, measure)
      if (!best || ls.length < best.lines.length) best = { lines: ls, px: fontPx(k), head: c.head }
      if (ls.length === 1) break
    }
    return best!
  }
  const lines = wrap(text, room, measure)
  return { lines, px, head: c.head }
}

// Renders line i of a card into a 576 x 144 canvas, white on black.
export function drawLine(c: Card, l: Lines, i: number, opts: { pages?: boolean } = {}): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = STRIP
  const g = cv.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, STRIP)
  g.fillStyle = '#fff'
  const line = l.lines[i] ?? ''
  // Base direction comes from the message body, not the sender's name in front of it.
  const dir = direction(c.text)
  g.direction = dir
  g.textAlign = dir === 'rtl' ? 'right' : 'left'
  g.textBaseline = 'middle'
  g.font = `${l.px}px ${FONT}`
  const hint = c.hint ?? ''
  const label = c.kind === 'draft' && c.head ? c.head.replace(/^↩\s*/, '') : ''
  if (label) {
    g.save()
    g.font = `${HINT_PX}px ${FONT}`
    g.fillStyle = '#bbb'
    g.direction = direction(label)
    g.textAlign = g.direction === 'rtl' ? 'right' : 'left'
    g.fillText(label, g.direction === 'rtl' ? W - PAD : PAD, 4 + HINT_PX / 2)
    g.restore()
  }
  // Text that is too tall for the room above the hint is drawn smaller, never over it.
  // The label's letters reach below its middle line by about half its size; the line starts under them.
  const top = label ? Math.ceil(4 + HINT_PX * 1.35) + 6 : 0
  const room = (hint ? STRIP - HINT_PX - 14 : STRIP - 8) - top
  let px = l.px
  g.font = `${px}px ${FONT}`
  // Measured on the letters' own baseline, the one they are drawn on.
  g.textBaseline = 'alphabetic'
  const box = () => { const m = g.measureText(line); return { up: m.actualBoundingBoxAscent || px * 0.8, down: m.actualBoundingBoxDescent || px * 0.25 } }
  let b = box()
  while (px > 20 && b.up + b.down > room) { px -= 4; g.font = `${px}px ${FONT}`; b = box() }
  // Placed by the drawn letters' own top and bottom, so tall letters never reach the label above.
  const lineY = top + Math.max(0, (room - b.up - b.down) / 2) + b.up + 2
  g.fillText(line, dir === 'rtl' ? W - PAD : PAD, lineY)
  g.textBaseline = 'middle'
  // Which line of how many, as numbers, at the right end of the hint row.
  const pages = opts.pages !== false && l.lines.length > 1 ? `part ${i + 1}/${l.lines.length}${i === l.lines.length - 1 ? ' · end' : ''}` : ''
  if (hint || pages) {
    const y = STRIP - HINT_PX / 2 - 6
    g.font = `${HINT_PX}px ${FONT}`
    g.fillStyle = '#aaa'
    g.direction = direction(hint)
    g.textAlign = g.direction === 'rtl' ? 'right' : 'left'
    let h = hint
    // A long hint is drawn a little smaller first (down to 80%), and cut only if it still does not fit.
    const fits = () => g.measureText(h).width <= W - PAD * 2 - (pages ? g.measureText(pages).width + 16 : 0)
    for (let px = HINT_PX; h && !fits() && px > HINT_PX * 0.8; px--) g.font = `${px - 1}px ${FONT}`
    while (h && !fits()) h = h.slice(0, -2).trimEnd() + '…'
    if (h) g.fillText(h, g.direction === 'rtl' ? W - PAD : PAD, y)
    g.direction = 'ltr'
    g.textAlign = g.direction === 'ltr' && direction(hint) === 'rtl' ? 'left' : 'right'
    if (pages) g.fillText(pages, direction(hint) === 'rtl' ? PAD : W - PAD, y)
  }
  return cv
}

// An empty line (black), drawn while the glasses menu covers the screen.
export function blankStrip(): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = STRIP
  const g = cv.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, STRIP)
  return cv
}

// Cuts the strip into the two tiles the glasses accept (each at most 288 x 144)
// and encodes them as greyscale PNG bytes.
export async function tiles(strip: HTMLCanvasElement): Promise<Uint8Array[]> {
  const out: Uint8Array[] = []
  for (let k = 0; k < 2; k++) {
    const t = document.createElement('canvas')
    t.width = 288
    t.height = STRIP
    t.getContext('2d')!.drawImage(strip, -k * 288, 0)
    const blob: Blob = await new Promise(r => t.toBlob(b => r(b!), 'image/png'))
    out.push(new Uint8Array(await blob.arrayBuffer()))
  }
  return out
}
