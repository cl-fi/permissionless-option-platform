import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount } from './amounts'

describe('formatAmount', () => {
  it('renders 100000000 base units of an 8-decimal coin as 1', () => {
    expect(formatAmount(100_000_000n, 8)).toBe('1')
  })

  it('renders fractional amounts without trailing zeros', () => {
    expect(formatAmount(150_000_000n, 8)).toBe('1.5')
    expect(formatAmount(123_456_789n, 8)).toBe('1.23456789')
  })

  it('renders amounts smaller than one unit', () => {
    expect(formatAmount(1n, 6)).toBe('0.000001')
  })

  it('renders zero as 0', () => {
    expect(formatAmount(0n, 8)).toBe('0')
  })

  it('groups thousands in the integer part', () => {
    expect(formatAmount(1_234_567_000_000n, 6)).toBe('1,234,567')
  })
})

describe('parseAmount', () => {
  it('parses a whole number into base units', () => {
    expect(parseAmount('1', 8)).toBe(100_000_000n)
  })

  it('parses a decimal number into base units', () => {
    expect(parseAmount('1.5', 8)).toBe(150_000_000n)
    expect(parseAmount('0.000001', 6)).toBe(1n)
  })

  it('rejects more fractional digits than the coin has decimals', () => {
    expect(() => parseAmount('0.0000001', 6)).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => parseAmount('', 6)).toThrow()
    expect(() => parseAmount('abc', 6)).toThrow()
    expect(() => parseAmount('1.2.3', 6)).toThrow()
    expect(() => parseAmount('-1', 6)).toThrow()
  })
})
