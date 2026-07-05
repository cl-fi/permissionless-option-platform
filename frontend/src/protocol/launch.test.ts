import { describe, expect, it } from 'vitest'
import {
  buildInitOptionVaultTx,
  buildPublishOptionCoinTx,
  dateTimeLocalValueToExpiryMs,
  expiryPresets,
  expiryToDateTimeLocalValue,
  validateLaunchExpiry,
} from './launch'
import { TOKENSMITH_PACKAGE_ID } from './config'

const TREASURY_CAP =
  '0x0000000000000000000000000000000000000000000000000000000000000abc'

describe('buildPublishOptionCoinTx', () => {
  it('transfers the UpgradeCap so publish does not fail with UnusedValueWithoutDrop', () => {
    const sender =
      '0x0000000000000000000000000000000000000000000000000000000000000abc'
    const tx = buildPublishOptionCoinTx(new Uint8Array([1, 2, 3]), sender)
    const data = tx.getData() as {
      commands: Array<{ Publish?: unknown; TransferObjects?: unknown }>
    }
    expect(data.commands).toHaveLength(2)
    expect(data.commands[0]).toHaveProperty('Publish')
    expect(data.commands[1]).toHaveProperty('TransferObjects')
  })
})

describe('buildInitOptionVaultTx', () => {
  it('targets init_option_vault with correct type args and shape', () => {
    const tx = buildInitOptionVaultTx({
      treasuryCapId: TREASURY_CAP,
      direction: 'call',
      expiryMs: 999n,
      strike: { numerator: 65000n, denominator: 1n },
      assetCoinType: '0xabc::mock_coin::MOCK_COIN',
      settlementCoinType: '0xabc::mock_usdc::MOCK_USDC',
      optionCoinType: '0xdef::opt::OPT',
      assetDecimals: 8,
      settlementDecimals: 6,
    })

    const data = tx.getData() as {
      commands: Array<{
        MoveCall: {
          package: string
          module: string
          function: string
          typeArguments: string[]
          arguments: unknown[]
        }
      }>
    }

    const call = data.commands[0].MoveCall
    expect(call.package).toBe(TOKENSMITH_PACKAGE_ID)
    expect(call.module).toBe('tokensmith')
    expect(call.function).toBe('init_option_vault')
    expect(call.typeArguments).toHaveLength(3)
    expect(call.arguments).toHaveLength(9)
  })
})

describe('launch expiry helpers', () => {
  it('round-trips datetime-local values at minute precision', () => {
    const expiryMs = 1_700_000_000_000n - (1_700_000_000_000n % 60_000n)
    const value = expiryToDateTimeLocalValue(expiryMs)
    expect(dateTimeLocalValueToExpiryMs(value)).toBe(expiryMs)
  })

  it('rejects expiry in the past', () => {
    expect(validateLaunchExpiry(1000n, 2000n)).toMatch(/future/)
    expect(validateLaunchExpiry(3000n, 2000n)).toBeNull()
  })

  it('includes a one-month preset for advanced launches', () => {
    const now = 1_700_000_000_000
    const labels = expiryPresets(now).map((p) => p.label)
    expect(labels).toContain('1 month')
  })
})
