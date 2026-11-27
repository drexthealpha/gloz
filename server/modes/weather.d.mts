// Types for the weather tool, which the app also runs in the browser before pairing.
export type Feed = { lines: string[], t: number, sample?: boolean, source?: string } | { error: string }
export const SAMPLE: Feed
export function sky(code: number): string
export function lines(j: unknown): string[]
export function handle(body: { lat?: number, lon?: number } | null | undefined, ctx: { env: Record<string, string | undefined>, fetch?: typeof fetch }): Promise<Feed>
