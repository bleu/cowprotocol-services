#!/usr/bin/env ts-node
/**
 * Main deployment orchestrator script
 * Deploys all contracts and generates configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import { DeploymentConfig, AllAddresses } from './deploy/types';
import { saveAddressesJson } from './deploy/utils';
import { deployTokens } from './deploy/01-deploy-tokens';
import { deployUniswap } from './deploy/02-deploy-uniswap';
import { deployCowProtocol } from './deploy/03-deploy-cow-protocol';
import { deployAuxiliary } from './deploy/04-deploy-auxiliary';
import { addLiquidity, initializeRouter } from './deploy/05-add-liquidity';
import { exportAddresses, generateConfigs } from './deploy/06-export-addresses';

// ============================================================================
// CONFIGURATION - Edit these constants as needed
// ============================================================================

const RPC_URL = 'http://localhost:8545';
const DEPLOYER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil account #0
const CHAIN_ID = 31337;

// ============================================================================

async function main() {
  console.log('🚀 Deploying all contracts to local Anvil...');
  console.log('');

  // Configuration
  const config: DeploymentConfig = {
    rpcUrl: RPC_URL,
    deployerPrivateKey: DEPLOYER_PRIVATE_KEY,
    chainId: CHAIN_ID,
  };

  console.log(`Using RPC URL: ${config.rpcUrl}`);
  console.log('');

  // Create directories
  const configDir = path.join(__dirname, '../config');
  const stateDir = path.join(__dirname, '../state');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });

  try {
    // Step 1: Deploy Tokens
    const tokens = await deployTokens(config);
    saveAddressesJson({ chainId: CHAIN_ID, tokens });

    // Step 2: Deploy Uniswap V2
    const uniswap = await deployUniswap(config, tokens);
    saveAddressesJson({ chainId: CHAIN_ID, tokens, uniswap });

    // Step 3: Deploy CoW Protocol Core
    const cowProtocol = await deployCowProtocol(config);
    saveAddressesJson({ chainId: CHAIN_ID, tokens, uniswap, cowProtocol });

    // Step 4: Deploy Auxiliary Contracts
    const auxiliary = await deployAuxiliary(config, cowProtocol);
    saveAddressesJson({ chainId: CHAIN_ID, tokens, uniswap, cowProtocol, auxiliary });

    // Step 5: Add Liquidity
    await addLiquidity(config, tokens, uniswap);

    // Step 6: Initialize Router
    await initializeRouter(config, tokens, uniswap, cowProtocol);

    // Combine all addresses
    const allAddresses: AllAddresses = {
      tokens,
      uniswap,
      cowProtocol,
      auxiliary,
    };

    // Final save
    saveAddressesJson({ chainId: CHAIN_ID, ...allAddresses });

    // Step 7: Generate Configuration Files
    await generateConfigs(allAddresses);

    // Print summary
    console.log('━'.repeat(60));
    console.log('✅ DEPLOYMENT COMPLETE');
    console.log('━'.repeat(60));
    console.log('');
    console.log('📋 Deployment Summary:');
    console.log('  ✅ Step 1: Tokens deployed (WETH, USDC, DAI, USDT, GNO)');
    console.log('  ✅ Step 2: Uniswap V2 deployed (Factory, Router, 10 Pairs)');
    console.log('  ✅ Step 3: CoW Protocol deployed (Settlement, Auth, VaultRelayer)');
    console.log('  ✅ Step 3.5: TradeSimulator contract deployed');
    console.log('  ✅ Step 3.6: Signatures contract deployed');
    console.log('  ✅ Step 3.7: HooksTrampoline contract deployed');
    console.log('  ✅ Step 3.8: CoWShed deployed (Factory, Implementation)');
    console.log('  ✅ Step 4: Liquidity added to all pairs');
    console.log('  ✅ Step 4.5: Uniswap Router initialized (token approvals)');
    console.log('  ✅ Step 5: Addresses exported to JSON');
    console.log('  ✅ Step 6: Configuration files generated');
    console.log('');
    console.log('📁 Output files:');
    console.log('  - offline-mode/config/addresses.json (deployment addresses)');
    console.log('  - offline-mode/configs/offline/driver.toml (auto-generated)');
    console.log('  - offline-mode/configs/offline/baseline.toml (auto-generated)');
    console.log('  - playground/.env.offline (auto-generated)');
    console.log('');
    console.log('🚀 Next: Start the full stack with:');
    console.log('  cd ../../playground');
    console.log('  docker compose -f docker-compose.offline.yml up');
    console.log('');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('');
    console.error('━'.repeat(60));
    console.error('❌ DEPLOYMENT FAILED');
    console.error('━'.repeat(60));
    console.error('');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main as deployAll };
