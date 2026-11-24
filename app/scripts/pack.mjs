// Packs gloz.ehpk with your Gloz server's address in the network whitelist.
//   GLOZ_BACKEND_ORIGIN=https://your-gloz-server.example npm run pack
// Without it, the package keeps the placeholder address and says so.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const origin = process.env.GLOZ_BACKEND_ORIGIN
const src = readFileSync('app.json', 'utf8')
const app = JSON.parse(src)
if (origin) {
  if (!/^https?:\/\/[^/]+$/.test(origin)) { console.log('GLOZ_BACKEND_ORIGIN must be an origin like https://gloz.example.com'); process.exit(1) }
  app.permissions.find(p => p.name === 'network').whitelist = [origin]
  writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n')
} else console.log('No GLOZ_BACKEND_ORIGIN: the package whitelists the placeholder address; set it to your server to use the package.')
try {
  execSync('npx -y @evenrealities/evenhub-cli@0.2.0 pack app.json dist -o gloz.ehpk --sdk-ver 0.0.16', { stdio: 'inherit' })
} finally { writeFileSync('app.json', src) }
