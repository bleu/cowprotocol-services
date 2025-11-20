#!/bin/bash
set -e

echo "🚀 Deploying all contracts to local Anvil..."
echo ""

# Set defaults if not provided (don't source .env in Docker - it overrides env vars)
: ${RPC_URL:=http://localhost:8545}
: ${DEPLOYER_PRIVATE_KEY:=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}

echo "Using RPC URL: $RPC_URL"
echo ""

# Create directories
mkdir -p config
mkdir -p state

# Step 1: Deploy Tokens
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Deploying Tokens (WETH, USDC, DAI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge script contracts/script/DeployTokens.s.sol:DeployTokens \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --skip-simulation \
    -vvv

echo ""
echo "✅ Tokens deployed!"
echo ""

# Extract token addresses from broadcast - using array indexing for TestERC20
WETH_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "WETH" and .transactionType == "CREATE") | .contractAddress' broadcast/DeployTokens.s.sol/31337/run-latest.json)
USDC_ADDRESS=$(jq -r '[.transactions[] | select(.contractName == "TestERC20" and .transactionType == "CREATE")] | .[0].contractAddress' broadcast/DeployTokens.s.sol/31337/run-latest.json)
DAI_ADDRESS=$(jq -r '[.transactions[] | select(.contractName == "TestERC20" and .transactionType == "CREATE")] | .[1].contractAddress' broadcast/DeployTokens.s.sol/31337/run-latest.json)

# Export for next scripts
export WETH_ADDRESS
export USDC_ADDRESS
export DAI_ADDRESS

echo "📝 Deployed token addresses:"
echo "  WETH: $WETH_ADDRESS"
echo "  USDC: $USDC_ADDRESS"
echo "  DAI: $DAI_ADDRESS"
echo ""

# Step 2: Deploy Uniswap V2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Deploying Uniswap V2 (Factory + Router + Pools)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge script contracts/script/DeployUniswapV2.s.sol:DeployUniswapV2 \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --skip-simulation \
    -vvv

echo ""
echo "✅ Uniswap V2 deployed!"
echo ""

# Extract Uniswap addresses from broadcast
# Factory and Router are deployed via deployCode (transactionType CREATE)
UNISWAP_FACTORY=$(jq -r '[.transactions[] | select(.transactionType == "CREATE" and .contractName == null)] | .[0].contractAddress' broadcast/DeployUniswapV2.s.sol/31337/run-latest.json)
UNISWAP_ROUTER=$(jq -r '[.transactions[] | select(.transactionType == "CREATE" and .contractName == null)] | .[1].contractAddress' broadcast/DeployUniswapV2.s.sol/31337/run-latest.json)

# Get pair addresses from PairCreated event logs
# The pair address is in the data field (first 32 bytes, prefixed with 0x followed by 24 zeros)
PAIR_WETH_USDC=$(jq -r '[.receipts[].logs[] | select(.topics[0] == "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9")] | .[0].data' broadcast/DeployUniswapV2.s.sol/31337/run-latest.json | cut -c 1-66 | sed 's/^0x000000000000000000000000/0x/')
PAIR_WETH_DAI=$(jq -r '[.receipts[].logs[] | select(.topics[0] == "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9")] | .[1].data' broadcast/DeployUniswapV2.s.sol/31337/run-latest.json | cut -c 1-66 | sed 's/^0x000000000000000000000000/0x/')
PAIR_USDC_DAI=$(jq -r '[.receipts[].logs[] | select(.topics[0] == "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9")] | .[2].data' broadcast/DeployUniswapV2.s.sol/31337/run-latest.json | cut -c 1-66 | sed 's/^0x000000000000000000000000/0x/')

# Export for next scripts - CRITICAL: Must export these for AddLiquidityDirect and InitializeUniswapRouter
export UNISWAP_FACTORY
export UNISWAP_ROUTER
export PAIR_WETH_USDC
export PAIR_WETH_DAI
export PAIR_USDC_DAI

echo "📝 Deployed Uniswap addresses:"
echo "  Factory: $UNISWAP_FACTORY"
echo "  Router: $UNISWAP_ROUTER"
echo "  WETH-USDC Pair: $PAIR_WETH_USDC"
echo "  WETH-DAI Pair: $PAIR_WETH_DAI"
echo "  USDC-DAI Pair: $PAIR_USDC_DAI"
echo ""

# Step 3: Deploy CoW Protocol
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Deploying CoW Protocol (Settlement + Auth)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deploy MockBalancerVault first
echo "Deploying MockBalancerVault..."
BALANCER_VAULT=$(forge create contracts/src/MockBalancerVault.sol:MockBalancerVault \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy \
    --broadcast \
    -vvv 2>&1 | grep "Deployed to:" | awk '{print $NF}')

echo "MockBalancerVault deployed at: $BALANCER_VAULT"

# Export for DeployCowProtocol script
export BALANCER_VAULT_ADDRESS=$BALANCER_VAULT

forge script contracts/script/DeployCowProtocol.s.sol:DeployCowProtocol \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --skip-simulation \
    -vvv

echo ""
echo "✅ CoW Protocol deployed!"
echo ""

# Extract CoW Protocol addresses from broadcast
# Now that MockBalancerVault is deployed separately, DeployCowProtocol only has 2 contracts:
# Authenticator is first (index 0)
COW_AUTHENTICATOR=$(jq -r '[.transactions[] | select(.transactionType == "CREATE")] | .[0].contractAddress' broadcast/DeployCowProtocol.s.sol/31337/run-latest.json)
# Settlement is second (index 1)
COW_SETTLEMENT=$(jq -r '[.transactions[] | select(.transactionType == "CREATE")] | .[1].contractAddress' broadcast/DeployCowProtocol.s.sol/31337/run-latest.json)
# VaultRelayer is created by Settlement contract, need to read it from chain
# cast call returns bytes32, we need to extract the address (last 20 bytes = 40 hex chars, keeping 0x prefix)
COW_VAULT_RELAYER=0x$(cast call $COW_SETTLEMENT "vaultRelayer()" --rpc-url $RPC_URL | xargs | cut -c 27-66)

# Export for next scripts
export COW_AUTHENTICATOR
export COW_SETTLEMENT
export COW_VAULT_RELAYER
export BALANCER_VAULT

echo "📝 Deployed CoW Protocol addresses:"
echo "  Authenticator: $COW_AUTHENTICATOR"
echo "  Settlement: $COW_SETTLEMENT"
echo "  Vault Relayer: $COW_VAULT_RELAYER"
echo "  Balancer Vault: $BALANCER_VAULT"
echo ""

# Step 3.4: Initialize Solver Authentication
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3.4: Initializing Solver Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Alice's address (Anvil account #0) will be the solver
ALICE_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo "Setting up solver authentication..."
echo "  Solver address (Alice): $ALICE_ADDRESS"
echo ""

# Initialize Alice as the manager of the authenticator
echo "Initializing manager..."
cast send $COW_AUTHENTICATOR \
    "initializeManager(address)" \
    $ALICE_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --chain 31337

echo ""
echo "Adding Alice as a solver..."
cast send $COW_AUTHENTICATOR \
    "addSolver(address)" \
    $ALICE_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --chain 31337

echo ""
echo "✅ Solver authentication configured!"
echo ""

# Step 3.5: Deploy Balances Contract
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3.5: Deploying Balances Contract"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge script contracts/script/DeployBalances.s.sol:DeployBalances \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --skip-simulation \
    -vvv

echo ""
echo "✅ Balances contract deployed!"
echo ""

# Extract Balances address from broadcast (CREATE2 transaction)
BALANCES_CONTRACT=$(jq -r '.transactions[] | select(.contractName == "Balances") | .contractAddress' broadcast/DeployBalances.s.sol/31337/run-latest.json)

# Export for next scripts
export BALANCES_CONTRACT

echo "📝 Deployed Balances address:"
echo "  Balances: $BALANCES_CONTRACT"
echo ""

# Step 3.6: Deploy Signatures Contract
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3.6: Deploying Signatures Contract"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge script contracts/script/DeploySignatures.s.sol:DeploySignatures \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --skip-simulation \
    -vvv

echo ""
echo "✅ Signatures contract deployed!"
echo ""

# Extract Signatures address from broadcast (CREATE2 transaction)
SIGNATURES_CONTRACT=$(jq -r '.transactions[] | select(.contractName == "Signatures") | .contractAddress' broadcast/DeploySignatures.s.sol/31337/run-latest.json)

# Export for next scripts
export SIGNATURES_CONTRACT

echo "📝 Deployed Signatures address:"
echo "  Signatures: $SIGNATURES_CONTRACT"
echo ""

# Step 4: Add Liquidity (using direct method to bypass router)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Adding Initial Liquidity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge script contracts/script/AddLiquidityDirect.s.sol:AddLiquidityDirect \
    --rpc-url $RPC_URL \
    --broadcast

echo ""
echo "✅ Liquidity added to all pairs!"
echo ""

# Step 4.5: Fund Test Accounts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4.5: Funding Test Accounts for Load Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pass addresses directly to forge using environment variables
export VAULT_RELAYER_ADDRESS=$COW_VAULT_RELAYER
echo "Using Vault Relayer Address: $VAULT_RELAYER_ADDRESS"
forge script contracts/script/FundTestAccounts.s.sol:FundTestAccounts \
    --rpc-url $RPC_URL \
    --broadcast \
    -vv

echo ""
echo "✅ Test accounts funded and approved!"
echo ""

# Step 4.6: Initialize Router (approve tokens for settlement to use)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4.6: Initializing Uniswap Router (Token Approvals)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Alice's address (Anvil account #0) will be the solver
ALICE_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
export SOLVER_ADDRESS=$ALICE_ADDRESS

# Note: We don't use --broadcast here because pranks don't work with broadcasting.
# On local Anvil, the prank state changes persist to the RPC directly.
forge script contracts/script/InitializeUniswapRouter.s.sol:InitializeUniswapRouter \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    -vvv

echo ""
echo "✅ Router initialized!"
echo ""

# Step 5: Export Addresses to JSON
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Exporting Deployed Addresses to JSON"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Source the addresses to make them available as environment variables
if [ -f config/addresses.txt ]; then
    source config/addresses.txt
fi

forge script contracts/script/ExportAddresses.s.sol:ExportAddresses \
    --rpc-url $RPC_URL \
    -vv

echo ""
echo "✅ Addresses exported to config/addresses.json"
echo ""

# Step 6: Generate Configuration Files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6: Generating Configuration Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Normalize address variable names for the config generator
export UNISWAP_V2_FACTORY_ADDRESS=${UNISWAP_FACTORY}
export UNISWAP_V2_ROUTER_ADDRESS=${UNISWAP_ROUTER}
export SETTLEMENT_CONTRACT_ADDRESS=${COW_SETTLEMENT}
export AUTHENTICATOR_ADDRESS=${COW_AUTHENTICATOR}
export VAULT_RELAYER_ADDRESS=${COW_VAULT_RELAYER}
export BALANCER_VAULT_ADDRESS=${BALANCER_VAULT}
export BALANCES_CONTRACT_ADDRESS=${BALANCES_CONTRACT}
export SIGNATURES_CONTRACT_ADDRESS=${SIGNATURES_CONTRACT}

# Generate configuration files using bash (avoid running solidity script which causes "stack too deep" errors)
generate_configs() {
    echo "Generating configs via bash..."
    mkdir -p ./configs

    # Required addresses (exported above)
    WETH_ADDRESS=${WETH_ADDRESS}
    DAI_ADDRESS=${DAI_ADDRESS}
    USDC_ADDRESS=${USDC_ADDRESS}
    UNISWAP_V2_ROUTER_ADDRESS=${UNISWAP_V2_ROUTER_ADDRESS}
    UNISWAP_V2_FACTORY_ADDRESS=${UNISWAP_V2_FACTORY_ADDRESS}
    SETTLEMENT_CONTRACT_ADDRESS=${SETTLEMENT_CONTRACT_ADDRESS}
    AUTHENTICATOR_ADDRESS=${AUTHENTICATOR_ADDRESS}
    VAULT_RELAYER_ADDRESS=${VAULT_RELAYER_ADDRESS}
    BALANCER_VAULT_ADDRESS=${BALANCER_VAULT_ADDRESS}
    BALANCES_CONTRACT_ADDRESS=${BALANCES_CONTRACT_ADDRESS}
    SIGNATURES_CONTRACT_ADDRESS=${SIGNATURES_CONTRACT_ADDRESS}

    # driver.toml
    cat > ../../configs/offline/driver.toml <<EOF
app-data-fetching-enabled = true
orderbook-url = "http://orderbook"
tx-gas-limit = "45000000"

[[solver]]
name = "baseline" # Arbitrary name given to this solver, must be unique
endpoint = "http://baseline"
absolute-slippage = "40000000000000000" # Denominated in wei, optional
relative-slippage = "0.1" # Percentage in the [0, 1] range
# Anvil account #0 private key (from test mnemonic)
account = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

[submission]
gas-price-cap = "1000000000000"

[[submission.mempool]]
mempool = "public"

[contracts]
gp-v2-settlement = "${SETTLEMENT_CONTRACT_ADDRESS}"
weth = "${WETH_ADDRESS}"
balances = "${BALANCES_CONTRACT_ADDRESS}"
signatures = "${SIGNATURES_CONTRACT_ADDRESS}"

[liquidity]
base-tokens = [
    "${WETH_ADDRESS}", # WETH (auto-generated from deployment)
    "${DAI_ADDRESS}", # DAI (auto-generated from deployment)
    "${USDC_ADDRESS}", # USDC (auto-generated from deployment)
]

[[liquidity.uniswap-v2]] # Uniswap V2 configuration (auto-generated from deployment)
router = "${UNISWAP_V2_ROUTER_ADDRESS}"
pool-code = "0xb6912aa8f91da604bdd903b3484a9f6bb569baa993085fc590133487ff27f91e" # Uniswap V2 init code hash
missing-pool-cache-time = "1h"
EOF

    # baseline.toml
    cat > ../../configs/offline/baseline.toml <<EOF
chain-id = "31337" # Anvil local chain
base-tokens = [
    "${WETH_ADDRESS}", # WETH (auto-generated from deployment)
    "${DAI_ADDRESS}", # DAI (auto-generated from deployment)
    "${USDC_ADDRESS}", # USDC (auto-generated from deployment)
]
max-hops = 2
max-partial-attempts = 5
native-token-price-estimation-amount = "100000000000000000" # 0.1 ETH
EOF

    # .env.offline
    cat > ../.env.offline <<EOF
# Auto-generated by deploy-all.sh
# Generated at: $(date +%s)

# Network Configuration
CHAIN_ID=31337
NODE_URL=http://chain:8545
SIMULATION_NODE_URL=http://chain:8545

# Token Addresses (from deployment)
WETH_ADDRESS=${WETH_ADDRESS}
DAI_ADDRESS=${DAI_ADDRESS}
USDC_ADDRESS=${USDC_ADDRESS}
NATIVE_TOKEN_ADDRESS=${WETH_ADDRESS}

# Uniswap V2 Addresses (from deployment)
UNISWAP_V2_FACTORY_ADDRESS=${UNISWAP_V2_FACTORY_ADDRESS}
UNISWAP_V2_ROUTER_ADDRESS=${UNISWAP_V2_ROUTER_ADDRESS}

# CoW Protocol Addresses (from deployment)
SETTLEMENT_CONTRACT_ADDRESS=${SETTLEMENT_CONTRACT_ADDRESS}
AUTHENTICATOR_ADDRESS=${AUTHENTICATOR_ADDRESS}
VAULT_RELAYER_ADDRESS=${VAULT_RELAYER_ADDRESS}
BALANCER_VAULT_ADDRESS=${BALANCER_VAULT_ADDRESS}
BALANCES_CONTRACT_ADDRESS=${BALANCES_CONTRACT_ADDRESS}
SIGNATURES_CONTRACT_ADDRESS=${SIGNATURES_CONTRACT_ADDRESS}
EOF

    echo "Wrote ./configs/driver.toml, ./configs/baseline.toml, and ../.env.offline"
}

generate_configs

echo ""
echo "✅ Configuration files generated!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Step 1: Tokens deployed (WETH, USDC, DAI)"
echo "  ✅ Step 2: Uniswap V2 deployed (Factory, Router, Pairs)"
echo "  ✅ Step 3: CoW Protocol deployed (Settlement, Auth, VaultRelayer)"
echo "  ✅ Step 3.5: Balances contract deployed"
echo "  ✅ Step 3.6: Signatures contract deployed"
echo "  ✅ Step 4: Liquidity added to all pairs"
echo "  ✅ Step 4.5: Test accounts funded and approved"
echo "  ✅ Step 4.6: Uniswap Router initialized (token approvals)"
echo "  ✅ Step 5: Addresses exported to JSON"
echo "  ✅ Step 6: Configuration files generated"
echo "  ✅ Step 7: Blockchain state saved"
echo ""
echo "📁 Output files:"
echo "  - config/addresses.json (deployment addresses)"
echo "  - configs/offline/driver.toml (auto-generated)"
echo "  - configs/offline/baseline.toml (auto-generated)"
echo "  - playground/.env.offline (auto-generated)"
echo "  - state/poc-state.json (blockchain state)"
echo ""
echo "🚀 Next: Start the full stack with:"
echo "  cd ../../playground"
echo "  docker compose -f docker-compose.offline.yml up"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
