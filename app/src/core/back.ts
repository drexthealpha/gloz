// What a double tap does: with no app open it closes Gloz (the platform's rule at the root);
// in an app it goes back to the Apps list; on the Apps list it goes back to messages.
export type Back = 'close' | 'list' | 'messages'
export function doubleTap(active: object | null, list: object | null): Back {
  if (!active) return 'close'
  return active === list ? 'messages' : 'list'
}
