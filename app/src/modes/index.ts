// Every app in the glasses "Apps" list, in the order shown.
import type { AppEntry } from './types.ts'
import { dashApp } from './dash.ts'
import { askApp } from './ask.ts'
import { musicApp } from './music.ts'
import { navApp } from './nav.ts'
import { stocksApp } from './stocks.ts'
import { termApp } from './term.ts'
import { prompterApp } from './prompter.ts'
import { readerApp } from './reader.ts'
import { notesApp } from './notes.ts'
import { tasksApp } from './tasks.ts'
import { timerApp } from './timer.ts'
import { weatherApp, newsApp } from './feed.ts'

export const APPS: AppEntry[] = [dashApp, tasksApp, notesApp, askApp, weatherApp, newsApp, timerApp, readerApp, prompterApp, navApp, stocksApp, musicApp, termApp]
