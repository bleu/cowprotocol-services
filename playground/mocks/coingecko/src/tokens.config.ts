/**
 * Token configuration for Coingecko mock API
 *
 * Prices are denominated in ETH as per Coingecko's API format.
 * These are the 5 tokens deployed in offline mode with deterministic addresses.
 *
 * Addresses from: playground/offline-mode/config/addresses.json
 */

export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceInEth: number;
}

export const TOKENS: Record<string, TokenConfig> = {
  // WETH - Wrapped Ether
  '0x923f26d85d25c0abb51d643f105dca62b13374c2': {
    address: '0x923f26d85d25c0abb51d643f105dca62b13374c2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    priceInEth: 1.0, // 1 WETH = 1 ETH by definition
  },

  // DAI - Dai Stablecoin
  '0xa3b4bb9a29a954c5236080c331e32fb4434e4229': {
    address: '0xa3b4bb9a29a954c5236080c331e32fb4434e4229',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    priceInEth: 0.0004, // Assuming 1 DAI ≈ $1 and 1 ETH ≈ $2500
  },

  // USDC - USD Coin
  '0x78e24297cb4911956a3017dba2d82463c9c01555': {
    address: '0x78e24297cb4911956a3017dba2d82463c9c01555',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    priceInEth: 0.0004, // Assuming 1 USDC ≈ $1 and 1 ETH ≈ $2500
  },

  // USDT - Tether USD
  '0x52eea99f47938350e5bafed3bedcf886d116b061': {
    address: '0x52eea99f47938350e5bafed3bedcf886d116b061',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    priceInEth: 0.0004, // Assuming 1 USDT ≈ $1 and 1 ETH ≈ $2500
  },

  // GNO - Gnosis Token
  '0x869b46ffaae323ff22d4a5a92e14141542693ebe': {
    address: '0x869b46ffaae323ff22d4a5a92e14141542693ebe',
    symbol: 'GNO',
    name: 'Gnosis Token',
    decimals: 18,
    priceInEth: 0.05, // Assuming 1 GNO ≈ $125 and 1 ETH ≈ $2500
  },
};

/**
 * Get token price by address (case-insensitive)
 */
export function getTokenPrice(address: string): number | null {
  const normalizedAddress = address.toLowerCase();
  const token = TOKENS[normalizedAddress];
  return token ? token.priceInEth : null;
}

/**
 * Check if token is supported
 */
export function isTokenSupported(address: string): boolean {
  return address.toLowerCase() in TOKENS;
}

/**
 * Get all supported token addresses
 */
export function getSupportedTokens(): string[] {
  return Object.keys(TOKENS);
}
