import { bcs } from '@mysten/bcs'
import { Transaction } from '@mysten/sui/transactions'
import {
  update_constants,
  update_identifiers,
} from '@mysten/move-bytecode-template'
import { ensureBytecodeTemplateReady } from './bytecode-init'
import {
  CLOCK_OBJECT_ID,
  MARKETPLACE_OBJECT_ID,
  TOKENSMITH_PACKAGE_ID,
} from './config'
import {
  hexToBytes,
  OPTION_COIN_TEMPLATE_HEX,
  TEMPLATE_MODULE_NAME,
  TEMPLATE_OTW_NAME,
  TEMPLATE_SYMBOL,
} from './template'
import type { OptionDirection, Strike } from './types'

const CALL_OPTION = 0
const PUT_OPTION = 1

export interface PatchOptionCoinInput {
  otwName: string
  symbol: string
  decimals: number
}

export interface PatchOptionCoinResult {
  moduleBytes: Uint8Array
  otwName: string
  moduleName: string
  symbol: string
}

/** Patch the Option Coin template module for a new Series. */
export async function patchOptionCoinTemplate(
  input: PatchOptionCoinInput,
): Promise<PatchOptionCoinResult> {
  await ensureBytecodeTemplateReady()

  const otwName = input.otwName.toUpperCase().replace(/[^A-Z0-9_]/g, '')
  const moduleName = otwName.toLowerCase()
  if (!otwName || otwName.length < 3) {
    throw new Error('Generated OTW name is too short')
  }

  let bytes = hexToBytes(OPTION_COIN_TEMPLATE_HEX)

  bytes = update_identifiers(bytes, {
    [TEMPLATE_OTW_NAME]: otwName,
    [TEMPLATE_MODULE_NAME]: moduleName,
  })

  bytes = update_constants(
    bytes,
    bcs.u8().serialize(input.decimals).toBytes(),
    bcs.u8().serialize(8).toBytes(),
    'U8',
  )

  const symbolBytes = new TextEncoder().encode(input.symbol)
  bytes = update_constants(
    bytes,
    bcs.vector(bcs.u8()).serialize(Array.from(symbolBytes)).toBytes(),
    bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(TEMPLATE_SYMBOL))).toBytes(),
    'Vector(U8)',
  )

  const nameBytes = new TextEncoder().encode(`${input.symbol} Option`)
  bytes = update_constants(
    bytes,
    bcs.vector(bcs.u8()).serialize(Array.from(nameBytes)).toBytes(),
    bcs
      .vector(bcs.u8())
      .serialize(Array.from(new TextEncoder().encode('MOCK OPTION COIN')))
      .toBytes(),
    'Vector(U8)',
  )

  return { moduleBytes: bytes, otwName, moduleName, symbol: input.symbol }
}

export function buildPublishOptionCoinTx(moduleBytes: Uint8Array): Transaction {
  const tx = new Transaction()
  tx.setGasBudget(200_000_000n)
  tx.publish({
    modules: [Array.from(moduleBytes)],
    dependencies: [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
    ],
  })
  return tx
}

export interface InitVaultParams {
  treasuryCapId: string
  direction: OptionDirection
  expiryMs: bigint
  strike: Strike
  assetCoinType: string
  settlementCoinType: string
  optionCoinType: string
  assetDecimals: number
  settlementDecimals: number
}

export function buildInitOptionVaultTx(params: InitVaultParams): Transaction {
  const tx = new Transaction()
  tx.setGasBudget(50_000_000n)
  tx.moveCall({
    target: `${TOKENSMITH_PACKAGE_ID}::tokensmith::init_option_vault`,
    typeArguments: [
      params.assetCoinType,
      params.settlementCoinType,
      params.optionCoinType,
    ],
    arguments: [
      tx.object(CLOCK_OBJECT_ID),
      tx.object(params.treasuryCapId),
      tx.pure.u8(params.direction === 'call' ? CALL_OPTION : PUT_OPTION),
      tx.pure.u64(params.expiryMs),
      tx.pure.u64(params.strike.numerator),
      tx.pure.u64(params.strike.denominator),
      tx.pure.u8(params.assetDecimals),
      tx.pure.u8(params.settlementDecimals),
      tx.object(MARKETPLACE_OBJECT_ID),
    ],
  })
  return tx
}

export function generateOtwName(): string {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  return `TS${suffix}`
}

export function generateOptionSymbol(
  underlyingSymbol: string,
  strikeDisplay: string,
  direction: OptionDirection,
): string {
  const compactStrike = strikeDisplay.replace(/\./g, '')
  const dir = direction === 'call' ? 'C' : 'P'
  const base = `TS${underlyingSymbol}${compactStrike}${dir}`.slice(0, 16)
  return base.toUpperCase()
}

export function optionCoinTypeFromPublish(
  packageId: string,
  moduleName: string,
  otwName: string,
): string {
  return `${packageId}::${moduleName}::${otwName}`
}

const LAUNCH_STORAGE_KEY = 'tokensmith.launch.draft'

export function saveLaunchDraft(draft: import('./types').LaunchDraft): void {
  localStorage.setItem(LAUNCH_STORAGE_KEY, JSON.stringify(draft, replacer))
}

export function loadLaunchDraft(): import('./types').LaunchDraft | null {
  const raw = localStorage.getItem(LAUNCH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw, reviver) as import('./types').LaunchDraft
  } catch {
    return null
  }
}

export function clearLaunchDraft(): void {
  localStorage.removeItem(LAUNCH_STORAGE_KEY)
}

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return { __bigint: value.toString() }
  return value
}

function reviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    '__bigint' in value &&
    typeof (value as { __bigint: string }).__bigint === 'string'
  ) {
    return BigInt((value as { __bigint: string }).__bigint)
  }
  return value
}

export function expiryPresets(nowMs = Date.now()): Array<{
  label: string
  expiryMs: bigint
}> {
  return [
    { label: '10 minutes — demo', expiryMs: BigInt(nowMs + 10 * 60_000) },
    { label: '1 hour', expiryMs: BigInt(nowMs + 3_600_000) },
    { label: '1 day', expiryMs: BigInt(nowMs + 86_400_000) },
    { label: '1 week', expiryMs: BigInt(nowMs + 7 * 86_400_000) },
  ]
}
