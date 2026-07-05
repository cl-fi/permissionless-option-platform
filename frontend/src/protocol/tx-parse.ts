import type { SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc'

export function extractPublishOptionCoinResult(
  txBlock: SuiTransactionBlockResponse,
  sender: string,
): { packageId: string; treasuryCapId: string; optionCoinType: string } {
  const changes = txBlock.objectChanges ?? []
  let packageId = ''
  let treasuryCapId = ''
  let optionCoinType = ''

  for (const change of changes) {
    if (change.type === 'published') {
      packageId = change.packageId
    }
    if (
      change.type === 'created' &&
      change.objectType.includes('TreasuryCap') &&
      change.owner &&
      typeof change.owner === 'object' &&
      'AddressOwner' in change.owner &&
      change.owner.AddressOwner === sender
    ) {
      treasuryCapId = change.objectId
      const match = change.objectType.match(/TreasuryCap<(.+)>/)
      if (match) optionCoinType = match[1]
    }
  }

  if (!packageId || !treasuryCapId || !optionCoinType) {
    throw new Error('Could not find published Option Coin package or TreasuryCap')
  }

  return { packageId, treasuryCapId, optionCoinType }
}

export function findVaultOwnerId(
  txBlock: SuiTransactionBlockResponse,
  sender: string,
): string | null {
  for (const change of txBlock.objectChanges ?? []) {
    if (
      change.type === 'created' &&
      change.objectType.includes('VaultOwner') &&
      change.owner &&
      typeof change.owner === 'object' &&
      'AddressOwner' in change.owner &&
      change.owner.AddressOwner === sender
    ) {
      return change.objectId
    }
  }
  return null
}
