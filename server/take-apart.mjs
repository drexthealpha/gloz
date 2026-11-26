// Take apart: "how does example.com's search work?" said to Ask. The server fetches the site's page and
// scripts, finds the code for the feature named, and hands that evidence to the AI with the question,
// so the answer comes from the site's own code. When rea is installed on the server
// (npm install -g rea-agents; github.com/morluto/rea, MIT License, Copyright (c) 2026 morluto), its JavaScript analysis
// adds the modules and imports that match; without it, the scripts are searched directly.
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { exec } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STOP = new Set('how does do the a an of on in at to for is it its work works working what which why when site app website page feature their there this that and with by from does s handle handles use uses implement get make makes show shows'.split(' '))
const MAX_SCRIPTS = 8, MAX_BYTES = 2_000_000

// The site and the feature words in a question, or null when no site is named.
export function target(q) {
  const m = String(q).toLowerCase().match(/\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/\S*)?/)
  if (!m || !/^how\b/.test(String(q).trim().toLowerCase())) return null
  const site = m[0].replace(/[?.,!]+$/, '').replace(/'s$/, '')
  const words = String(q).toLowerCase().replace(m[0], ' ').replace(/'s\b/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w))
  return { url: /^https?:/.test(site) ? site : `https://${site}`, words }
}

// Lines of the scripts that name a feature word, each cut to 160 characters, at most n.
export function snippets(files, words, n = 14) {
  const out = []
  if (!words.length) return out
  const re = new RegExp(words.map(w => w.replace(/[^a-z0-9]/g, '')).join('|'), 'i')
  for (const f of files) {
    for (const piece of f.text.split(/[;\n]/)) {
      if (!re.test(piece)) continue
      const i = piece.search(re)
      out.push(`${f.name}: ${piece.slice(Math.max(0, i - 60), i + 100).trim()}`)
      if (out.length >= n) return out
    }
  }
  return out
}

function reaRun(dir) {
  // dir is a folder this server just made (mkdtemp), so it is safe inside the quoted command.
  return new Promise(done => exec(`rea analyze-javascript-application "${dir}" --json`, { timeout: 60000, maxBuffer: 1 << 26 }, (e, out) => {
    if (e) return done(null)
    try { done(JSON.parse(out)) } catch { done(null) }
  }))
}

// The names in rea's result (modules, imports) that match a feature word.
export function reaNames(json, words) {
  const names = new Set()
  const walk = v => {
    if (names.size >= 20 || v == null) return
    if (typeof v === 'string') { if (v.length < 200 && words.some(w => v.toLowerCase().includes(w))) names.add(v); return }
    if (typeof v === 'object') for (const x of Object.values(v)) walk(x)
  }
  walk(json)
  return [...names]
}

// Evidence for the AI, or null when the question names no site or the site cannot be read.
export async function evidence(q, { get = globalThis.fetch, rea = reaRun } = {}) {
  const t = target(q)
  if (!t) return null
  try {
    const r = await get(t.url, { headers: { 'user-agent': 'Gloz/0.1' }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const html = await r.text()
    const files = [{ name: 'page', text: html.slice(0, MAX_BYTES) }]
    const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => new URL(m[1], t.url).href).slice(0, MAX_SCRIPTS)
    for (const s of srcs) {
      try { const j = await get(s, { headers: { 'user-agent': 'Gloz/0.1' }, signal: AbortSignal.timeout(8000) }); if (j.ok) files.push({ name: new URL(s).pathname.split('/').pop() || s, text: (await j.text()).slice(0, MAX_BYTES) }) } catch {}
    }
    let found = []
    const dir = await mkdtemp(join(tmpdir(), 'gloz-rea-'))
    try {
      await Promise.all(files.map((f, i) => writeFile(join(dir, `${i}-${f.name.replace(/[^\w.-]/g, '_')}${/\.m?js$/.test(f.name) ? '' : '.html'}`), f.text)))
      const j = await rea(dir)
      if (j) found = reaNames(j, t.words)
    } finally { await rm(dir, { recursive: true, force: true }) }
    // The scripts first, then the page: code says more than markup.
    const lines = snippets([...files.slice(1), files[0]], t.words)
    if (!lines.length && !found.length) return { url: t.url, text: `Read ${files.length} files from ${t.url}; none names ${t.words.join(', ') || 'the feature'}.`, rea: false }
    return { url: t.url, rea: found.length > 0, text: [found.length ? `rea found: ${found.join(', ')}` : '', ...lines].filter(Boolean).join('\n') }
  } catch { return null }
}
