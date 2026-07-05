# Frontend publishes per-series Option Coins via bytecode template

The `tokensmith` contract requires a fresh zero-supply `TreasuryCap<OPTION_COIN>` for every Option Series, meaning each Series needs its own Sui coin type published on-chain. Rather than pre-deploying a fixed pool of option coins (which caps supply and fakes permissionlessness) or reworking the contract to avoid per-series coin types (which would break the "options are plain tradable Sui coins" property), the frontend ships a pre-compiled Move coin package as a bytecode template and uses `@mysten/move-bytecode-template` (WASM, in-browser) to patch the module name, symbol, and decimals before the user's wallet publishes it. Series Launch is therefore a two-transaction flow: (1) publish the patched coin package, (2) pass its TreasuryCap to `init_option_vault`.

## Consequences

- Series Launch cannot be a single transaction: the TreasuryCap created by the publish's `init` is not referenceable within the same PTB. The wizard must handle the interrupted state where a coin was published but no Vault was created (orphan TreasuryCap).
- The Option Coin's decimals must be patched to match the underlying asset's decimals, a contract invariant enforced only by convention.
- The template package's compiled bytecode is a build artifact committed to the frontend; recompiling it against a different framework version requires re-verifying the patch offsets.
