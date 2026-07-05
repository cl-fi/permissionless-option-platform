export type OptionDirection = 'call' | 'put'

export type LifecycleState = 'pre_expiry' | 'exercise_window' | 'withdrawal_open'

export interface CoinInfo {
  coinType: string
  symbol: string
  decimals: number
}

export interface Strike {
  numerator: bigint
  denominator: bigint
}

export interface Series {
  optionCoinType: string
  direction: OptionDirection
  underlying: CoinInfo
  settlement: CoinInfo
  strike: Strike
  strikeDisplay: string
  expiryMs: bigint
  mintedSupply: bigint
  remainingCollateral: bigint
  collateralCoin: CoinInfo
  writer: string
  lifecycle: LifecycleState
}

export interface VaultState extends Series {
  assetBalance: bigint
  settlementBalance: bigint
}

export interface VaultOwnerRef {
  objectId: string
  optionCoinType: string
}

export interface HeldPosition {
  optionCoinType: string
  balance: bigint
  series: VaultState
}

export interface WrittenSeries {
  vaultOwner: VaultOwnerRef
  series: VaultState
}

export type TransactionPhase = 'idle' | 'signing' | 'executing' | 'confirmed' | 'failed'

export interface LaunchDraft {
  id: string
  direction: OptionDirection
  underlyingCoinType: string
  settlementCoinType: string
  underlyingDecimals: number
  settlementDecimals: number
  strikeDisplay: string
  expiryMs: bigint
  /** Set after step 1 (publish coin) */
  publishedPackageId?: string
  treasuryCapId?: string
  optionCoinType?: string
  otwName?: string
  symbol?: string
  createdAt: number
}
