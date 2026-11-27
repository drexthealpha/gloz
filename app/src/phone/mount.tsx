// Mounts the phone screens. Same two calls as before: pairScreen and settingsScreen.
import { createRoot, type Root } from 'react-dom/client'
import type { Live, Chat } from './SettingsScreen'
import type { Settings } from '../core/types'
import './phone.css'
import { useLang } from './strings'
import { phoneLang } from '../core/phonelang'

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
// The language the wearer picked last time, before anything is drawn.
const savedLang = () => { try { return JSON.parse(store.get('gloz.settings') || '{}').myLang || phoneLang(navigator.languages) } catch { return phoneLang(navigator.languages) } }

const roots = new WeakMap<HTMLElement, Root>()
const rootOf = (el: HTMLElement) => { let r = roots.get(el); if (!r) { el.innerHTML = ''; r = createRoot(el); roots.set(el, r) } return r }

// Each screen loads only its own code.
export async function pairScreen(el: HTMLElement, backend: string, onPair: (base: string, code: string) => Promise<void>) {
  const [{ PairScreen }] = await Promise.all([import('./PairScreen'), useLang(savedLang())])
  rootOf(el).render(<PairScreen backend={backend} onPair={onPair} />)
}

export async function settingsScreen(el: HTMLElement, s: Settings & { roomLang?: string }, onChange: (n: Partial<Settings> & { roomLang?: string }) => void, status: () => string, said: () => string = () => '', muted: () => number = () => 0, unmute: () => void = () => {}, current?: () => Settings & { roomLang?: string }, chats: () => Chat[] = () => [], pick: (key: string, on: boolean) => void = () => {}, unpair?: () => void, ai: () => Live['ai'] = () => null) {
  const [{ SettingsScreen }] = await Promise.all([import('./SettingsScreen'), useLang(s.myLang || savedLang())])
  const live = (): Live => ({ status: status(), said: said(), muted: muted(), chats: chats(), ai: ai() })
  // A new language loads, then the screen is drawn again in it.
  const change = (n: Partial<Settings> & { roomLang?: string }) => { onChange(n); if (n.myLang) void useLang(n.myLang).then(c => { if (c) draw() }) }
  const draw = () => rootOf(el).render(<SettingsScreen settings={{ ...s }} current={current} onChange={change} live={live} unmute={unmute} pick={pick} unpair={unpair} theme={theme()} onTheme={v => { applyTheme(v); draw() }} />)
  draw()
}
