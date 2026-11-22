import { describe, expect, it } from 'vitest'
import { checkDigitStatus, eanCheckDigit } from './format.ts'

describe('barcode check digits', () => {
  it('accepts Nutella and rejects the sample with a bad check digit', () => {
    expect(eanCheckDigit('301762042200')).toBe(3)
    expect(checkDigitStatus('3017620422003')).toBe('ok')
    expect(checkDigitStatus('9300633603423')).toBe('bad')
    expect(eanCheckDigit('930063360342')).toBe(7)
  })
})
