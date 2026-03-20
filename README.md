# HyperVault - Native DOT Yield on Polkadot Hub

Polkadot Solidity Hackathon | Track 1: EVM Smart Contracts  
Solo Build | 7-Hour Sprint | Submission: March 20, 2026

## One-Line Pitch

A Solidity-native yield vault on Polkadot Hub that routes DOT to Bifrost via XCM, earns Bifrost liquid staking rewards (vDOT, ~14-16% APY target), and returns principal + yield to users - no bridges, no Ethereum.

## Product Vision

HyperVault is designed to make Polkadot-native yield accessible from the EVM environment on Polkadot Hub:

- Users deposit DOT once from the HyperVault dApp/contract flow.
- The vault dispatches XCM to Bifrost to mint vDOT.
- The vault tracks user shares and share price as staking value accrues.
- On withdrawal, the vault dispatches XCM to redeem vDOT back to DOT + yield.
- Users never need to interact with Bifrost directly.

## Current Prototype Status (Demo-Ready UI)

This repository currently contains a professional frontend prototype that simulates the complete deposit/withdraw UX in **mock mode** (so the demo works even if XCM precompile integration is not fully wired yet).

What's mocked today:

- vDOT value growth using a mocked APY
- share price and user position accounting
- "XCM dispatched" + activity feed events

Where it lives:

- Vault mock logic: `src/hooks/use-vault.ts`
- Dashboard / states / components: `src/components/*`, `src/pages/Index.tsx`

Planned next step:

- Replace mock mode with real `HyperVault.sol` contract interactions on Polkadot Hub (and wire XCM dispatch to Bifrost through the relevant precompile).

## User Experience (Deposit -> Yield -> Withdraw)

### Deposit

1. User enters an amount in DOT.
2. Vault calculates shares based on current share price.
3. Vault "dispatches XCM to Bifrost" to mint vDOT (mocked in this prototype).
4. UI shows updated position and share count.

### Withdraw

1. User chooses shares to redeem.
2. Vault calculates the DOT owed from share price (principal + accrued value).
3. Vault "redeems vDOT via XCM from Bifrost" (mocked in this prototype).
4. UI updates wallet balance and clears/updates the position.

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
- Include an emergency pause and a demo-friendly fallback strategy.

Fallback strategy (critical for a 7-hour build):

- The UX continues to work even if the XCM precompile is unavailable/misconfigured.
- Contract actions degrade to emitted events and mocked yield accounting so the demo flow remains intact.

## Frontend Spec

Design direction:

- Dark, precise, financial UI (not generic gradient DeFi)
- Monospace numbers, clear data panels, and an "XCM status" banner for trust

Views (implemented as a UI state machine in this prototype):

- Connect Wallet (demo connect)
- Main Dashboard: vault stats, deposit panel, position panel, activity feed
- Transaction Pending overlay during "XCM dispatch" (simulated)

## Tech Stack

- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- Contract integration (planned): `ethers.js`, wallet connection (e.g. wagmi/viem + RainbowKit)
- Prototype logic (current): mocked vault state to keep the demo end-to-end

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

## 7-Hour Build Plan (Condensed)

1. Environment setup + precompile validation (or fallback decision)
2. Implement `HyperVault.sol` (deposit/withdraw/share accounting + XCM dispatch)
3. Add tests + deploy script (at minimum: compile + basic deposit/withdraw flow)
4. Build UI states (connect → dashboard → pending overlay)
5. Wire UI to the real contract (replacing mock mode)
6. Demo run + polish
7. Final README + demo submission materials

## Roadmap (If Time Permits)

- XCM response handling (confirm vDOT receipt / redemption)
- Live APY oracle pulled via XCM queries (instead of mocked yield)
- Multi-asset extension beyond DOT (e.g. KSM/GLMR) if supported
- Auto-compounding / vault parameters governance
