/**
 * Deploy Tokens (WETH, USDC, DAI, USDT, GNO)
 */

import { DeploymentConfig, TokenAddresses } from './types';
import {
  runForgeScript,
  readBroadcastResult,
  extractAddress,
  printSection,
  printDeployment,
} from './utils';

export async function deployTokens(config: DeploymentConfig): Promise<TokenAddresses> {
  printSection('STEP 1: Deploying Tokens (WETH, USDC, DAI, USDT, GNO)');

  // Run the forge script
  await runForgeScript(
    'contracts/script/DeployTokens.s.sol',
    'DeployTokens',
    config.rpcUrl,
    config.deployerPrivateKey
  );

  // Read broadcast result
  const broadcast = readBroadcastResult('DeployTokens');

  // Extract addresses
  const WETH = extractAddress(broadcast, 'WETH', 'CREATE2');

  // TestERC20 contracts are deployed in order: USDC, DAI, USDT, GNO
  const testERC20Transactions = broadcast.transactions.filter(
    tx => tx.contractName === 'TestERC20' && tx.transactionType === 'CREATE2'
  );

  const USDC = testERC20Transactions[0].contractAddress;
  const DAI = testERC20Transactions[1].contractAddress;
  const USDT = testERC20Transactions[2].contractAddress;
  const GNO = testERC20Transactions[3].contractAddress;

  const addresses: TokenAddresses = {
    WETH,
    USDC,
    DAI,
    USDT,
    GNO,
  };

  console.log('');
  console.log('✅ Tokens deployed!');
  console.log('');
  console.log('📝 Deployed token addresses:');
  printDeployment('WETH', addresses.WETH);
  printDeployment('USDC', addresses.USDC);
  printDeployment('DAI', addresses.DAI);
  printDeployment('USDT', addresses.USDT);
  printDeployment('GNO', addresses.GNO);
  console.log('');

  return addresses;
}

// If run directly
if (require.main === module) {
  const config: DeploymentConfig = {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId: 31337,
  };

  deployTokens(config)
    .then(() => {
      console.log('✅ Token deployment complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Token deployment failed:', error);
      process.exit(1);
    });
}
