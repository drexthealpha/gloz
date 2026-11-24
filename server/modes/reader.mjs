// Reader on the server: the wearer's texts from Notion or Google Docs (same keys and documents as
// Notes); with GLOZ_SAMPLE=1 or no account, a sample text. Paging happens on the glasses.
import { docsSource, listDocs, readDoc, setupLine } from './notes.mjs'
import { sampleReader } from '../../app/src/modes/reader.ts'

export async function handle(body, { env = process.env } = {}) {
  const a = body?.action
  if (docsSource(env) === 'sample') return sampleReader(body)
  try {
    if (a === 'list') return await listDocs(env)
    if (a === 'read') return await readDoc(env, String(body.id ?? ''))
    return { error: 'unknown action' }
  } catch (e) {
    const line = setupLine(e)
    if (line) return { error: line }
    throw e
  }
}
