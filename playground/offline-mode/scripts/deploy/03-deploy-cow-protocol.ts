/**
 * Deploy CoW Protocol Core (Settlement, VaultRelayer, Authenticator, BalancerVault)
 */

import { DeploymentConfig, CowProtocolAddresses } from './types';
import {
  runForgeScript,
  readBroadcastResult,
  extractAddress,
  castCall,
  castSend,
  printSection,
  printDeployment,
} from './utils';

export async function deployCowProtocol(config: DeploymentConfig): Promise<CowProtocolAddresses> {
  printSection('STEP 3: Deploying CoW Protocol (Settlement + Auth)');

  // Step 3.1: Deploy MockBalancerVault
  console.log('Deploying MockBalancerVault with CREATE2...');
  await runForgeScript(
    'contracts/script/DeployBalancerVault.s.sol',
    'DeployBalancerVault',
    config.rpcUrl,
    config.deployerPrivateKey
  );

  const balancerBroadcast = readBroadcastResult('DeployBalancerVault');
  const balancerVault = extractAddress(balancerBroadcast, 'MockBalancerVault', 'CREATE2');
  console.log(`MockBalancerVault deployed at: ${balancerVault}`);
  console.log('');

  // Step 3.2: Deploy Settlement and Authenticator
  await runForgeScript(
    'contracts/script/DeployCowProtocol.s.sol',
    'DeployCowProtocol',
    config.rpcUrl,
    config.deployerPrivateKey,
    {
      env: {
        BALANCER_VAULT_ADDRESS: balancerVault,
      },
    }
  );

  const cowBroadcast = readBroadcastResult('DeployCowProtocol');

  // Authenticator is first, Settlement is second
  const authenticator = extractAddress(cowBroadcast, undefined, 'CREATE2', 0);
  const settlement = extractAddress(cowBroadcast, undefined, 'CREATE2', 1);

  // VaultRelayer is created by Settlement contract, need to read it from chain
  console.log('Reading VaultRelayer address from Settlement contract...');
  const vaultRelayerRaw = await castCall(settlement, 'vaultRelayer()', config.rpcUrl);
  // Extract address from bytes32 (last 20 bytes = 40 hex chars, add 0x prefix)
  const vaultRelayer = '0x' + vaultRelayerRaw.trim().slice(-40);

  console.log('');
  console.log('✅ CoW Protocol deployed!');
  console.log('');

  // Step 3.4: Initialize Solver Authentication
  printSection('STEP 3.4: Initializing Solver Authentication');

  const ALICE_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  console.log(`Setting up solver authentication...`);
  console.log(`  Solver address (Alice): ${ALICE_ADDRESS}`);
  console.log('');

  console.log('Initializing manager...');
  await castSend(
    authenticator,
    'initializeManager(address)',
    [ALICE_ADDRESS],
    config.deployerPrivateKey,
    config.rpcUrl,
    config.chainId
  );

  console.log('');
  console.log('Adding Alice as a solver...');
  await castSend(
    authenticator,
    'addSolver(address)',
    [ALICE_ADDRESS],
    config.deployerPrivateKey,
    config.rpcUrl,
    config.chainId
  );

  console.log('');
  console.log('✅ Solver authentication configured!');
  console.log('');

  const addresses: CowProtocolAddresses = {
    authenticator,
    settlement,
    vaultRelayer,
    balancerVault,
  };

  console.log('📝 Deployed CoW Protocol addresses:');
  printDeployment('Authenticator', addresses.authenticator);
  printDeployment('Settlement', addresses.settlement);
  printDeployment('Vault Relayer', addresses.vaultRelayer);
  printDeployment('Balancer Vault', addresses.balancerVault);
  console.log('');

  return addresses;
}

// If run directly
if (require.main === module) {
  console.error('❌ This script should be run via the main deploy-all.ts script');
  process.exit(1);
}
