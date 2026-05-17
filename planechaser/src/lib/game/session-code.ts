const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion

export function generateSessionCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join('')
}

export function isValidSessionCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}
