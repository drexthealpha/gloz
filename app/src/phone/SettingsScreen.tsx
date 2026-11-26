// Settings: the glasses language and text size first; the rest under More settings, loaded when opened.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ChevronDown, ALargeSmall } from 'lucide-react'
import { Button } from '@/phone/components/ui/button'
import { Label } from '@/phone/components/ui/label'
import { Slider } from '@/phone/components/ui/slider'
import { NativeSelect, NativeSelectOption } from '@/phone/components/ui/native-select'
import { t } from './strings'
import { field, LANGS } from './shared'
import type { Settings } from '../core/types'

const More = lazy(() => import('./MoreSettings'))
export type Chat = { key: string; label: string; on: boolean; muted?: boolean }
export type Live = { status: string; said: string; muted: number; chats: Chat[] }
export type Theme = 'device' | 'light' | 'dark'
export type Set = (n: Partial<Settings> & { roomLang?: string }) => void

export function SettingsScreen({ settings, current, onChange, live, unmute, pick, unpair, theme, onTheme }: {
  settings: Settings & { roomLang?: string }; current?: () => Settings & { roomLang?: string }; onChange: (n: Partial<Settings> & { roomLang?: string }) => void
  live: () => Live; unmute: () => void; pick: (key: string, on: boolean) => void; unpair?: () => void; theme: Theme; onTheme: (v: Theme) => void
}) {
  const [s, setS] = useState(settings)
  const [l, setL] = useState(live)
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  // Every 2 s: the status, and any setting changed from the glasses menu (text size, line position).
  useEffect(() => { const i = setInterval(() => { setL(live()); if (current) { const c = current(); setS(x => (x.size === c.size && x.low === c.low && x.translate === c.translate ? x : { ...x, size: c.size, low: c.low, translate: c.translate })) } }, 2000); return () => clearInterval(i) }, [live, current])
  const savedAt = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Every change is kept at once and says so for a moment.
  const set = (n: Partial<Settings> & { roomLang?: string }) => { setS(x => ({ ...x, ...n })); onChange(n); setSaved(true); clearTimeout(savedAt.current); savedAt.current = setTimeout(() => setSaved(false), 2500) }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3"><h1 className="m-0 text-3xl leading-normal font-semibold">{t('settingsTitle')}</h1><span aria-live="polite" className="text-base font-semibold">{saved ? t('saved') : ''}</span></div>
      <p role="status" aria-live="polite" data-must-understand className="m-0 text-muted-foreground">{l.status}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lang" className="text-base">{t('myLanguage')}</Label>
        <NativeSelect id="lang" className={field} value={s.myLang} onChange={e => set({ myLang: e.target.value })}>
          {LANGS.map(([c, n]) => <NativeSelectOption key={c} value={c} lang={c}>{n}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label id="sizel" className="text-base"><ALargeSmall aria-hidden="true" className="size-5" /> {t('textSize')}</Label>
          <output className="text-base font-semibold">{t('sizeOf', s.size)}</output>
        </div>
        <Slider data-primary id="size" aria-labelledby="sizel" aria-valuetext={t('sizeOf', s.size)} min={1} max={7} step={1}
          value={s.size} onValueChange={v => set({ size: v })} />
      </div>
      <div className="flex flex-col gap-3">
        <Button variant="outline" aria-expanded={open} aria-controls="more" className={`${field} w-full justify-between`} onClick={() => setOpen(o => !o)}>
          {t('more')} <ChevronDown aria-hidden="true" className={open ? 'rotate-180' : ''} />
        </Button>
        {open && (
          <div id="more" className="flex flex-col gap-2">
            <Suspense fallback={<p className="m-0 text-muted-foreground">{t('loading')}</p>}>
              <More s={s} set={set} l={l} setL={setL} live={live} unmute={unmute} pick={pick} unpair={unpair} theme={theme} onTheme={onTheme} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
