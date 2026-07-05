import { useSuiClient } from '@mysten/dapp-kit'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatAmount } from '../protocol/amounts'
import {
  encodeSeriesId,
  fetchAllSeries,
  filterSeries,
  sortSeries,
  type SeriesSortKey,
} from '../protocol/series'
import { formatStrikeDisplay } from '../protocol/strike'
import { DirectionBadge, LifecycleBadge } from '../components/Badges'
import { useMemo, useState } from 'react'
import type { LifecycleState, OptionDirection } from '../protocol/types'

export function MarketplacePage() {
  const client = useSuiClient()
  const [direction, setDirection] = useState<OptionDirection | 'all'>('all')
  const [lifecycle, setLifecycle] = useState<LifecycleState | 'all'>('all')
  const [sortBy, setSortBy] = useState<SeriesSortKey>('expiry')

  const { data: series = [], isPending } = useQuery({
    queryKey: ['series'],
    queryFn: () => fetchAllSeries(client),
  })

  const underlyings = useMemo(
    () => [...new Set(series.map((s) => s.underlying.coinType))],
    [series],
  )
  const [underlying, setUnderlying] = useState<string | 'all'>('all')

  const filtered = useMemo(
    () => sortSeries(filterSeries(series, { direction, underlying, lifecycle }), sortBy),
    [series, direction, underlying, lifecycle, sortBy],
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>
        <p className="mt-2 text-muted">
          Every Option Series registered on-chain — permissionless, fully
          collateralized.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="input w-auto"
          value={direction}
          onChange={(e) => setDirection(e.target.value as OptionDirection | 'all')}
        >
          <option value="all">All directions</option>
          <option value="call">Call</option>
          <option value="put">Put</option>
        </select>
        <select
          className="input w-auto"
          value={underlying}
          onChange={(e) => setUnderlying(e.target.value)}
        >
          <option value="all">All underlyings</option>
          {underlyings.map((u) => (
            <option key={u} value={u}>
              {series.find((s) => s.underlying.coinType === u)?.underlying.symbol ?? u}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={lifecycle}
          onChange={(e) => setLifecycle(e.target.value as LifecycleState | 'all')}
        >
          <option value="all">All states</option>
          <option value="pre_expiry">Live</option>
          <option value="exercise_window">Exercise Window</option>
          <option value="withdrawal_open">Withdrawal Open</option>
        </select>
        <select
          className="input w-auto"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SeriesSortKey)}
        >
          <option value="expiry">Sort: Expiry</option>
          <option value="strike">Sort: Strike</option>
          <option value="supply">Sort: Supply</option>
          <option value="collateral">Sort: Collateral</option>
        </select>
      </div>

      {isPending && <p className="text-muted">Loading Series from testnet…</p>}

      {!isPending && filtered.length === 0 && (
        <div className="card text-center">
          <p className="text-white">No Series yet</p>
          <p className="mt-2 text-sm text-muted">
            Launch the first Series from the Create page, or run the seed script.
          </p>
          <Link to="/create" className="btn-primary mt-4 inline-flex">
            Launch a Series
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((s) => (
          <Link
            key={s.optionCoinType}
            to={`/series/${encodeSeriesId(s.optionCoinType)}`}
            className="card block no-underline transition hover:border-accent/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <DirectionBadge direction={s.direction} />
                <LifecycleBadge state={s.lifecycle} />
              </div>
              <span className="text-xs text-muted">{s.underlying.symbol}</span>
            </div>
            <p className="mt-3 text-lg font-semibold text-white">
              {formatStrikeDisplay(
                s.strike,
                s.settlement.decimals,
                s.settlement.symbol,
                s.underlying.symbol,
              )}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Expiry</dt>
                <dd className="text-white">
                  {new Date(Number(s.expiryMs)).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Minted supply</dt>
                <dd className="text-white">
                  {formatAmount(s.mintedSupply, s.underlying.decimals)}{' '}
                  {s.underlying.symbol}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Remaining collateral</dt>
                <dd className="text-white">
                  {formatAmount(s.remainingCollateral, s.collateralCoin.decimals)}{' '}
                  {s.collateralCoin.symbol}
                </dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </div>
  )
}
