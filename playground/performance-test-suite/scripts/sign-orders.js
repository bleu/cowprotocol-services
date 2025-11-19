#!/usr/bin/env node
/**
 * Sign CoW Protocol Orders with Real EIP-712 Signatures
 *
 * This script generates a pool of pre-signed orders using ethers.js
 * for use in K6 load testing. Since K6 cannot generate real ECDSA signatures
 * (lacks secp256k1 support), we pre-generate signed orders here.
 *
 * Usage:
 *   node scripts/sign-orders.js [count]
 *
 * Options:
 *   count - Number of orders to generate (default: 1000)
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const CHAIN_ID = 31337; // Anvil
const SETTLEMENT_CONTRACT = '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e';
const OUTPUT_FILE = path.join(__dirname, '../signed-orders.json');

// Token pairs (from load-test.ts)
const TOKEN_PAIRS = [
  {
    name: 'WETH/USDC',
    sellToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    buyToken: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  },
  {
    name: 'WETH/DAI',
    sellToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    buyToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  },
  {
    name: 'USDC/DAI',
    sellToken: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    buyToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  },
];

// Anvil default private keys
const ANVIL_PRIVATE_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
];

// EIP-712 Domain for CoW Protocol
const DOMAIN = {
  name: 'Gnosis Protocol',
  version: 'v2',
  chainId: CHAIN_ID,
  verifyingContract: SETTLEMENT_CONTRACT,
};

// EIP-712 Types for CoW Protocol Order
const TYPES = {
  Order: [
    { name: 'sellToken', type: 'address' },
    { name: 'buyToken', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'sellAmount', type: 'uint256' },
    { name: 'buyAmount', type: 'uint256' },
    { name: 'validTo', type: 'uint32' },
    { name: 'appData', type: 'bytes32' },
    { name: 'feeAmount', type: 'uint256' },
    { name: 'kind', type: 'string' },
    { name: 'partiallyFillable', type: 'bool' },
    { name: 'sellTokenBalance', type: 'string' },
    { name: 'buyTokenBalance', type: 'string' },
  ],
};

/**
 * Generate random amount between min and max
 */
function randomBigInt(min, max) {
  const range = max - min;
  const randomValue = BigInt(Math.floor(Math.random() * Number(range)));
  return min + randomValue;
}

/**
 * Generate random float between min and max
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Random choice from array
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a single order (unsigned)
 */
function generateOrder(index) {
  const pair = randomChoice(TOKEN_PAIRS);

  // Generate amounts
  const minAmount = ethers.parseEther('1'); // 1 token
  const maxAmount = ethers.parseEther('10'); // 10 tokens
  const sellAmount = randomBigInt(minAmount, maxAmount);

  // Buy amount with some price variation
  const priceVariation = randomFloat(0.95, 1.05);
  const buyAmountNum = Math.floor(Number(sellAmount) * priceVariation);
  const buyAmount = buyAmountNum > 0 ? BigInt(buyAmountNum) : 1n;

  // Valid for 1 hour from now (CoW Protocol orderbook has a max validTo limit)
  const validTo = Math.floor(Date.now() / 1000) + 3600;

  // Fee (0.1% of sell amount)
  const feeAmount = sellAmount / 1000n;

  return {
    sellToken: pair.sellToken,
    buyToken: pair.buyToken,
    receiver: ethers.ZeroAddress, // Will be set to signer address
    sellAmount: sellAmount.toString(),
    buyAmount: buyAmount.toString(),
    validTo,
    appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
    feeAmount: feeAmount.toString(),
    kind: 'sell',
    partiallyFillable: false,
    sellTokenBalance: 'erc20',
    buyTokenBalance: 'erc20',
  };
}

/**
 * Sign an order with EIP-712
 */
async function signOrder(wallet, order) {
  // CoW Protocol uses zero address for receiver when it's the same as owner
  const orderToSign = {
    ...order,
    receiver: ethers.ZeroAddress,
  };

  // Sign typed data
  const signature = await wallet.signTypedData(DOMAIN, TYPES, orderToSign);

  // Return complete signed order - receiver can be omitted (defaults to signer)
  return {
    sellToken: orderToSign.sellToken,
    buyToken: orderToSign.buyToken,
    receiver: ethers.ZeroAddress,
    sellAmount: orderToSign.sellAmount,
    buyAmount: orderToSign.buyAmount,
    validTo: orderToSign.validTo,
    appData: orderToSign.appData,
    feeAmount: orderToSign.feeAmount,
    kind: orderToSign.kind,
    partiallyFillable: orderToSign.partiallyFillable,
    sellTokenBalance: orderToSign.sellTokenBalance,
    buyTokenBalance: orderToSign.buyTokenBalance,
    signingScheme: 'eip712',
    signature,
    from: wallet.address,
  };
}

/**
 * Main function
 */
async function main() {
  const count = parseInt(process.argv[2] || '1000', 10);

  console.log(`🔐 Generating ${count} signed orders with real EIP-712 signatures...`);
  console.log(`📝 Chain ID: ${CHAIN_ID}`);
  console.log(`📝 Settlement Contract: ${SETTLEMENT_CONTRACT}`);
  console.log('');

  const signedOrders = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    // Rotate through Anvil accounts
    const privateKey = ANVIL_PRIVATE_KEYS[i % ANVIL_PRIVATE_KEYS.length];
    const wallet = new ethers.Wallet(privateKey);

    // Generate unsigned order
    const order = generateOrder(i);

    // Sign it
    const signedOrder = await signOrder(wallet, order);
    signedOrders.push(signedOrder);

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`✅ Signed ${i + 1}/${count} orders...`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(signedOrders, null, 2));

  console.log('');
  console.log(`✅ Successfully generated ${count} signed orders in ${duration}s`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`📊 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('');
  console.log('🚀 Ready for K6 load testing!');
}

// Run
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
