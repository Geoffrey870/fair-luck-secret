#!/bin/bash
echo "Starting Hardhat local node..."
echo "RPC URL: http://127.0.0.1:8545"
echo "Chain ID: 31337"
echo ""
echo "Available accounts:"
echo "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)"
echo "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)"
echo "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)"
echo ""
echo "Press Ctrl+C to stop the node"
echo ""

npx hardhat node --hostname 127.0.0.1 --port 8545 --show-accounts
