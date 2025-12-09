/**
 * Token configuration for Coingecko mock API
 *
 * Prices are fetched dynamically from Uniswap V2 pairs.
 * These are the 5 tokens deployed in offline mode with deterministic addresses.
 *
 * Addresses from: playground/offline-mode/config/addresses.json
 */

export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const TOKENS: Record<string, TokenConfig> = {
  // WETH - Wrapped Ether
  '0x923f26d85d25c0abb51d643f105dca62b13374c2': {
    address: '0x923f26d85d25c0abb51d643f105dca62b13374c2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },

  // DAI - Dai Stablecoin
  '0xa3b4bb9a29a954c5236080c331e32fb4434e4229': {
    address: '0xa3b4bb9a29a954c5236080c331e32fb4434e4229',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },

  // USDC - USD Coin
  '0x78e24297cb4911956a3017dba2d82463c9c01555': {
    address: '0x78e24297cb4911956a3017dba2d82463c9c01555',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },

  // USDT - Tether USD
  '0x52eea99f47938350e5bafed3bedcf886d116b061': {
    address: '0x52eea99f47938350e5bafed3bedcf886d116b061',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },

  // GNO - Gnosis Token
  '0x869b46ffaae323ff22d4a5a92e14141542693ebe': {
    address: '0x869b46ffaae323ff22d4a5a92e14141542693ebe',
    symbol: 'GNO',
    name: 'Gnosis Token',
    decimals: 18,
  },
};

/**
 * Get token config by address (case-insensitive)
 */
export function getTokenConfig(address: string): TokenConfig | null {
  const normalizedAddress = address.toLowerCase();
  return TOKENS[normalizedAddress] || null;
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
