// Say anything: what the wearer said on the home screen, turned into one action.
// Plain word rules, no AI, so it works the same with or without a key and can be tested.
export type Tool = 'tasks' | 'notes' | 'ask' | 'nav' | 'reader' | 'prompter' | 'term' | 'music' | 'stocks' | 'dash' | 'timer' | 'weather' | 'news'
// guess: no command word was said; inside a tool such words stay with that tool.
export interface Said { tool: Tool; op?: 'add' | 'play' | 'pause' | 'next'; arg?: string; guess?: true }

const clean = (s: string) => s.trim().replace(/[.!?。！？]+$/u, '').trim()

export function said(text: string): Said | null {
  const t = clean(text)
  if (!t) return null
  const m = (re: RegExp) => t.match(re)
  let r: RegExpMatchArray | null
  if ((r = m(/^(?:add (?:a )?task|new task|task|remind me to)[\s:,]+(?:to\s+)?(.+)$/i))) return { tool: 'tasks', op: 'add', arg: clean(r[1]) }
  if ((r = m(/^(?:take a note|new note|add (?:a )?note|note(?: that)?)[\s:,]+(.+)$/i))) return { tool: 'notes', op: 'add', arg: clean(r[1]) }
  if ((r = m(/^(?:directions to|navigate to|take me to|route to|how do i get to|go to)\s+(.+)$/i))) return { tool: 'nav', arg: clean(r[1]) }
  if ((r = m(/^(?:run|terminal|command)[\s:,]+(.+)$/i))) return { tool: 'term', arg: clean(r[1]) }
  if (m(/^(?:tele)?prompter$|^(?:my |open (?:my |the )?)?script$/i)) return { tool: 'prompter' }
  if ((r = m(/^(?:read|continue reading|open)\s+(.+)$/i))) return { tool: 'reader', arg: clean(r[1]) }
  if (m(/^(?:read|reader|continue reading)$/i)) return { tool: 'reader' }
  if (m(/^(?:play|resume)(?: music)?$/i)) return { tool: 'music', op: 'play' }
  if (m(/^(?:pause|stop)(?: (?:the )?music)?$/i)) return { tool: 'music', op: 'pause' }
  if (m(/^(?:next (?:song|track)|skip (?:song|track))$/i)) return { tool: 'music', op: 'next' }
  if (m(/^(?:what'?s playing|music|now playing)$/i)) return { tool: 'music' }
  if ((r = m(/^(?:stocks?|my stocks|price of|how is)\s*(.*)$/i)) && (/^stocks?$|^my stocks$/i.test(t) || /^(?:price of|how is)\s/i.test(t))) return { tool: 'stocks', arg: clean(r[1]) || undefined }
  if ((r = m(/^(?:(?:set |start )?(?:a )?timer(?: for)?|countdown(?: for)?)\s*(.*)$/i)) || (r = m(/^(.*\d.*?)\s+timer$/i))) return { tool: 'timer', arg: clean(r[1]) || undefined }
  if (m(/^(?:(?:the |today'?s )?weather(?: today| now| tomorrow)?|forecast|(?:what'?s|how'?s) the weather(?: today| like| tomorrow)*|will it rain(?: today| tomorrow)?)$/i)) return { tool: 'weather' }
  if (m(/^(?:(?:the |today'?s |latest )?news|headlines|(?:what'?s|what is) (?:in )?the news(?: today)?)$/i)) return { tool: 'news' }
  if (m(/^(?:dashboard|my day|today)$/i)) return { tool: 'dash' }
  if (m(/^(?:tasks|my tasks)$/i)) return { tool: 'tasks' }
  if (m(/^(?:notes|my notes)$/i)) return { tool: 'notes' }
  // A question (a question word, "tell me", or a question mark) goes to Ask; anything else said is a task to add.
  if (/[?？]$/.test(text.trim()) || /^(?:what|who|whom|whose|when|where|why|how|which|is|are|was|were|can|could|do|does|did|will|would|should|shall|may|tell me|explain|define|translate|summari[sz]e)\b/i.test(t)) return { tool: 'ask', arg: /[?？]$/.test(text.trim()) && !/[?？]$/.test(t) ? `${t}?` : t, guess: true }
  return { tool: 'tasks', op: 'add', arg: t, guess: true }
}
