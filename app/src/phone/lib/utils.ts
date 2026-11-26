import { clsx, type ClassValue } from 'clsx'
import { merge } from './merge'

// shadcn/ui's class helper; merge stands in for tailwind-merge (same result on every class Gloz uses).
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
