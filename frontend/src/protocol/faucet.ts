import { Transaction } from '@mysten/sui/transactions'
import {
  MBTC_COIN_TYPE,
  MBTC_TREASURY_CAP_ID,
  MOCK_COIN_PACKAGE_ID,
  MUSDC_COIN_TYPE,
  MUSDC_TREASURY_CAP_ID,
} from './config'

export function buildMintMbtcTx(amount: bigint): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${MOCK_COIN_PACKAGE_ID}::mock_coin::mint`,
    arguments: [tx.object(MBTC_TREASURY_CAP_ID), tx.pure.u64(amount)],
  })
  return tx
}

export function buildMintMusdcTx(amount: bigint): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${MOCK_COIN_PACKAGE_ID}::mock_usdc::mint`,
    arguments: [tx.object(MUSDC_TREASURY_CAP_ID), tx.pure.u64(amount)],
  })
  return tx
}

export const FAUCET_MINT_AMOUNT = {
  mbtc: 10_000_000_000n, // 100 MBTC
  musdc: 100_000_000_000n, // 100,000 MUSDC
} as const

export const FAUCET_COINS = {
  mbtc: { coinType: MBTC_COIN_TYPE, symbol: 'MBTC', decimals: 8 },
  musdc: { coinType: MUSDC_COIN_TYPE, symbol: 'MUSDC', decimals: 6 },
} as const
