// scripts/probe-hub-precompiles.js
// ─────────────────────────────────────────────────────────────
//  Diagnostic probe for Polkadot Hub testnet precompiles.
//
//  Optional env:
//    DOT_ERC20_ADDRESS   explicit precompile address
//    DOT_ASSET_ID        derive ERC20 precompile from asset id
//
//  Usage:
//    npx hardhat run scripts/probe-hub-precompiles.js --network polkadotTestnet
//    DOT_ASSET_ID=<DOT_ASSET_ID> npx hardhat run scripts/probe-hub-precompiles.js --network polkadotTestnet
// ─────────────────────────────────────────────────────────────

const { ethers } = require("hardhat");

const XCM_PRECOMPILE = "0x00000000000000000000000000000000000a0000";
const ERC20_INTERFACE = new ethers.Interface([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
const XCM_INTERFACE = new ethers.Interface([
  "function weighMessage(bytes) view returns ((uint64 refTime, uint64 proofSize))",
]);
const ERROR_INTERFACE = new ethers.Interface([
  "error Error(string)",
]);

function deriveErc20FromAssetId(raw) {
  if (!raw) return null;

  let assetId;
  if (/^0x[0-9a-fA-F]+$/.test(raw)) {
    assetId = Number(BigInt(raw));
  } else if (/^[0-9]+$/.test(raw)) {
    assetId = Number(raw);
  } else {
    throw new Error("DOT_ASSET_ID must be decimal or 0x-prefixed hex");
  }
  if (!Number.isInteger(assetId) || assetId < 0 || assetId > 0xffffffff) {
    throw new Error("DOT_ASSET_ID must fit in uint32");
  }

  const head = assetId.toString(16).padStart(8, "0");
  return `0x${head}${"0".repeat(24)}01200000`;
}

function maybeAddress(raw) {
  if (!raw) return null;
  const value = raw.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null;
}

function decodeRevert(err) {
  const data = err?.data?.data || err?.data || err?.error?.data;
  if (!data || typeof data !== "string") return null;
  if (!data.startsWith("0x08c379a0")) return data;

  try {
    const [reason] = ERROR_INTERFACE.decodeErrorResult("Error", data);
    return reason;
  } catch {
    return data;
  }
}

async function tryCall(to, data, label) {
  try {
    const out = await ethers.provider.call({ to, data });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, error: decodeRevert(err), label };
  }
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const explicit = maybeAddress(process.env.DOT_ERC20_ADDRESS || "");
  const derived = deriveErc20FromAssetId((process.env.DOT_ASSET_ID || "").trim());
  const dotAddress = explicit || derived;

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Polkadot Hub Precompile Probe");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Chain ID         : ${chainId}`);
  console.log(`  XCM precompile   : ${XCM_PRECOMPILE}`);
  if (dotAddress) {
    console.log(`  DOT ERC20 target : ${dotAddress}`);
  } else {
    console.log("  DOT ERC20 target : <not provided>");
  }
  if ((process.env.DOT_ERC20_ADDRESS || "").trim() && !explicit) {
    console.log("  Note             : ignored invalid DOT_ERC20_ADDRESS env value");
  }

  const xcmCode = await ethers.provider.getCode(XCM_PRECOMPILE);
  console.log(`\n[1] XCM getCode: ${xcmCode}`);

  const weighEmpty = XCM_INTERFACE.encodeFunctionData("weighMessage", ["0x"]);
  const xcmProbe = await tryCall(XCM_PRECOMPILE, weighEmpty, "weighMessage([])");
  if (xcmProbe.ok) {
    const [weight] = XCM_INTERFACE.decodeFunctionResult("weighMessage", xcmProbe.out);
    console.log(`[2] XCM weighMessage(empty) unexpectedly succeeded:`, weight);
  } else {
    console.log(`[2] XCM weighMessage(empty) reverted (expected): ${xcmProbe.error}`);
  }

  if (!dotAddress) {
    console.log("\nSet DOT_ERC20_ADDRESS or DOT_ASSET_ID to probe ERC20 precompile behavior.");
    console.log("═══════════════════════════════════════════════\n");
    return;
  }

  const dotCode = await ethers.provider.getCode(dotAddress);
  console.log(`\n[3] DOT getCode: ${dotCode}`);

  const totalSupplyData = ERC20_INTERFACE.encodeFunctionData("totalSupply");
  const totalSupplyProbe = await tryCall(dotAddress, totalSupplyData, "totalSupply()");
  if (totalSupplyProbe.ok) {
    const [supply] = ERC20_INTERFACE.decodeFunctionResult("totalSupply", totalSupplyProbe.out);
    console.log(`[4] totalSupply(): ${supply.toString()}`);
  } else {
    console.log(`[4] totalSupply() failed: ${totalSupplyProbe.error}`);
  }

  const decimalsData = ERC20_INTERFACE.encodeFunctionData("decimals");
  const decimalsProbe = await tryCall(dotAddress, decimalsData, "decimals()");
  if (decimalsProbe.ok) {
    const [decimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", decimalsProbe.out);
    console.log(`[5] decimals(): ${decimals}`);
  } else {
    console.log(`[5] decimals() reverted: ${decimalsProbe.error}`);
    console.log("    Note: this is expected for Polkadot ERC20 precompiles.");
  }

  console.log("═══════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
