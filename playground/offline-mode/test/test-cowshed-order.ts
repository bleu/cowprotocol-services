/**
 * CoWShed Integration Test Script
 *
 * This script tests the full flow of placing an order with hooks through CoWShed:
 * 1. Calculate CoWShed proxy address for user
 * 2. Create pre-hook (token approval)
 * 3. Create order with hooks in appData
 * 4. Sign order with EIP-712
 * 5. Submit to orderbook
 * 6. Monitor for settlement
 *
 * Run with: npm run test:cowshed
 */

import { ethers } from 'ethers';
import { loadAddresses } from './utils/loadAddresses';

// Configuration
const CONFIG = {
  rpcUrl: 'http://localhost:8545',
  orderbookUrl: 'http://localhost:8080',
  chainId: 31337,
  // Anvil's first test account
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
};

// Load deployed addresses from .env.offline
const addresses = loadAddresses();

// Contract addresses
const ADDRESSES = {
  settlement: addresses.cowProtocol.settlement,
  vaultRelayer: addresses.cowProtocol.vaultRelayer,
  hooksTrampoline: addresses.cowProtocol.hooksTrampoline,
  cowShedFactory: addresses.cowShed.factory,
  cowShedImplementation: addresses.cowShed.implementation,
  dai: addresses.tokens.DAI,
  weth: addresses.tokens.WETH,
  usdc: addresses.tokens.USDC,
};

// EIP-712 Type definitions for CoW Protocol orders
const ORDER_TYPE_FIELDS = [
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
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

// Settlement contract ABI (minimal)
const SETTLEMENT_ABI = [
  'function domainSeparator() view returns (bytes32)',
];

// CoWShed Factory ABI (minimal)
const COWSHED_FACTORY_ABI = [
  'function proxyOf(address owner) view returns (address)',
  'function implementation() view returns (address)',
];

// Helper to create hook calldata for token approval
function createApprovalHook(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
): { target: string; callData: string; gasLimit: string } {
  const iface = new ethers.Interface(ERC20_ABI);
  const callData = iface.encodeFunctionData('approve', [spenderAddress, amount]);
  return {
    target: tokenAddress,
    callData: callData,
    gasLimit: '100000',
  };
}

// Helper to compute appData hash
function computeAppDataHash(appDataContent: object): string {
  const appDataString = JSON.stringify(appDataContent);
  return ethers.keccak256(ethers.toUtf8Bytes(appDataString));
}

// Helper to get current timestamp + offset
function getValidTo(offsetSeconds: number): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

async function main() {
  console.log('🐮 CoWShed Integration Test');
  console.log('===========================\n');

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const userAddress = await wallet.getAddress();

  console.log(`📋 Configuration:`);
  console.log(`   Chain ID: ${CONFIG.chainId}`);
  console.log(`   User: ${userAddress}`);
  console.log(`   Settlement: ${ADDRESSES.settlement}`);
  console.log(`   Vault Relayer: ${ADDRESSES.vaultRelayer}`);
  console.log(`   Hooks Trampoline: ${ADDRESSES.hooksTrampoline}`);
  console.log(`   CoWShed Factory: ${ADDRESSES.cowShedFactory}`);
  console.log('');

  // Get contracts
  const settlement = new ethers.Contract(ADDRESSES.settlement, SETTLEMENT_ABI, provider);
  const cowShedFactory = new ethers.Contract(ADDRESSES.cowShedFactory, COWSHED_FACTORY_ABI, provider);
  const dai = new ethers.Contract(ADDRESSES.dai, ERC20_ABI, wallet);
  const weth = new ethers.Contract(ADDRESSES.weth, ERC20_ABI, provider);

  // Step 1: Get CoWShed proxy address
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Get CoWShed Proxy Address');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const proxyAddress = await cowShedFactory.proxyOf(userAddress);
  console.log(`✅ CoWShed proxy for user: ${proxyAddress}`);

  const proxyCode = await provider.getCode(proxyAddress);
  if (proxyCode === '0x') {
    console.log('ℹ️  Proxy not deployed yet (will be deployed on first use via hook)');
  } else {
    console.log('ℹ️  Proxy already deployed');
  }
  console.log('');

  // Step 2: Check balances and allowances
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Check Balances and Allowances');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const daiBalance = await dai.balanceOf(userAddress);
  const daiAllowance = await dai.allowance(userAddress, ADDRESSES.vaultRelayer);

  console.log(`   DAI Balance: ${ethers.formatEther(daiBalance)} DAI`);
  console.log(`   DAI Allowance for Vault Relayer: ${ethers.formatEther(daiAllowance)} DAI`);

  // Ensure we have enough allowance
  const sellAmount = ethers.parseEther('10'); // Sell 10 DAI
  if (daiAllowance < sellAmount) {
    console.log('\n   Approving Vault Relayer to spend DAI...');
    const approveTx = await dai.approve(ADDRESSES.vaultRelayer, ethers.parseEther('1000000'));
    await approveTx.wait();
    console.log('   ✅ Approved');
  }
  console.log('');

  // Step 3: Get domain separator
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Get Domain Separator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const domainSeparator = await settlement.domainSeparator();
  console.log(`   Domain Separator: ${domainSeparator}`);
  console.log('');

  // Step 4: Create order with hooks
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Create Order with Pre-Hook');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Create a pre-hook that does a simple call (we'll use a no-op approval as example)
  // In a real scenario, this could be: unwrap WETH, claim rewards, etc.
  const preHook = createApprovalHook(
    ADDRESSES.dai,
    ADDRESSES.hooksTrampoline, // Approve HooksTrampoline (safe, since it doesn't hold funds)
    ethers.parseEther('1')
  );

  // Create appData with hooks
  const appDataContent = {
    version: '1.0.0',
    metadata: {
      hooks: {
        pre: [preHook],
        post: [],
      },
    },
  };

  const appDataHash = computeAppDataHash(appDataContent);
  console.log(`   AppData Hash: ${appDataHash}`);
  console.log(`   Pre-Hook: Approve ${preHook.target} for HooksTrampoline`);
  console.log('');

  // Step 5: Get quote from orderbook
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: Get Quote from Orderbook');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const quoteRequest = {
    sellToken: ADDRESSES.dai,
    buyToken: ADDRESSES.weth,
    from: userAddress,
    kind: 'sell',
    sellAmountBeforeFee: sellAmount.toString(),
    appData: JSON.stringify(appDataContent),
    appDataHash: appDataHash,
  };

  console.log('   Requesting quote...');

  const quoteResponse = await fetch(`${CONFIG.orderbookUrl}/api/v1/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteRequest),
  });

  if (!quoteResponse.ok) {
    const errorText = await quoteResponse.text();
    console.log(`   ❌ Quote failed: ${quoteResponse.status}`);
    console.log(`   Error: ${errorText}`);

    // Try without hooks to see if basic quoting works
    console.log('\n   Trying quote without hooks...');
    const simpleQuoteRequest = {
      sellToken: ADDRESSES.dai,
      buyToken: ADDRESSES.weth,
      from: userAddress,
      kind: 'sell',
      sellAmountBeforeFee: sellAmount.toString(),
    };

    const simpleQuoteResponse = await fetch(`${CONFIG.orderbookUrl}/api/v1/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simpleQuoteRequest),
    });

    if (simpleQuoteResponse.ok) {
      const simpleQuote = await simpleQuoteResponse.json() as any;
      console.log('   ✅ Simple quote succeeded (without hooks)');
      console.log(`   Buy Amount: ${ethers.formatEther(simpleQuote.quote.buyAmount)} WETH`);
      console.log(`   Fee Amount: ${ethers.formatEther(simpleQuote.quote.feeAmount)} DAI`);
    }
    return;
  }

  const quote = await quoteResponse.json() as any;
  console.log('   ✅ Quote received');
  console.log(`   Buy Amount: ${ethers.formatEther(quote.quote.buyAmount)} WETH`);
  console.log(`   Fee Amount: ${ethers.formatEther(quote.quote.feeAmount)} DAI`);
  console.log(`   Verified: ${quote.verified}`);
  console.log('');

  // Step 6: Create and sign the order
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: Sign Order with EIP-712');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Note: CoW Protocol v2 uses feeAmount: 0 for limit orders
  // The actual fee is taken from the sell amount
  const order = {
    sellToken: ADDRESSES.dai,
    buyToken: ADDRESSES.weth,
    receiver: userAddress,
    sellAmount: quote.quote.sellAmount,
    buyAmount: quote.quote.buyAmount,
    validTo: getValidTo(600), // 10 minutes from now
    appData: appDataHash,
    feeAmount: '0', // Fee is now always 0 (included in sell amount)
    kind: 'sell',
    partiallyFillable: false,
    sellTokenBalance: 'erc20',
    buyTokenBalance: 'erc20',
  };

  // EIP-712 domain
  const domain = {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId: CONFIG.chainId,
    verifyingContract: ADDRESSES.settlement,
  };

  const types = {
    Order: ORDER_TYPE_FIELDS,
  };

  console.log('   Signing order...');
  const signature = await wallet.signTypedData(domain, types, order);
  console.log(`   ✅ Signature: ${signature.substring(0, 20)}...`);
  console.log('');

  // Step 7: Submit order to orderbook
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 7: Submit Order to Orderbook');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const orderCreation = {
    sellToken: order.sellToken,
    buyToken: order.buyToken,
    receiver: order.receiver,
    sellAmount: order.sellAmount,
    buyAmount: order.buyAmount,
    validTo: order.validTo,
    feeAmount: '0', // Always 0 in v2
    kind: order.kind,
    partiallyFillable: order.partiallyFillable,
    sellTokenBalance: order.sellTokenBalance,
    buyTokenBalance: order.buyTokenBalance,
    signingScheme: 'eip712',
    signature: signature,
    from: userAddress,
    appData: JSON.stringify(appDataContent),
    appDataHash: appDataHash,
  };

  console.log('   Submitting order...');

  const orderResponse = await fetch(`${CONFIG.orderbookUrl}/api/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderCreation),
  });

  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.log(`   ❌ Order submission failed: ${orderResponse.status}`);
    console.log(`   Error: ${errorText}`);
    return;
  }

  const orderUid = await orderResponse.text();
  console.log(`   ✅ Order submitted!`);
  console.log(`   Order UID: ${orderUid}`);
  console.log('');

  // Step 8: Monitor order status
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 8: Monitor Order Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const cleanOrderUid = orderUid.replace(/"/g, '');
  console.log(`   Monitoring order ${cleanOrderUid.substring(0, 20)}...`);
  console.log('   (Press Ctrl+C to stop monitoring)\n');

  let lastStatus = '';
  for (let i = 0; i < 60; i++) { // Monitor for up to 5 minutes
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    const statusResponse = await fetch(`${CONFIG.orderbookUrl}/api/v1/orders/${cleanOrderUid}`);
    if (!statusResponse.ok) {
      console.log(`   ⚠️ Could not fetch order status: ${statusResponse.status}`);
      continue;
    }

    const orderStatus = await statusResponse.json() as any;
    const status = orderStatus.status;

    if (status !== lastStatus) {
      lastStatus = status;
      console.log(`   [${new Date().toISOString()}] Status: ${status}`);

      if (status === 'fulfilled') {
        console.log('\n   🎉 Order fulfilled!');

        // Check final balances
        const finalDaiBalance = await dai.balanceOf(userAddress);
        const finalWethBalance = await weth.balanceOf(userAddress);

        console.log(`\n   Final Balances:`);
        console.log(`   DAI: ${ethers.formatEther(finalDaiBalance)}`);
        console.log(`   WETH: ${ethers.formatEther(finalWethBalance)}`);
        break;
      } else if (status === 'cancelled' || status === 'expired') {
        console.log(`\n   ❌ Order ${status}`);
        break;
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);
