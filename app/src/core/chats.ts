// Which chats reach the glasses: never a muted one; when the wearer picked chats on the phone, only those.
export function shows(key: string, muted: Set<string>, only: Set<string>): boolean {
  return !muted.has(key) && (!only.size || only.has(key))
}
