/**
 * Seeds a demo Call Series on Sui testnet against the canonical deployment.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed_demo_series.ts
 *
 * Requires `privatekey` in the repo-root `.env` file.
 */
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import dotenv from 'dotenv'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import init, {
  update_constants,
  update_identifiers,
} from '@mysten/move-bytecode-template'
import { bcs } from '@mysten/bcs'

dotenv.config({ path: resolve(import.meta.dirname, '../.env') })

const TOKENSMITH_PACKAGE =
  '0xbfa6bd48a5dac421fc20390d3909ce7a8ddce08d0a020cb907e390f33319c7b0'
const MARKETPLACE =
  '0x5a4a826dee99a1486c26895c6cb00dbea8aa3b43d72cb655125564c77f8092ca'
const MBTC = `${'0x0ba87d5477f2ff33f9c51b479329a73736e0f1eb847db96ab902a80ef09ae9eb'}::mock_coin::MOCK_COIN`
const MUSDC = `${'0x0ba87d5477f2ff33f9c51b479329a73736e0f1eb847db96ab902a80ef09ae9eb'}::mock_usdc::MOCK_USDC`

async function main() {
  const pk = String(process.env.privatekey)
  const keypair = Ed25519Keypair.fromSecretKey(pk)
  const client = new SuiClient({ url: getFullnodeUrl('testnet') })
  const sender = keypair.getPublicKey().toSuiAddress()

  console.log('Seeding demo Series as', sender)

  execSync('sui move build --path mock_option', {
    cwd: resolve(import.meta.dirname, '..'),
    stdio: 'inherit',
  })

  const templateHex = execSync(
    'xxd -c 0 -p mock_option/build/mock_option/bytecode_modules/mock_option.mv',
    { cwd: resolve(import.meta.dirname, '..') },
  )
    .toString()
    .trim()

  init()
  const otwName = `TSSEED${Date.now().toString(36).toUpperCase().slice(-6)}`
  const moduleName = otwName.toLowerCase()
  let bytes = Uint8Array.from(Buffer.from(templateHex, 'hex'))
  bytes = update_identifiers(bytes, {
    MOCK_OPTION: otwName,
    mock_option: moduleName,
  })
  bytes = update_constants(
    bytes,
    bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode('TSDEMO'))).toBytes(),
    bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode('MOPTION'))).toBytes(),
    'Vector(U8)',
  )

  const publishTx = new Transaction()
  publishTx.setGasBudget(50_000_000n)
  publishTx.publish({
    modules: [Array.from(bytes)],
    dependencies: [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
    ],
  })

  const publishResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: publishTx,
    options: { showObjectChanges: true },
  })

  let packageId = ''
  let treasuryCapId = ''
  let optionCoinType = ''
  for (const change of publishResult.objectChanges ?? []) {
    if (change.type === 'published') packageId = change.packageId
    if (
      change.type === 'created' &&
      change.objectType.includes('TreasuryCap') &&
      change.owner &&
      typeof change.owner === 'object' &&
      'AddressOwner' in change.owner &&
      change.owner.AddressOwner === sender
    ) {
      treasuryCapId = change.objectId
      optionCoinType = change.objectType.match(/TreasuryCap<(.+)>/)?.[1] ?? ''
    }
  }

  if (!packageId || !treasuryCapId) {
    throw new Error('Publish failed to produce TreasuryCap')
  }

  console.log('Published Option Coin:', optionCoinType)

  const vaultTx = new Transaction()
  vaultTx.setGasBudget(50_000_000n)
  vaultTx.moveCall({
    target: `${TOKENSMITH_PACKAGE}::tokensmith::init_option_vault`,
    typeArguments: [MBTC, MUSDC, optionCoinType],
    arguments: [
      vaultTx.object('0x6'),
      vaultTx.object(treasuryCapId),
      vaultTx.pure.u8(0),
      vaultTx.pure.u64(BigInt(Date.now() + 86_400_000)),
      vaultTx.pure.u64(65000n),
      vaultTx.pure.u64(1n),
      vaultTx.pure.u8(8),
      vaultTx.pure.u8(6),
      vaultTx.object(MARKETPLACE),
    ],
  })

  const vaultResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: vaultTx,
  })

  console.log('Demo Series created. Vault tx:', vaultResult.digest)
  console.log('Option coin type:', optionCoinType)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
