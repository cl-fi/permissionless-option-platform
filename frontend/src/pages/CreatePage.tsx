import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MBTC_COIN_TYPE,
  MBTC_DECIMALS,
  MUSDC_COIN_TYPE,
  MUSDC_DECIMALS,
  buildInitOptionVaultTx,
  buildPublishOptionCoinTx,
  buildWriteCoveredCallTx,
  buildWriteCoveredPutTx,
  clearLaunchDraft,
  encodeSeriesId,
  expiryPresets,
  dateTimeLocalValueToExpiryMs,
  expiryToDateTimeLocalValue,
  fetchCoinInfoFromChain,
  generateOptionSymbol,
  generateOtwName,
  humanPriceToFraction,
  loadLaunchDraft,
  parseAmount,
  patchOptionCoinTemplate,
  putCollateralRequired,
  saveLaunchDraft,
  validateCoinType,
  validateLaunchExpiry,
  type LaunchDraft,
  type OptionDirection,
} from '../protocol'
import { ensureBytecodeTemplateReady } from '../protocol/bytecode-init'
import { extractPublishOptionCoinResult, findVaultOwnerId } from '../protocol/tx-parse'
import { TxFeedback } from '../components/TxFeedback'
import { useTransactionExecution } from '../hooks/useTransactionExecution'

type WizardStep = 'form' | 'publish' | 'vault' | 'done'

export function CreatePage() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const tx = useTransactionExecution()

  const [advanced, setAdvanced] = useState(false)
  const [direction, setDirection] = useState<OptionDirection>('call')
  const [strike, setStrike] = useState('65000')
  const [expiryMs, setExpiryMs] = useState(expiryPresets()[0].expiryMs)
  const [underlyingInput, setUnderlyingInput] = useState('')
  const [settlementInput, setSettlementInput] = useState('')
  const [coinError, setCoinError] = useState<string | null>(null)
  const [step, setStep] = useState<WizardStep>('form')
  const [draft, setDraft] = useState<LaunchDraft | null>(null)
  const [writeAmount, setWriteAmount] = useState('1')
  const [createdVaultOwnerId, setCreatedVaultOwnerId] = useState<string | null>(null)
  const [createdOptionCoinType, setCreatedOptionCoinType] = useState<string | null>(null)

  useEffect(() => {
    const saved = loadLaunchDraft()
    if (saved?.treasuryCapId && saved?.publishedPackageId) {
      setDraft(saved)
    }
  }, [])

  useEffect(() => {
    void ensureBytecodeTemplateReady()
  }, [])

  const defaultCoins = useQuery({
    queryKey: ['default-coins'],
    queryFn: async () => ({
      underlying: { coinType: MBTC_COIN_TYPE, symbol: 'MBTC', decimals: MBTC_DECIMALS },
      settlement: { coinType: MUSDC_COIN_TYPE, symbol: 'MUSDC', decimals: MUSDC_DECIMALS },
    }),
    enabled: !advanced,
  })

  const advancedCoins = useQuery({
    queryKey: ['advanced-coins', underlyingInput, settlementInput],
    queryFn: async () => {
      if (!validateCoinType(underlyingInput)) throw new Error('Invalid underlying coin type')
      const settlement = settlementInput.trim()
        ? settlementInput.trim()
        : MUSDC_COIN_TYPE
      if (!validateCoinType(settlement)) throw new Error('Invalid settlement coin type')
      if (underlyingInput.trim() === settlement) {
        throw new Error('Underlying and settlement must differ')
      }
      const [underlying, settlementCoin] = await Promise.all([
        fetchCoinInfoFromChain(client, underlyingInput.trim()),
        fetchCoinInfoFromChain(client, settlement),
      ])
      return { underlying, settlement: settlementCoin }
    },
    enabled: advanced && validateCoinType(underlyingInput.trim()),
    retry: false,
  })

  useEffect(() => {
    if (advancedCoins.error) {
      setCoinError(
        advancedCoins.error instanceof Error
          ? advancedCoins.error.message
          : 'Failed to fetch coin metadata',
      )
    } else {
      setCoinError(null)
    }
  }, [advancedCoins.error])

  const coins = advanced ? advancedCoins.data : defaultCoins.data
  const expiryError = validateLaunchExpiry(expiryMs)

  const resumeOffer = draft && draft.treasuryCapId && account?.address

  async function handleLaunchFresh() {
    if (!account || !coins) return
    setCoinError(null)
    const otwName = generateOtwName()
    const symbol = generateOptionSymbol(coins.underlying.symbol, strike, direction)
    const launchDraft: LaunchDraft = {
      id: crypto.randomUUID(),
      direction,
      underlyingCoinType: coins.underlying.coinType,
      settlementCoinType: coins.settlement.coinType,
      underlyingDecimals: coins.underlying.decimals,
      settlementDecimals: coins.settlement.decimals,
      strikeDisplay: strike,
      expiryMs,
      otwName,
      symbol,
      createdAt: Date.now(),
    }

    setStep('publish')
    const patched = await patchOptionCoinTemplate({
      otwName,
      symbol,
      decimals: coins.underlying.decimals,
    })

    try {
      const result = await tx.execute(() =>
        buildPublishOptionCoinTx(patched.moduleBytes, account.address),
      )
      const txBlock = await client.getTransactionBlock({
        digest: result.digest,
        options: { showObjectChanges: true },
      })
      const published = extractPublishOptionCoinResult(txBlock, account.address)
      const updated: LaunchDraft = {
        ...launchDraft,
        publishedPackageId: published.packageId,
        treasuryCapId: published.treasuryCapId,
        optionCoinType: published.optionCoinType,
      }
      saveLaunchDraft(updated)
      setDraft(updated)
      setStep('vault')
      await handleCreateVault(updated)
    } catch (err) {
      setStep('form')
      setCoinError(
        err instanceof Error ? err.message : tx.error ?? 'Series Launch failed',
      )
    }
  }

  async function handleCreateVault(activeDraft: LaunchDraft) {
    if (!account || !activeDraft.treasuryCapId || !activeDraft.optionCoinType) return
    const strikeFraction = humanPriceToFraction(activeDraft.strikeDisplay)
    try {
      const result = await tx.execute(() =>
        buildInitOptionVaultTx({
          treasuryCapId: activeDraft.treasuryCapId!,
          direction: activeDraft.direction,
          expiryMs: activeDraft.expiryMs,
          strike: strikeFraction,
          assetCoinType: activeDraft.underlyingCoinType,
          settlementCoinType: activeDraft.settlementCoinType,
          optionCoinType: activeDraft.optionCoinType!,
          assetDecimals: activeDraft.underlyingDecimals,
          settlementDecimals: activeDraft.settlementDecimals,
        }),
      )
      const txBlock = await client.getTransactionBlock({
        digest: result.digest,
        options: { showObjectChanges: true },
      })
      setCreatedVaultOwnerId(findVaultOwnerId(txBlock, account.address))
      setCreatedOptionCoinType(activeDraft.optionCoinType ?? null)
      clearLaunchDraft()
      setDraft(null)
      setStep('done')
    } catch {
      setStep('vault')
    }
  }

  async function handleResume() {
    if (!draft) return
    setStep('vault')
    await handleCreateVault(draft)
  }

  async function handleFirstWrite() {
    if (!account || !createdVaultOwnerId || !coins || !createdOptionCoinType) return
    const amount = parseAmount(writeAmount, coins.underlying.decimals)
    const coinType =
      direction === 'call' ? coins.underlying.coinType : coins.settlement.coinType

    const coinObjects = await client.getCoins({
      owner: account.address,
      coinType,
    })
    const coin = coinObjects.data[0]
    if (!coin) throw new Error(`No coins in wallet for ${coinType}`)

    if (direction === 'call') {
      await tx.execute(() =>
        buildWriteCoveredCallTx({
          vaultOwnerId: createdVaultOwnerId,
          assetCoinType: coins.underlying.coinType,
          settlementCoinType: coins.settlement.coinType,
          optionCoinType: createdOptionCoinType,
          assetCoinId: coin.coinObjectId,
          amount,
        }),
      )
    } else {
      const strikeFraction = humanPriceToFraction(strike)
      const collateralAmount = putCollateralRequired(
        amount,
        strikeFraction,
        coins.underlying.decimals,
        coins.settlement.decimals,
      )
      await tx.execute(() =>
        buildWriteCoveredPutTx({
          vaultOwnerId: createdVaultOwnerId,
          assetCoinType: coins.underlying.coinType,
          settlementCoinType: coins.settlement.coinType,
          optionCoinType: createdOptionCoinType,
          collateralCoinId: coin.coinObjectId,
          optionAmount: amount,
          collateralAmount,
        }),
      )
    }
  }

  if (!account) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-white">Series Launch</h1>
        <p className="mt-2 text-muted">Connect a wallet to launch a new Option Series.</p>
      </div>
    )
  }

  if (resumeOffer && step === 'form') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-white">Resume Series Launch</h1>
        <p className="mt-2 text-muted">
          A published Option Coin was found without a Vault. Resume from step 2 or start
          fresh.
        </p>
        <div className="mt-6 card space-y-3">
          <p className="text-sm">
            Symbol: <strong>{draft.symbol}</strong> · Strike: {draft.strikeDisplay} ·{' '}
            {draft.direction}
          </p>
          <div className="flex gap-3">
            <button type="button" className="btn-primary" onClick={() => void handleResume()}>
              Resume Vault creation
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                clearLaunchDraft()
                setDraft(null)
              }}
            >
              Start fresh
            </button>
          </div>
        </div>
        <TxFeedback {...tx} explorerUrl={tx.explorerUrl} />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-white">Series launched</h1>
        <p className="mt-2 text-muted">
          Your Vault is live on the Marketplace. You can keep writing collateral any time
          from Portfolio or the Series page.
        </p>
        {createdVaultOwnerId && coins && createdOptionCoinType && (
          <div className="mt-6 card">
            <p className="text-sm font-medium text-white">Write collateral now (optional)</p>
            <div className="mt-3 flex gap-3">
              <input
                className="input"
                value={writeAmount}
                onChange={(e) => setWriteAmount(e.target.value)}
                placeholder="Amount"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleFirstWrite()}
              >
                Write {direction}
              </button>
            </div>
          </div>
        )}
        {createdOptionCoinType && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={`/series/${encodeSeriesId(createdOptionCoinType)}?action=write`}
              className="btn-primary inline-flex"
            >
              Continue writing
            </Link>
            <Link to="/portfolio" className="btn-secondary inline-flex">
              Open Portfolio
            </Link>
          </div>
        )}
        <TxFeedback {...tx} explorerUrl={tx.explorerUrl} />
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white">Series Launch</h1>
      <p className="mt-2 text-muted">
        Publish a fresh Option Coin, then create the Vault — two transactions, fully
        permissionless.
      </p>

      <div className="mt-6 card space-y-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => setAdvanced(e.target.checked)}
          />
          Advanced: paste any coin type
        </label>

        {advanced ? (
          <div className="space-y-3">
            <input
              className="input font-mono text-xs"
              placeholder="Underlying coin type (0x…::module::TYPE)"
              value={underlyingInput}
              onChange={(e) => setUnderlyingInput(e.target.value)}
            />
            <input
              className="input font-mono text-xs"
              placeholder="Settlement coin type (defaults to MUSDC)"
              value={settlementInput}
              onChange={(e) => setSettlementInput(e.target.value)}
            />
            {advancedCoins.data && (
              <p className="text-xs text-muted">
                Found {advancedCoins.data.underlying.symbol} (
                {advancedCoins.data.underlying.decimals} dec) /{' '}
                {advancedCoins.data.settlement.symbol} (
                {advancedCoins.data.settlement.decimals} dec)
              </p>
            )}
            {coinError && <p className="text-xs text-danger">{coinError}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Default pair: <strong className="text-white">MBTC</strong> /{' '}
            <strong className="text-white">MUSDC</strong>
          </p>
        )}

        <div className="flex gap-3">
          {(['call', 'put'] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${
                direction === d
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted'
              }`}
              onClick={() => setDirection(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm text-muted">Strike ({coins?.settlement.symbol ?? 'MUSDC'} per {coins?.underlying.symbol ?? 'MBTC'})</label>
          <input className="input mt-1" value={strike} onChange={(e) => setStrike(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-muted">Expiry</label>
          {advanced ? (
            <div className="mt-1 space-y-3">
              <input
                type="datetime-local"
                className="input"
                value={expiryToDateTimeLocalValue(expiryMs)}
                onChange={(e) => {
                  const parsed = dateTimeLocalValueToExpiryMs(e.target.value)
                  if (parsed) setExpiryMs(parsed)
                }}
              />
              <div className="flex flex-wrap gap-2">
                {expiryPresets().map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-white"
                    onClick={() => setExpiryMs(p.expiryMs)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">
                Expires {new Date(Number(expiryMs)).toLocaleString()} (local time)
              </p>
              {expiryError && <p className="text-xs text-danger">{expiryError}</p>}
            </div>
          ) : (
            <select
              className="input mt-1"
              value={String(expiryMs)}
              onChange={(e) => setExpiryMs(BigInt(e.target.value))}
            >
              {expiryPresets().map((p) => (
                <option key={p.label} value={String(p.expiryMs)}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          className="btn-primary w-full"
          disabled={
            !coins ||
            !!coinError ||
            !!expiryError ||
            tx.phase === 'signing' ||
            tx.phase === 'executing'
          }
          onClick={() => void handleLaunchFresh()}
        >
          {step === 'publish' ? 'Publishing Option Coin…' : step === 'vault' ? 'Creating Vault…' : 'Launch Series (2 tx)'}
        </button>
      </div>

      <TxFeedback {...tx} explorerUrl={tx.explorerUrl} />
    </div>
  )
}
