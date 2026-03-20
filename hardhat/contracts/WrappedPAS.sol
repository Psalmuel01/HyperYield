// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────
//  WrappedPAS.sol
//
//  WETH9-style wrapper for the native PAS token on Passet Hub.
//  Deployed BEFORE HyperVault — its address is passed as
//  `_dotToken` to the HyperVault constructor.
//
//  How it works:
//    deposit()        — send PAS as msg.value → get WPAS ERC-20
//    withdraw(amount) — burn WPAS → receive native PAS back
//    Standard ERC-20  — transfer / approve / transferFrom
//
//  Why needed:
//    Polkadot Hub has no official Wrapped DOT ERC-20 precompile
//    on Passet Hub testnet. HyperVault needs an ERC-20 to call
//    safeTransferFrom on. This contract IS that ERC-20.
//
//  On mainnet:
//    Replace with the official DOT ERC-20 precompile address
//    once Polkadot Hub publishes it. No changes to HyperVault.
//
//  Decimals: 18 (standard EVM)
//  Note: Native PAS on Passet Hub uses 10 decimals in the
//        Substrate layer but the EVM layer presents it as 18.
//        1 PAS = 1e18 in msg.value on the EVM side.
// ─────────────────────────────────────────────────────────────

contract WrappedPAS {

    // ── Metadata ─────────────────────────────────────────────

    string public constant name     = "Wrapped PAS";
    string public constant symbol   = "WPAS";
    uint8  public constant decimals = 18;

    // ── Storage ──────────────────────────────────────────────

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ── Events ───────────────────────────────────────────────

    event Deposit(address indexed dst, uint256 amount);
    event Withdrawal(address indexed src, uint256 amount);
    event Transfer(address indexed src, address indexed dst, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    // ── Errors ───────────────────────────────────────────────

    error InsufficientBalance(uint256 have, uint256 want);
    error InsufficientAllowance(uint256 have, uint256 want);
    error NativeTransferFailed();

    // ── Wrap on plain ETH send ────────────────────────────────

    receive() external payable {
        deposit();
    }

    // ── Core: wrap / unwrap ───────────────────────────────────

    /**
     * @notice Wrap native PAS into WPAS.
     *         Send PAS as msg.value, receive equal WPAS balance.
     */
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
        emit Transfer(address(0), msg.sender, msg.value);
    }

    /**
     * @notice Unwrap WPAS back to native PAS.
     * @param amount Amount of WPAS to burn (in wei, 1 PAS = 1e18).
     */
    function withdraw(uint256 amount) external {
        if (balanceOf[msg.sender] < amount)
            revert InsufficientBalance(balanceOf[msg.sender], amount);

        balanceOf[msg.sender] -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert NativeTransferFailed();

        emit Withdrawal(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    // ── ERC-20 ───────────────────────────────────────────────

    /**
     * @notice Total WPAS in circulation = total native PAS held by contract.
     */
    function totalSupply() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Approve `spender` to transfer up to `amount` of your WPAS.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer WPAS to `dst`.
     */
    function transfer(address dst, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, dst, amount);
    }

    /**
     * @notice Transfer WPAS from `src` to `dst` using allowance.
     *         Infinite allowance (type(uint256).max) is never decremented.
     */
    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (bool) {
        uint256 allowed = allowance[src][msg.sender];

        if (allowed != type(uint256).max) {
            if (allowed < amount)
                revert InsufficientAllowance(allowed, amount);
            allowance[src][msg.sender] = allowed - amount;
        }

        return _transfer(src, dst, amount);
    }

    // ── Internal ─────────────────────────────────────────────

    function _transfer(
        address src,
        address dst,
        uint256 amount
    ) internal returns (bool) {
        if (balanceOf[src] < amount)
            revert InsufficientBalance(balanceOf[src], amount);

        balanceOf[src] -= amount;
        balanceOf[dst] += amount;

        emit Transfer(src, dst, amount);
        return true;
    }
}
