# Permissionless Option Platform

A Sui-based protocol where anyone can create, write, and exercise fully-collateralized, tokenized European options on any Sui coin — no platform approval required.

## Language

### Core domain

**Option Series**:
A unique option product defined by underlying asset, settlement currency, call/put direction, strike, and expiry. Each Series is backed by exactly one Option Vault and identified by its own Option Coin type.
_Avoid_: option market, option product, listing

**Option Coin**:
The fungible Sui coin type minted 1:1 against collateral for a Series. Holding it is holding the option; it is freely transferable and tradable.
_Avoid_: option token, oToken

**Option Vault**:
The on-chain object holding a Series' collateral, strike, expiry, and minting authority. One Vault per Series.
_Avoid_: pool, escrow

**Marketplace**:
The single shared registry object that stores all Option Vaults, keyed by Option Coin type. It is a registry, not a trading venue.
_Avoid_: exchange, order book

**Writer**:
The account that creates a Series and locks collateral to mint Option Coins. Identified on-chain by holding the Series' VaultOwner capability.
_Avoid_: seller, issuer, creator

**Holder**:
Any account holding Option Coins. Holders exercise after expiry or unwind before expiry.
_Avoid_: buyer, owner

**Strike**:
The exercise price, stored as a numerator/denominator fraction of settlement currency per unit of underlying (decimal-adjusted).
_Avoid_: exercise price (in UI copy), price ratio

**Expiry**:
The millisecond timestamp after which a Series becomes exercisable. European style: exercise is only possible *after* Expiry, never before.
_Avoid_: expiration date, maturity

**Exercise Window**:
The 7-day period after Expiry during which Holders may exercise. After it ends, the Writer may withdraw remaining collateral.
_Avoid_: settlement period

### Lifecycle actions

**Write**:
Locking collateral into a Vault and minting Option Coins (covered call: underlying asset; covered put: settlement currency at strike value).
_Avoid_: mint (alone), sell

**Exercise**:
Post-Expiry physical settlement by a Holder: burn Option Coins and swap at Strike (call: pay settlement currency, receive underlying; put: deliver underlying, receive settlement currency).
_Avoid_: settle, redeem

**Unwind**:
Pre-Expiry burning of Option Coins to reclaim the corresponding collateral. Available to any Holder.
_Avoid_: withdraw (ambiguous), cancel

**Claim Proceeds**:
Post-Expiry collection by the Writer of what exercising Holders paid in.
_Avoid_: harvest, collect

**Withdraw Remaining**:
Writer reclaiming unexercised collateral after the Exercise Window closes.
_Avoid_: withdraw (ambiguous)

### Frontend

**Series Launch**:
The two-transaction frontend flow that creates a Series: (1) publish a fresh Option Coin package from a bytecode template, (2) hand its TreasuryCap to the protocol to create the Vault.
_Avoid_: deploy, listing creation
