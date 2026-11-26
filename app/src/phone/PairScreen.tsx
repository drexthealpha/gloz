// Pairing: type the code the Gloz server shows, press Pair.
import { useState } from 'react'
import { Button } from '@/phone/components/ui/button'
import { Input } from '@/phone/components/ui/input'
import { Label } from '@/phone/components/ui/label'
import { t } from './strings'
import { westernDigits } from './digits'
import { field, Listen } from './shared'

export function PairScreen({ backend, onPair }: { backend: string; onPair: (base: string, code: string) => Promise<void> }) {
  const [base, setBase] = useState(backend)
  const [badBase, setBadBase] = useState(false)
  const [known, setKnown] = useState(backend)   // the address the code step used last
  const [step, setStep] = useState<'server' | 'code'>(backend ? 'code' : 'server')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(0)          // seconds spent pairing; 0 when not pairing
  const [err, setErr] = useState<'' | 'wrong' | 'offline' | 'short'>('')
  const go = async () => {
    if (busy) return
    if (code.length !== 6) { setErr('short'); return }
    setErr('')
    if (!navigator.onLine) { setErr('offline'); return }
    const t0 = Date.now()
    setBusy(1)
    const tick = setInterval(() => setBusy(Math.max(1, Math.round((Date.now() - t0) / 1000))), 1000)
    try { await onPair(base.trim(), code) } catch (e) { setErr(navigator.onLine && (e as { status?: number }).status ? 'wrong' : 'offline') }
    clearInterval(tick)
    setBusy(0)
  }
  return (
    <div className="flex flex-col gap-5 pt-6">
      <h1 className="m-0 text-3xl leading-normal font-semibold">{t('pairTitle')}</h1>
      {step === 'server' ? (
        <form key="server" className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); const ok = /^https?:\/\/[^\s/]+\.?[^\s]*$/.test(base.trim()) && !/\s/.test(base.trim()); setBadBase(!ok); if (ok) { setKnown(base.trim()); setStep('code') } }}>
          <p data-must-understand className="m-0">{t('serverWhere')}</p>
          <Label htmlFor="server" className="text-base">{t('serverLabel')}</Label>
          <Input id="server" dir="ltr" data-no-mirror className={`${field} w-full`} inputMode="url" autoComplete="off" maxLength={300} value={base} onChange={e => setBase(e.target.value)} placeholder="https://" aria-invalid={badBase || undefined} />
          {badBase && <p role="alert" className="m-0 font-semibold text-destructive">⚠ {t('badServer')}</p>}
          <Button data-primary className={`${field} w-full`}>{t('next')}</Button>
          <p className="m-0 text-muted-foreground">{t('dataStays')}</p>
          {known && <Button type="button" variant="outline" className={`${field} w-full`} onClick={() => { setBase(known); setBadBase(false); setStep('code') }}>{t('back')}</Button>}
        </form>
      ) : (
        <form key="code" className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void go() }}>
          <Label htmlFor="code" data-must-understand className="text-lg leading-normal font-normal">{t('pairStep')}</Label>
          <Input id="code" dir="ltr" data-no-mirror className={`${field} w-full text-center text-2xl tracking-[0.3em]`}
            inputMode="numeric" autoComplete="one-time-code" maxLength={20} value={code} aria-invalid={err ? true : undefined}
            onChange={e => { setCode(westernDigits(e.target.value).slice(0, 6)); setErr('') }} />
          <Button data-primary className={`${field} w-full`} disabled={busy > 0} aria-busy={busy > 0 || undefined}>
            {busy ? t('pairing') : t('pair')}
          </Button>
          {busy > 0 && (
            <div role="progressbar" aria-label={t('pairing')} aria-valuemin={0} aria-valuemax={30} aria-valuenow={busy} aria-valuetext={`${busy} s`} className="h-1 w-full overflow-hidden rounded bg-muted">
              <div className="h-full w-1/3 animate-pulse bg-primary" />
            </div>
          )}
          {busy > 0 && <p role="status" className="m-0">{t('pairing')} {busy} s</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p data-recap className="m-0 text-muted-foreground"><span>{t('server')}: </span><bdi dir="ltr" className="break-all">{base}</bdi></p>
            <Listen k="pairStep" label={`${t('listen')}: ${t('pairStep')}`} />
          </div>
        </form>
      )}
      <div role="alert" className="min-h-6">
        {err && (
          <div className="flex flex-col gap-3">
            <p className="m-0 font-semibold text-destructive">⚠ {t(err === 'offline' ? 'offline' : err === 'short' ? 'sixDigits' : 'wrong')}</p>
            {err === 'wrong' && (
              <Button type="button" variant="outline" data-next-step className={field} onClick={() => { setErr(''); setStep('server') }}>
                <Server aria-hidden="true" /> {t('changeServer')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
