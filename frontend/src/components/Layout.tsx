import { ConnectButton, useCurrentAccount, useSuiClientContext } from '@mysten/dapp-kit'
import { useSuiClientQuery } from '@mysten/dapp-kit'
import { NavLink, Outlet } from 'react-router-dom'
import { formatAmount } from '../protocol/amounts'
import { NETWORK, SUI_COIN_TYPE, SUI_DECIMALS } from '../protocol/config'
import { HowItWorksBanner } from './HowItWorksBanner'

const navItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/', label: 'Marketplace', end: true },
  { to: '/create', label: 'Create' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/faucet', label: 'Faucet' },
]

function WalletSummary() {
  const account = useCurrentAccount()
  const { data: balance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '', coinType: SUI_COIN_TYPE },
    { enabled: !!account },
  )

  if (!account) return null

  return (
    <div className="hidden text-right text-xs text-muted sm:block">
      <div className="font-mono text-white/90">
        {account.address.slice(0, 6)}…{account.address.slice(-4)}
      </div>
      <div>
        {formatAmount(BigInt(balance?.totalBalance ?? 0), SUI_DECIMALS)} SUI
      </div>
    </div>
  )
}

export function Layout() {
  const { network } = useSuiClientContext()
  const wrongNetwork = network !== NETWORK

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          <NavLink to="/" className="flex items-center gap-2 no-underline">
            <span className="text-lg font-bold tracking-tight text-white">
              Token<span className="text-accent">Smith</span>
            </span>
          </NavLink>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm no-underline transition ${
                    isActive
                      ? 'bg-surface-overlay text-white'
                      : 'text-muted hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <WalletSummary />
            <ConnectButton />
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm no-underline ${
                  isActive ? 'bg-surface-overlay text-white' : 'text-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {wrongNetwork && (
        <div className="border-b border-danger/40 bg-danger/10 px-4 py-3 text-center text-sm text-danger">
          Switch your wallet to <strong>Sui Testnet</strong> to use TokenSmith.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8">
        <HowItWorksBanner />
        <Outlet />
      </main>
    </div>
  )
}
