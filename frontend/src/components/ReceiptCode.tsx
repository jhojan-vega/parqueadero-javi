import { normalizeReceiptCode } from '../utils/receiptCode'

export function ReceiptCode({ value }: { value: string }) {
  const normalized = normalizeReceiptCode(value)
  const match = /^([CMB])-(\d+)$/.exec(normalized)

  if (!match) return <strong className="receipt-code">{value}</strong>

  return <strong className="receipt-code" aria-label={normalized}><span>{match[1]}</span><b>{match[2]}</b></strong>
}
