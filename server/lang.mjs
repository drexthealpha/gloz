// Script-based language guess. Good enough to pick the reply language and the
// fallback reply when no AI key is set; the AI model does the real work when one is.
export function guessLang(text) {
  const t = text || ''
  // Persian uses پ چ ژ گ and its own ک (U+06A9) and ی (U+06CC); Arabic uses ك and ي.
  if (/[؀-ۿ]/.test(t)) return /[پچژگکی]/.test(t) ? 'fa' : 'ar'
  if (/[֐-׿]/.test(t)) return 'he'
  if (/[ऀ-ॿ]/.test(t)) return 'hi'
  if (/[฀-๿]/.test(t)) return 'th'
  if (/[가-힯]/.test(t)) return 'ko'
  if (/[぀-ヿ]/.test(t)) return 'ja'
  if (/[一-鿿]/.test(t)) return 'zh'
  if (/[Ѐ-ӿ]/.test(t)) return 'ru'
  return 'en'
}

export const NAMES = { ar: 'Arabic', fa: 'Persian', he: 'Hebrew', hi: 'Hindi', th: 'Thai', ko: 'Korean', ja: 'Japanese', zh: 'Chinese', ru: 'Russian', en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian' }

// The reply Gloz offers when no AI model can be reached: a short holding reply
// in the sender's language, with its meaning in English. It is labelled as such
// on the glasses and still needs the wearer's tap.
import { readFileSync } from 'node:fs'
export const HOLDING = JSON.parse(readFileSync(new URL('../shared/holding.json', import.meta.url), 'utf8'))
