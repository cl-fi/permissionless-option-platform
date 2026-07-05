import { describe, expect, it } from 'vitest'
import { TOKENSMITH_PACKAGE_ID } from './config'
import { buildMintMbtcTx, buildMintMusdcTx } from './faucet'
import { abortCodeToMessage, formatTransactionError } from './errors'
import { deriveLifecycleState, withdrawalUnlockMs } from './lifecycle'
import { WITHDRAWAL_DELAY_MS } from './config'

describe('deriveLifecycleState', () => {
  const expiry = 1_000_000n

  it('returns pre_expiry before Expiry', () => {
    expect(deriveLifecycleState(expiry, expiry - 1n)).toBe('pre_expiry')
  })

  it('returns exercise_window after Expiry but before withdrawal unlock', () => {
    expect(deriveLifecycleState(expiry, expiry)).toBe('exercise_window')
    expect(deriveLifecycleState(expiry, expiry + WITHDRAWAL_DELAY_MS - 1n)).toBe(
      'exercise_window',
    )
  })

  it('returns withdrawal_open after the Exercise Window', () => {
    expect(deriveLifecycleState(expiry, expiry + WITHDRAWAL_DELAY_MS)).toBe(
      'withdrawal_open',
    )
  })
})

describe('withdrawalUnlockMs', () => {
  it('adds the 7-day contract delay to Expiry', () => {
    expect(withdrawalUnlockMs(1000n)).toBe(1000n + WITHDRAWAL_DELAY_MS)
  })
})

describe('abortCodeToMessage', () => {
  it('maps known abort codes', () => {
    expect(abortCodeToMessage(7)).toContain('collateral')
    expect(abortCodeToMessage(6)).toContain('Exercise Window')
  })

  it('falls back for unknown codes', () => {
    expect(abortCodeToMessage(99)).toContain('99')
  })
})

describe('formatTransactionError', () => {
  it('translates MoveAbort codes', () => {
    expect(formatTransactionError(new Error('MoveAbort error code 5'))).toContain(
      'Strike',
    )
  })

  it('handles wallet rejection', () => {
    expect(formatTransactionError(new Error('User rejected the request'))).toContain(
      'rejected',
    )
  })
})

describe('faucet transaction builders', () => {
  it('builds MBTC mint with correct target and args', () => {
    const tx = buildMintMbtcTx(100_000_000n)
    const data = tx.getData() as {
      commands: Array<{ MoveCall: { package: string; module: string; function: string; arguments: unknown[] } }>
    }
    const call = data.commands[0].MoveCall
    expect(call.module).toBe('mock_coin')
    expect(call.function).toBe('mint')
    expect(call.arguments).toHaveLength(2)
  })

  it('builds MUSDC mint with correct target', () => {
    const tx = buildMintMusdcTx(1_000_000n)
    const data = tx.getData() as {
      commands: Array<{ MoveCall: { module: string; function: string } }>
    }
    expect(data.commands[0].MoveCall.module).toBe('mock_usdc')
    expect(data.commands[0].MoveCall.function).toBe('mint')
  })
})

describe('config', () => {
  it('records the canonical tokensmith package id', () => {
    expect(TOKENSMITH_PACKAGE_ID).toBe(
      '0xbfa6bd48a5dac421fc20390d3909ce7a8ddce08d0a020cb907e390f33319c7b0',
    )
  })
})
