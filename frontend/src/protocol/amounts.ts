/**
 * Decimal-aware amount formatting and parsing.
 *
 * All on-chain amounts are integer base units; the UI always goes through
 * these two functions so every displayed number respects the coin's decimals.
 */

/** Format base units as a human-readable decimal string (no trailing zeros). */
export function formatAmount(baseUnits: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals)
  const integer = baseUnits / divisor
  const fraction = baseUnits % divisor

  const integerPart = integer.toLocaleString('en-US')
  if (fraction === 0n) return integerPart

  const fractionPart = fraction
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  return `${integerPart}.${fractionPart}`
}

/** Parse a user-entered decimal string into base units. Throws on bad input. */
export function parseAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount: "${input}"`)
  }
  const [integerPart, fractionPart = ''] = trimmed.split('.')
  if (fractionPart.length > decimals) {
    throw new Error(
      `Too many decimal places: "${input}" (max ${decimals})`,
    )
  }
  const padded = fractionPart.padEnd(decimals, '0')
  return BigInt(integerPart) * 10n ** BigInt(decimals) + BigInt(padded || '0')
}
