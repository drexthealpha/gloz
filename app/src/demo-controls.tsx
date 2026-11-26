// The live demo's controls, built with shadcn/ui (the phone page's kit). Each keeps the id demo.ts uses,
// so the demo's logic is unchanged; render() is synchronous, so they exist before demo.ts reads them.
import { render } from 'preact'
import { Button } from '@/phone/components/ui/button'
import { Input } from '@/phone/components/ui/input'
import { Label } from '@/phone/components/ui/label'
import './demo.css'

const big = 'min-h-12 min-w-12 h-auto px-4 text-[17px] text-foreground'
// Filled buttons keep shadcn's own dark text on the green.
const filled = 'min-h-12 min-w-12 h-auto px-4 text-[17px]'
const toggle = `${big} aria-pressed:border-destructive aria-pressed:bg-destructive/25`

export function mountControls() {
  render(
    <form id="say" hidden className="mt-2.5 flex flex-wrap items-center gap-2">
      <Label htmlFor="sayin" className="basis-full text-base font-normal text-muted-foreground">No microphone in this demo: type what you would say.</Label>
      <Input id="sayin" placeholder="Type your words" aria-label="What you would say" className="h-12 min-w-0 flex-1 text-lg text-foreground" />
      <Button className={filled}>Done</Button>
      <Button type="button" id="saymic" variant="outline" className={big} hidden>Speak</Button>
      <Button type="button" id="saycancel" variant="outline" className={big}>Cancel</Button>
      <p id="saymicnote" hidden className="m-0 basis-full text-base text-muted-foreground">Speak uses your browser's own speech service to turn your words into text.</p>
    </form>,
    document.getElementById('say-slot')!,
  )
  render(
    <p id="again" hidden className="m-0"><Button variant="outline" className={big}>Start the demo again</Button></p>,
    document.getElementById('again-slot')!,
  )
  render(
    <>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button id="smaller" variant="outline" className={big} aria-label="Smaller text">A−</Button>
        <Button id="bigger" variant="outline" className={big} aria-label="Bigger text">A+</Button>
        <Button id="lower" variant="outline" className={big}>Move text lower</Button>
        <Button id="net" variant="outline" className={toggle} aria-pressed="false">Cut the phone's signal</Button>
        <Button id="apps" variant="outline" className={big} hidden>Back to the list</Button>
        <Button id="mute" variant="outline" className={big}>Mute this chat</Button>
        <Button id="unmute" variant="outline" className={big} hidden>Unmute all chats</Button>
      </div>
      <form id="key" className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Label htmlFor="keyin" className="basis-full justify-center text-center text-base font-normal">Real AI drafts: paste your own OpenRouter key. It stays in this tab and goes only to OpenRouter.</Label>
        <Input id="keyin" type="password" autoComplete="off" dir="ltr" placeholder="sk-or-..." aria-describedby="keynote" className="h-12 min-w-0 flex-1 text-lg text-foreground" />
        <Button className={filled}>Use my key</Button>
        <p id="keynote" aria-live="polite" className="m-0 basis-full text-center text-base text-muted-foreground">Without a key, replies are a fixed holding reply.</p>
      </form>
    </>,
    document.getElementById('row-slot')!,
  )
}
