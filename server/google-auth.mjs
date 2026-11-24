// One-time Gmail sign-in for the backend: opens Google's consent page and
// writes the refresh token into .env. Google sign-in does not work inside the
// glasses WebView, so it happens here, on the machine that runs the backend.
//   GLOZ_GOOGLE_CLIENT_ID=... GLOZ_GOOGLE_CLIENT_SECRET=... node server/google-auth.mjs
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'

const id = process.env.GLOZ_GOOGLE_CLIENT_ID
const secret = process.env.GLOZ_GOOGLE_CLIENT_SECRET
if (!id || !secret) { console.log('Set GLOZ_GOOGLE_CLIENT_ID and GLOZ_GOOGLE_CLIENT_SECRET first (a Desktop app OAuth client).'); process.exit(1) }
const port = 8788
const redirect = `http://127.0.0.1:${port}/`
// Read, send, and mark as read. Nothing else.
const scope = 'https://www.googleapis.com/auth/gmail.modify'
const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', scope, access_type: 'offline', prompt: 'consent' })}`

const srv = createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code')
  if (!code) { res.end('No code.'); return }
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }) })
  const j = await r.json()
  if (!j.refresh_token) { res.end('Google gave no refresh token. Try again.'); console.log('No refresh token returned.'); srv.close(); return }
  appendFileSync('.env', `\nGLOZ_GOOGLE_REFRESH_TOKEN=${j.refresh_token}\n`)
  res.end('Gmail is connected to Gloz. You can close this tab.')
  console.log('Saved the refresh token to .env (not printed).')
  srv.close()
}).listen(port, () => console.log(`Open this address in a browser and allow access:\n${url}`))
