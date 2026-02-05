/**
 * EIP-712 Order Signing for CoW Protocol
 * Adapted from poc-offline-mode/scripts/sign_order.py
 */

import crypto from 'k6/crypto';

export interface OrderParams {
  sellToken: string;
  buyToken: string;
  receiver: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  appData: string;
  feeAmount: string;
  kind: string;
  partiallyFillable: boolean;
  sellTokenBalance: string;
  buyTokenBalance: string;
}

export interface SignedOrder extends OrderParams {
  from: string;
  signature: string;
  signingScheme: string;
}

/**
 * EIP-712 Domain for CoW Protocol
 */
function getEIP712Domain(chainId: number, verifyingContract: string) {
  return {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId,
    verifyingContract,
  };
}

/**
 * EIP-712 Type definition for CoW Protocol Order
 */
const ORDER_TYPE = {
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
 * Simple keccak256 implementation using k6 crypto
 * Note: This is a simplified implementation for POC purposes
 */
function keccak256(data: string): string {
  // In a real implementation, you would use a proper keccak256 library
  // For K6 testing, we'll generate a deterministic hash based on input
  const hash = crypto.sha256(data, 'hex');
  return '0x' + hash;
}

/**
 * Encode EIP-712 typed data hash
 */
function encodeTypeHash(typeName: string, typeData: any[]): string {
  const typeString = `${typeName}(${typeData.map((t) => `${t.type} ${t.name}`).join(',')})`;
  return keccak256(typeString);
}

/**
 * Encode EIP-712 domain separator
 */
function encodeDomainSeparator(chainId: number, verifyingContract: string): string {
  const domain = getEIP712Domain(chainId, verifyingContract);
  const domainTypeHash = encodeTypeHash('EIP712Domain', [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ]);

  // Simplified encoding - in production, use proper ABI encoding
  const encoded = JSON.stringify(domain);
  return keccak256(domainTypeHash + encoded);
}

/**
 * Encode order struct hash
 */
function encodeOrderHash(order: OrderParams): string {
  const orderTypeHash = encodeTypeHash('Order', ORDER_TYPE.Order);

  // Simplified encoding - in production, use proper ABI encoding
  const encoded = JSON.stringify(order);
  return keccak256(orderTypeHash + encoded);
}

/**
 * Generate EIP-712 signature digest
 */
function getSignatureDigest(
  chainId: number,
  verifyingContract: string,
  order: OrderParams
): string {
  const domainSeparator = encodeDomainSeparator(chainId, verifyingContract);
  const orderHash = encodeOrderHash(order);

  // EIP-712 signature: keccak256("\x19\x01" ‖ domainSeparator ‖ orderHash)
  return keccak256('\x19\x01' + domainSeparator + orderHash);
}

/**
 * Generate a mock signature for testing purposes
 *
 * NOTE: This generates a MOCK signature for POC/testing only!
 * In production, you need a proper wallet to sign the EIP-712 digest.
 *
 * K6 doesn't have access to crypto wallets or secp256k1 signing,
 * so for load testing we generate deterministic mock signatures.
 */
function generateMockSignature(digest: string, privateKey: string): string {
  // Generate deterministic "signature" based on digest and key
  // This is NOT a real ECDSA signature - just for load testing!
  const combined = digest + privateKey;
  const hash = crypto.sha256(combined, 'hex');

  // ECDSA signature format: 65 bytes (r: 32, s: 32, v: 1)
  // We'll create a deterministic 65-byte hex string
  const r = hash.substring(0, 64);
  const s = crypto.sha256(hash, 'hex').substring(0, 64);
  const v = '1b'; // Recovery id (27 in hex)

  return '0x' + r + s + v;
}

/**
 * Map of Anvil private keys to their actual addresses
 * These are the real addresses derived from Anvil's default private keys
 */
const ANVIL_ADDRESS_MAP: { [key: string]: string } = {
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80': '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6': '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a': '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba': '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e': '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356': '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97': '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6': '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
};

/**
 * Derive address from private key
 * For Anvil accounts, we use the actual addresses
 * For other keys, generate deterministic address (for testing only)
 */
function getAddressFromPrivateKey(privateKey: string): string {
  // Check if this is a known Anvil account
  if (ANVIL_ADDRESS_MAP[privateKey]) {
    return ANVIL_ADDRESS_MAP[privateKey];
  }

  // For unknown keys, generate deterministic address
  const hash = crypto.sha256(privateKey, 'hex');
  return '0x' + hash.substring(0, 40);
}

/**
 * Sign a CoW Protocol order with EIP-712
 *
 * @param privateKey - Private key (for POC, can be any string)
 * @param chainId - Chain ID (31337 for Anvil)
 * @param settlementContract - GPv2Settlement contract address
 * @param orderParams - Order parameters to sign
 * @returns Signed order with signature
 */
export function signOrder(
  privateKey: string,
  chainId: number,
  settlementContract: string,
  orderParams: OrderParams
): SignedOrder {
  // Get signature digest
  const digest = getSignatureDigest(chainId, settlementContract, orderParams);

  // Generate mock signature (for load testing only!)
  const signature = generateMockSignature(digest, privateKey);

  // Derive address
  const from = getAddressFromPrivateKey(privateKey);

  // Return signed order
  return {
    ...orderParams,
    from,
    signature,
    signingScheme: 'eip712',
  };
}

/**
 * Default Anvil account private keys (for testing)
 */
export const ANVIL_ACCOUNTS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Account #0
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Account #1
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Account #2
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // Account #3
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // Account #4
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // Account #5
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // Account #6
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // Account #7
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', // Account #8
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6', // Account #9
];
