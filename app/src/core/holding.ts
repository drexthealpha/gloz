// With no signal and no draft yet, Gloz still offers the short holding reply,
// written on the phone in the sender's language; it waits in the outbox.
import holding from '../../../shared/holding.json' with { type: 'json' }
import type { Draft } from './types'

// Script-based language guess, the same rule the server uses (server/lang.mjs).
export function guessLang(t: string): string {
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

export function holdingReply(message: string, wearer: string): Draft & { lang: string } {
  const H = holding as Record<string, string>
  const lang = guessLang(message)
  const text = H[lang] ?? H.en
  return { text, gloss: lang === wearer ? undefined : H[wearer] ?? H.en, lang, by: 'default' }
}
