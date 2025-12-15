/**
 * Deploy Uniswap V2 (Factory + Router + Pools)
 */

import { DeploymentConfig, TokenAddresses, UniswapAddresses } from './types';
import {
  runForgeScript,
  readBroadcastResult,
  extractAddress,
  extractPairAddress,
  printSection,
  printDeployment,
} from './utils';

export async function deployUniswap(
  config: DeploymentConfig,
  tokens: TokenAddresses
): Promise<UniswapAddresses> {
  printSection('STEP 2: Deploying Uniswap V2 (Factory + Router + Pools)');

  // Run the forge script with token addresses as environment variables
  await runForgeScript(
    'contracts/script/DeployUniswapV2.s.sol',
    'DeployUniswapV2',
    config.rpcUrl,
    config.deployerPrivateKey,
    {
      env: {
        WETH_ADDRESS: tokens.WETH,
        USDC_ADDRESS: tokens.USDC,
        DAI_ADDRESS: tokens.DAI,
        USDT_ADDRESS: tokens.USDT,
        GNO_ADDRESS: tokens.GNO,
      },
    }
  );

  // Read broadcast result
  const broadcast = readBroadcastResult('DeployUniswapV2');

  // Extract factory and router addresses (CREATE2 deployments without contract name)
  const factory = extractAddress(broadcast, undefined, 'CREATE2', 0);
  const router = extractAddress(broadcast, undefined, 'CREATE2', 1);

  // Extract pair addresses from PairCreated events (in deployment order)
  const pairs = {
    WETH_USDC: extractPairAddress(broadcast, 0),
    WETH_DAI: extractPairAddress(broadcast, 1),
    WETH_USDT: extractPairAddress(broadcast, 2),
    WETH_GNO: extractPairAddress(broadcast, 3),
    USDC_DAI: extractPairAddress(broadcast, 4),
    USDC_USDT: extractPairAddress(broadcast, 5),
    USDC_GNO: extractPairAddress(broadcast, 6),
    DAI_USDT: extractPairAddress(broadcast, 7),
    DAI_GNO: extractPairAddress(broadcast, 8),
    USDT_GNO: extractPairAddress(broadcast, 9),
  };

  const addresses: UniswapAddresses = {
    factory,
    router,
    pairs,
  };

  console.log('');
  console.log('✅ Uniswap V2 deployed!');
  console.log('');
  console.log('📝 Deployed Uniswap addresses:');
  printDeployment('Factory', addresses.factory);
  printDeployment('Router', addresses.router);
  printDeployment('WETH-USDC Pair', addresses.pairs.WETH_USDC);
  printDeployment('WETH-DAI Pair', addresses.pairs.WETH_DAI);
  printDeployment('USDC-DAI Pair', addresses.pairs.USDC_DAI);
  printDeployment('WETH-USDT Pair', addresses.pairs.WETH_USDT);
  printDeployment('WETH-GNO Pair', addresses.pairs.WETH_GNO);
  printDeployment('USDC-USDT Pair', addresses.pairs.USDC_USDT);
  printDeployment('USDC-GNO Pair', addresses.pairs.USDC_GNO);
  printDeployment('DAI-USDT Pair', addresses.pairs.DAI_USDT);
  printDeployment('DAI-GNO Pair', addresses.pairs.DAI_GNO);
  printDeployment('USDT-GNO Pair', addresses.pairs.USDT_GNO);
  console.log('');

  return addresses;
}

// If run directly
if (require.main === module) {
  // This script requires token addresses, so it should be run via the main deploy script
  console.error('❌ This script should be run via the main deploy-all.ts script');
  process.exit(1);
}
