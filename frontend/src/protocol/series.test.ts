import { describe, expect, it } from 'vitest'
import { coinTypesEqual, normalizeCoinType, parseVaultFields } from './series'
import marketplaceFixture from './__fixtures__/marketplace-vault.json'

describe('coin type helpers', () => {
  it('treats padded and unpadded addresses as equal', () => {
    const short = '0x2::sui::SUI'
    const padded = `0x${'0'.repeat(62)}2::sui::SUI`
    expect(coinTypesEqual(short, padded)).toBe(true)
    expect(normalizeCoinType(padded)).toBe('0x2::sui::SUI')
  })

  it('treats TypeName addresses without 0x prefix as equal to canonical types', () => {
    const withPrefix =
      '0x643c84d1c1dc23c16c1e86fe9c25454c62375bdc01f5dea4856ab589898e83ad::ts0da3d9f7::TS0DA3D9F7'
    const withoutPrefix =
      '643c84d1c1dc23c16c1e86fe9c25454c62375bdc01f5dea4856ab589898e83ad::ts0da3d9f7::TS0DA3D9F7'
    expect(coinTypesEqual(withPrefix, withoutPrefix)).toBe(true)
    expect(normalizeCoinType(withoutPrefix)).toBe(withPrefix)
  })
})

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
