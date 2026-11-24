// Glyph probe: draws characters in plain firmware-font text containers so the
// evaluation can see which ones the glasses draw. Each batch holds 8 characters,
// one per container, in a 4 x 2 grid of 144 x 144 cells. A click moves on.
// The character list comes from /probe-chars.json, written by eval/probe.mjs.
import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

const bridge = await waitForEvenAppBridge()
const chars: string[] = await (await fetch('/probe-chars.json')).json()

function cells(batch: number): TextContainerProperty[] {
  const out: TextContainerProperty[] = []
  for (let i = 0; i < 8; i++) {
    const ch = chars[batch * 8 + i] ?? ' '
    out.push(new TextContainerProperty({
      xPosition: (i % 4) * 144,
      yPosition: Math.floor(i / 4) * 144,
      width: 144,
      height: 144,
      borderWidth: 0,
      paddingLength: 8,
      containerID: i + 1,
      containerName: `c${i}`,
      content: ch,
      isEventCapture: i === 0 ? 1 : 0,
    }))
  }
  return out
}

let batch = 0
const total = Math.ceil(chars.length / 8)
await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({ containerTotalNum: 8, textObject: cells(0) }))
console.log(`[probe] batch 0 of ${total}`)

bridge.onEvenHubEvent(async event => {
  const of = (e?: { eventType?: OsEventTypeList }) => e ? (e.eventType ?? OsEventTypeList.CLICK_EVENT) : null
  if (of(event.sysEvent) !== OsEventTypeList.CLICK_EVENT && of(event.textEvent) !== OsEventTypeList.CLICK_EVENT) return
  batch += 1
  if (batch >= total) { console.log('[probe] done'); return }
  await bridge.rebuildPageContainer(new RebuildPageContainer({ containerTotalNum: 8, textObject: cells(batch) }))
  console.log(`[probe] batch ${batch} of ${total}`)
})
