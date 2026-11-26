// A small stand-in for tailwind-merge: when two classes set the same thing under the same variants, the
// later one wins. It knows the class families Gloz's screens use, and a test checks it gives the same
// result as tailwind-merge on every class combination in the app (test/merge.test.ts).
const SIZES = /^(xs|sm|base|lg|xl|\d?xl|\[\d+(\.\d+)?(px|rem|em)\])$/
const DISPLAY = /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents|table)$/
const FAMILIES = ['min-h', 'min-w', 'max-h', 'max-w', 'size', 'h', 'w', 'basis', 'gap-x', 'gap-y', 'gap', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe', 'p', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me', 'm', 'rounded', 'leading', 'tracking', 'justify', 'items', 'self', 'whitespace', 'overflow-x', 'overflow-y', 'overflow', 'opacity', 'shadow', 'z', 'top', 'bottom', 'left', 'right', 'inset', 'shrink', 'grow', 'order', 'cursor', 'select', 'pointer-events', 'transition', 'duration', 'object', 'aspect', 'list', 'content', 'break', 'align', 'resize', 'appearance']

function family(c: string): string {
  if (DISPLAY.test(c)) return 'display'
  if (/^text-(left|center|right|justify|start|end)$/.test(c)) return 'text-align'
  if (c.startsWith('text-')) return SIZES.test(c.slice(5)) ? 'text-size' : 'text-color'
  if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/.test(c)) return 'font-weight'
  if (c.startsWith('font-')) return 'font-family'
  if (/^border(-[trblxy])?(-\d+|-\[.+\])?$/.test(c)) return c.replace(/-(\d+|\[.+\])$/, '') + '-width'
  if (c.startsWith('border-')) return 'border-color'
  if (/^ring(-\d+|-\[.+\])?$/.test(c)) return 'ring-width'
  if (c.startsWith('ring-offset-')) return 'ring-offset'
  if (c.startsWith('ring-')) return 'ring-color'
  if (c.startsWith('outline-offset')) return 'outline-offset'
  if (/^outline(-\d+|-\[.+\])?$/.test(c)) return 'outline-width'
  if (/^outline-(none|hidden|solid|dashed|dotted|double)$/.test(c)) return 'outline-style'
  if (c.startsWith('outline-')) return 'outline-color'
  if (c.startsWith('bg-')) return 'bg'
  if (c.startsWith('flex-') && /^flex-(row|col|row-reverse|col-reverse)$/.test(c)) return 'flex-direction'
  if (/^flex-(wrap|nowrap|wrap-reverse)$/.test(c)) return 'flex-wrap'
  if (/^flex-(1|auto|initial|none)$/.test(c)) return 'flex'
  for (const f of FAMILIES) if (c === f || c.startsWith(f + '-')) return f
  return c   // unknown: only an identical class replaces it
}

// A class for the whole also replaces earlier ones for its parts (p-0 replaces px-4).
const PARTS: Record<string, string[]> = {
  p: ['px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'], px: ['pl', 'pr'], py: ['pt', 'pb'],
  m: ['mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me'], mx: ['ml', 'mr'], my: ['mt', 'mb'],
  size: ['h', 'w'], 'text-size': ['leading'], flex: ['shrink', 'grow', 'basis'], gap: ['gap-x', 'gap-y'], overflow: ['overflow-x', 'overflow-y'], inset: ['top', 'bottom', 'left', 'right'],
  'border-width': ['border-t-width', 'border-r-width', 'border-b-width', 'border-l-width', 'border-x-width', 'border-y-width'],
}

export function merge(classes: string): string {
  const out: string[] = [], seen = new Map<string, number>()
  for (const c of classes.split(/\s+/).filter(Boolean)) {
    const i = c.lastIndexOf(':')
    const variant = i < 0 ? '' : c.slice(0, i + 1), base = c.slice(i + 1).replace(/^!/, '')
    const f = family(base.replace(/^-/, ''))
    for (const k of [f, ...(PARTS[f] || [])]) { const at = seen.get(variant + k); if (at !== undefined) { out[at] = ''; seen.delete(variant + k) } }
    seen.set(variant + f, out.length)
    out.push(c)
  }
  return out.filter(Boolean).join(' ')
}
