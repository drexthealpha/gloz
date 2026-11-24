// One-time Telegram account login for the backend. Asks for the phone number, the
// code Telegram sends, and the two-step password if one is set, then writes the
// session into .env. Nothing secret is printed.
//   node --env-file=.env server/telegram-login.mjs   (with GLOZ_TELEGRAM_API_ID and GLOZ_TELEGRAM_API_HASH set)
import { createInterface } from 'node:readline/promises'
import { appendFileSync } from 'node:fs'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

const id = Number(process.env.GLOZ_TELEGRAM_API_ID), hash = process.env.GLOZ_TELEGRAM_API_HASH
if (!id || !hash) { console.log('Set GLOZ_TELEGRAM_API_ID and GLOZ_TELEGRAM_API_HASH first (my.telegram.org, API development tools).'); process.exit(1) }
const rl = createInterface({ input: process.stdin, output: process.stdout })
const client = new TelegramClient(new StringSession(''), id, hash, { connectionRetries: 5 })
client.setLogLevel?.('error')
await client.start({
  phoneNumber: () => rl.question('Phone number (with country code): '),
  phoneCode: () => rl.question('Code from Telegram: '),
  password: () => rl.question('Two-step password (empty if none): '),
  onError: e => console.log('Telegram said:', e.message),
})
appendFileSync('.env', `\nGLOZ_TELEGRAM_SESSION=${client.session.save()}\n`)
console.log('Telegram account connected. The session is saved in .env (not printed).')
rl.close()
await client.disconnect()
process.exit(0)
