# CoW Protocol Offline Playground

A self-contained, offline development environment for CoW Protocol that runs locally without requiring mainnet forks or archive nodes.

## What is this?

The CoW Protocol Offline Playground is a complete local blockchain environment that includes:

- **Local Anvil node** with persistent state
- **CoW Protocol contracts**: Settlement, VaultRelayer, Authenticator
- **DEX infrastructure**: Uniswap V2 (with liquidity pools)
- **Test tokens**: WETH, USDC, DAI
- **CoW Protocol services**: Orderbook API, Autopilot, Driver, Baseline Solver
- **Mock Balancer Vault** for settlement execution

All services work out-of-the-box with proper configuration pointing to the local blockchain.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Foundry (forge, cast, anvil)
- jq (for JSON parsing)
- Python 3 (for order signing)

### Initialize the Environment

1. **Start all services** (this will automatically load the existing blockchain state):
   ```bash
   cd /path/to/playground
   docker-compose -f docker-compose.offline.yml up -d
   ```

   The Anvil node will automatically load the pre-deployed state from `poc-offline-mode/state/poc-state.json`.

2. **Wait for services to be ready**:
   ```bash
   # Wait for orderbook API to be available
   curl --retry 24 --retry-delay 5 --retry-all-errors http://localhost:8080/api/v1/version
   ```

3. **Run the end-to-end test**:
   ```bash
   ./test_playground_offline_cow.sh
   ```

   This script will:
   - Create two orders (peer-to-peer matching)
   - Wait for autopilot to match and settle them
   - Verify balances changed correctly

### Access Points

Once running, you can access:

- **Orderbook API**: http://localhost:8080
- **Anvil RPC**: http://localhost:8545
- **Driver API**: http://localhost:9000
- **Grafana (monitoring)**: http://localhost:3000
- **Prometheus (metrics)**: http://localhost:9090
- **Adminer (database)**: http://localhost:8082

## Running Tests

The playground includes TypeScript-based integration tests to verify the setup and functionality.

### Test Suite

#### 1. Playground Order Test (Parameterized)

Test placing and settling orders with custom parameters:

```bash
npm run test:order
```

This will run with default parameters. For custom parameters, use ts-node directly:

```bash
npm run test:order --sellToken USDC --buyToken DAI --sellAmount 100e6 --from 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Parameters:**
- `--sellToken <TOKEN>`: Token to sell (WETH, USDC, DAI, USDT, or GNO)
- `--buyToken <TOKEN>`: Token to buy (WETH, USDC, DAI, USDT, or GNO)
- `--sellAmount <AMOUNT>`: Amount to sell with decimals (e.g., `100e6` for 100 USDC, `10e18` for 10 WETH)
- `--from <PRIVATE_KEY>`: Private key of the trader (defaults to Anvil account #0)

**Examples:**
```bash
# Sell 100 USDC for DAI
npx ts-node test/test-playground-order.ts --sellToken USDC --buyToken DAI --sellAmount 100e6

# Sell 10 GNO for WETH with custom private key
npx ts-node test/test-playground-order.ts --sellToken GNO --buyToken WETH --sellAmount 10e18 --from 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This test will:
1. Fund the trader with sell tokens
2. Get a quote from the orderbook
3. Sign the order with EIP-712
4. Submit the order to the orderbook
5. Monitor settlement status (up to 2 minutes)
6. Display final balances

#### 2. CoWShed Integration Test

Test the full CoWShed proxy flow with hooks:

```bash
npm run test:cowshed
```

This test demonstrates:
1. Calculate CoWShed proxy address for a user
2. Create a pre-hook (token approval via hooks trampoline)
3. Submit an order with hooks in appData
4. Monitor for settlement
5. Verify hooks were executed correctly

**Note**: CoWShed proxies enable gasless approvals and other advanced features via pre/post settlement hooks.

### Expected Output

Both tests should complete in **15-30 seconds** when the system is healthy. If orders stay in "open" status for more than 60 seconds, check:

1. **Baseline solver status**: The solver may need to be restarted
   ```bash
   docker restart playground-baseline-1
   ```

2. **Driver logs**: Check for solver errors
   ```bash
   docker logs playground-driver-1 --tail 50
   ```

3. **Token liquidity**: Ensure Uniswap pools have sufficient liquidity for the trading pair

### Troubleshooting Tests

**Orders not settling:**
- Restart the baseline solver (known issue with solver degradation)
- Check that services are running: `docker-compose -f docker-compose.offline.yml ps`
- Verify token approvals are set

**TypeScript errors:**
- Ensure dependencies are installed: `npm install`
- Check that TypeScript is properly configured: `npx tsc --version`

### Contract Addresses

All deployed contract addresses are stored in:
```
poc-offline-mode/config/addresses.json
```

Example:
```json
{
  "chainId": 31337,
  "tokens": {
    "WETH": "0x923F26D85D25C0AbB51d643F105DcA62b13374C2",
    "USDC": "0x78e24297cb4911956A3017dBa2d82463c9c01555",
    "DAI": "0xA3B4bb9A29a954C5236080C331E32fB4434e4229",
    "USDT": "0x52eEA99F47938350E5BaFEd3bEdcF886d116b061",
    "GNO": "0x869b46ffAAE323ff22d4a5A92e14141542693EbE"
  },
  "uniswap": {
    "factory": "0x75BB62D11fC5aA893827203D977e0931D269580D",
    "router": "0x2A444154BC6a6228FcA4225C939f650886655fED",
    "pairs": {
      "WETH_USDC": "0x95BB40fA565c47086A879738320f70b5536801bA",
      "WETH_DAI": "0xDF07533453d6e041B756001DfB5986E149D46E6c",
      "WETH_USDT": "0x06f0349F3684086715Fa21395795275383E29f89",
      "WETH_GNO": "0xb898217aB617B331BC584521131911A8ca7b24de",
      "USDC_DAI": "0x23946DA7ED86d371d3606409350a59b0874d640A",
      "USDC_USDT": "0x048683Aa87c603Ff55514BC5BA08f9D0Aaa1B6d5",
      "USDC_GNO": "0xE59c5a96C44355E3d075F89B414679Fac91B2efF",
      "DAI_USDT": "0x54185ff1C4442FcA50456bc4bd18A0e9A3669698",
      "DAI_GNO": "0x27746D7E586f0343ec8E428612F4470249EcFf8c",
      "USDT_GNO": "0x6389094E07770816FB940a68D86C93808Ce30D55"
    }
  },
  "cowProtocol": {
    "authenticator": "0xEe308BBdaafBd435312741ABed5883278Aa6a783",
    "settlement": "0x8c0332128D2B6a19e687Aa16DB9C779106028F6f",
    "vaultRelayer": "0x29b90c7D3fb8725061F089c7cAA1143783b55980",
    "balancerVault": "0xC06FA9877b907F58677EF3246D21760411FCFcFa",
    "hooksTrampoline": "0x20DDAbae0B223E0e9d6287c719Fc472E76d18eA5"
  },
  "auxiliary": {
    "tradeSimulator": "0xe5e977b8f1699433f05e8E18a20806Bce2a0Fcc0",
    "signatures": "0xA6BB44Ec3C9D05aeDC4c534B63bC7811D4B94eeC"
  },
  "cowShed": {
    "factory": "0xDb086A44b9db2650e9e3c1F21Fc7ba6B7d4B6681",
    "implementation": "0xCeEEA420F4DaE4E0405F0E218B8da6114D01ddE3"
  }
}

```

## Building Contracts from Source

If you need to rebuild contracts (for example, after modifying sources), use the Foundry profiles:

### Profile Overview

The project uses three Foundry profiles to handle different Solidity versions:

| Profile | Solidity Version | Contracts | Output Directory |
|---------|------------------|-----------|------------------|
| `default` | 0.8.26 | Custom contracts (tokens, mocks) | `contracts/out` |
| `uniswap-v2` | 0.5.16 | Uniswap V2 Core (Factory, Pair) | `contracts/out-uniswap-v2` |
| `uniswap-v2-periphery` | 0.6.6 | Uniswap V2 Router | `contracts/out-uniswap-v2-periphery` |
| `cow-protocol` | 0.7.6 | CoW Protocol contracts | `contracts/out-cow-protocol` |

### Building Specific Contracts

From the `poc-offline-mode` directory:

```bash
# Build custom contracts (default profile)
forge build

# Build Uniswap V2 Core (Factory, Pair)
forge build --profile uniswap-v2

# Build Uniswap V2 Router
forge build --profile uniswap-v2-periphery

# Build CoW Protocol contracts
forge build --profile cow-protocol
```

### Build All Contracts

To rebuild everything:

```bash
forge build && \
forge build --profile uniswap-v2 && \
forge build --profile uniswap-v2-periphery && \
forge build --profile cow-protocol
```

## Deploying from Scratch

If you want to deploy everything from scratch (instead of loading the existing state):

1. **Delete the existing state**:
   ```bash
   rm poc-offline-mode/state/poc-state.json
   ```

2. **Start Anvil and services**:
   ```bash
   docker-compose -f docker-compose.offline.yml up -d chain
   ```

3. **Run the deployment script**:
   ```bash
   cd poc-offline-mode
   ./scripts/deploy-all.sh
   ```

   This will deploy:
   - Step 1: Tokens (WETH, USDC, DAI)
   - Step 2: Uniswap V2 (Factory, Router)
   - Step 3: Mock Balancer Vault
   - Step 4: CoW Protocol (Settlement, VaultRelayer, Authenticator)
   - Step 5: Uniswap V2 Pairs with liquidity
   - Step 6: Save addresses to `config/addresses.json`

4. **Start the remaining services**:
   ```bash
   docker-compose -f docker-compose.offline.yml up -d
   ```

## Configuration Files

### Docker Configuration

- **`docker-compose.offline.yml`**: Defines all services (chain, database, orderbook, autopilot, driver, baseline solver)
- **`.env.offline`**: Environment variables for services

### Solver Configuration

- **`configs/offline/driver.toml`**: Driver configuration for offline mode
  - Chain ID: 31337
  - Settlement contract address
  - Gas estimation settings

### Blockchain State

- **`state/poc-state.json`**: Persistent Anvil blockchain state
  - Contains all deployed contracts
  - Pre-seeded liquidity pools
  - Can be loaded/dumped by Anvil

## Architecture

```
┌─────────────────┐
│  Anvil (31337)  │  ← Local blockchain with persistent state
└────────┬────────┘
         │
    ┌────┴─────────────────────────────────┐
    │                                       │
┌───▼────────┐                    ┌────────▼──────┐
│   Tokens   │                    │  DEX Contracts │
│ WETH, USDC │                    │   Uniswap V2   │
│    DAI     │                    │  (with pools)  │
└────────────┘                    └────────────────┘
                                           │
         ┌─────────────────────────────────┤
         │                                 │
    ┌────▼──────────┐          ┌──────────▼──────┐
    │  CoW Protocol │          │ Balancer Vault  │
    │   Settlement  │◄─────────│     (Mock)      │
    │ VaultRelayer  │          └─────────────────┘
    └───────┬───────┘
            │
    ┌───────┴──────────────────────────────┐
    │                                       │
┌───▼─────┐  ┌──────────┐  ┌──────┐  ┌────▼────┐
│Orderbook│  │Autopilot │  │Driver│  │Baseline │
│   API   │  │          │  │      │  │ Solver  │
└─────────┘  └──────────┘  └──────┘  └─────────┘
```

## Troubleshooting

### Services not starting

Check Docker logs:
```bash
docker-compose -f docker-compose.offline.yml logs -f [service_name]
```

Services: `chain`, `orderbook`, `autopilot`, `driver`, `baseline`

### Orders not settling

1. Check if services are running:
   ```bash
   docker-compose -f docker-compose.offline.yml ps
   ```

2. Check driver logs for errors:
   ```bash
   docker-compose -f docker-compose.offline.yml logs driver --tail=50
   ```

3. Verify token approvals are set for VaultRelayer

### Reset everything

```bash
# Stop all services
docker-compose -f docker-compose.offline.yml down -v

# Remove state (optional - will require redeployment)
rm poc-offline-mode/state/poc-state.json

# Start fresh
docker-compose -f docker-compose.offline.yml up -d
```

## Development Workflow

1. **Make code changes** to contracts or services
2. **Rebuild contracts** using appropriate Foundry profile
3. **Redeploy** using `scripts/deploy-all.sh` (or keep existing state)
4. **Restart services**: `docker-compose -f docker-compose.offline.yml restart`
5. **Test changes** using `test_playground_offline_cow.sh`

## Learn More

- [CoW Protocol Documentation](https://docs.cow.fi/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Grant Application](grant_application-by-hand.md) - Full project roadmap and architecture

## License

This project is part of the CoW Protocol ecosystem and follows the same open-source licensing.
