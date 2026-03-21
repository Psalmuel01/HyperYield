// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────
//  XcmBuilder – helpers that produce SCALE-encoded XCM bytes
//  ready to pass into IXcm.send().
//
//  All encoding follows XCM V3 (the version live on Polkadot Hub).
//  References:
//    • https://docs.polkadot.com/develop/interoperability/xcm-docs/
//    • https://github.com/paritytech/xcm-format
//    • Bifrost SLPx: parachain 2030
// ─────────────────────────────────────────────────────────────

library XcmBuilder {

    // ── Constants ────────────────────────────────────────────

    /// @dev SCALE-encoded VersionedMultiLocation V3 for Bifrost (paraId 2030).
    ///      Breakdown:
    ///        0x03        – V3 version tag
    ///        0x01        – parents = 1  (go up to relay chain)
    ///        0x01        – interior = X1
    ///        0x00        – Parachain junction tag
    ///        0xEE070000  – paraId 2030 in little-endian u32
    bytes internal constant BIFROST_DEST =
        hex"03010100EE070000";

    /// @dev DOT multilocation from the perspective of Polkadot Hub:
    ///      Here() = the native token of the relay chain context.
    ///      Encoded as V3 Here: 0x03 0x00 0x00
    bytes internal constant DOT_ASSET_ID =
        hex"030000";

    // ── Destination builder ───────────────────────────────────

    /// @notice Returns the SCALE-encoded Bifrost destination.
    function bifrostDest() internal pure returns (bytes memory) {
        return BIFROST_DEST;
    }

    // ── SCALE compact integer encoding ───────────────────────

    /// @dev Encode a uint128 as a SCALE compact integer.
    ///      Compact encoding rules:
    ///        0..63        → single byte  (value << 2) | 0b00
    ///        64..16383    → two bytes    (value << 2) | 0b01, LE
    ///        16384..2^30-1→ four bytes   (value << 2) | 0b10, LE
    ///        larger       → big-integer mode (not needed for DOT amounts here)
    function compactU128(uint128 v) internal pure returns (bytes memory out) {
        if (v < 64) {
            out = new bytes(1);
            out[0] = bytes1(uint8(v << 2));
        } else if (v < 16384) {
            out = new bytes(2);
            uint16 enc = uint16((v << 2) | 1);
            out[0] = bytes1(uint8(enc));
            out[1] = bytes1(uint8(enc >> 8));
        } else if (v < 1073741824) {
            out = new bytes(4);
            uint32 enc = uint32((v << 2) | 2);
            out[0] = bytes1(uint8(enc));
            out[1] = bytes1(uint8(enc >> 8));
            out[2] = bytes1(uint8(enc >> 16));
            out[3] = bytes1(uint8(enc >> 24));
        } else {
            // Big-integer mode: prefix byte = (bytes_needed - 4) << 2 | 3
            // For amounts up to u128 max we need at most 16 bytes.
            // Determine minimal byte length.
            uint8 n = 0;
            uint128 tmp = v;
            while (tmp > 0) { tmp >>= 8; n++; }
            out = new bytes(1 + n);
            out[0] = bytes1(uint8(((n - 4) << 2) | 3));
            for (uint8 i = 0; i < n; i++) {
                out[1 + i] = bytes1(uint8(v >> (8 * i)));
            }
        }
    }

    // ── XCM message builders ──────────────────────────────────

    /**
     * @notice Build a minimal XCM V3 message that:
     *   1. WithdrawAsset – pull `dotAmount` DOT from sovereign account
     *   2. BuyExecution   – pay fees from withdrawn asset
     *   3. Transact       – call Bifrost's SLPx mint extrinsic
     *   4. RefundSurplus  – return unused weight
     *   5. DepositAsset   – send leftover asset back to hub sovereign
     *
     * @param dotAmount   Amount of DOT (in Planck, 1 DOT = 1e10 Planck)
     * @param hubSovereign The sovereign account of Polkadot Hub on Bifrost
     *                     (used for DepositAsset fallback)
     * @param mintCall    Raw SCALE bytes of the Bifrost extrinsic to call
     *                    (e.g. SLPx.mint or VtokenMinting.mint)
     * @param refTime     refTime weight for Transact
     * @param proofSize   proofSize weight for Transact
     */
    function buildMintMessage(
        uint128 dotAmount,
        bytes32 hubSovereign,
        bytes memory mintCall,
        uint64 refTime,
        uint64 proofSize
    ) internal pure returns (bytes memory) {

        // ── 1. WithdrawAsset ─────────────────────────────────
        // Instruction tag: 0x00 (WithdrawAsset)
        // Assets: Vec<MultiAsset> with 1 element
        //   MultiAsset.id  = Concrete(Here)  → 0x00 0x00 0x00
        //   MultiAsset.fun = Fungible(amount) → 0x00 + compact(amount)
        bytes memory withdrawAsset = abi.encodePacked(
            hex"00",             // WithdrawAsset tag
            hex"04",             // Vec length: 1 element (compact 1 = 0x04)
            hex"000000",         // Concrete(Here) asset id
            hex"00",             // Fungible discriminant
            compactU128(dotAmount)
        );

        // ── 2. BuyExecution ──────────────────────────────────
        // Instruction tag: 0x07
        // fees: same asset as above
        // weight_limit: Unlimited (tag 0x00)
        bytes memory buyExecution = abi.encodePacked(
            hex"07",             // BuyExecution tag
            hex"000000",         // Concrete(Here) as fee asset
            hex"00",             // Fungible discriminant
            compactU128(dotAmount),
            hex"00"              // WeightLimit::Unlimited
        );

        // ── 3. Transact ──────────────────────────────────────
        // Instruction tag: 0x06
        // origin_kind: SovereignAccount (0x00)
        // require_weight_at_most: Weight { refTime, proofSize }
        // call: SCALE bytes of the extrinsic
        bytes memory transact = abi.encodePacked(
            hex"06",                         // Transact tag
            hex"00",                         // OriginKind::SovereignAccount
            _encodeWeight(refTime, proofSize),
            _encodeBytes(mintCall)
        );

        // ── 4. RefundSurplus ─────────────────────────────────
        bytes memory refundSurplus = hex"0D"; // RefundSurplus tag

        // ── 5. DepositAsset ──────────────────────────────────
        // Send leftover assets back to hub sovereign on Bifrost
        bytes memory depositAsset = abi.encodePacked(
            hex"08",             // DepositAsset tag
            hex"01",             // AssetFilter::Wild(All) – simplest
            hex"00",             // Wild::All
            hex"01",             // max_assets = 1 (compact)
            hex"010100EE070000", // destination: back to hub (parent relay + hub)
            // beneficiary: AccountId32 of hub sovereign
            hex"01",             // X1 junction
            hex"01",             // AccountId32 tag
            hex"00",             // network: Any
            hubSovereign         // 32-byte account id
        );

        // ── Wrap in VersionedXcm V3 ──────────────────────────
        // V3 tag: 0x03
        // Instructions: Vec<Instruction> with compact length prefix
        bytes memory instructions = abi.encodePacked(
            withdrawAsset,
            buyExecution,
            transact,
            refundSurplus,
            depositAsset
        );

        // 5 instructions → compact(5) = 0x14
        return abi.encodePacked(
            hex"03",   // XCM V3
            hex"14",   // Vec length: 5 instructions (compact 5 = 0x14)
            instructions
        );
    }

    /**
     * @notice Build XCM message to redeem vDOT back to DOT on Bifrost.
     *         Similar structure but calls redeem extrinsic.
     */
    function buildRedeemMessage(
        uint128 vdotAmount,
        bytes32 /* hubSovereign */,
        bytes memory redeemCall,
        uint64 refTime,
        uint64 proofSize
    ) internal pure returns (bytes memory) {
        // Redeem flow: BuyExecution (using existing sovereign balance) → Transact
        bytes memory buyExecution = abi.encodePacked(
            hex"07",
            hex"000000",
            hex"00",
            compactU128(vdotAmount / 100), // small fee fraction
            hex"00"
        );

        bytes memory transact = abi.encodePacked(
            hex"06",
            hex"00",
            _encodeWeight(refTime, proofSize),
            _encodeBytes(redeemCall)
        );

        bytes memory refundSurplus = hex"0D";

        bytes memory instructions = abi.encodePacked(
            buyExecution,
            transact,
            refundSurplus
        );

        // 3 instructions → compact(3) = 0x0C
        return abi.encodePacked(
            hex"03",
            hex"0C",
            instructions
        );
    }

    // ── Internal helpers ─────────────────────────────────────

    /// @dev SCALE-encode a Weight struct (two SCALE compact u64).
    function _encodeWeight(uint64 refTime, uint64 proofSize)
        private
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(
            compactU128(uint128(refTime)),
            compactU128(uint128(proofSize))
        );
    }

    /// @dev SCALE-encode a byte array: compact(len) ++ data.
    function _encodeBytes(bytes memory data)
        private
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(
            compactU128(uint128(data.length)),
            data
        );
    }
}
