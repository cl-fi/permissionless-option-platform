import { describe, expect, it } from 'vitest'
import {
  callExercisePayment,
  fractionToHumanPrice,
  humanPriceToFraction,
  putCollateralRequired,
} from './strike'

describe('humanPriceToFraction', () => {
  it('converts whole-number prices', () => {
    expect(humanPriceToFraction('65000')).toEqual({
      numerator: 65000n,
      denominator: 1n,
    })
  })

  it('converts decimal prices', () => {
    expect(humanPriceToFraction('65000.5')).toEqual({
      numerator: 650005n,
      denominator: 10n,
    })
  })

  it('round-trips through fractionToHumanPrice', () => {
    const strike = humanPriceToFraction('65000.5')
    expect(fractionToHumanPrice(strike)).toBe('65000.5')
  })
})

describe('put collateral sizing (8/6 decimals)', () => {
  it('requires settlement at Strike × amount for 1 MBTC', () => {
    const strike = humanPriceToFraction('65000')
    const oneBtc = 100_000_000n
    const collateral = putCollateralRequired(oneBtc, strike, 8, 6)
    expect(collateral).toBe(65_000_000_000n)
  })

  it('handles fractional strike prices', () => {
    const strike = humanPriceToFraction('65000.5')
    const oneBtc = 100_000_000n
    const collateral = putCollateralRequired(oneBtc, strike, 8, 6)
    expect(collateral).toBe(65_000_500_000n)
  })
})

describe('call exercise payment sizing', () => {
  it('matches put collateral math for the same inputs', () => {
    const strike = humanPriceToFraction('65000')
    const amount = 50_000_000n
    expect(callExercisePayment(amount, strike, 8, 6)).toBe(
      putCollateralRequired(amount, strike, 8, 6),
    )
  })
})
