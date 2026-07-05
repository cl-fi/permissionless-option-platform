import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildClaimProceedsTx,
  buildExerciseCallTx,
  buildExercisePutTx,
  buildTransferOptionCoinTx,
  buildUnwindTx,
  buildWithdrawRemainingTx,
  buildWriteCoveredCallTx,
  buildWriteCoveredPutTx,
  callExercisePayment,
  coinTypesEqual,
  decodeSeriesId,
  fetchSeriesByOptionCoinType,
  fetchVaultOwnersForAddress,
  formatAmount,
  formatStrikeDisplay,
  parseAmount,
  putCollateralRequired,
  putExercisePayout,
  withdrawalUnlockMs,
} from '../protocol'
import { DirectionBadge, LifecycleBadge } from '../components/Badges'
import { TxFeedback } from '../components/TxFeedback'
import { useTransactionExecution } from '../hooks/useTransactionExecution'

function Countdown({ targetMs, label }: { targetMs: bigint; label: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Number(targetMs) - now
  if (diff <= 0) return <p className="text-sm text-muted">{label}: elapsed</p>
  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return (
    <p className="text-sm text-muted">
      {label}: {mins}m {secs}s
    </p>
  )
}

export function SeriesDetailPage({ optionCoinTypeParam }: { optionCoinTypeParam: string }) {
  const optionCoinType = decodeSeriesId(optionCoinTypeParam)
  const account = useCurrentAccount()
  const client = useSuiClient()
  const tx = useTransactionExecution()
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('action')

  const [writeAmount, setWriteAmount] = useState('1')
  const [exerciseAmount, setExerciseAmount] = useState('1')
  const [transferTo, setTransferTo] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const writeSectionRef = useRef<HTMLDivElement>(null)

  async function runAction(action: () => Promise<void>) {
    setInlineError(null)
    try {
      await action()
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : String(err))
    }
  }

  const { data: series, isPending } = useQuery({
    queryKey: ['series', optionCoinType],
    queryFn: () => fetchSeriesByOptionCoinType(client, optionCoinType),
  })

  const { data: vaultOwners = [], isPending: vaultOwnersPending } = useQuery({
    queryKey: ['vault-owners', account?.address],
    queryFn: () => fetchVaultOwnersForAddress(client, account!.address),
    enabled: !!account,
  })

  const vaultOwner = vaultOwners.find((v) => coinTypesEqual(v.optionCoinType, optionCoinType))
  const isCreator =
    !!account && series?.writer.toLowerCase() === account.address.toLowerCase()

  const { data: optionBalance } = useQuery({
    queryKey: ['balance', account?.address, optionCoinType],
    queryFn: () =>
      client.getBalance({ owner: account!.address, coinType: optionCoinType }),
    enabled: !!account,
  })

  const isWriter = !!vaultOwner
  const holderBalance = BigInt(optionBalance?.totalBalance ?? 0)
  const isHolder = holderBalance > 0n

  const exercisePayment = useMemo(() => {
    if (!series) return 0n
    try {
      const amount = parseAmount(exerciseAmount, series.underlying.decimals)
      return series.direction === 'call'
        ? callExercisePayment(
            amount,
            series.strike,
            series.underlying.decimals,
            series.settlement.decimals,
          )
        : putExercisePayout(
            amount,
            series.strike,
            series.underlying.decimals,
            series.settlement.decimals,
          )
    } catch {
      return 0n
    }
  }, [series, exerciseAmount])

  const putCollateral = useMemo(() => {
    if (!series) return 0n
    try {
      const amount = parseAmount(writeAmount, series.underlying.decimals)
      return putCollateralRequired(
        amount,
        series.strike,
        series.underlying.decimals,
        series.settlement.decimals,
      )
    } catch {
      return 0n
    }
  }, [series, writeAmount])

  useEffect(() => {
    if (highlight === 'write' && writeSectionRef.current) {
      writeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight, series, vaultOwners])

  if (isPending) return <p className="text-muted">Loading Series…</p>
  if (!series) {
    return (
      <div className="card">
        <p className="text-white">Series not found</p>
        <Link to="/" className="mt-4 inline-block">
          Back to Marketplace
        </Link>
      </div>
    )
  }

  const canWrite = isWriter && series.lifecycle === 'pre_expiry'
  const canUnwind = isHolder && isWriter && series.lifecycle === 'pre_expiry'
  const canExercise = isHolder && series.lifecycle !== 'pre_expiry'
  const canClaim =
    isWriter && (series.lifecycle === 'exercise_window' || series.lifecycle === 'withdrawal_open')
  const canWithdrawRemaining = isWriter && series.lifecycle === 'withdrawal_open'
  const hasActions =
    canWrite ||
    canUnwind ||
    canExercise ||
    canClaim ||
    canWithdrawRemaining ||
    (isHolder && series.lifecycle === 'pre_expiry') ||
    (isWriter && series.lifecycle === 'exercise_window')

  async function getPrimaryCoin(coinType: string) {
    const coins = await client.getCoins({ owner: account!.address, coinType })
    const coin = coins.data[0]
    if (!coin) throw new Error('Insufficient balance for this action')
    return coin.coinObjectId
  }

  async function runWriteCall() {
    if (!vaultOwner) return
    const amount = parseAmount(writeAmount, series!.underlying.decimals)
    const coinId = await getPrimaryCoin(series!.underlying.coinType)
    await tx.execute(() =>
      buildWriteCoveredCallTx({
        vaultOwnerId: vaultOwner.objectId,
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
        assetCoinId: coinId,
        amount,
      }),
    )
  }

  async function runWritePut() {
    if (!vaultOwner) return
    const amount = parseAmount(writeAmount, series!.underlying.decimals)
    const coinId = await getPrimaryCoin(series!.settlement.coinType)
    await tx.execute(() =>
      buildWriteCoveredPutTx({
        vaultOwnerId: vaultOwner.objectId,
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
        collateralCoinId: coinId,
        optionAmount: amount,
      }),
    )
  }

  async function runExerciseCall() {
    const amount = parseAmount(exerciseAmount, series!.underlying.decimals)
    const optionCoins = await client.getCoins({
      owner: account!.address,
      coinType: series!.optionCoinType,
    })
    const paymentCoins = await client.getCoins({
      owner: account!.address,
      coinType: series!.settlement.coinType,
    })
    if (!optionCoins.data[0] || !paymentCoins.data[0]) {
      throw new Error('Insufficient Option Coins or settlement currency')
    }
    if (holderBalance < amount) throw new Error('Not enough Option Coins')
    const required = callExercisePayment(
      amount,
      series!.strike,
      series!.underlying.decimals,
      series!.settlement.decimals,
    )
    if (BigInt(paymentCoins.data[0].balance) < required) {
      throw new Error('Insufficient settlement currency for Exercise')
    }
    await tx.execute(() =>
      buildExerciseCallTx({
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
        optionCoinId: optionCoins.data[0].coinObjectId,
        paymentCoinId: paymentCoins.data[0].coinObjectId,
        optionAmount: amount,
        paymentAmount: required,
      }),
    )
  }

  async function runExercisePut() {
    const amount = parseAmount(exerciseAmount, series!.underlying.decimals)
    const optionCoins = await client.getCoins({
      owner: account!.address,
      coinType: series!.optionCoinType,
    })
    const assetCoins = await client.getCoins({
      owner: account!.address,
      coinType: series!.underlying.coinType,
    })
    if (!optionCoins.data[0] || !assetCoins.data[0]) {
      throw new Error('Insufficient Option Coins or underlying asset')
    }
    await tx.execute(() =>
      buildExercisePutTx({
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
        optionCoinId: optionCoins.data[0].coinObjectId,
        assetCoinId: assetCoins.data[0].coinObjectId,
        optionAmount: amount,
        assetAmount: amount,
      }),
    )
  }

  async function runUnwind() {
    if (!vaultOwner) return
    const optionCoins = await client.getCoins({
      owner: account!.address,
      coinType: series!.optionCoinType,
    })
    if (!optionCoins.data[0]) throw new Error('No Option Coins to Unwind')
    await tx.execute(() =>
      buildUnwindTx({
        vaultOwnerId: vaultOwner.objectId,
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
        optionCoinId: optionCoins.data[0].coinObjectId,
      }),
    )
  }

  async function runClaim() {
    if (!vaultOwner) return
    await tx.execute(() =>
      buildClaimProceedsTx({
        vaultOwnerId: vaultOwner.objectId,
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
      }),
    )
  }

  async function runWithdrawRemaining() {
    if (!vaultOwner) return
    await tx.execute(() =>
      buildWithdrawRemainingTx({
        vaultOwnerId: vaultOwner.objectId,
        assetCoinType: series!.underlying.coinType,
        settlementCoinType: series!.settlement.coinType,
        optionCoinType: series!.optionCoinType,
      }),
    )
  }

  async function runTransfer() {
    if (!transferTo.startsWith('0x')) throw new Error('Invalid recipient address')
    const optionCoins = await client.getCoins({
      owner: account!.address,
      coinType: series!.optionCoinType,
    })
    if (!optionCoins.data[0]) throw new Error('No Option Coins to transfer')
    await tx.execute(() =>
      buildTransferOptionCoinTx(optionCoins.data[0].coinObjectId, transferTo),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-muted no-underline hover:text-white">
          ← Marketplace
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">
            {formatStrikeDisplay(
              series.strike,
              series.settlement.decimals,
              series.settlement.symbol,
              series.underlying.symbol,
            )}
          </h1>
          <DirectionBadge direction={series.direction} />
          <LifecycleBadge state={series.lifecycle} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-white">Vault state</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Writer</dt>
              <dd className="font-mono text-xs">{series.writer.slice(0, 10)}…</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Underlying collateral</dt>
              <dd>
                {formatAmount(series.assetBalance, series.underlying.decimals)}{' '}
                {series.underlying.symbol}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Settlement pool</dt>
              <dd>
                {formatAmount(series.settlementBalance, series.settlement.decimals)}{' '}
                {series.settlement.symbol}
              </dd>
            </div>
            {isWriter && series.lifecycle !== 'pre_expiry' && (
              <div className="flex justify-between">
                <dt className="text-muted">Claimable proceeds</dt>
                <dd>
                  {series.direction === 'call'
                    ? `${formatAmount(series.settlementBalance, series.settlement.decimals)} ${series.settlement.symbol}`
                    : `${formatAmount(series.assetBalance, series.underlying.decimals)} ${series.underlying.symbol}`}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Minted Option Coins</dt>
              <dd>
                {formatAmount(series.mintedSupply, series.underlying.decimals)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Your Option Coin balance</dt>
              <dd>
                {formatAmount(holderBalance, series.underlying.decimals)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-border pt-4">
            <Countdown targetMs={series.expiryMs} label="Time to Expiry" />
            <Countdown
              targetMs={withdrawalUnlockMs(series.expiryMs)}
              label="Withdraw Remaining unlocks in"
            />
          </div>
        </div>

        <div className="space-y-4">
          {!account && (
            <div className="card">
              <h2 className="font-semibold text-white">Actions</h2>
              <p className="mt-2 text-sm text-muted">
                Connect your wallet to write collateral or manage Option Coin positions.
              </p>
            </div>
          )}

          {account && isCreator && !isWriter && !vaultOwnersPending && (
            <div className="card border-warning/40">
              <h2 className="font-semibold text-white">Writer access</h2>
              <p className="mt-2 text-sm text-muted">
                This Series was launched from your wallet, but your VaultOwner object
                could not be loaded. Open{' '}
                <Link to="/portfolio" className="text-accent">
                  Portfolio
                </Link>{' '}
                and try again.
              </p>
            </div>
          )}

          {account && !hasActions && !isCreator && (
            <div className="card">
              <h2 className="font-semibold text-white">Actions</h2>
              <p className="mt-2 text-sm text-muted">
                Write, Exercise, and Unwind appear here when your wallet owns the Vault
                (Writer) or Option Coins (Holder) for this Series.
              </p>
            </div>
          )}

          {canWrite && (
            <div
              ref={writeSectionRef}
              className={`card ${highlight === 'write' ? 'ring-2 ring-accent' : ''}`}
            >
              <h2 className="font-semibold text-white">Write</h2>
              <p className="mt-1 text-sm text-muted">
                Deposit collateral to mint more Option Coins for this Series.
              </p>
              <input
                className="input mt-3"
                value={writeAmount}
                onChange={(e) => setWriteAmount(e.target.value)}
              />
              {series.direction === 'put' && (
                <p className="mt-2 text-xs text-muted">
                  Required collateral:{' '}
                  {formatAmount(putCollateral, series.settlement.decimals)}{' '}
                  {series.settlement.symbol}
                </p>
              )}
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={() =>
                  void runAction(() =>
                    series.direction === 'call' ? runWriteCall() : runWritePut(),
                  )
                }
              >
                Write covered {series.direction}
              </button>
            </div>
          )}

          {canUnwind && (
            <div className={`card ${highlight === 'unwind' ? 'ring-2 ring-accent' : ''}`}>
              <h2 className="font-semibold text-white">Unwind</h2>
              <p className="mt-1 text-sm text-muted">Burn Option Coins pre-Expiry to reclaim collateral.</p>
              <button type="button" className="btn-secondary mt-3" onClick={() => void runAction(runUnwind)}>
                Unwind
              </button>
            </div>
          )}

          {canExercise && (
            <div
              className={`card ${highlight === 'exercise' ? 'ring-2 ring-accent' : ''}`}
            >
              <h2 className="font-semibold text-white">Exercise</h2>
              <input
                className="input mt-3"
                value={exerciseAmount}
                onChange={(e) => setExerciseAmount(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted">
                {series.direction === 'call'
                  ? `Payment: ${formatAmount(exercisePayment, series.settlement.decimals)} ${series.settlement.symbol}`
                  : `Deliver ${exerciseAmount} ${series.underlying.symbol} · receive ${formatAmount(exercisePayment, series.settlement.decimals)} ${series.settlement.symbol}`}
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={() =>
                  void runAction(() =>
                    series.direction === 'call' ? runExerciseCall() : runExercisePut(),
                  )
                }
              >
                Exercise {series.direction}
              </button>
            </div>
          )}

          {isHolder && series.lifecycle === 'pre_expiry' && (
            <div className="card">
              <h2 className="font-semibold text-white">Transfer Option Coins</h2>
              <input
                className="input mt-3 font-mono text-xs"
                placeholder="Recipient address (0x…)"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              />
              <button type="button" className="btn-secondary mt-3" onClick={() => void runAction(runTransfer)}>
                Transfer
              </button>
            </div>
          )}

          {canClaim && (
            <div
              className={`card ${highlight === 'claim' ? 'ring-2 ring-accent' : ''}`}
            >
              <h2 className="font-semibold text-white">Claim Proceeds</h2>
              <p className="mt-1 text-sm text-muted">
                Collect settlement proceeds from exercised positions.
              </p>
              <button type="button" className="btn-primary mt-3" onClick={() => void runAction(runClaim)}>
                Claim Proceeds
              </button>
            </div>
          )}

          {isWriter && series.lifecycle === 'exercise_window' && (
            <div className="card">
              <h2 className="font-semibold text-white">Withdraw Remaining</h2>
              <p className="mt-1 text-sm text-muted">
                Unlocks after the 7-day Exercise Window. Countdown shown above.
              </p>
              <button type="button" className="btn-secondary mt-3" disabled>
                Not yet unlocked
              </button>
            </div>
          )}

          {canWithdrawRemaining && (
            <div
              className={`card ${highlight === 'withdraw' ? 'ring-2 ring-accent' : ''}`}
            >
              <h2 className="font-semibold text-white">Withdraw Remaining</h2>
              <button type="button" className="btn-primary mt-3" onClick={() => void runAction(runWithdrawRemaining)}>
                Withdraw Remaining
              </button>
            </div>
          )}
        </div>
      </div>

      {inlineError && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {inlineError}
        </p>
      )}

      <TxFeedback {...tx} explorerUrl={tx.explorerUrl} />
    </div>
  )
}
