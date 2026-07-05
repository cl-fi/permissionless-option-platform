import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import { MARKETPLACE_OBJECT_ID, TOKENSMITH_PACKAGE_ID } from './config'
import { deriveLifecycleState } from './lifecycle'
import { fractionToHumanPrice } from './strike'
import type {
  CoinInfo,
  HeldPosition,
  OptionDirection,
  Series,
  Strike,
  VaultOwnerRef,
  VaultState,
  WrittenSeries,
} from './types'

function parseTypeNameField(name: unknown): string | null {
  if (typeof name === 'string') return name
  if (!name || typeof name !== 'object') return null
  const value = (name as { value?: unknown }).value
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'name' in value) {
    const inner = (value as { name?: unknown }).name
    if (typeof inner === 'string') return inner
  }
  if ('fields' in (name as object)) {
    const nested = parseTypeNameField(
      (name as { fields: Record<string, unknown> }).fields.name,
    )
    if (nested) return nested
  }
  if ('name' in (name as object)) {
    const direct = (name as { name?: unknown }).name
    if (typeof direct === 'string') return direct
  }
  return null
}

/** Normalize coin type strings so VaultOwner and Marketplace keys match. */
export function normalizeCoinType(coinType: string): string {
  const parts = coinType.split('::')
  if (parts.length !== 3) return coinType
  let [addr, module, name] = parts
  // Move TypeName stores package addresses without the 0x prefix.
  if (!addr.startsWith('0x') && /^[a-fA-F0-9]+$/.test(addr)) {
    addr = `0x${addr}`
  }
  if (!addr.startsWith('0x')) return coinType
  try {
    const normalizedAddr = `0x${BigInt(addr).toString(16)}`
    return `${normalizedAddr}::${module}::${name}`
  } catch {
    return coinType
  }
}

export function coinTypesEqual(a: string, b: string): boolean {
  return normalizeCoinType(a) === normalizeCoinType(b)
}

function extractCoinTypesFromVaultType(
  vaultType: string,
): { asset: string; settlement: string; option: string } | null {
  const match = vaultType.match(/OptionVault<([^,]+),\s*([^,]+),\s*([^>]+)>/)
  if (!match) return null
  return {
    asset: match[1].trim(),
    settlement: match[2].trim(),
    option: match[3].trim(),
  }
}

function symbolFromCoinType(coinType: string): string {
  const parts = coinType.split('::')
  return parts[parts.length - 1] ?? coinType.slice(0, 8)
}

async function fetchCoinInfo(
  client: SuiJsonRpcClient,
  coinType: string,
  fallbackDecimals: number,
): Promise<CoinInfo> {
  try {
    const metadata = await client.getCoinMetadata({ coinType })
    return {
      coinType,
      symbol: metadata?.symbol ?? symbolFromCoinType(coinType),
      decimals: metadata?.decimals ?? fallbackDecimals,
    }
  } catch {
    return {
      coinType,
      symbol: symbolFromCoinType(coinType),
      decimals: fallbackDecimals,
    }
  }
}

function fieldBigInt(fields: Record<string, unknown>, key: string): bigint {
  const value = fields[key]
  if (typeof value === 'string') return BigInt(value)
  if (typeof value === 'number') return BigInt(value)
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value
    if (typeof inner === 'string') return BigInt(inner)
  }
  return 0n
}

function fieldNumber(fields: Record<string, unknown>, key: string): number {
  const value = fields[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function fieldString(fields: Record<string, unknown>, key: string): string {
  const value = fields[key]
  return typeof value === 'string' ? value : ''
}

function parseBalance(fields: Record<string, unknown>, key: string): bigint {
  const balance = fields[key]
  if (balance && typeof balance === 'object' && 'fields' in balance) {
    return fieldBigInt((balance as { fields: Record<string, unknown> }).fields, 'value')
  }
  return fieldBigInt(fields, key)
}

function parseStrike(fields: Record<string, unknown>): Strike {
  const price = fields.exercise_price
  if (price && typeof price === 'object' && 'fields' in price) {
    const pf = (price as { fields: Record<string, unknown> }).fields
    return {
      numerator: fieldBigInt(pf, 'numerator'),
      denominator: fieldBigInt(pf, 'denominator') || 1n,
    }
  }
  return { numerator: 0n, denominator: 1n }
}

function parseTreasurySupply(fields: Record<string, unknown>): bigint {
  const cap = fields.treasury_cap
  if (cap && typeof cap === 'object' && 'fields' in cap) {
    const cf = (cap as { fields: Record<string, unknown> }).fields
    const supply = cf.total_supply
    if (supply && typeof supply === 'object' && 'fields' in supply) {
      return fieldBigInt(
        (supply as { fields: Record<string, unknown> }).fields,
        'value',
      )
    }
    return fieldBigInt(cf, 'total_supply')
  }
  return 0n
}

export function parseVaultFields(
  vaultType: string,
  fields: Record<string, unknown>,
  nowMs: bigint,
  underlying?: CoinInfo,
  settlement?: CoinInfo,
): VaultState {
  const types = extractCoinTypesFromVaultType(vaultType)
  if (!types) throw new Error(`Unrecognized vault type: ${vaultType}`)

  const assetDecimals = fieldNumber(fields, 'asset_decimals')
  const settlementDecimals = fieldNumber(fields, 'usdc_decimals')
  const direction: OptionDirection =
    fieldNumber(fields, 'option_type') === 1 ? 'put' : 'call'

  const underlyingCoin =
    underlying ??
    ({
      coinType: types.asset,
      symbol: symbolFromCoinType(types.asset),
      decimals: assetDecimals,
    } satisfies CoinInfo)

  const settlementCoin =
    settlement ??
    ({
      coinType: types.settlement,
      symbol: symbolFromCoinType(types.settlement),
      decimals: settlementDecimals,
    } satisfies CoinInfo)

  const strike = parseStrike(fields)
  const expiryMs = fieldBigInt(fields, 'expire_date')
  const assetBalance = parseBalance(fields, 'asset_balance')
  const settlementBalance = parseBalance(fields, 'usdc_balance')
  const mintedSupply = parseTreasurySupply(fields)
  const lifecycle = deriveLifecycleState(expiryMs, nowMs)

  const remainingCollateral =
    direction === 'call' ? assetBalance : settlementBalance
  const collateralCoin = direction === 'call' ? underlyingCoin : settlementCoin

  return {
    optionCoinType: types.option,
    direction,
    underlying: underlyingCoin,
    settlement: settlementCoin,
    strike,
    strikeDisplay: fractionToHumanPrice(strike),
    expiryMs,
    mintedSupply,
    remainingCollateral,
    collateralCoin,
    writer: fieldString(fields, 'owner'),
    lifecycle,
    assetBalance,
    settlementBalance,
  }
}

export async function fetchAllSeries(
  client: SuiJsonRpcClient,
  nowMs = BigInt(Date.now()),
): Promise<VaultState[]> {
  const fields = await client.getDynamicFields({ parentId: MARKETPLACE_OBJECT_ID })
  const series: VaultState[] = []

  for (const entry of fields.data) {
    const optionCoinType = parseTypeNameField(entry.name)
    if (!optionCoinType) continue

    const vaultObject = await client.getDynamicFieldObject({
      parentId: MARKETPLACE_OBJECT_ID,
      name: entry.name,
    })

    const data = vaultObject.data
    if (!data?.content || data.content.dataType !== 'moveObject') continue

    const vault = parseVaultFields(
      data.content.type,
      data.content.fields as Record<string, unknown>,
      nowMs,
    )

    const [underlying, settlement] = await Promise.all([
      fetchCoinInfo(client, vault.underlying.coinType, vault.underlying.decimals),
      fetchCoinInfo(client, vault.settlement.coinType, vault.settlement.decimals),
    ])

    series.push({
      ...vault,
      underlying,
      settlement,
    })
  }

  return series
}

export async function fetchSeriesByOptionCoinType(
  client: SuiJsonRpcClient,
  optionCoinType: string,
  nowMs = BigInt(Date.now()),
): Promise<VaultState | null> {
  const all = await fetchAllSeries(client, nowMs)
  return all.find((s) => coinTypesEqual(s.optionCoinType, optionCoinType)) ?? null
}

export function encodeOptionCoinTypeName(optionCoinType: string) {
  return {
    type: '0x1::type_name::TypeName',
    value: { name: optionCoinType },
  }
}

export async function fetchVaultOwnersForAddress(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<VaultOwnerRef[]> {
  const objects = await client.getOwnedObjects({
    owner,
    filter: {
      StructType: `${TOKENSMITH_PACKAGE_ID}::tokensmith::VaultOwner`,
    },
    options: { showContent: true },
  })

  return objects.data
    .map((item) => {
      const content = item.data?.content
      if (!content || content.dataType !== 'moveObject') return null
      const fields = content.fields as Record<string, unknown>
      const optionCoinType = normalizeCoinType(
        parseTypeNameField(fields.option_coin_type) ?? '',
      )
      return {
        objectId: item.data!.objectId,
        optionCoinType,
      }
    })
    .filter((x): x is VaultOwnerRef => x !== null && x.optionCoinType !== '')
}

export async function fetchWrittenSeries(
  client: SuiJsonRpcClient,
  owner: string,
  nowMs = BigInt(Date.now()),
): Promise<WrittenSeries[]> {
  const [owners, allSeries] = await Promise.all([
    fetchVaultOwnersForAddress(client, owner),
    fetchAllSeries(client, nowMs),
  ])
  const byType = new Map(allSeries.map((s) => [s.optionCoinType, s]))
  const byNormalizedType = new Map(
    allSeries.map((s) => [normalizeCoinType(s.optionCoinType), s]),
  )
  return owners
    .map((vaultOwner) => {
      const series =
        byType.get(vaultOwner.optionCoinType) ??
        byNormalizedType.get(normalizeCoinType(vaultOwner.optionCoinType))
      if (!series) return null
      return { vaultOwner, series }
    })
    .filter((x): x is WrittenSeries => x !== null)
}

export async function fetchHeldPositions(
  client: SuiJsonRpcClient,
  owner: string,
  nowMs = BigInt(Date.now()),
): Promise<HeldPosition[]> {
  const [allSeries, balances] = await Promise.all([
    fetchAllSeries(client, nowMs),
    client.getAllBalances({ owner }),
  ])

  const seriesByType = new Map(allSeries.map((s) => [s.optionCoinType, s]))
  const positions: HeldPosition[] = []

  for (const balance of balances) {
    const series = seriesByType.get(balance.coinType)
    if (!series) continue
    if (BigInt(balance.totalBalance) === 0n) continue
    positions.push({
      optionCoinType: balance.coinType,
      balance: BigInt(balance.totalBalance),
      series,
    })
  }

  return positions
}

export function validateCoinType(input: string): boolean {
  return /^0x[a-fA-F0-9]+::[\w_]+::[\w_]+$/.test(input.trim())
}

export async function fetchCoinInfoFromChain(
  client: SuiJsonRpcClient,
  coinType: string,
): Promise<CoinInfo> {
  if (!validateCoinType(coinType)) {
    throw new Error('Invalid coin type format')
  }
  const metadata = await client.getCoinMetadata({ coinType })
  if (!metadata) throw new Error('Coin metadata not found on chain')
  return {
    coinType,
    symbol: metadata.symbol ?? symbolFromCoinType(coinType),
    decimals: metadata.decimals,
  }
}

export function filterSeries(
  series: Series[],
  filters: {
    direction?: OptionDirection | 'all'
    underlying?: string | 'all'
    lifecycle?: import('./types').LifecycleState | 'all'
  },
): Series[] {
  return series.filter((s) => {
    if (filters.direction && filters.direction !== 'all' && s.direction !== filters.direction) {
      return false
    }
    if (
      filters.underlying &&
      filters.underlying !== 'all' &&
      s.underlying.coinType !== filters.underlying
    ) {
      return false
    }
    if (filters.lifecycle && filters.lifecycle !== 'all' && s.lifecycle !== filters.lifecycle) {
      return false
    }
    return true
  })
}

export type SeriesSortKey = 'expiry' | 'strike' | 'supply' | 'collateral'

export function sortSeries(series: Series[], sortBy: SeriesSortKey): Series[] {
  return [...series].sort((a, b) => {
    switch (sortBy) {
      case 'expiry':
        return Number(a.expiryMs - b.expiryMs)
      case 'strike':
        return Number(
          a.strike.numerator * b.strike.denominator -
            b.strike.numerator * a.strike.denominator,
        )
      case 'supply':
        return Number(b.mintedSupply - a.mintedSupply)
      case 'collateral':
        return Number(b.remainingCollateral - a.remainingCollateral)
    }
  })
}

export function encodeSeriesId(optionCoinType: string): string {
  return encodeURIComponent(optionCoinType)
}

export function decodeSeriesId(id: string): string {
  return decodeURIComponent(id)
}
