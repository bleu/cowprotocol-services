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
  '0x0e9eaf7d33972f56831e1fc87ac7ed00c8943f51': {
    address: '0x0E9eAf7d33972F56831E1fc87AC7Ed00c8943F51',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    priceInEth: 1.0, // 1 WETH = 1 ETH by definition
  },

  // DAI - Dai Stablecoin
  '0x0e13b765c10b085cf5648537cb6e5121e683a9a1': {
    address: '0x0e13b765c10B085CF5648537cB6E5121E683a9a1',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    priceInEth: 0.0004, // Assuming 1 DAI ≈ $1 and 1 ETH ≈ $2500
  },

  // USDC - USD Coin
  '0x3835b40c692affa1e2d0dc3bb6de93ab91e7f805': {
    address: '0x3835b40C692AFfA1e2D0dC3bB6dE93aB91e7f805',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    priceInEth: 0.0004, // Assuming 1 USDC ≈ $1 and 1 ETH ≈ $2500
  },

  // USDT - Tether USD
  '0xfe71f4affd20f7e1ca13e15d1ceecd9c024ead05': {
    address: '0xfE71f4aFfD20f7e1CA13E15D1cEecd9c024ead05',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    priceInEth: 0.0004, // Assuming 1 USDT ≈ $1 and 1 ETH ≈ $2500
  },

  // GNO - Gnosis Token
  '0xfb408f28d8b38b127b00d9f07dad87fb21745831': {
    address: '0xFB408F28D8b38b127b00d9F07daD87Fb21745831',
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
