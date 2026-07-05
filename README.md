# Permissionless Option Platform (TokenSmith)

A Sui-based protocol where anyone can create, write, and exercise fully-collateralized, tokenized European options on any Sui coin — no platform approval required.

## Live demo

Deploy the frontend from `frontend/` to Vercel (see [frontend/README.md](frontend/README.md)).

## Architecture

```
tokensmith/          Move protocol (testnet deployment in Published.toml)
mock_coin/           MBTC + MUSDC test coins with shared TreasuryCaps
mock_option/         Option Coin bytecode template source
frontend/
  src/protocol/      Single seam: config, domain math, RPC parsers, tx builders
  src/pages/         React UI (Marketplace, Create, Portfolio, Faucet, Series detail)
scripts/             Legacy tx scripts + seed_demo_series.ts
```

The frontend reads Sui RPC directly (Marketplace dynamic fields for Series discovery). Series Launch patches `mock_option` bytecode in-browser per [ADR 0001](docs/adr/0001-frontend-publishes-option-coins-via-bytecode-template.md).

## Canonical testnet IDs

| Object | ID |
|--------|-----|
| tokensmith package | `0xbfa6bd48a5dac421fc20390d3909ce7a8ddce08d0a020cb907e390f33319c7b0` |
| Marketplace | `0x5a4a826dee99a1486c26895c6cb00dbea8aa3b43d72cb655125564c77f8092ca` |
| mock_coin package | `0x0ba87d5477f2ff33f9c51b479329a73736e0f1eb847db96ab902a80ef09ae9eb` |

Domain vocabulary: [CONTEXT.md](CONTEXT.md)

## Quick start (frontend)

```bash
cd frontend && pnpm install && pnpm dev
```

## Why Choose Us?

### Permissionless Creation
- Create options for any Sui-based asset without platform approval
- Support for both covered calls and puts
- Fully collateralized to ensure security

### Tokenized Options
- Options exist as tradable Sui coins
- Seamless integration with AMMs and DEXes

### Built-in Safety
- Fully collateralized positions
- European-style exercise (only after Expiry)

## License

See [LICENSE](LICENSE).
