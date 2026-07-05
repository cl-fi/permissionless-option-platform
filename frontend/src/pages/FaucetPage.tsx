import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit'
import {
  buildMintMbtcTx,
  buildMintMusdcTx,
  FAUCET_COINS,
  FAUCET_MINT_AMOUNT,
  formatAmount,
} from '../protocol'
import { TxFeedback } from '../components/TxFeedback'
import { useTransactionExecution } from '../hooks/useTransactionExecution'

export function FaucetPage() {
  const account = useCurrentAccount()
  const tx = useTransactionExecution()

  const mbtcBalance = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '', coinType: FAUCET_COINS.mbtc.coinType },
    { enabled: !!account },
  )
  const musdcBalance = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '', coinType: FAUCET_COINS.musdc.coinType },
    { enabled: !!account },
  )

  if (!account) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-white">Faucet</h1>
        <p className="mt-2 text-muted">Connect a wallet to mint test MBTC and MUSDC.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white">Faucet</h1>
      <p className="mt-2 text-muted">
        Mint test MBTC and MUSDC using shared TreasuryCaps on Sui testnet.
      </p>

      <div className="mt-8 space-y-4">
        {([
          {
            key: 'mbtc' as const,
            balance: mbtcBalance.data,
            mint: () => tx.execute(() => buildMintMbtcTx(FAUCET_MINT_AMOUNT.mbtc)),
            amount: FAUCET_MINT_AMOUNT.mbtc,
          },
          {
            key: 'musdc' as const,
            balance: musdcBalance.data,
            mint: () => tx.execute(() => buildMintMusdcTx(FAUCET_MINT_AMOUNT.musdc)),
            amount: FAUCET_MINT_AMOUNT.musdc,
          },
        ]).map((coin) => {
          const info = FAUCET_COINS[coin.key]
          return (
            <div key={coin.key} className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{info.symbol}</p>
                  <p className="text-sm text-muted">
                    Balance:{' '}
                    {formatAmount(
                      BigInt(coin.balance?.totalBalance ?? 0),
                      info.decimals,
                    )}{' '}
                    {info.symbol}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={tx.phase === 'signing' || tx.phase === 'executing'}
                  onClick={() => void coin.mint()}
                >
                  Mint {formatAmount(coin.amount, info.decimals)}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <TxFeedback
        phase={tx.phase}
        digest={tx.digest}
        error={tx.error}
        explorerUrl={tx.explorerUrl}
      />
    </div>
  )
}
