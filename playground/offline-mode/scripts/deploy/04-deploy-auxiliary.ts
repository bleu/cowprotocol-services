/**
 * Deploy Auxiliary Contracts (TradeSimulator, Signatures, HooksTrampoline, CoWShed)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { DeploymentConfig, CowProtocolAddresses, AuxiliaryAddresses } from './types';
import {
  runForgeScript,
  readBroadcastResult,
  extractAddress,
  printSection,
  printDeployment,
} from './utils';

const execAsync = promisify(exec);

export async function deployAuxiliary(
  config: DeploymentConfig,
  cowProtocol: CowProtocolAddresses
): Promise<AuxiliaryAddresses> {
  // Step 3.5: Deploy GPv2TradeSimulator
  printSection('STEP 3.5: Deploying GPv2TradeSimulator Contract');

  await runForgeScript(
    'contracts/script/DeployTradeSimulator.s.sol',
    'DeployTradeSimulator',
    config.rpcUrl,
    config.deployerPrivateKey
  );

  const tradeSimulatorBroadcast = readBroadcastResult('DeployTradeSimulator');
  const tradeSimulator = extractAddress(tradeSimulatorBroadcast, undefined, 'CREATE2');

  console.log('');
  console.log('✅ GPv2TradeSimulator contract deployed!');
  console.log('');
  console.log('📝 Deployed GPv2TradeSimulator address:');
  printDeployment('GPv2TradeSimulator', tradeSimulator);
  console.log('');

  // Step 3.6: Deploy Signatures Contract
  printSection('STEP 3.6: Deploying Signatures Contract');

  await runForgeScript(
    'contracts/script/DeploySignatures.s.sol',
    'DeploySignatures',
    config.rpcUrl,
    config.deployerPrivateKey
  );

  const signaturesBroadcast = readBroadcastResult('DeploySignatures');
  const signatures = extractAddress(signaturesBroadcast, 'Signatures');

  console.log('');
  console.log('✅ Signatures contract deployed!');
  console.log('');
  console.log('📝 Deployed Signatures address:');
  printDeployment('Signatures', signatures);
  console.log('');

  // Step 3.7: Deploy HooksTrampoline Contract
  printSection('STEP 3.7: Deploying HooksTrampoline Contract');

  await runForgeScript(
    'contracts/script/DeployHooksTrampoline.s.sol',
    'DeployHooksTrampoline',
    config.rpcUrl,
    config.deployerPrivateKey,
    {
      env: {
        SETTLEMENT: cowProtocol.settlement,
      },
    }
  );

  const hooksTrampolineBroadcast = readBroadcastResult('DeployHooksTrampoline');
  const hooksTrampoline = extractAddress(hooksTrampolineBroadcast, 'HooksTrampoline');

  console.log('');
  console.log('✅ HooksTrampoline contract deployed!');
  console.log('');
  console.log('📝 Deployed HooksTrampoline address:');
  printDeployment('HooksTrampoline', hooksTrampoline);
  console.log('');

  // Step 3.8: Deploy CoWShed Factory and Implementation
  printSection('STEP 3.8: Deploying CoWShed (Factory + Implementation)');

  console.log('Building CoWShed contracts...');
  await execAsync('FOUNDRY_PROFILE=cow-shed forge build', {
    cwd: process.cwd(),
  });

  await runForgeScript(
    'contracts/script/DeployCoWShed.s.sol',
    'DeployCoWShed',
    config.rpcUrl,
    config.deployerPrivateKey
  );

  const cowShedBroadcast = readBroadcastResult('DeployCoWShed');

  // Implementation is first, Factory is second
  const cowShedImplementation = extractAddress(cowShedBroadcast, undefined, 'CREATE2', 0);
  const cowShedFactory = extractAddress(cowShedBroadcast, undefined, 'CREATE2', 1);

  console.log('');
  console.log('✅ CoWShed contracts deployed!');
  console.log('');
  console.log('📝 Deployed CoWShed addresses:');
  printDeployment('Implementation', cowShedImplementation);
  printDeployment('Factory', cowShedFactory);
  console.log('');

  const addresses: AuxiliaryAddresses = {
    tradeSimulator,
    signatures,
    hooksTrampoline,
    cowShed: {
      factory: cowShedFactory,
      implementation: cowShedImplementation,
    },
  };

  return addresses;
}

// If run directly
if (require.main === module) {
  console.error('❌ This script should be run via the main deploy-all.ts script');
  process.exit(1);
}
