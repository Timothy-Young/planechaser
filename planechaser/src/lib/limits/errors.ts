/**
 * Limit violations raised by the migration 026 triggers. The SQLSTATE is the
 * contract — the message text is server-authored and safe to show as-is.
 */
export type LimitCode =
  | 'PC001' // feedback cooldown not elapsed
  | 'PC002' // feedback daily cap reached
  | 'PC003' // custom plane cap reached

const LIMIT_CODES: LimitCode[] = ['PC001', 'PC002', 'PC003']

export class LimitError extends Error {
  readonly code: LimitCode

  constructor(code: LimitCode, message: string) {
    super(message)
    this.name = 'LimitError'
    this.code = code
  }
}

function isLimitCode(code: unknown): code is LimitCode {
  return typeof code === 'string' && (LIMIT_CODES as string[]).includes(code)
}

/**
 * Converts a Supabase/PostgREST error into a `LimitError` when it came from a
 * limit trigger, and a plain `Error` otherwise. Callers can then branch on
 * `err instanceof LimitError` without parsing message strings.
 */
export function toLimitError(error: unknown, fallbackMessage: string): Error {
  const code = (error as { code?: unknown } | null)?.code
  const message = (error as { message?: unknown } | null)?.message

  if (isLimitCode(code)) {
    return new LimitError(
      code,
      typeof message === 'string' && message.length > 0 ? message : fallbackMessage,
    )
  }

  return new Error(
    typeof message === 'string' && message.length > 0
      ? `${fallbackMessage}: ${message}`
      : fallbackMessage,
  )
}
