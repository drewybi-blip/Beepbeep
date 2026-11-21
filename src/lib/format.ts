export function prettyTag(tag: string) {
  const raw = tag.includes(':') ? tag.split(':').slice(1).join(':') : tag
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function eanCheckDigit(body: string) {
  const digits = body.split('').map(Number)
  let sum = 0
  for (let index = digits.length - 1, weight = 3; index >= 0; index -= 1, weight = weight === 3 ? 1 : 3) {
    sum += digits[index] * weight
  }
  return (10 - (sum % 10)) % 10
}

export function checkDigitStatus(code: string): 'ok' | 'bad' | 'unchecked' {
  const digits = code.replace(/\D/g, '')
  if (![8, 12, 13].includes(digits.length)) return 'unchecked'
  const expected = eanCheckDigit(digits.slice(0, -1))
  return expected === Number(digits.at(-1)) ? 'ok' : 'bad'
}

export function aud(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)
}

export function scannedOn(timestamp: number) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp))
}

export function checkedLabel(iso: string) {
  return `Checked ${new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))}`
}

export function formatAmount(value: number, digits = 1) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits }).format(value)
}

export const STORE_LABELS: Record<string, string> = {
  coles: 'Coles',
  woolworths: 'Woolworths',
  aldi: 'Aldi',
  iga: 'IGA',
}
