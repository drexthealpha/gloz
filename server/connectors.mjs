// One file per service would be tidier, but each connector is small: read new
// messages from the chats the wearer picked, send a reply, mark as read.
// Every connector is off until its keys are set in the backend's environment.
const env = process.env
const list = v => (v || '').split(',').map(s => s.trim()).filter(Boolean)

async function getJSON(url, opts = {}) {
  const r = await fetch(url, opts)
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`)
  return r.json()
}

// --- Telegram (Bot API) -------------------------------------------------------
// The bot sees direct messages to it and messages in groups it is in.
// TELEGRAM_CHATS limits it to the chats the wearer picked (chat ids).
export function telegram() {
  const token = env.GLOZ_TELEGRAM_BOT_TOKEN
  if (!token) return null
  const api = m => `https://api.telegram.org/bot${token}/${m}`
  const chats = list(env.GLOZ_TELEGRAM_CHATS)
  let offset = 0
  // wait: seconds Telegram holds the request open until a message comes (long polling), 0 to return at once.
  async function updates(wait) {
      const j = await getJSON(api(`getUpdates?timeout=${wait}&offset=${offset}&allowed_updates=["message"]`))
      const out = []
      for (const u of j.result) {
        offset = Math.max(offset, u.update_id + 1)
        const m = u.message
        if (!m?.text) continue
        if (chats.length && !chats.includes(String(m.chat.id))) continue
        const from = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || m.from?.username || 'Someone'
        out.push({ id: `telegram:${m.chat.id}:${m.message_id}`, source: 'telegram', chat: m.chat.title || from, from, text: m.text, at: m.date * 1000, ref: { chat: m.chat.id, mid: m.message_id } })
      }
      return out
  }
  return {
    name: 'telegram',
    poll: () => updates(0),
    // Pushes each message as soon as Telegram has it; on an error, waits 3 s and listens again.
    async listen(push, stopped) {
      while (!stopped()) {
        try { const ms = await updates(25); if (ms.length) push(ms) } catch { await new Promise(r => setTimeout(r, 3000)) }
      }
    },
    async send(msg, text) {
      await getJSON(api('sendMessage'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: msg.ref.chat, text, reply_parameters: { message_id: msg.ref.mid } }) })
    },
    async read() {},  // the Bot API has no read receipts
  }
}

// --- Telegram account (official client API, the wearer's own chats) ----------
// Sees every chat the wearer has, not only chats with a bot. Needs an API id and
// hash from my.telegram.org and a one-time login: node server/telegram-login.mjs
export function telegramAccount() {
  const { GLOZ_TELEGRAM_API_ID: id, GLOZ_TELEGRAM_API_HASH: hash, GLOZ_TELEGRAM_SESSION: session } = env
  if (!id || !hash || !session) return null
  const chats = list(env.GLOZ_TELEGRAM_CHATS)
  let client, queue = [], ready = null
  function connect() {
    ready ??= (async () => {
      const { TelegramClient } = await import('telegram')
      const { StringSession } = await import('telegram/sessions/index.js')
      const { NewMessage } = await import('telegram/events/index.js')
      client = new TelegramClient(new StringSession(session), Number(id), hash, { connectionRetries: 10, autoReconnect: true })
      client.setLogLevel?.('error')
      await client.connect()
      await client.getDialogs({ limit: 200 })   // so replies can reach every chat after a restart
      client.addEventHandler(async ev => {
        const m = ev.message
        if (!m?.message || m.out) return
        const chatId = String(m.chatId)
        if (chats.length && !chats.includes(chatId)) return
        const sender = await m.getSender().catch(() => null)
        const chat = await m.getChat().catch(() => null)
        const from = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || sender?.title || sender?.username || 'Someone'
        queue.push({ id: `telegram-account:${chatId}:${m.id}`, source: 'telegram-account', chat: chat?.title || from, from, text: m.message, at: m.date * 1000, ref: { chat: chatId, mid: m.id } })
      }, new NewMessage({}))
    })()
    return ready
  }
  return {
    name: 'telegram-account',
    async poll() { await connect(); const q = queue; queue = []; return q },
    async send(msg, text) { await connect(); await client.sendMessage(msg.ref.chat, { message: text, replyTo: msg.ref.mid }) },
    async read(msg) { await connect(); await client.markAsRead(msg.ref.chat, msg.ref.mid).catch(() => {}) },
  }
}

// --- Slack (Web API, user token so replies come from the wearer) -----------
export function slack() {
  const token = env.GLOZ_SLACK_TOKEN
  if (!token) return null
  const h = { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=utf-8' }
  const channels = list(env.GLOZ_SLACK_CHANNELS)
  const since = {}
  const names = {}
  async function who(id) {
    if (!names[id]) { try { const j = await getJSON(`https://slack.com/api/users.info?user=${id}`, { headers: h }); names[id] = j.user?.real_name || j.user?.name || id } catch { names[id] = id } }
    return names[id]
  }
  return {
    name: 'slack',
    async poll() {
      const out = []
      for (const ch of channels) {
        const j = await getJSON(`https://slack.com/api/conversations.history?channel=${ch}&limit=20${since[ch] ? `&oldest=${since[ch]}` : ''}`, { headers: h })
        if (!j.ok) throw new Error(`slack ${j.error}`)
        const first = !since[ch]
        let max = since[ch] || '0'
        for (const m of j.messages || []) {
          if (Number(m.ts) > Number(max)) max = m.ts
          if (first || !m.text || m.subtype) continue   // the first read only sets the starting point
          out.push({ id: `slack:${ch}:${m.ts}`, source: 'slack', chat: ch, from: await who(m.user), text: m.text, at: Number(m.ts) * 1000, ref: { ch, ts: m.thread_ts || m.ts } })
        }
        since[ch] = max
      }
      return out
    },
    async send(msg, text) {
      const j = await getJSON('https://slack.com/api/chat.postMessage', { method: 'POST', headers: h, body: JSON.stringify({ channel: msg.ref.ch, thread_ts: msg.ref.ts, text }) })
      if (!j.ok) throw new Error(`slack ${j.error}`)
    },
    async read(msg) {
      await getJSON('https://slack.com/api/conversations.mark', { method: 'POST', headers: h, body: JSON.stringify({ channel: msg.ref.ch, ts: msg.ref.ts }) }).catch(() => {})
    },
  }
}

// --- Discord (bot) ----------------------------------------------------------
export function discord() {
  const token = env.GLOZ_DISCORD_BOT_TOKEN
  if (!token) return null
  const h = { authorization: `Bot ${token}`, 'content-type': 'application/json' }
  const channels = list(env.GLOZ_DISCORD_CHANNELS)
  const after = {}
  return {
    name: 'discord',
    async poll() {
      const out = []
      for (const ch of channels) {
        const ms = await getJSON(`https://discord.com/api/v10/channels/${ch}/messages?limit=20${after[ch] ? `&after=${after[ch]}` : ''}`, { headers: h })
        const first = !after[ch]
        for (const m of ms.reverse()) {
          after[ch] = m.id
          if (first || !m.content || m.author?.bot) continue
          out.push({ id: `discord:${ch}:${m.id}`, source: 'discord', chat: ch, from: m.author?.global_name || m.author?.username || 'Someone', text: m.content, at: Date.parse(m.timestamp), ref: { ch, mid: m.id } })
        }
      }
      return out
    },
    async send(msg, text) {
      await getJSON(`https://discord.com/api/v10/channels/${msg.ref.ch}/messages`, { method: 'POST', headers: h, body: JSON.stringify({ content: text, message_reference: { message_id: msg.ref.mid } }) })
    },
    async read() {},
  }
}

// --- Gmail (OAuth refresh token; see server/google-auth.mjs) ----------------
export function gmail() {
  const { GLOZ_GOOGLE_CLIENT_ID: id, GLOZ_GOOGLE_CLIENT_SECRET: secret, GLOZ_GOOGLE_REFRESH_TOKEN: refresh } = env
  if (!id || !secret || !refresh) return null
  let access = '', until = 0
  async function auth() {
    if (Date.now() < until) return access
    const j = await getJSON('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }) })
    access = j.access_token
    until = Date.now() + (j.expires_in - 60) * 1000
    return access
  }
  const G = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const hdr = (p, n) => p.headers?.find(h => h.name.toLowerCase() === n)?.value || ''
  function body(p) {
    if (p.mimeType === 'text/plain' && p.body?.data) return Buffer.from(p.body.data, 'base64url').toString('utf8')
    for (const c of p.parts || []) { const t = body(c); if (t) return t }
    return ''
  }
  const seen = new Set()
  return {
    name: 'gmail',
    async poll() {
      const h = { authorization: `Bearer ${await auth()}` }
      const j = await getJSON(`${G}/messages?q=${encodeURIComponent('is:unread category:primary newer_than:2d')}&maxResults=10`, { headers: h })
      const out = []
      for (const { id: mid } of j.messages || []) {
        if (seen.has(mid)) continue
        seen.add(mid)
        const m = await getJSON(`${G}/messages/${mid}?format=full`, { headers: h })
        const p = m.payload
        // Only the new part of the mail: stop at the quoted earlier mail.
        const text = body(p).split(/\r?\n(?:On .+wrote:|>)/)[0].trim().slice(0, 1500) || m.snippet
        out.push({ id: `gmail:${mid}`, source: 'gmail', chat: hdr(p, 'subject') || '(no subject)', from: hdr(p, 'from').replace(/<.*>/, '').replace(/"/g, '').trim(), text, at: Number(m.internalDate), ref: { mid, thread: m.threadId, msgid: hdr(p, 'message-id'), to: hdr(p, 'reply-to') || hdr(p, 'from'), subject: hdr(p, 'subject') } })
      }
      return out
    },
    async send(msg, text) {
      const r = msg.ref
      const subject = /^re:/i.test(r.subject) ? r.subject : `Re: ${r.subject}`
      const raw = [`To: ${r.to}`, `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`, `In-Reply-To: ${r.msgid}`, `References: ${r.msgid}`, 'Content-Type: text/plain; charset=UTF-8', '', text].join('\r\n')
      await getJSON(`${G}/messages/send`, { method: 'POST', headers: { authorization: `Bearer ${await auth()}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url'), threadId: r.thread }) })
    },
    async read(msg) {
      await getJSON(`${G}/messages/${msg.ref.mid}/modify`, { method: 'POST', headers: { authorization: `Bearer ${await auth()}`, 'content-type': 'application/json' }, body: JSON.stringify({ removeLabelIds: ['UNREAD'] }) }).catch(() => {})
    },
  }
}

// --- Sample messages (GLOZ_SAMPLE=1 only) ------------------------------------
// The same 10 sample messages as the live demo, for trying Gloz in the simulator
// before any service is connected. Replies are written to the log, not sent anywhere.
import { readFileSync } from 'node:fs'
export function sample() {
  if (env.GLOZ_SAMPLE !== '1') return null
  let given = false
  return {
    name: 'sample',
    async poll() {
      if (given) return []
      given = true
      const list = JSON.parse(readFileSync(new URL('../app/src/demo-inbox.json', import.meta.url), 'utf8'))
      return list.map((m, i) => ({ id: `sample:${m.id}`, source: 'sample', chat: m.chat, from: m.from, text: m.text, at: Date.now() - i * 60000, ref: {} }))
    },
    async send(msg, text) { console.log(`[sample] reply to ${msg.id}: ${text}`) },
    async read() {},
  }
}

export function connectors() {
  return [telegram(), telegramAccount(), slack(), discord(), gmail(), sample()].filter(Boolean)
}
