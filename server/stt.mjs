// Speech to text on Gloz's own server. The glasses send raw 16 kHz, 16-bit,
// mono PCM (Even Hub docs, Device APIs: Audio). Two engines:
//  1. Whisper running on this server (optional package @huggingface/transformers),
//     so speech never leaves the backend.
//  2. OpenAI transcription when GLOZ_OPENAI_KEY is set (ChatGPT is on the allowed list).
const env = process.env
let local = null
let localTried = false

async function loadLocal() {
  if (localTried) return local
  localTried = true
  try {
    const { pipeline } = await import('@huggingface/transformers')
    local = await pipeline('automatic-speech-recognition', env.GLOZ_WHISPER_MODEL || 'onnx-community/whisper-base', { dtype: 'q8' })
  } catch { local = null }
  return local
}

export function pcmToFloat(buf) {
  const n = Math.floor(buf.length / 2)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2) / 32768
  return out
}

function wav(pcm) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(16000, 24)
  h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

export async function sttReady() {
  return Boolean(env.GLOZ_OPENAI_KEY) || Boolean(await loadLocal())
}

// The wearer speaks their own language (set on the phone), so it is passed in:
// the local Whisper pipeline falls back to English when no language is given.
// Returns { text, ms, engine } or throws when no engine is set up.
export async function transcribe(pcm, lang = 'en') {
  const t0 = performance.now()
  if (pcm.length < 3200) return { text: '', ms: 0, engine: 'none' }   // under 0.1 s: nothing said
  const w = await loadLocal()
  if (w) {
    const r = await w(pcmToFloat(pcm), { language: lang || 'en', task: 'transcribe' })
    return { text: (r.text || '').trim(), ms: Math.round(performance.now() - t0), engine: 'whisper-local' }
  }
  if (env.GLOZ_OPENAI_KEY) {
    const form = new FormData()
    form.append('file', new Blob([wav(pcm)], { type: 'audio/wav' }), 'speech.wav')
    form.append('model', env.GLOZ_OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe')
    if (lang) form.append('language', lang)   // empty: the service finds the language itself
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${env.GLOZ_OPENAI_KEY}` }, body: form })
    if (!r.ok) throw new Error(`stt ${r.status}`)
    const j = await r.json()
    return { text: (j.text || '').trim(), ms: Math.round(performance.now() - t0), engine: 'openai' }
  }
  throw new Error('no speech engine: see .env.example')
}
