import { useState } from 'react'

export function HowItWorksBanner() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-8 card border-accent/20 bg-accent/5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="text-sm font-semibold text-white">How TokenSmith works</p>
          <p className="mt-1 text-sm text-muted">
            Write → Expiry → Exercise Window → Withdraw Remaining
          </p>
        </div>
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm text-muted">
          <p>
            <strong className="text-white">Write</strong> — lock collateral and
            mint Option Coins 1:1. European style: Exercise only opens after
            Expiry.
          </p>
          <p>
            <strong className="text-white">Exercise Window</strong> — Holders
            can Exercise for 7 days after Expiry. Writers can Claim Proceeds
            from settlements.
          </p>
          <p>
            <strong className="text-white">Withdraw Remaining</strong> — after
            the window closes, Writers reclaim unexercised collateral. The
            7-day delay is a contract constant — use minute-level Expiry presets
            to demo Exercise live.
          </p>
        </div>
      )}
    </div>
  )
}
