// Evaluation page (eval/PROTOCOL.md). Asks the runner what to show, shows it,
// and logs "[eval] ready <n>" so the runner can read the framebuffer.
//   plain: the text in one full-screen firmware text container
//   gloz:  line k of the text, drawn by Gloz's renderer at the given size
import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  ImageContainerProperty,
  ImageRawDataUpdate,
} from '@evenrealities/even_hub_sdk'
import { layoutCard, drawLine, tiles, tiles4, STRIP, FULL_H } from './render.ts'
import type { Card } from './core/types.ts'

const RUNNER = 'http://127.0.0.1:8799'
const bridge = await waitForEvenAppBridge()

const plainPage = (text: string) => ({
  containerTotalNum: 1,
  textObject: [new TextContainerProperty({ xPosition: 0, yPosition: 0, width: 576, height: 288, paddingLength: 4, containerID: 1, containerName: 'plain', content: text, isEventCapture: 1 })],
})
const glozPage = () => ({
  containerTotalNum: 3,
  textObject: [new TextContainerProperty({ xPosition: 0, yPosition: 0, width: 576, height: 288, containerID: 1, containerName: 'input', content: ' ', isEventCapture: 1, zOrderIndex: 1 })],
  imageObject: [
    new ImageContainerProperty({ xPosition: 0, yPosition: (288 - STRIP) / 2, width: 288, height: STRIP, containerID: 2, containerName: 'left', zOrderIndex: 2 }),
    new ImageContainerProperty({ xPosition: 288, yPosition: (288 - STRIP) / 2, width: 288, height: STRIP, containerID: 3, containerName: 'right', zOrderIndex: 3 }),
  ],
})

const fullPage = () => ({
  containerTotalNum: 5,
  textObject: [new TextContainerProperty({ xPosition: 0, yPosition: 0, width: 576, height: 288, containerID: 1, containerName: 'input', content: ' ', isEventCapture: 1, zOrderIndex: 1 })],
  imageObject: [[0, 0], [288, 0], [0, 144], [288, 144]].map(([x, y], k) => new ImageContainerProperty({ xPosition: x, yPosition: y, width: 288, height: 144, containerID: 2 + k, containerName: `t${k}`, zOrderIndex: 2 + k })),
})

await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(plainPage(' ')))
console.log('[eval] up')

let last = -1
let layout: 'plain' | 'gloz' | 'full' = 'plain'
for (;;) {
  let cmd: any
  try { cmd = await (await fetch(`${RUNNER}/cmd`)).json() } catch { await new Promise(r => setTimeout(r, 200)); continue }
  if (cmd.n === last) { await new Promise(r => setTimeout(r, 50)); continue }
  last = cmd.n
  if (cmd.arm === 'plain') {
    await bridge.rebuildPageContainer(new RebuildPageContainer(plainPage(cmd.text)))
    layout = 'plain'
    console.log(`[eval] ready ${cmd.n} lines 1`)
  } else if (cmd.size === 7) {
    if (layout !== 'full') { await bridge.rebuildPageContainer(new RebuildPageContainer(fullPage())); layout = 'full' }
    const c: Card = { kind: 'message', text: cmd.text }
    const l = layoutCard(c, cmd.size)
    const four = await tiles4(drawLine(c, l, cmd.line, { pages: false }, FULL_H))
    for (let k = 0; k < 4; k++) await bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 2 + k, containerName: `t${k}`, imageData: four[k] }))
    console.log(`[eval] ready ${cmd.n} lines ${l.lines.length}`)
  } else {
    if (layout !== 'gloz') { await bridge.rebuildPageContainer(new RebuildPageContainer(glozPage())); layout = 'gloz' }
    const c: Card = { kind: 'message', text: cmd.text }
    const l = layoutCard(c, cmd.size)
    const [a, b] = await tiles(drawLine(c, l, cmd.line, { pages: false }))
    await bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 2, containerName: 'left', imageData: a }))
    await bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: 3, containerName: 'right', imageData: b }))
    console.log(`[eval] ready ${cmd.n} lines ${l.lines.length}`)
  }
}
