// scripts/deploy.js
// ─────────────────────────────────────────────────────────────
//  Deploy HyperVault to Passet Hub (Polkadot Hub TestNet)
//
//  Prerequisites:
//    1. Copy .env.example → .env and fill in PRIVATE_KEY
//    2. Get testnet PAS from faucet:
//       https://faucet.polkadot.io (select Passet Hub)
//    3. Run: npx hardhat run scripts/deploy.js --network passetHub
//
//  Outputs the deployed address + a verification command.
// ─────────────────────────────────────────────────────────────

const hre = require("hardhat");
const { ethers } = hre;

// ── Config ────────────────────────────────────────────────────

// DOT ERC-20 precompile address on Polkadot Hub.
// ⚠️  Verify this in the official docs before deploying:
//     https://docs.polkadot.com/smart-contracts/precompiles/erc20/
// Placeholder – replace with confirmed address.
const DOT_ERC20_PRECOMPILE = process.env.DOT_ERC20_ADDRESS
  || "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"; // TODO: replace

// Hub sovereign account of the vault on Bifrost.
// This is the 32-byte AccountId that represents the vault's
// Polkadot Hub address in the Bifrost context.
// Compute with: https://www.shawntabrizi.com/substrate-js/
// or use the script below to derive it from the contract address.
//
// For the hackathon demo you can use a placeholder bytes32 and
// update it after the contract is deployed (call setXcmConfig).
const HUB_SOVEREIGN = process.env.HUB_SOVEREIGN
  || "0x" + "00".repeat(32); // placeholder – update post-deploy

// Start in mock mode (xcmEnabled = false) until XCM call bytes are confirmed.
const XCM_ENABLED_AT_DEPLOY = false;

// ─────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n═══════════════════════════════════════════════");
  console.log("  HyperVault — Polkadot Hub TestNet Deploy");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  )} PAS`);
  console.log(`  Network  : ${hre.network.name}`);
  console.log(`  ChainId  : ${(await ethers.provider.getNetwork()).chainId}`);
  console.log("───────────────────────────────────────────────\n");

  // Sanity check
  if (DOT_ERC20_PRECOMPILE === "0x" + "FF".repeat(20)) {
    console.warn("⚠️  WARNING: Using placeholder DOT_ERC20_ADDRESS.");
    console.warn("   Set DOT_ERC20_ADDRESS in .env before mainnet deploy.\n");
  }

  console.log("Deploying HyperVault...");
  const HyperVault = await ethers.getContractFactory("HyperVault");

  const vault = await HyperVault.deploy(
    DOT_ERC20_PRECOMPILE,
    HUB_SOVEREIGN,
    XCM_ENABLED_AT_DEPLOY,
    { gasLimit: 3_000_000 }
  );

  await vault.waitForDeployment();
  const address = await vault.getAddress();

  console.log(`\n✅  HyperVault deployed at: ${address}`);
  console.log(`    DOT token  : ${DOT_ERC20_PRECOMPILE}`);
  console.log(`    Sovereign  : ${HUB_SOVEREIGN}`);
  console.log(`    XCM mode   : ${XCM_ENABLED_AT_DEPLOY ? "LIVE" : "MOCK"}`);

  // ── Post-deploy: derive sovereign hint ───────────────────
  console.log("\n───────────────────────────────────────────────");
  console.log("  Next steps:");
  console.log("───────────────────────────────────────────────");
  console.log(`  1. Compute the vault's Bifrost sovereign account:`);
  console.log(`     Address: ${address}`);
  console.log(`     Use: https://www.shawntabrizi.com/substrate-js/`);
  console.log(`     Select: AccountKey20 → AccountId32, source chain = Polkadot Hub`);
  console.log(`\n  2. Fund that sovereign account on Bifrost with ~1 DOT for fees.`);
  console.log(`\n  3. Confirm Bifrost mint/redeem call bytes, then call:`);
  console.log(`     vault.setXcmConfig(mintCallBytes, redeemCallBytes, true)`);
  console.log(`\n  4. Approve the vault for DOT spending and test deposit:`);
  console.log(`     npx hardhat run scripts/test-deposit.js --network passetHub`);
  console.log(`\n  Explorer: https://blockscout.com (Passet Hub)`);
  console.log(`  Contract: ${address}\n`);

  // Write address to file for frontend .env
  const fs = require("fs");
  const envLine = `VITE_VAULT_ADDRESS=${address}\n`;
  fs.writeFileSync(".vault-address", envLine);
  console.log(`  Vault address written to .vault-address`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });