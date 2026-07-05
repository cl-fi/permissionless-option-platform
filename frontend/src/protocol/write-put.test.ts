import { describe, expect, it } from 'vitest'
import { humanPriceToFraction, putCollateralRequired } from './strike'

/**
 * Regression for testnet tx 3AMiGZ1EmPms4Pu3CLDyRw3gFiNMv4tkFuU4dL6AvjxH:
 * writing 1 MBTC put at strike 1000 requires 1_000 USDC collateral, not 100_000 USDC.
 */
describe('write covered put collateral sizing', () => {
  it('requires 1_000 USDC to write 1 MBTC put at 1000 USDC strike', () => {
    const optionAmount = 100_000_000n // 1 MBTC (8 decimals)
    const strike = humanPriceToFraction('1000')
    const collateralAmount = putCollateralRequired(optionAmount, strike, 8, 6)
    expect(collateralAmount).toBe(1_000_000_000n) // 1_000 USDC (6 decimals)
  })
})
