// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────
//  XCM Precompile Interface
//  Address on Polkadot Hub (Passet Hub testnet + mainnet):
//      0x00000000000000000000000000000000000a0000
//
//  Source: https://docs.polkadot.com/smart-contracts/precompiles/xcm/
// ─────────────────────────────────────────────────────────────

/**
 * @dev Represents an XCM VersionedLocation (previously MultiLocation).
 *      For Bifrost: parents=1, interior encodes X1(Parachain(2030)).
 *
 *      SCALE-encoded bytes for Bifrost destination:
 *        parents  = 0x01
 *        interior = X1 tag (0x01) + Parachain tag (0x00) + paraId LE u32
 *        paraId 2030 = 0xEE070000
 *        Full: 0x010100EE070000
 *
 *      Wrapped as VersionedMultiLocation V3:
 *        0x03 (V3) + 0x010100EE070000
 *        = 0x03010100EE070000
 */

/**
 * @notice XCM Weight struct used by weighMessage / execute.
 */
struct Weight {
    uint64 refTime;
    uint64 proofSize;
}

/**
 * @notice Minimal interface for the Polkadot Hub XCM precompile.
 *
 *  send()    – fire-and-forget cross-chain message (no fee deducted from
 *              caller; the origin must have enough native balance for XCM fees
 *              as configured in the runtime).
 *
 *  execute() – execute an XCM message locally (useful for testing MultiAsset
 *              transfers before sending cross-chain).
 *
 *  weighMessage() – dry-run weight estimation (read-only).
 */
interface IXcm {
    /**
     * @notice Send an XCM message to a destination chain.
     * @param dest     SCALE-encoded VersionedLocation of the destination.
     * @param message  SCALE-encoded VersionedXcm message body.
     * @return success True if the precompile accepted the call.
     */
    function send(bytes memory dest, bytes memory message)
        external
        returns (bool success);

    /**
     * @notice Execute an XCM message locally.
     * @param message    SCALE-encoded VersionedXcm message body.
     * @param maxWeight  Maximum weight to consume.
     * @return success   True if execution succeeded within weight limit.
     */
    function execute(bytes memory message, Weight memory maxWeight)
        external
        returns (bool success);

    /**
     * @notice Estimate the weight of an XCM message (view, no state change).
     * @param message SCALE-encoded VersionedXcm message body.
     * @return weight Estimated Weight struct.
     */
    function weighMessage(bytes memory message)
        external
        view
        returns (Weight memory weight);
}
