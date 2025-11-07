#!/bin/bash
echo "Starting Hardhat local node..."
echo "RPC URL: http://127.0.0.1:8545"
echo "Chain ID: 31337"
echo ""
echo "Press Ctrl+C to stop the node"
echo ""

npx hardhat node --hostname 127.0.0.1 --port 8545
