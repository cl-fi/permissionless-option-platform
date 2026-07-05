import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import { describe, expect, it } from 'vitest'
import { coinTypesEqual, fetchAllSeries, fetchVaultOwnersForAddress } from './series'

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl('testnet'),
  network: 'testnet',
})

describe('vault owner integration', () => {
  it('matches each marketplace series to its writer VaultOwner', async () => {
    const all = await fetchAllSeries(client)
    expect(all.length).toBeGreaterThan(0)

    for (const s of all) {
      const owners = await fetchVaultOwnersForAddress(client, s.writer)
      const match = owners.find((o) => coinTypesEqual(o.optionCoinType, s.optionCoinType))
      expect(match, `writer ${s.writer} series ${s.optionCoinType}`).toBeDefined()
    }
  })
})
