export function normalizeReceiptCode(value: string): string {
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, '')
  const match = /^([CMB])(\d+)$/.exec(compact)
  return match ? `${match[1]}-${match[2]}` : compact
}
