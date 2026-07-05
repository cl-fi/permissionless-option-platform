import { describe, expect, it } from 'vitest'
import { parseVaultFields } from './series'
import marketplaceFixture from './__fixtures__/marketplace-vault.json'

describe('parseVaultFields', () => {
  it('parses a real testnet vault fixture into a typed model', () => {
    const { type, fields, nowMs } = marketplaceFixture
    const vault = parseVaultFields(type, fields, BigInt(nowMs))

    expect(vault.direction).toBe('call')
    expect(vault.strike.numerator).toBe(65000n)
    expect(vault.strike.denominator).toBe(1n)
    expect(vault.underlying.decimals).toBe(8)
    expect(vault.settlement.decimals).toBe(6)
    expect(vault.lifecycle).toBe('pre_expiry')
  })
})
