import { formatAmount } from './amounts'
import type { Strike } from './types'

/** Convert a human-readable price (settlement per 1 underlying unit) to a fraction. */
export function humanPriceToFraction(price: string): Strike {
  const trimmed = price.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid strike price: "${price}"`)
  }
  const [integerPart, fractionPart = ''] = trimmed.split('.')
  const denominator = 10n ** BigInt(fractionPart.length)
  const numerator = BigInt(integerPart + fractionPart)
  if (numerator === 0n) throw new Error('Strike must be greater than zero')
  return { numerator, denominator }
}

/** Format a stored fraction as a human-readable settlement-per-underlying price. */
export function fractionToHumanPrice(strike: Strike): string {
  const scale = 12
  const scaled =
    (strike.numerator * 10n ** BigInt(scale)) / strike.denominator
  const intPart = scaled / 10n ** BigInt(scale)
  const fracPart = scaled % 10n ** BigInt(scale)
  if (fracPart === 0n) return intPart.toString()
  const fracStr = fracPart
    .toString()
    .padStart(scale, '0')
    .replace(/0+$/, '')
  return `${intPart}.${fracStr}`
}

export function formatStrikeDisplay(
  strike: Strike,
  _settlementDecimals: number,
  settlementSymbol: string,
  underlyingSymbol: string,
): string {
  const price = fractionToHumanPrice(strike)
  return `${price} ${settlementSymbol} / ${underlyingSymbol}`
}

/** Scale an underlying-base-unit amount to settlement decimals (matches on-chain adjust_decimal_scale). */
export function adjustDecimalScale(
  amount: bigint,
  fromDecimals: number,
  toDecimals: number,
): bigint {
  if (fromDecimals > toDecimals) {
    return amount / 10n ** BigInt(fromDecimals - toDecimals)
  }
  if (fromDecimals < toDecimals) {
    return amount * 10n ** BigInt(toDecimals - fromDecimals)
  }
  return amount
}

/** Settlement collateral required to Write a Put for `optionAmount` base units. */
export function putCollateralRequired(
  optionAmount: bigint,
  strike: Strike,
  assetDecimals: number,
  settlementDecimals: number,
): bigint {
  const adjusted = adjustDecimalScale(
    optionAmount,
    assetDecimals,
    settlementDecimals,
  )
  return (adjusted * strike.numerator) / strike.denominator
}

/** Settlement payment required to Exercise a Call for `optionAmount` base units. */
export function callExercisePayment(
  optionAmount: bigint,
  strike: Strike,
  assetDecimals: number,
  settlementDecimals: number,
): bigint {
  return putCollateralRequired(
    optionAmount,
    strike,
    assetDecimals,
    settlementDecimals,
  )
}

/** Settlement received when Exercising a Put for `optionAmount` base units. */
export function putExercisePayout(
  optionAmount: bigint,
  strike: Strike,
  assetDecimals: number,
  settlementDecimals: number,
): bigint {
  return callExercisePayment(
    optionAmount,
    strike,
    assetDecimals,
    settlementDecimals,
  )
}

export function formatStrikeAmount(
  baseUnits: bigint,
  decimals: number,
  symbol: string,
): string {
  return `${formatAmount(baseUnits, decimals)} ${symbol}`
}
