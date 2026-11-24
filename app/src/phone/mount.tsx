// Mounts the phone screens. Same two calls as before: pairScreen and settingsScreen.
import { createRoot, type Root } from 'react-dom/client'
import type { Live } from './SettingsScreen'
import type { Settings } from '../core/types'
import './phone.css'

type Theme = 'device' | 'light' | 'dark'
const store = { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} } }

// A stored theme wins; otherwise the page follows the phone (prefers-color-scheme in phone.css).
export function applyTheme(v: Theme) {
  if (v === 'device') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', v)
  store.set('gloz.theme', v)
}
const theme = (): Theme => (store.get('gloz.theme') as Theme) || 'device'
applyTheme(theme())

const roots = new WeakMap<HTMLElement, Root>()
const rootOf = (el: HTMLElement) => { let r = roots.get(el); if (!r) { el.innerHTML = ''; r = createRoot(el); roots.set(el, r) } return r }

// Each screen loads only its own code.
export async function pairScreen(el: HTMLElement, backend: string, onPair: (base: string, code: string) => Promise<void>) {
  const { PairScreen } = await import('./PairScreen')
  rootOf(el).render(<PairScreen backend={backend} onPair={onPair} />)
}

export async function settingsScreen(el: HTMLElement, s: Settings & { roomLang?: string }, onChange: (n: Partial<Settings> & { roomLang?: string }) => void, status: () => string, said: () => string = () => '', muted: () => number = () => 0, unmute: () => void = () => {}, current?: () => Settings & { roomLang?: string }) {
  const { SettingsScreen } = await import('./SettingsScreen')
  const live = (): Live => ({ status: status(), said: said(), muted: muted() })
  const draw = () => rootOf(el).render(<SettingsScreen settings={{ ...s }} current={current} onChange={onChange} live={live} unmute={unmute} theme={theme()} onTheme={v => { applyTheme(v); draw() }} />)
  draw()
}
