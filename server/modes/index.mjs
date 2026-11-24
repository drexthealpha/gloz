// Server side of the apps in the glasses "Apps" list: one handler per app, keyed by its id.
// Each handler gets the request body and the server context, and returns JSON for the glasses.
import { handle as dash } from './dash.mjs'
import { handle as ask } from './ask.mjs'
import { handle as music } from './music.mjs'
import { handle as nav } from './nav.mjs'
import { handle as stocks } from './stocks.mjs'
import { handle as term } from './term.mjs'
import { handle as prompter } from './prompter.mjs'
import { handle as reader } from './reader.mjs'
import { handle as notes } from './notes.mjs'
import { handle as tasks } from './tasks.mjs'

export const MODES = { dash, ask, music, nav, stocks, term, prompter, reader, notes, tasks }
