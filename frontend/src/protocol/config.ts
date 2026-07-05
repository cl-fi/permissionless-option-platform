/**
 * Canonical testnet deployment of the TokenSmith protocol.
 *
 * These IDs are the single source of truth for the whole app (see PRD:
 * "the protocol client owns the deployment configuration"). The older IDs
 * hard-coded in the legacy `scripts/` folder belong to an abandoned
 * deployment and must not be used.
 */

export const NETWORK = 'testnet' as const
export const CHAIN = 'sui:testnet' as const

/** tokensmith Move package (from tokensmith/Published.toml) */
export const TOKENSMITH_PACKAGE_ID =
  '0xbfa6bd48a5dac421fc20390d3909ce7a8ddce08d0a020cb907e390f33319c7b0'

/** The single shared Marketplace registry object created by tokensmith's init */
export const MARKETPLACE_OBJECT_ID =
  '0x5a4a826dee99a1486c26895c6cb00dbea8aa3b43d72cb655125564c77f8092ca'

/** Sui system clock object */
export const CLOCK_OBJECT_ID = '0x6'

/** Mock coin package providing MBTC and MUSDC with shared TreasuryCaps */
export const MOCK_COIN_PACKAGE_ID =
  '0x0ba87d5477f2ff33f9c51b479329a73736e0f1eb847db96ab902a80ef09ae9eb'

export const MBTC_COIN_TYPE = `${MOCK_COIN_PACKAGE_ID}::mock_coin::MOCK_COIN`
export const MUSDC_COIN_TYPE = `${MOCK_COIN_PACKAGE_ID}::mock_usdc::MOCK_USDC`

/** Shared TreasuryCap<MOCK_COIN> — anyone can mint MBTC (the in-app Faucet) */
export const MBTC_TREASURY_CAP_ID =
  '0x2d546560a4080a70de8fdebc2c2439b4e3b15cb3cefa023fb4345976ad1d7c03'

/** Shared TreasuryCap<MOCK_USDC> — anyone can mint MUSDC (the in-app Faucet) */
export const MUSDC_TREASURY_CAP_ID =
  '0x353cd8638d91ce0f2169c13ba8d1334d6b72a8927681261caba2268fd8a916f0'

export const MBTC_DECIMALS = 8
export const MUSDC_DECIMALS = 6

/** Contract constant: Exercise Window length (7 days in ms) after Expiry */
export const WITHDRAWAL_DELAY_MS = 7n * 86_400_000n

export const SUI_COIN_TYPE = '0x2::sui::SUI'
export const SUI_DECIMALS = 9
