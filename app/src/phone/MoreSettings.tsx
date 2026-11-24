// The rest of the settings, loaded the first time More settings opens.
import { useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { Button } from '@/phone/components/ui/button'
import { Label } from '@/phone/components/ui/label'
import { Switch } from '@/phone/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/phone/components/ui/toggle-group'
import { NativeSelect, NativeSelectOption } from '@/phone/components/ui/native-select'
import { t } from './strings'
import { big, field, LANGS, Listen } from './shared'
import type { Live, Set, Theme } from './SettingsScreen'
import type { Settings } from '../core/types'

export default function MoreSettings({ s, set, l, setL, live, unmute, pick, theme, onTheme }: {
  s: Settings & { roomLang?: string }; set: Set; l: Live; setL: (l: Live) => void; live: () => Live; unmute: () => void; pick: (key: string, on: boolean) => void; theme: Theme; onTheme: (v: Theme) => void
}) {
  const [copied, setCopied] = useState('')
  const [unmutedNote, setUnmutedNote] = useState(false)
  const [chatsOpen, setChatsOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label id="linel" className="text-base">{t('line')}</Label>
        <ToggleGroup type="single" variant="outline" spacing={2} aria-labelledby="linel" value={s.low ? 'low' : 'middle'} onValueChange={v => v && set({ low: v === 'low' })} className="w-full flex-wrap gap-2">
          <ToggleGroupItem value="middle" className={`${big} flex-1`}>{t('middle')}</ToggleGroupItem>
          <ToggleGroupItem value="low" className={`${big} flex-1`}>{t('low')}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
        <Label htmlFor="tr" className="min-w-0 flex-1 basis-40 text-base">{t('translate')}</Label>
        <Switch id="tr" checked={s.translate} onCheckedChange={v => set({ translate: v })} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="room" className="text-base">{t('roomLang')}</Label>
        <NativeSelect id="room" className={field} value={s.roomLang ?? ''} onChange={e => set({ roomLang: e.target.value })}>
          <NativeSelectOption value="">{t('findIt')}</NativeSelectOption>
          {LANGS.map(([c, n]) => <NativeSelectOption key={c} value={c} lang={c}>{n}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label id="themel" className="text-base">{t('theme')}</Label>
        <ToggleGroup type="single" variant="outline" spacing={2} aria-labelledby="themel" data-theme-switch value={theme} onValueChange={v => v && onTheme(v as Theme)} className="w-full flex-wrap gap-2">
          <ToggleGroupItem value="device" className={`${big} flex-1`}>{t('device')}</ToggleGroupItem>
          <ToggleGroupItem value="light" className={`${big} flex-1`}>{t('light')}</ToggleGroupItem>
          <ToggleGroupItem value="dark" className={`${big} flex-1`}>{t('dark')}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {unmutedNote && <p role="status" className="m-0 font-semibold">{t('unmuted')}</p>}
      {(l.muted > 0 || l.chats.length > 0) && (
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 flex-1 basis-40">{l.muted > 0 ? (l.muted === 1 ? t('mutedChat') : t('mutedChats', l.muted)) : l.chats.some(c => c.on) ? t('onlyPicked') : t('allChats')}</span>
          <Button variant="outline" className={big} aria-expanded={chatsOpen} aria-controls="chatlist" onClick={() => setChatsOpen(!chatsOpen)}>{t('chats')}</Button>
        </div>
      )}
      {chatsOpen && (
        <fieldset id="chatlist" className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-base font-semibold">{t('onlyChats')}</legend>
          {l.muted > 0 && <Button variant="outline" className={`${big} w-full`} onClick={() => { unmute(); setL(live()); setUnmutedNote(true); setTimeout(() => setUnmutedNote(false), 4000) }}>{t('unmute')}</Button>}
          {l.chats.map((c, k) => (
            <div key={c.key} className="flex min-h-12 flex-wrap items-center justify-between gap-3">
              <Label htmlFor={`chat${k}`} className="min-w-0 flex-1 basis-40 text-base"><bdi>{c.label}</bdi></Label>
              <Switch id={`chat${k}`} checked={c.on} onCheckedChange={v => { pick(c.key, v); setL(live()) }} />
            </div>
          ))}
        </fieldset>
      )}
      {l.said && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-xl font-semibold">{t('lastTalk')}</h2>
          <p data-ai-notice className="m-0 text-muted-foreground">{t('aiNotice')}</p>
          <pre role="log" data-user-content dir="auto" className="m-0 max-h-60 overflow-auto rounded-lg border p-3 font-sans text-base whitespace-pre-wrap">{l.said}</pre>
          <div className="flex gap-2">
            <Button variant="outline" className={`${big} flex-1`} onClick={async () => { try { await navigator.clipboard.writeText(l.said); setCopied(t('copied')) } catch { const log = document.querySelector('[role=log]'); if (log) getSelection()?.selectAllChildren(log); setCopied(t('noCopy')) } setTimeout(() => setCopied(''), 3000) }}><Copy aria-hidden="true" /> {copied || t('copy')}</Button>
            {typeof navigator.share === 'function' && <Button variant="outline" className={`${big} flex-1`} onClick={() => { void navigator.share({ title: t('lastTalk'), text: l.said }).catch(() => {}) }}><Share2 aria-hidden="true" /> {t('share')}</Button>}
          </div>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-xl font-semibold">{t('howTo')}</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {(['help1', 'help2', 'help3', 'help4'] as const).map(k => (
            <li key={k} className="flex flex-wrap items-center justify-between gap-3"><span className="min-w-0 flex-1 basis-40">{t(k)}</span><Listen k={k} label={`${t('listen')}: ${t(k)}`} /></li>
          ))}
        </ul>
      </section>
    </>
  )
}
