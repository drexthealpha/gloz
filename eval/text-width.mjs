// Text width without a browser: Helvetica glyph widths (units per 1000 em) plus 10% for the phone's own
// sans-serif fonts. Used where no canvas exists (tests, measurements); the glasses measure with the real font.
export const AFM = {
  191: "'", 222: 'ijl', 260: '|', 278: ' !,./:;[\\]fIt·', 333: '()-`r', 334: '{}', 355: '"', 389: '*', 400: '°', 469: '^',
  500: 'Jckszvxy', 556: '#$0123456789?L_abdeghnopqu', 584: '+<=>~', 611: 'FTZ', 667: '&ABEKPSVXY', 722: 'CDHNRUw',
  778: 'GOQ', 833: 'Mm', 889: '%', 944: 'W', 1000: '…', 1015: '@',
}
export const WIDTH = new Map(Object.entries(AFM).flatMap(([w, chars]) => [...chars].map(ch => [ch, Number(w)])))
export const measure = (s, px) => [...s].reduce((w, ch) => w + (WIDTH.get(ch) ?? (/[　-鿿가-힯]/.test(ch) ? 1000 : 667)), 0) / 1000 * px * 1.1
