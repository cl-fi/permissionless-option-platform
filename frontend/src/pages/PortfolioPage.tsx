import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  encodeSeriesId,
  fetchHeldPositions,
  fetchWrittenSeries,
  formatAmount,
  formatStrikeDisplay,
} from '../protocol'
import { DirectionBadge, LifecycleBadge } from '../components/Badges'

export function PortfolioPage() {
  const account = useCurrentAccount()
  const client = useSuiClient()

  const written = useQuery({
    queryKey: ['written', account?.address],
    queryFn: () => fetchWrittenSeries(client, account!.address),
    enabled: !!account,
  })

  const held = useQuery({
    queryKey: ['held', account?.address],
    queryFn: () => fetchHeldPositions(client, account!.address),
    enabled: !!account,
  })

  if (!account) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-white">Portfolio</h1>
        <p className="mt-2 text-muted">Connect a wallet to view your Series and positions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="mt-2 text-muted">Series you wrote and Option Coin positions you hold.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-white">Series I wrote</h2>
        {written.isPending && <p className="mt-3 text-sm text-muted">Loading…</p>}
        {!written.isPending && (written.data?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-muted">No Vaults owned.</p>
        )}
        <div className="mt-4 grid gap-3">
          {written.data?.map(({ vaultOwner, series }) => {
            const pendingAction =
              series.lifecycle === 'pre_expiry'
                ? 'write'
                : series.lifecycle === 'exercise_window'
                  ? 'claim'
                  : series.lifecycle === 'withdrawal_open'
                    ? 'withdraw'
                    : null
            return (
              <Link
                key={vaultOwner.objectId}
                to={`/series/${encodeSeriesId(series.optionCoinType)}${
                  pendingAction ? `?action=${pendingAction}` : ''
                }`}
                className="card block no-underline hover:border-accent/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <DirectionBadge direction={series.direction} />
                  <LifecycleBadge state={series.lifecycle} />
                  {pendingAction === 'write' && (
                    <span className="badge bg-accent/15 text-accent">Write collateral</span>
                  )}
                  {pendingAction === 'claim' && (
                    <span className="badge bg-accent/15 text-accent">Claim Proceeds</span>
                  )}
                  {pendingAction === 'withdraw' && (
                    <span className="badge bg-accent/15 text-accent">Withdraw Remaining</span>
                  )}
                </div>
                <p className="mt-2 text-white">
                  {formatStrikeDisplay(
                    series.strike,
                    series.settlement.decimals,
                    series.settlement.symbol,
                    series.underlying.symbol,
                  )}
                </p>
                {pendingAction === 'write' && (
                  <p className="mt-2 text-sm text-muted">
                    Minted:{' '}
                    {formatAmount(series.mintedSupply, series.underlying.decimals)}{' '}
                    {series.underlying.symbol} · tap to write more
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Positions I hold</h2>
        {held.isPending && <p className="mt-3 text-sm text-muted">Loading…</p>}
        {!held.isPending && (held.data?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-muted">No Option Coin balances.</p>
        )}
        <div className="mt-4 grid gap-3">
          {held.data?.map((pos) => {
            const action = pos.series.lifecycle === 'pre_expiry' ? 'unwind' : 'exercise'
            return (
              <Link
                key={pos.optionCoinType}
                to={`/series/${encodeSeriesId(pos.optionCoinType)}${
                  action ? `?action=${action}` : ''
                }`}
                className="card block no-underline hover:border-accent/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <DirectionBadge direction={pos.series.direction} />
                  <LifecycleBadge state={pos.series.lifecycle} />
                </div>
                <p className="mt-2 text-white">
                  {formatAmount(pos.balance, pos.series.underlying.decimals)}{' '}
                  {pos.series.underlying.symbol} ·{' '}
                  {formatStrikeDisplay(
                    pos.series.strike,
                    pos.series.settlement.decimals,
                    pos.series.settlement.symbol,
                    pos.series.underlying.symbol,
                  )}
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
