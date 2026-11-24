// Parts both phone screens use.
import { useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/phone/components/ui/button'
import { t, type Key } from './strings'

export const CODES = ['en', 'ar', 'fa', 'hi', 'th', 'he', 'ja', 'ko', 'zh', 'ru', 'de', 'fr', 'es', 'it']
// Each language named in itself, as Intl.DisplayNames names it, so a reader finds their own.
export const NAMES: Record<string, string> = { en: 'English', ar: 'العربية', fa: 'فارسی', hi: 'हिन्दी', th: 'ไทย', he: 'עברית', ja: '日本語', ko: '한국어', zh: '中文', ru: 'русский', de: 'Deutsch', fr: 'français', es: 'español', it: 'italiano' }
export const LANGS = CODES.map(c => [c, NAMES[c]] as const)

export const field = 'min-h-12 h-auto text-base'
export const big = 'min-h-12 min-w-12 h-auto text-base'

// Plays a recorded instruction, only when pressed. One plays at a time; a second press stops it.
// If the sound fails, or has not started after 6 s, the button says so.
let playing: HTMLAudioElement | null = null
export function Listen({ k, label }: { k: Key; label?: string }) {
  const a = useRef<HTMLAudioElement>(null)
  const [on, setOn] = useState(false)
  const [none, setNone] = useState(false)
  const wait = useRef<ReturnType<typeof setTimeout>>(undefined)
  return (
    <>
      <Button type="button" variant="outline" className={big} data-audio={k} aria-label={label} aria-pressed={on} onClick={() => { const el = a.current; if (!el) return; if (on) { el.pause(); return } if (playing && playing !== el) playing.pause(); playing = el; setOn(true); setNone(false); el.currentTime = 0
          const fail = () => { el.pause(); setOn(false); setNone(true); setTimeout(() => setNone(false), 2500) }
          clearTimeout(wait.current); wait.current = setTimeout(fail, 6000)
          void el.play().catch(e => { if ((e as Error).name !== 'AbortError') fail() }) }}>
        <Volume2 aria-hidden="true" /> {none ? t('noSound') : on ? t('stop') : t('listen')}
      </Button>
      <audio ref={a} src={`./audio/${k}.mp3`} preload="none" onPlaying={() => clearTimeout(wait.current)} onError={() => { clearTimeout(wait.current); setOn(false); setNone(true); setTimeout(() => setNone(false), 2500) }} onEnded={() => setOn(false)} onPause={() => { clearTimeout(wait.current); setOn(false) }} />
    </>
  )
}
