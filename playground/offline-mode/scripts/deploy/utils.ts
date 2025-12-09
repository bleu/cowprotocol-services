/**
 * Utility functions for deployment scripts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ForgeBroadcastResult } from './types';

const execAsync = promisify(exec);

/**
 * Execute a forge script command
 */
export async function runForgeScript(
  scriptPath: string,
  scriptName: string,
  rpcUrl: string,
  privateKey: string,
  options: {
    broadcast?: boolean;
    skipSimulation?: boolean;
    verbosity?: number;
    env?: Record<string, string>;
  } = {}
): Promise<void> {
  const {
    broadcast = true,
    skipSimulation = true,
    verbosity = 3,
    env = {},
  } = options;

  const args = [
    'forge script',
    `${scriptPath}:${scriptName}`,
    `--rpc-url ${rpcUrl}`,
    broadcast ? '--broadcast' : '',
    privateKey ? `--private-key ${privateKey}` : '',
    skipSimulation ? '--skip-simulation' : '',
    `-${'v'.repeat(verbosity)}`,
  ].filter(Boolean).join(' ');

  console.log(`Running: ${args}`);

  const envVars = {
    ...process.env,
    ...env,
  } as NodeJS.ProcessEnv;

  // Only add DEPLOYER_PRIVATE_KEY if privateKey is provided
  if (privateKey) {
    envVars.DEPLOYER_PRIVATE_KEY = privateKey;
  }

  const { stdout, stderr } = await execAsync(args, {
    env: envVars,
    cwd: path.join(__dirname, '../..'),
  });

  if (stderr && !stderr.includes('Warning')) {
    console.error('stderr:', stderr);
  }
  if (stdout) {
    console.log(stdout);
  }
}

/**
 * Read the latest broadcast result for a script
 */
export function readBroadcastResult(scriptName: string): ForgeBroadcastResult {
  const broadcastPath = path.join(
    __dirname,
    '../..',
    'broadcast',
    `${scriptName}.s.sol`,
    '31337',
    'run-latest.json'
  );

  if (!fs.existsSync(broadcastPath)) {
    throw new Error(`Broadcast file not found: ${broadcastPath}`);
  }

  const content = fs.readFileSync(broadcastPath, 'utf8');
  return JSON.parse(content);
}

/**
 * Extract contract address from broadcast by contract name and transaction type
 */
export function extractAddress(
  broadcast: ForgeBroadcastResult,
  contractName?: string,
  transactionType: 'CREATE' | 'CREATE2' = 'CREATE2',
  index: number = 0
): string {
  const transactions = broadcast.transactions.filter(tx => {
    if (contractName) {
      return tx.contractName === contractName && tx.transactionType === transactionType;
    }
    return tx.transactionType === transactionType;
  });

  if (transactions.length === 0) {
    throw new Error(`No transaction found for ${contractName || 'unnamed contract'} with type ${transactionType}`);
  }

  if (index >= transactions.length) {
    throw new Error(`Index ${index} out of bounds (found ${transactions.length} transactions)`);
  }

  return transactions[index].contractAddress;
}

/**
 * Extract pair address from PairCreated event log
 */
export function extractPairAddress(
  broadcast: ForgeBroadcastResult,
  pairIndex: number
): string {
  // PairCreated event topic
  const pairCreatedTopic = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';

  const pairLogs = broadcast.receipts.flatMap(receipt =>
    receipt.logs.filter(log => log.topics[0] === pairCreatedTopic)
  );

  if (pairIndex >= pairLogs.length) {
    throw new Error(`Pair index ${pairIndex} out of bounds (found ${pairLogs.length} pairs)`);
  }

  // Extract address from data field (first 32 bytes after 0x, skip 24 leading zeros)
  const data = pairLogs[pairIndex].data;
  return '0x' + data.slice(26, 66);
}

/**
 * Call a view function on a contract using cast
 */
export async function castCall(
  contractAddress: string,
  functionSig: string,
  rpcUrl: string
): Promise<string> {
  const { stdout } = await execAsync(
    `cast call ${contractAddress} "${functionSig}" --rpc-url ${rpcUrl}`
  );
  return stdout.trim();
}

/**
 * Send a transaction to a contract using cast
 */
export async function castSend(
  contractAddress: string,
  functionSig: string,
  args: string[],
  privateKey: string,
  rpcUrl: string,
  chainId: number
): Promise<void> {
  const argsStr = args.join(' ');
  const { stdout, stderr } = await execAsync(
    `cast send ${contractAddress} "${functionSig}" ${argsStr} --private-key ${privateKey} --rpc-url ${rpcUrl} --chain ${chainId}`
  );

  if (stderr) {
    console.error('stderr:', stderr);
  }
  if (stdout) {
    console.log(stdout);
  }
}

/**
 * Save addresses to JSON file
 */
export function saveAddressesJson(addresses: any): void {
  const filePath = path.join(__dirname, '../..', 'config/addresses.json');
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2) + '\n');
  console.log(`✅ Saved to config/addresses.json`);
}

/**
 * Load addresses from JSON file
 */
export function loadAddressesJson(): any {
  const filePath = path.join(__dirname, '../..', 'config/addresses.json');

  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Print a section header
 */
export function printSection(title: string): void {
  console.log('');
  console.log('━'.repeat(60));
  console.log(title);
  console.log('━'.repeat(60));
}

/**
 * Print deployment result
 */
export function printDeployment(name: string, address: string): void {
  console.log(`  ${name}: ${address}`);
}
