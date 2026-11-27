// The glasses side: one line on screen, drawn as two image tiles, and every
// press turned into a flow event. A full-screen blank text container sits behind
// the images to take input (Even Hub docs, Display: "Image-first apps").
import {
  type EvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
  OsEventTypeList,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'
import type { Card } from './core/types.ts'
import { dwell } from './core/layout.ts'
import { pressOf } from './core/press.ts'
import { layoutFor, drawLine, tiles, blankStrip, drawGrid, tiles4, STRIP, FULL_H, type Lines } from './render.ts'

export type Input = 'tap' | 'next' | 'prev' | 'hold' | 'release' | 'exit'

// A send the glasses never answer must not hold every later screen back: after 3 s the next one goes.
function within<T>(p: Promise<T>, ms = 3000): Promise<T | void> {
  let t: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<void>(ok => { t = setTimeout(() => { console.warn('[gloz] draw timed out'); late = true; ok() }, ms) })
  return Promise.race([p, timedOut]).finally(() => clearTimeout(t))
}
let late = false   // a send timed out since the last full screen was drawn

export class Glasses {
  private bridge: EvenAppBridge
  private card: Card | null = null
  private lay: Lines | null = null
  private line = 0
  private size = 3
  private low = false
  private autoPace = true
  private manualTimer: ReturnType<typeof setTimeout> | null = null
  private manual = false   // the wearer swiped: pages stop moving on by themselves for a moment
  private lineAt = Date.now()
  private menuOpen = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private drawing = Promise.resolve()
  private gen = 0
  private landed = ''
  onInput: (i: Input) => void = () => {}
  onAudio: (pcm: Uint8Array) => void = () => {}
  onTurn: () => void = () => {}   // the wearer moved to another part of the same card
  onMenu: (id: number) => void = () => {}
  onMenuClosed = () => {}

  constructor(bridge: EvenAppBridge) { this.bridge = bridge; setInterval(() => this.tick(), 400) }

  private y() { return this.low ? 288 - STRIP - 8 : (288 - STRIP) / 2 }

  private menu: { itemName: string; itemID: number }[] = []
  private full = false   // a grid card fills the display with four tiles
  private rebuildDue = false   // the page must switch before the next screen is sent

  private page() {
    const y = this.y()
    if (this.full) return {
      containerTotalNum: 5,
      textObject: [new TextContainerProperty({ xPosition: 0, yPosition: 0, width: 576, height: 288, containerID: 1, containerName: 'input', content: ' ', isEventCapture: 1, zOrderIndex: 1 })],
      imageObject: [[0, 0], [288, 0], [0, 144], [288, 144]].map(([x, yy], k) => new ImageContainerProperty({ xPosition: x, yPosition: yy, width: 288, height: 144, containerID: 2 + k, containerName: `t${k}`, zOrderIndex: 2 + k })),
      menuObject: { menuItems: this.menu },
    } as any
    return {
      containerTotalNum: 3,
      textObject: [new TextContainerProperty({ xPosition: 0, yPosition: 0, width: 576, height: 288, containerID: 1, containerName: 'input', content: ' ', isEventCapture: 1, zOrderIndex: 1 })],
      imageObject: [
        new ImageContainerProperty({ xPosition: 0, yPosition: y, width: 288, height: STRIP, containerID: 2, containerName: 'left', zOrderIndex: 2 }),
        new ImageContainerProperty({ xPosition: 288, yPosition: y, width: 288, height: STRIP, containerID: 3, containerName: 'right', zOrderIndex: 3 }),
      ],
      menuObject: { menuItems: this.menu },
    } as any
  }

  // The menu is part of the page: a new menu means a rebuilt page.
  setMenu(menu: { itemName: string; itemID: number }[]) {
    this.menu = menu
    this.drawing = this.drawing.then(() => within(this.bridge.rebuildPageContainer(new RebuildPageContainer(this.page())))).then(() => {})
    if (this.card) this.show(this.card, true)
  }

  async open(menu: { itemName: string; itemID: number }[]) {
    this.menu = menu
    await this.bridge.createStartUpPageContainer(new CreateStartUpPageContainer(this.page()))
    this.bridge.onEvenHubEvent(ev => this.event(ev))
  }

  private event(ev: any) {
    if (ev.audioEvent?.audioPcm) {
      const a = ev.audioEvent.audioPcm
      // The simulator sends the bytes as a plain object; the glasses send a Uint8Array.
      this.onAudio(a instanceof Uint8Array ? a : Uint8Array.from(Object.values(a) as number[]))
      return
    }
    const id = ev.menuItemClickEvent?.itemID
    if (id !== undefined) { this.onMenu(id); return }
    // The glasses menu is drawn over the page: presses inside it are the menu's, not Gloz's.
    const st = ev.sysEvent?.eventType
    // The platform menu covers part of the line: the line is blanked while it is open, so no cut-off words show.
    if (st === OsEventTypeList.FOREGROUND_ENTER_EVENT) { this.menuOpen = true; this.paint(); return }
    if (st === OsEventTypeList.FOREGROUND_EXIT_EVENT) { this.menuOpen = false; this.lineAt = Date.now(); this.paint(); this.onMenuClosed(); return }
    if (this.menuOpen) return
    // The same from the touchpad or the R1 ring (core/press.ts).
    const p = pressOf(ev)
    if (p === 'down') return this.move(1)
    if (p === 'up') return this.move(-1)
    if (p) return this.onInput(p)
  }

  // A swipe moves one line inside the card; past the last line it moves to the next card.
  private move(d: 1 | -1) {
    if (!this.lay) return
    // Down shows the next part of a message or reply, and acts only on the last part (skip, or the next reply);
    // up goes back a part, and acts on the first. So every part can be read before anything is sent or skipped.
    const n = this.line + d
    // Up on the first page: the pages hold still for a moment, so the "first part" note stays true.
    if (n < 0) { this.pause(); return this.onInput('prev') }
    if (n >= this.lay.lines.length) return this.onInput('next')
    this.line = n
    this.lineAt = Date.now()
    this.pause()
    this.onTurn()
    this.paint()
  }

  // A swipe pauses the pages for 6 s, then they move on again from where the wearer is.
  private pause() {
    this.manual = true
    this.lineAt = Date.now()
    if (this.manualTimer) clearTimeout(this.manualTimer)
    this.manualTimer = setTimeout(() => { this.manual = false; this.lineAt = Date.now() }, 6000)
  }

  setLook(size: number, low: boolean, autoPace: boolean) {
    const moved = low !== this.low
    const resized = size !== this.size
    this.size = size
    this.low = low
    this.autoPace = autoPace
    if (moved) this.drawing = this.drawing.then(() => within(this.bridge.rebuildPageContainer(new RebuildPageContainer(this.page())))).then(() => {})
    // A new size makes new pages, so it starts again; moving the line keeps the page the wearer is on.
    if (this.card && resized) this.show(this.card, true)
    else if (this.card && moved) this.paint()
  }

  show(c: Card, force = false) {
    // A grid card, the largest size and a long message use the whole display; a line card uses the strip.
    // Switch pages when that changes.
    const laid = layoutFor(c, this.size)
    const full = Boolean(c.grid) || laid.full
    if (full !== this.full) { this.full = full; this.rebuildDue = true; force = true }
    // A new hint ("Checked ✓", no signal) keeps the line the wearer is on; new text starts at line 1.
    const sameText = Boolean(this.card) && this.card!.kind === c.kind && this.card!.text === c.text && this.card!.head === c.head
    if (sameText && this.card!.hint === c.hint && !force) return
    this.card = c
    this.lay = laid.lay
    // New text, or a new size, starts again from the first page.
    if (!sameText || force) { this.line = 0; this.manual = false; this.lineAt = Date.now() }
    this.line = Math.min(this.line, this.lay.lines.length - 1)
    this.paint()
  }

  // From the first page again (the app opened anew).
  top() { if (this.card) this.show(this.card, true) }

  get lines() { return this.lay?.lines ?? [] }
  get lineIndex() { return this.line }

  // Pages move on at reading pace on their own clock, so repaints never hold them back.
  // A message stops at its last page; a reply goes round so all of it can be read.
  private tick() {
    const c = this.card, l = this.lay
    if (!c || !l || c.grid || !this.autoPace || this.manual || this.menuOpen || l.lines.length < 2) return
    if (c.kind !== 'message' && c.kind !== 'draft') return
    const wait = (dwell(l.lines[this.line]) + (c.kind === 'message' && this.line === 0 ? 1.5 : 0)) * 1000
    if (Date.now() - this.lineAt < wait) return
    if (c.kind === 'message' && this.line >= l.lines.length - 1) return
    this.line = (this.line + 1) % l.lines.length
    this.lineAt = Date.now()
    this.paint()
  }

  private paint() {
    if (!this.card || !this.lay) return
    const c = this.card, l = this.lay, i = this.line
    if (this.timer) clearTimeout(this.timer)
    // Image sends must not overlap (Even Hub docs, Page lifecycle).
    const my = ++this.gen
    this.drawing = this.drawing.then(async () => {
      if (my !== this.gen) return   // a newer screen is waiting: skip this one
      if (c.grid && !this.menuOpen) {
        const four = await tiles4(drawGrid(c.grid, c.hint ?? ''))
        if (my !== this.gen) return
        await this.switchPage()
        for (let k = 0; k < 4; k++) { await within(this.bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 2 + k, containerName: `t${k}`, imageData: four[k] }))); await new Promise(r => setTimeout(r, 150)) }
        return
      }
      if (this.full && !this.menuOpen) {
        const four = await tiles4(drawLine(c, l, i, { pages: c.parts !== false }, FULL_H))
        if (my !== this.gen) return
        await this.switchPage()
        for (let k = 0; k < 4; k++) { await within(this.bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 2 + k, containerName: `t${k}`, imageData: four[k] }))); await new Promise(r => setTimeout(r, 150)) }
        return
      }
      const [a, b] = await tiles(this.menuOpen ? blankStrip() : drawLine(c, l, i, { pages: c.parts !== false }))
      if (my !== this.gen) return
      await this.switchPage()
      // The glasses hold an image sent within 100 ms of the one before until the next send
      // (Even Hub docs, Display: "Image sends are paced at 100ms"), so the halves go 150 ms apart
      // and the next screen waits too; otherwise a page could show only when something else changed.
      await within(this.bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 2, containerName: 'left', imageData: a })))
      await new Promise(r => setTimeout(r, 150))
      await within(this.bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 3, containerName: 'right', imageData: b })))
      // A page's reading time starts when it is on the glasses, not when it was asked for;
      // a repaint of the same page (a new hint) does not start it again.
      const key = `${c.kind}|${c.head ?? ''}|${c.text}|${i}`
      if (!late && key !== this.landed && this.line === i && this.card === c) { this.landed = key; this.lineAt = Date.now() }   // a timed-out send has not landed
      await new Promise(r => setTimeout(r, 150))
    }).then(() => {
      // A send that timed out may still land late, over a newer half: draw the whole screen again.
      if (late && my === this.gen) { late = false; this.paint() }
    }).catch(e => console.error('[gloz] draw', e))
  }

  private async switchPage() {
    if (!this.rebuildDue) return
    this.rebuildDue = false
    await within(this.bridge.rebuildPageContainer(new RebuildPageContainer(this.page())))
  }

  async mic(on: boolean) { await this.bridge.audioControl(on) }

  // The phone's position: from the Even app first, then the browser; null after 5 s without one.
  async locate(): Promise<{ lat: number; lon: number } | null> {
    const late = new Promise<null>(done => setTimeout(() => done(null), 5000))
    const fromApp = (async () => { try { const l = await (this.bridge as any).getAppLocation?.(); return l ? { lat: l.latitude, lon: l.longitude } : null } catch { return null } })()
    const fromBrowser = () => new Promise<{ lat: number; lon: number } | null>(done => {
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
      if (!geo) return done(null)
      geo.getCurrentPosition(p => done({ lat: p.coords.latitude, lon: p.coords.longitude }), () => done(null), { timeout: 5000, maximumAge: 60000 })
    })
    return Promise.race([fromApp.then(p => p ?? fromBrowser()), late])
  }
  exit() { this.bridge.shutDownPageContainer(1) }
}
