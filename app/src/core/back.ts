// What a double tap does: in a tool it goes home; anywhere else it closes Gloz (the platform's rule at the root).
export type Back = 'close' | 'home'
export function doubleTap(active: object | null): Back {
  return active ? 'home' : 'close'
}
