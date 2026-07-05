import type { TransactionPhase } from '../protocol'

interface TxFeedbackProps {
  phase: TransactionPhase
  digest: string | null
  error: string | null
  explorerUrl: string | null
}

export function TxFeedback({ phase, digest, error, explorerUrl }: TxFeedbackProps) {
  if (phase === 'idle') return null

  const label =
    phase === 'signing'
      ? 'Waiting for wallet signature…'
      : phase === 'executing'
        ? 'Executing on testnet…'
        : phase === 'confirmed'
          ? 'Transaction confirmed'
          : 'Transaction failed'

  return (
    <div
      className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
        phase === 'failed'
          ? 'border-danger/40 bg-danger/10 text-danger'
          : phase === 'confirmed'
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-border bg-surface-overlay text-muted'
      }`}
    >
      <p className="font-medium">{label}</p>
      {digest && phase === 'confirmed' && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs underline"
        >
          View on explorer
        </a>
      )}
      {error && <p className="mt-2 text-xs">{error}</p>}
    </div>
  )
}
