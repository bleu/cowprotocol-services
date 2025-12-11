#!/bin/bash
set -e  # Exit immediately if any command fails
set -o pipefail  # Catch errors in pipes

STATE_FILE="/state/anvil-state.json"
DEPLOYMENT_COMPLETE_FLAG="/tmp/deployment-complete"
ENV_FILE="/playground/.env.offline"

# Cleanup function to kill Anvil on error
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "❌ Script failed with exit code $exit_code"
        if [ ! -z "$ANVIL_PID" ]; then
            echo "🛑 Killing Anvil process $ANVIL_PID..."
            kill $ANVIL_PID 2>/dev/null || true
        fi
    fi
}
trap cleanup EXIT

echo "🔍 Chain Deployer: Checking for existing state..."

if [ -f "$STATE_FILE" ]; then
    echo "✅ State file found at $STATE_FILE"

    # Restore .env.offline from backup if it exists
    ENV_BACKUP="/state/.env.offline.backup"
    if [ -f "$ENV_BACKUP" ]; then
        echo "📝 Restoring .env.offline from backup..."
        cp "$ENV_BACKUP" "$ENV_FILE"
    else
        echo "⚠️  Warning: No .env.offline backup found in state directory"
    fi

    echo "🎉 Chain deployer is healthy - state already exists"
    touch "$DEPLOYMENT_COMPLETE_FLAG"
    exit 0
fi

echo "⚠️  No state file found. Starting deployment process..."

# Install Node.js 18.x (LTS) and npm
echo "📦 Installing Node.js 18.x and npm..."
apt-get update -qq
apt-get install -y -qq curl
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y -qq nodejs
node --version
npm --version

# Install dependencies
echo "📦 Installing npm dependencies..."
cd /workspace
if ! npm install --legacy-peer-deps; then
    echo "❌ Failed to install npm dependencies"
    exit 1
fi

# Start Anvil in the background with --dump-state flag
echo "🚀 Starting temporary Anvil instance..."
anvil \
    --host 0.0.0.0 \
    --port 8545 \
    --chain-id 31337 \
    --block-time 1 \
    --gas-limit 30000000 \
    --code-size-limit 50000 \
    --accounts 10 \
    --dump-state "$STATE_FILE" &

ANVIL_PID=$!
echo "📝 Anvil PID: $ANVIL_PID"

# Wait for Anvil to be ready
echo "⏳ Waiting for Anvil to be ready..."
for i in {1..30}; do
    if cast rpc eth_blockNumber --rpc-url http://127.0.0.1:8545 > /dev/null 2>&1; then
        echo "✅ Anvil is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Timeout waiting for Anvil to start"
        kill $ANVIL_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Run deployment
echo "🚀 Running deployment script..."
if ! npm run deploy:ts 2>&1 | tee /tmp/deployment.log; then
    echo "❌ Deployment script failed!"
    exit 1
fi

echo "✅ Deployment completed successfully!"

# Kill Anvil gracefully so it dumps the state
echo "🛑 Stopping Anvil (this will automatically dump state)..."
echo "📝 Sending SIGTERM to Anvil PID $ANVIL_PID..."
kill -TERM $ANVIL_PID 2>/dev/null || true

echo "⏳ Waiting for Anvil to finish dumping state..."
sleep 3

# Check if process is still running
if ps -p $ANVIL_PID > /dev/null 2>&1; then
    echo "⚠️  Anvil still running, sending SIGKILL..."
    kill -9 $ANVIL_PID 2>/dev/null || true
fi

wait $ANVIL_PID 2>/dev/null || true

# Debug: Check if file exists and list directory
echo "🔍 Checking for state file at $STATE_FILE..."
ls -la /state/ || echo "❌ /state directory not accessible"

# Verify state file was created
if [ ! -f "$STATE_FILE" ]; then
    echo "❌ State file was not created at $STATE_FILE"
    exit 1
fi

echo "✅ State saved to $STATE_FILE ($(stat -f%z "$STATE_FILE" 2>/dev/null || stat -c%s "$STATE_FILE" 2>/dev/null) bytes)"

echo "🎉 Chain deployer completed successfully!"
touch "$DEPLOYMENT_COMPLETE_FLAG"
