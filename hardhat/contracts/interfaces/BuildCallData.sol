// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @dev Bifrost SLPx SCALE call-data builder (ported from bifrost-io/slpx-contracts).
 *
 * This library builds the inner call bytes that are passed to the XCM `Transact`
 * instruction (on Bifrost runtime) to execute `create_order`.
 *
 * Notes:
 * - `remark` is encoded as a SCALE string using a limited charset in the upstream code.
 *   Use only letters/digits (a-zA-Z0-9) to avoid reverts.
 */
library BuildCallData {
    uint8 public constant PALLET_INDEX = 125;
    uint8 public constant CREATE_ORDER_CALL_INDEX = 14;

    /**
     * @dev Build `pallet_slpx::create_order` call bytes.
     *
     * @param caller HyperVault address (EVM address used by Bifrost slpx wrapper logic)
     * @param chain_id Source chain id (we use `block.chainid`)
     * @param block_number Source block number (we use `block.number`)
     * @param token Bifrost currency id (bytes2)
     * @param amount Amount (uint128)
     * @param targetChain Encoded destination chain marker + receiver (bytes)
     * @param remark Order remark, up to 32 bytes worth of scale-string encoding
     * @param channel_id Reward sharing channel id
     */
    function buildCreateOrderCallBytes(
        address caller,
        uint256 chain_id,
        uint256 block_number,
        bytes2 token,
        uint128 amount,
        bytes memory targetChain,
        string memory remark,
        uint32 channel_id
    ) public pure returns (bytes memory) {
        bytes memory prefix = new bytes(2);
        prefix[0] = bytes1(PALLET_INDEX);
        prefix[1] = bytes1(CREATE_ORDER_CALL_INDEX);

        return
            bytes.concat(
                prefix,
                abi.encodePacked(caller),
                encode_uint64(uint64(chain_id)),
                encode_uint128(uint128(block_number)),
                token,
                encode_uint128(amount),
                targetChain,
                toScaleString(remark),
                encode_uint32(channel_id)
            );
    }

    // -----------------------------
    // SCALE compact encoding helpers
    // -----------------------------

    // Encode uint128 little-endian fixed size (upstream uses fixed-size encoding).
    function encode_uint128(uint128 x) internal pure returns (bytes memory b) {
        b = new bytes(16);
        for (uint i = 0; i < 16; i++) {
            b[i] = bytes1(uint8(x / (2 ** (8 * i))));
        }
    }

    function encode_uint64(uint64 x) internal pure returns (bytes memory b) {
        b = new bytes(8);
        for (uint i = 0; i < 8; i++) {
            b[i] = bytes1(uint8(x / (2 ** (8 * i))));
        }
    }

    function encode_uint32(uint32 x) internal pure returns (bytes memory b) {
        b = new bytes(4);
        for (uint i = 0; i < 4; i++) {
            b[i] = bytes1(uint8(x / (2 ** (8 * i))));
        }
    }

    function toTruncBytes(uint64 x) internal pure returns (bytes memory) {
        bytes memory b = new bytes(8);
        uint len = 0;
        for (uint i = 0; i < 8; i++) {
            uint8 temp = uint8(x / (2 ** (8 * i)));
            if (temp != 0) {
                b[i] = bytes1(temp);
            } else {
                len = i;
                break;
            }
        }

        bytes memory rst = new bytes(len);
        for (uint i = 0; i < len; i++) {
            rst[i] = b[i];
        }
        return rst;
    }

    // Convert an hexadecimal character to its value, but as-is this library expects letters/digits only.
    function fromScaleChar(uint8 c) internal pure returns (uint8) {
        if (bytes1(c) >= bytes1("0") && bytes1(c) <= bytes1("9")) {
            return 48 + c - uint8(bytes1("0"));
        }
        if (bytes1(c) >= bytes1("a") && bytes1(c) <= bytes1("z")) {
            return 97 + c - uint8(bytes1("a"));
        }
        if (bytes1(c) >= bytes1("A") && bytes1(c) <= bytes1("Z")) {
            return 65 + c - uint8(bytes1("A"));
        }
        revert("unsupported remark charset");
    }

    // Encode the string to bytes following the scale-string formatting used upstream:
    // format: len + content, where len is "truncated bytes" and content uses fromScaleChar.
    function toScaleString(string memory s) internal pure returns (bytes memory) {
        bytes memory ss = bytes(s);
        bytes memory len = toTruncBytes(uint64(ss.length * 4));
        bytes memory content = new bytes(ss.length);
        for (uint i = 0; i < ss.length; ++i) {
            content[i] = bytes1(fromScaleChar(uint8(ss[i])));
        }
        return bytes.concat(len, content);
    }
}

