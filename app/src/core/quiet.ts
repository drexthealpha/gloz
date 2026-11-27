// Quiet hours: new messages wait on the server until the chosen hour, then all come at once.
// A setting is "from-to" in whole hours of the phone's clock, e.g. "22-7"; empty is off.
export const QUIET_CHOICES = ['', '21-7', '22-7', '23-8', '0-7'] as const

// The hour quiet ends, when `now` is inside the quiet hours; otherwise null.
export function quietUntil(setting: string | undefined, now: Date): number | null {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(setting ?? '')
  if (!m) return null
  const from = Number(m[1]), to = Number(m[2]), h = now.getHours()
  if (from === to) return null
  const inside = from < to ? h >= from && h < to : h >= from || h < to
  return inside ? to : null
}

// "22:00 to 07:00", for the phone's choice list.
export const quietLabel = (setting: string) => setting.split('-').map(h => `${h.padStart(2, '0')}:00`).join(' to ')

// What the glasses say when quiet hours begin, in the wearer's language.
const NOTE: Record<string, (t: string) => string> = {
  en: t => `Quiet until ${t} · messages wait`, ar: t => `هدوء حتى ${t} · الرسائل تنتظر`, fa: t => `سکوت تا ${t} · پیام‌ها منتظر می‌مانند`,
  he: t => `שקט עד ${t} · ההודעות ממתינות`, hi: t => `${t} तक शांत · संदेश रुके हैं`, th: t => `เงียบถึง ${t} · ข้อความรออยู่`,
  ja: t => `${t}まで静か · メッセージは待機中`, ko: t => `${t}까지 조용히 · 메시지 대기 중`, zh: t => `安静至 ${t} · 消息稍后显示`, ru: t => `Тишина до ${t} · сообщения ждут`,
}
export const quietNote = (lang: string, to: number) => (NOTE[lang] ?? NOTE.en)(`${String(to).padStart(2, '0')}:00`)
