// The languages the glasses speak, on their own so the phone page can pick one without loading the glasses' words.
export const GLASS_LANGS = ['en', 'ar', 'fa', 'he', 'hi', 'th', 'ja', 'ko', 'zh', 'ru'] as const

// The first of the phone's own languages that the glasses speak, so a new wearer starts in theirs; else English.
export function phoneLang(langs: readonly string[] = []): string {
  for (const l of langs) { const c = l.toLowerCase().split('-')[0]; if ((GLASS_LANGS as readonly string[]).includes(c)) return c }
  return 'en'
}
