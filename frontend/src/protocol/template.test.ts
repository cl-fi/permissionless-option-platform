import init, { deserialize } from '@mysten/move-bytecode-template'
import { describe, expect, it } from 'vitest'
import { patchOptionCoinTemplate } from './launch'
import { hexToBytes, OPTION_COIN_TEMPLATE_HEX } from './template'

describe('patchOptionCoinTemplate', () => {
  it('patches identifiers and produces distinct bytecode', () => {
    init()
    const result = patchOptionCoinTemplate({
      otwName: 'TSDEMO01',
      symbol: 'TSD65000C',
      decimals: 6,
    })

    expect(result.otwName).toBe('TSDEMO01')
    expect(result.moduleName).toBe('tsdemo01')

    const abi = deserialize(result.moduleBytes) as { identifiers: string[] }
    expect(abi.identifiers).toContain('TSDEMO01')
    expect(abi.identifiers).toContain('tsdemo01')
    expect(abi.identifiers).not.toContain('MOCK_OPTION')

    const original = hexToBytes(OPTION_COIN_TEMPLATE_HEX)
    expect(result.moduleBytes.length).toBeGreaterThan(0)
    expect(Array.from(result.moduleBytes)).not.toEqual(Array.from(original))
  })
})
