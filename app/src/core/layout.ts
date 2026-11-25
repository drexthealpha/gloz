// Splits text into lines that fit the display width at the wearer's size.
// Works for every script the phone can draw: word breaks come from
// Intl.Segmenter, which knows Thai, Japanese and Chinese word boundaries.

export type Measure = (text: string) => number

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/
const STRONG = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿऀ-෿฀-๿぀-ヿ㐀-鿿가-힯]/

// Direction of a line from its first strong character.
export function direction(text: string): 'rtl' | 'ltr' {
  for (const ch of text) {
    if (RTL.test(ch)) return 'rtl'
    if (STRONG.test(ch)) return 'ltr'
  }
  return 'ltr'
}

function segments(text: string, granularity: 'word' | 'grapheme'): string[] {
  const Seg = (Intl as any).Segmenter
  if (!Seg) return granularity === 'word' ? text.split(/(\s+)/).filter(Boolean) : [...text]
  const out: string[] = []
  for (const s of new Seg(undefined, { granularity }).segment(text) as any) {
    // A mark like . , ? ! 。 、 ) never starts a line: it joins the segment before it.
    if (granularity === 'word' && out.length && !s.isWordLike && !/\s/.test(s.segment) && !/^[(\[“"'«¿¡]/.test(s.segment)) out[out.length - 1] += s.segment
    else out.push(s.segment)
  }
  return out
}

export function wrap(text: string, width: number, measure: Measure): string[] {
  const lines: string[] = []
  for (const para of text.replace(/\r/g, '').split('\n')) {
    let line = ''
    for (const seg of segments(para, 'word')) {
      const next = line + seg
      // A time or number (07:12, 3.5) is never broken at its colon or point.
      if (measure(next.trimEnd()) <= width || (line.trim() && !/[\p{L}\p{N}]/u.test(seg)) || (/\d[:.,]$/.test(line) && /^\d/.test(seg))) { line = next; continue }
      if (line.trim()) lines.push(line.trim())
      // A segment wider than the line (a long link or word) is cut by grapheme.
      if (measure(seg.trim()) > width) {
        let part = ''
        for (const g of segments(seg.trim(), 'grapheme')) {
          if (measure(part + g) > width && part) { lines.push(part); part = '' }
          part += g
        }
        line = part
      } else {
        line = seg.trimStart()
      }
    }
    if (line.trim()) lines.push(line.trim())
  }
  return lines.length ? lines : ['']
}

// Seconds a line stays up when lines move on by themselves, at least 3 s.
// Alphabets: 238 words a minute (Brysbaert, 2019), about 5.7 characters a word.
// Chinese and Japanese: about 5 characters a second (Trauzettel-Klosinski and
// Dietz, 2012, IReST: Chinese 255 and Japanese 357 characters a minute).
const CJK = /[぀-ヿ㐀-鿿가-힯฀-๿]/
export function dwell(line: string): number {
  const chars = [...line].length
  // Read on glasses while doing something else: slower than page reading.
  const perSecond = CJK.test(line) ? 3 : 8
  return Math.max(4, chars / perSecond + 1.5)
}
