import { describe, expect, it } from 'vitest'
import {
  buildClaimProceedsTx,
  buildExerciseCallTx,
  buildUnwindTx,
  buildWithdrawRemainingTx,
  buildWriteCoveredPutTx,
} from './actions'

const ASSET = '0xabc::mock_coin::MOCK_COIN'
const SETTLE = '0xabc::mock_usdc::MOCK_USDC'
const OPT = '0xdef::opt::OPT'
const OWNER = '0x0000000000000000000000000000000000000000000000000000000000000abc'

function firstMoveCall(tx: ReturnType<typeof buildExerciseCallTx>) {
  const data = tx.getData() as {
    commands: Array<{ MoveCall: { module: string; function: string; typeArguments: string[] } }>
  }
  return data.commands[0].MoveCall
}

describe('lifecycle transaction builders', () => {
  it('buildWriteCoveredPutTx targets write_covered_put', () => {
    const call = firstMoveCall(
      buildWriteCoveredPutTx({
        vaultOwnerId: OWNER,
        assetCoinType: ASSET,
        settlementCoinType: SETTLE,
        optionCoinType: OPT,
        collateralCoinId: OWNER,
        optionAmount: 100n,
      }) as unknown as ReturnType<typeof buildExerciseCallTx>,
    )
    expect(call.function).toBe('write_covered_put')
    expect(call.typeArguments).toEqual([ASSET, SETTLE, OPT])
  })

  it('buildExerciseCallTx targets exercise_call', () => {
    const call = firstMoveCall(
      buildExerciseCallTx({
        assetCoinType: ASSET,
        settlementCoinType: SETTLE,
        optionCoinType: OPT,
        optionCoinId: OWNER,
        paymentCoinId: OWNER,
      }),
    )
    expect(call.function).toBe('exercise_call')
  })

  it('buildUnwindTx targets withdraw_tokens', () => {
    const call = firstMoveCall(
      buildUnwindTx({
        vaultOwnerId: OWNER,
        assetCoinType: ASSET,
        settlementCoinType: SETTLE,
        optionCoinType: OPT,
        optionCoinId: OWNER,
      }) as unknown as ReturnType<typeof buildExerciseCallTx>,
    )
    expect(call.function).toBe('withdraw_tokens')
  })

  it('buildClaimProceedsTx targets claim_proceeds', () => {
    const call = firstMoveCall(
      buildClaimProceedsTx({
        vaultOwnerId: OWNER,
        assetCoinType: ASSET,
        settlementCoinType: SETTLE,
        optionCoinType: OPT,
      }) as unknown as ReturnType<typeof buildExerciseCallTx>,
    )
    expect(call.function).toBe('claim_proceeds')
  })

  it('buildWithdrawRemainingTx targets withdraw_remaining', () => {
    const call = firstMoveCall(
      buildWithdrawRemainingTx({
        vaultOwnerId: OWNER,
        assetCoinType: ASSET,
        settlementCoinType: SETTLE,
        optionCoinType: OPT,
      }) as unknown as ReturnType<typeof buildExerciseCallTx>,
    )
    expect(call.function).toBe('withdraw_remaining')
  })
})
