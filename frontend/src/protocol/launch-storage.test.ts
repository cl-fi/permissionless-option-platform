import { beforeEach, describe, expect, it } from 'vitest'
import { loadLaunchDraft, saveLaunchDraft, clearLaunchDraft } from './launch'
import type { LaunchDraft } from './types'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  }
})

describe('launch draft persistence', () => {
  it('round-trips bigint fields through localStorage', () => {
    const draft: LaunchDraft = {
      id: 'test',
      direction: 'call',
      underlyingCoinType: '0x1::a::A',
      settlementCoinType: '0x1::b::B',
      underlyingDecimals: 8,
      settlementDecimals: 6,
      strikeDisplay: '65000',
      expiryMs: 1234567890123n,
      treasuryCapId: '0xtcap',
      publishedPackageId: '0xpkg',
      createdAt: Date.now(),
    }
    saveLaunchDraft(draft)
    expect(loadLaunchDraft()?.expiryMs).toBe(1234567890123n)
    expect(loadLaunchDraft()?.treasuryCapId).toBe('0xtcap')
    clearLaunchDraft()
    expect(loadLaunchDraft()).toBeNull()
  })
})
