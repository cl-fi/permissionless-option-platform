import { WITHDRAWAL_DELAY_MS } from './config'
import type { LifecycleState } from './types'

/** Derive lifecycle state from Expiry and the current clock (ms). */
export function deriveLifecycleState(
  expiryMs: bigint,
  nowMs: bigint,
): LifecycleState {
  if (nowMs < expiryMs) return 'pre_expiry'
  if (nowMs < expiryMs + WITHDRAWAL_DELAY_MS) return 'exercise_window'
  return 'withdrawal_open'
}

export function withdrawalUnlockMs(expiryMs: bigint): bigint {
  return expiryMs + WITHDRAWAL_DELAY_MS
}

export function lifecycleLabel(state: LifecycleState): string {
  switch (state) {
    case 'pre_expiry':
      return 'Live'
    case 'exercise_window':
      return 'Exercise Window'
    case 'withdrawal_open':
      return 'Withdrawal Open'
  }
}
