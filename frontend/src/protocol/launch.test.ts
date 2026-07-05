import { describe, expect, it } from 'vitest'
import { buildInitOptionVaultTx } from './launch'
import { TOKENSMITH_PACKAGE_ID } from './config'

const TREASURY_CAP =
  '0x0000000000000000000000000000000000000000000000000000000000000abc'

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
