# HyperVault - Native DOT Yield on Polkadot Hub


## One-Line Pitch

A Solidity-native yield vault on Polkadot Hub that routes DOT to Bifrost via XCM, earns Bifrost liquid staking rewards (vDOT, ~14-16% APY target), and returns principal + yield to users - no bridges, no Ethereum.

## Product Vision

HyperVault is designed to make Polkadot-native yield accessible from the EVM environment on Polkadot Hub:

- Users deposit DOT once from the HyperVault dApp/contract flow.
- The vault dispatches XCM to Bifrost to mint vDOT.
- The vault tracks user shares and share price as staking value accrues.
- On withdrawal, the vault dispatches XCM to redeem vDOT back to DOT + yield.
- Users never need to interact with Bifrost directly.

## Architecture (Planned)

```
Polkadot Hub (EVM)
  User Wallet
    |
    v
  HyperVault.sol
    - deposit(amount)
    - withdraw(shares)
    - share accounting + share price
    - XCM dispatch (to Bifrost)
    |
    v
  XCM Precompile Interface
    |
    v  XCM message (mint / redeem)
Bifrost Parachain
  vtoken minting pallet
    - mint(DOT) -> vDOT
    - redeem(vDOT) -> DOT + yield
```

## Smart Contract Spec (HyperVault.sol — planned)

Key behaviors:

- Accept DOT deposits from users (via the DOT ERC20 representation on Polkadot Hub as exposed in the EVM layer).
- Dispatch XCM messages to Bifrost to mint vDOT.
- Track each user's shares and share price over time.
- Dispatch XCM messages to redeem vDOT back to DOT + yield on withdrawal.
- Include an emergency pause and an XCM-failure fallback strategy.

Fallback strategy:
- If XCM dispatch is unavailable or misconfigured on the target network, the contract emits intent events and safely blocks or defers share accounting for actions that depend on successful XCM delivery.

## Tech Stack

- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- Contract integration (planned): `ethers.js`, wallet connection (e.g. wagmi/viem + RainbowKit)
- Contract integration: wire the UI to real `HyperVault.sol` methods as they are implemented

## Local Development

1. Install dependencies:
   - `npm install`
   - or `bun install` (lockfiles are present)
2. Start dev server:
   - `npm run dev`
3. Build:
   - `npm run build`
4. Test / Lint:
   - `npm test`
   - `npm run lint`

## Roadmap (If Time Permits)

- XCM response handling (confirm vDOT receipt / redemption)
- Live APY oracle pulled via XCM queries (instead of mocked yield)
- Multi-asset extension beyond DOT (e.g. KSM/GLMR) if supported
- Auto-compounding / vault parameters governance
