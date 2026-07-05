# TokenSmith Frontend

Static SPA for the [Permissionless Option Platform](../README.md) on Sui testnet.

## Stack

- Vite + React + TypeScript + Tailwind
- [@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit) for wallet + RPC
- Framework-agnostic **protocol client** in `src/protocol/` (deployment IDs, domain math, transaction builders, chain reads)

## Commands

```bash
pnpm install
pnpm dev          # local dev server
pnpm test         # Vitest (protocol client seam)
pnpm build        # production build
```

## Deploy

Configured for [Vercel](https://vercel.com) (`vercel.json` SPA rewrite). Connect the `frontend/` directory as the project root.

## Demo flow

1. Connect wallet on **Sui Testnet**
2. **Faucet** — mint MBTC + MUSDC
3. **Create** — Series Launch (2 transactions: publish Option Coin → create Vault)
4. **Write** collateral on the Series detail page
5. Wait for Expiry (use “10 minutes — demo” preset)
6. **Exercise** → **Claim Proceeds**

Withdraw Remaining unlocks 7 days after Expiry (contract constant) — the UI shows the countdown.

## Seed script

To populate the Marketplace with a demo Series:

```bash
# from repo root, requires privatekey in .env
npx tsx scripts/seed_demo_series.ts
```

Uses the canonical testnet deployment recorded in `src/protocol/config.ts`.
