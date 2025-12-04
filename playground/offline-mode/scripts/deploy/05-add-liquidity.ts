/**
 * Add Liquidity to Uniswap V2 Pools and Initialize Router
 */

import { DeploymentConfig, TokenAddresses, UniswapAddresses, CowProtocolAddresses } from './types';
import { runForgeScript, printSection } from './utils';

export async function addLiquidity(
  config: DeploymentConfig,
  tokens: TokenAddresses,
  uniswap: UniswapAddresses
): Promise<void> {
  printSection('STEP 4: Adding Initial Liquidity');

  await runForgeScript(
    'contracts/script/AddLiquidityDirect.s.sol',
    'AddLiquidityDirect',
    config.rpcUrl,
    config.deployerPrivateKey,
    {
      env: {
        WETH_ADDRESS: tokens.WETH,
        USDC_ADDRESS: tokens.USDC,
        DAI_ADDRESS: tokens.DAI,
        USDT_ADDRESS: tokens.USDT,
        GNO_ADDRESS: tokens.GNO,
        UNISWAP_FACTORY: uniswap.factory,
        UNISWAP_ROUTER: uniswap.router,
        PAIR_WETH_USDC: uniswap.pairs.WETH_USDC,
        PAIR_WETH_DAI: uniswap.pairs.WETH_DAI,
        PAIR_USDC_DAI: uniswap.pairs.USDC_DAI,
        PAIR_WETH_USDT: uniswap.pairs.WETH_USDT,
        PAIR_WETH_GNO: uniswap.pairs.WETH_GNO,
        PAIR_USDC_USDT: uniswap.pairs.USDC_USDT,
        PAIR_USDC_GNO: uniswap.pairs.USDC_GNO,
        PAIR_DAI_USDT: uniswap.pairs.DAI_USDT,
        PAIR_DAI_GNO: uniswap.pairs.DAI_GNO,
        PAIR_USDT_GNO: uniswap.pairs.USDT_GNO,
      },
    }
  );

  console.log('');
  console.log('✅ Liquidity added to all pairs!');
  console.log('');
}

export async function initializeRouter(
  config: DeploymentConfig,
  tokens: TokenAddresses,
  uniswap: UniswapAddresses,
  cowProtocol: CowProtocolAddresses
): Promise<void> {
  printSection('STEP 4.5: Initializing Uniswap Router (Token Approvals)');

  const ALICE_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // Now using vm.prank with actual approve() calls instead of vm.store()
  // This creates proper transactions that won't corrupt Anvil state
  await runForgeScript(
    'contracts/script/InitializeUniswapRouter.s.sol',
    'InitializeUniswapRouter',
    config.rpcUrl,
    config.deployerPrivateKey,
    {
      broadcast: true, // Now we can broadcast since we're using proper transactions
      env: {
        WETH_ADDRESS: tokens.WETH,
        USDC_ADDRESS: tokens.USDC,
        DAI_ADDRESS: tokens.DAI,
        USDT_ADDRESS: tokens.USDT,
        GNO_ADDRESS: tokens.GNO,
        UNISWAP_FACTORY: uniswap.factory,
        UNISWAP_ROUTER: uniswap.router,
        COW_SETTLEMENT: cowProtocol.settlement,
        SOLVER_ADDRESS: ALICE_ADDRESS,
      },
    }
  );

  console.log('');
  console.log('✅ Router initialized!');
  console.log('');
}

// If run directly
if (require.main === module) {
  console.error('❌ This script should be run via the main deploy-all.ts script');
  process.exit(1);
}
