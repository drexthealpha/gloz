// Types for the news tool, whose sample the app shows before pairing.
import type { Feed } from './weather.mjs'
export const SAMPLE: Feed
export function headlines(xml: string, max?: number): string[]
export function handle(body: unknown, ctx: { env: Record<string, string | undefined>, fetch?: typeof fetch }): Promise<Feed>
