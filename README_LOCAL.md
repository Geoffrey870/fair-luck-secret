# Start Local Development

## Prerequisites
- MetaMask browser extension installed
- Node.js and npm installed

## Step 1: Start Hardhat Local Node

In terminal 1, start the local Hardhat node:

```bash
cd /Users/nithon/Desktop/Zama/fair-luck-secret
./start-local.sh
```

Or manually:

```bash
npx hardhat node --hostname 127.0.0.1 --port 8545
```

The node will be available at:
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337

## Step 2: Configure MetaMask

1. Open MetaMask
2. Click on the network dropdown (usually shows 'Ethereum Mainnet')
3. Click 'Add Network'
4. Click 'Add a network manually'
5. Enter these details:
   - Network Name: Hardhat Local
   - New RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
   - Block Explorer URL: (leave empty)

## Step 3: Start Frontend

In terminal 2, start the frontend:

```bash
cd ui
npm run dev
```

Open http://localhost:5173 in your browser.

## Step 4: Connect Wallet

1. Click 'Connect Wallet' in the app
2. Select MetaMask
3. Select 'Hardhat Local' network if prompted
4. Approve the connection

## Troubleshooting

### If you get 'Failed to fetch' errors:
1. Make sure Hardhat node is running
2. Check MetaMask is connected to 'Hardhat Local' network
3. Refresh the browser page

### If contract calls fail:
1. Make sure contracts are deployed: `npx hardhat deploy --network localhost`
2. Check contract address in ui/abi/FHERaffleAddresses.ts
3. Restart the frontend after deployment

### If FHE operations fail:
1. FHE is mocked in local environment
2. Full FHE functionality requires Sepolia testnet
3. Switch to Sepolia network for complete FHE features
