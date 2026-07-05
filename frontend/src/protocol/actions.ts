import { Transaction } from '@mysten/sui/transactions'
import {
  CLOCK_OBJECT_ID,
  MARKETPLACE_OBJECT_ID,
  TOKENSMITH_PACKAGE_ID,
} from './config'

export interface WriteCallParams {
  vaultOwnerId: string
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
  assetCoinId: string
  /** When set, splits this amount from the coin object before Write. */
  amount?: bigint
}

export function buildWriteCoveredCallTx(params: WriteCallParams): Transaction {
  const tx = new Transaction()
  const assetArg =
    params.amount !== undefined
      ? tx.splitCoins(tx.object(params.assetCoinId), [tx.pure.u64(params.amount)])[0]
      : tx.object(params.assetCoinId)
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::write_covered_call`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(params.vaultOwnerId),
      tx.object(CLOCK_OBJECT_ID),
      assetArg,
    ],
  })
  return tx
}

export interface WritePutParams {
  vaultOwnerId: string
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
  collateralCoinId: string
  optionAmount: bigint
}

export function buildWriteCoveredPutTx(params: WritePutParams): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::write_covered_put`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(params.vaultOwnerId),
      tx.object(CLOCK_OBJECT_ID),
      tx.object(params.collateralCoinId),
      tx.pure.u64(params.optionAmount),
    ],
  })
  return tx
}

export interface ExerciseCallParams {
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
  optionCoinId: string
  paymentCoinId: string
  optionAmount?: bigint
  paymentAmount?: bigint
}

export function buildExerciseCallTx(params: ExerciseCallParams): Transaction {
  const tx = new Transaction()
  const optionArg =
    params.optionAmount !== undefined
      ? tx.splitCoins(tx.object(params.optionCoinId), [tx.pure.u64(params.optionAmount)])[0]
      : tx.object(params.optionCoinId)
  const paymentArg =
    params.paymentAmount !== undefined
      ? tx.splitCoins(tx.object(params.paymentCoinId), [tx.pure.u64(params.paymentAmount)])[0]
      : tx.object(params.paymentCoinId)
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::exercise_call`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(CLOCK_OBJECT_ID),
      optionArg,
      paymentArg,
    ],
  })
  return tx
}

export interface ExercisePutParams {
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
  optionCoinId: string
  assetCoinId: string
  optionAmount?: bigint
  assetAmount?: bigint
}

export function buildExercisePutTx(params: ExercisePutParams): Transaction {
  const tx = new Transaction()
  const optionArg =
    params.optionAmount !== undefined
      ? tx.splitCoins(tx.object(params.optionCoinId), [tx.pure.u64(params.optionAmount)])[0]
      : tx.object(params.optionCoinId)
  const assetArg =
    params.assetAmount !== undefined
      ? tx.splitCoins(tx.object(params.assetCoinId), [tx.pure.u64(params.assetAmount)])[0]
      : tx.object(params.assetCoinId)
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::exercise_put`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(CLOCK_OBJECT_ID),
      optionArg,
      assetArg,
    ],
  })
  return tx
}

export interface UnwindParams {
  vaultOwnerId: string
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
  optionCoinId: string
}

/** Unwind — pre-Expiry burn of Option Coins to reclaim collateral. */
export function buildUnwindTx(params: UnwindParams): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::withdraw_tokens`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(params.vaultOwnerId),
      tx.object(CLOCK_OBJECT_ID),
      tx.object(params.optionCoinId),
    ],
  })
  return tx
}

export interface SettlementParams {
  vaultOwnerId: string
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
}

export function buildClaimProceedsTx(params: SettlementParams): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::claim_proceeds`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(params.vaultOwnerId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  })
  return tx
}

export function buildWithdrawRemainingTx(params: SettlementParams): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::withdraw_remaining`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(params.vaultOwnerId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  })
  return tx
}

export function buildTransferOptionCoinTx(
  optionCoinId: string,
  recipient: string,
): Transaction {
  const tx = new Transaction()
  tx.transferObjects([tx.object(optionCoinId)], tx.pure.address(recipient))
  return tx
}
