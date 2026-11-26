// What a press means, from a glasses event. The source (the touchpad on the glasses or the R1 ring,
// EventSourceType) is not read: a press means the same from either.
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'

export type Press = 'exit' | 'hold' | 'release' | 'tap' | 'down' | 'up'

export function pressOf(ev: { sysEvent?: { eventType?: number }; textEvent?: { eventType?: number } }): Press | null {
  const sys = ev.sysEvent ? (ev.sysEvent.eventType ?? OsEventTypeList.CLICK_EVENT) : null
  const txt = ev.textEvent ? (ev.textEvent.eventType ?? OsEventTypeList.CLICK_EVENT) : null
  const t = sys ?? txt
  if (t === OsEventTypeList.DOUBLE_CLICK_EVENT) return 'exit'
  if (t === OsEventTypeList.LONG_PRESS_EVENT) return 'hold'
  if (t === OsEventTypeList.LONG_PRESS_RELEASE_EVENT) return 'release'
  if (t === OsEventTypeList.CLICK_EVENT) return 'tap'
  if (t === OsEventTypeList.SCROLL_BOTTOM_EVENT) return 'down'
  if (t === OsEventTypeList.SCROLL_TOP_EVENT) return 'up'
  return null
}
