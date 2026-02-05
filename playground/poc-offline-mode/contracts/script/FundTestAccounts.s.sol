// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title FundTestAccounts
/// @notice Fund and approve all 10 Anvil test accounts for load testing
/// @dev This script mints tokens and approves VaultRelayer for all test accounts
contract FundTestAccounts is Script {
    // All 10 Anvil test accounts (from standard test mnemonic) with their private keys
    address[10] private TEST_ACCOUNTS = [
        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // Account 0
        0x70997970C51812dc3A010C7d01b50e0d17dc79C8, // Account 1
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, // Account 2
        0x90F79bf6EB2c4f870365E785982E1f101E93b906, // Account 3
        0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65, // Account 4
        0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc, // Account 5
        0x976EA74026E726554dB657fA54763abd0C3a0aa9, // Account 6
        0x14dC79964da2C08b23698B3D3cc7Ca32193d9955, // Account 7
        0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f, // Account 8
        0xa0Ee7A142d267C1f36714E4a8F75612F20a79720  // Account 9
    ];

    uint256[10] private PRIVATE_KEYS = [
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80,
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d,
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a,
        0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6,
        0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a,
        0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba,
        0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e,
        0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356,
        0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97,
        0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
    ];

    function run() external {
        // Load addresses from environment
        address weth = vm.envAddress("WETH_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address dai = vm.envAddress("DAI_ADDRESS");
        address vaultRelayer = vm.envAddress("VAULT_RELAYER_ADDRESS");

        console.log("===========================================");
        console.log("FUNDING TEST ACCOUNTS FOR LOAD TESTING");
        console.log("===========================================");
        console.log("Vault Relayer:", vaultRelayer);
        console.log("");
        console.log("Tokens:");
        console.log("  WETH:", weth);
        console.log("  USDC:", usdc);
        console.log("  DAI:", dai);
        console.log("");

        // Amount to mint per account (100 tokens each)
        uint256 mintAmount = 100 ether;
        uint256 maxApproval = type(uint256).max;

        console.log("Processing 10 test accounts...");
        console.log("");

        // Use Account 0 to mint/wrap tokens (it has ETH for gas and WETH wrapping)
        uint256 minterKey = PRIVATE_KEYS[0];

        for (uint256 i = 0; i < 10; i++) {
            address account = TEST_ACCOUNTS[i];
            uint256 privateKey = PRIVATE_KEYS[i];

            console.log("Account", i, ":", account);

            vm.startBroadcast(minterKey);

            // For WETH: deposit ETH and transfer
            IWETH(weth).deposit{value: mintAmount}();
            IWETH(weth).transfer(account, mintAmount);

            // For USDC and DAI: mint directly
            IERC20(usdc).mint(account, mintAmount);
            IERC20(dai).mint(account, mintAmount);

            vm.stopBroadcast();

            // Approve VaultRelayer using each account's private key
            vm.startBroadcast(privateKey);
            IERC20(weth).approve(vaultRelayer, maxApproval);
            IERC20(usdc).approve(vaultRelayer, maxApproval);
            IERC20(dai).approve(vaultRelayer, maxApproval);
            vm.stopBroadcast();

            console.log("  Minted/wrapped 100 WETH, USDC, DAI");
            console.log("  Approved VaultRelayer for all tokens");
            console.log("");
        }

        // Verify a few balances
        console.log("Verification:");
        uint256 wethBalance = IERC20(weth).balanceOf(TEST_ACCOUNTS[0]);
        uint256 usdcBalance = IERC20(usdc).balanceOf(TEST_ACCOUNTS[0]);
        uint256 daiBalance = IERC20(dai).balanceOf(TEST_ACCOUNTS[0]);

        console.log("  Account 0 WETH balance:", wethBalance / 1e18, "tokens");
        console.log("  Account 0 USDC balance:", usdcBalance / 1e18, "tokens");
        console.log("  Account 0 DAI balance:", daiBalance / 1e18, "tokens");
        console.log("");

        console.log("===========================================");
        console.log("ALL TEST ACCOUNTS FUNDED AND APPROVED");
        console.log("===========================================");
    }
}
