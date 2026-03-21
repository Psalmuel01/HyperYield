// scripts/test-deposit.js
// ─────────────────────────────────────────────────────────────
//  Smoke test: approve + deposit + read position
//
//  Usage:
//    npx hardhat run scripts/test-deposit.js --network polkadotTestnet
// ─────────────────────────────────────────────────────────────

const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

function loadEnvFileValue(path, key) {
  if (!fs.existsSync(path)) return null;
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    if (k !== key) continue;
    return line.slice(idx + 1).trim() || null;
  }
  return null;
}

async function main() {
  const [signer] = await ethers.getSigners();

  // Load vault address from deploy output
  const vaultAddress = process.env.VAULT_ADDRESS
    || loadEnvFileValue(".vault-address", "VAULT_ADDRESS");

  if (!vaultAddress) {
    throw new Error("Set VAULT_ADDRESS env var or run deploy.js first.");
  }

  const dotAddress = process.env.DOT_ERC20_ADDRESS;
  if (!dotAddress) {
    throw new Error("Set DOT_ERC20_ADDRESS env var.");
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  HyperVault — Smoke Test");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Signer : ${signer.address}`);
  console.log(`  Vault  : ${vaultAddress}`);
  console.log(`  DOT    : ${dotAddress}`);

  const vault = await ethers.getContractAt("HyperVault", vaultAddress, signer);
  const dot = await ethers.getContractAt("IERC20", dotAddress, signer);
  const dotDecimals = Number(await vault.dotDecimals());
  const dotSymbol = dotDecimals === 10 ? "DOT" : "TOKEN";

  const ONE_TOKEN = ethers.parseUnits("1", dotDecimals);
  const DEPOSIT_AMOUNT = ONE_TOKEN * 5n; // 5 units

  console.log(`\n[1] Token balance: ${ethers.formatUnits(
    await dot.balanceOf(signer.address), dotDecimals
  )} ${dotSymbol}`);

  // Approve
  console.log(`[2] Approving vault for ${ethers.formatUnits(DEPOSIT_AMOUNT, dotDecimals)} ${dotSymbol}...`);
  const approveTx = await dot.approve(vaultAddress, DEPOSIT_AMOUNT);
  await approveTx.wait();
  console.log(`    ✅ Approved (tx: ${approveTx.hash})`);

  // Deposit
  console.log(`[3] Depositing ${ethers.formatUnits(DEPOSIT_AMOUNT, dotDecimals)} ${dotSymbol}...`);
  const depositTx = await vault.deposit(DEPOSIT_AMOUNT, { gasLimit: 500_000 });
  const receipt = await depositTx.wait();
  console.log(`    ✅ Deposited (tx: ${depositTx.hash})`);

  // Find Deposited event
  const depositedEvent = receipt.logs
    .map(log => { try { return vault.interface.parseLog(log); } catch { return null; } })
    .find(e => e?.name === "Deposited");

  if (depositedEvent) {
    console.log(`    Shares issued : ${depositedEvent.args.sharesIssued.toString()}`);
    console.log(`    Share price   : ${depositedEvent.args.sharePrice.toString()}`);
  }

  // Read position
  console.log(`\n[4] Reading user position...`);
  const pos = await vault.getUserInfo(signer.address);
  console.log(`    Shares      : ${pos._shares.toString()}`);
  console.log(`    Value       : ${ethers.formatUnits(pos._dotValue, dotDecimals)} ${dotSymbol}`);
  console.log(`    Est. yield  : ${ethers.formatUnits(pos._estimatedYield, dotDecimals)} ${dotSymbol}`);

  // Vault state
  console.log(`\n[5] Vault state...`);
  const state = await vault.getVaultState();
  console.log(`    Total value : ${ethers.formatUnits(state._totalDotDeposited, dotDecimals)} ${dotSymbol}`);
  console.log(`    Total shares: ${state._totalShares.toString()}`);
  console.log(`    Share price : ${state._sharePrice.toString()}`);
  console.log(`    XCM enabled : ${state._xcmEnabled}`);
  console.log(`    Depositors  : ${state._depositorCount}`);

  console.log("\n✅  Smoke test complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
