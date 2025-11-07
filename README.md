# FHE Raffle - Encrypted On-Chain Raffle System

A decentralized raffle system built with Fully Homomorphic Encryption (FHE) that ensures complete privacy of entry amounts until the draw is completed.

## Features

- **Encrypted Entry Amounts**: All entry amounts are encrypted using FHE, ensuring privacy
- **On-Chain Storage**: All raffle data is stored on the blockchain
- **Rainbow Wallet Integration**: Easy wallet connection using RainbowKit
- **Decentralized**: No central authority, fully trustless

## Tech Stack

### Smart Contracts
- Solidity ^0.8.24
- FHEVM (Zama)
- Hardhat

### Frontend
- React + TypeScript
- Vite
- RainbowKit + Wagmi
- shadcn-ui
- Tailwind CSS

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- Hardhat
- MetaMask or compatible wallet

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Geoffrey870/fair-luck-secret.git
cd fair-luck-secret
```

2. Install dependencies:
```bash
npm install
cd ui
npm install
```

## Development

### 1. Compile Contracts

```bash
npm run compile
```

This will generate TypeScript types in the `types/` directory.

### 2. Start Local Hardhat Node

In one terminal:
```bash
npx hardhat node
```

### 3. Deploy Contracts to Local Network

In another terminal:
```bash
npx hardhat deploy --network hardhat
```

Note the contract address from the deployment output and update `ui/src/config/contracts.ts` with:
```typescript
export const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_ADDRESS';
```

Or set it as an environment variable:
```bash
export VITE_CONTRACT_ADDRESS=YOUR_DEPLOYED_ADDRESS
```

### 4. Run Tests

Local tests (mock FHEVM):
```bash
npm test
```

Sepolia testnet tests:
```bash
npm run test:sepolia
```

### 5. Start Frontend

```bash
cd ui
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Contract Functions

### Create Raffle
- `createRaffle(title, description, encPrizeAmount, encEntryFee, maxEntries, durationHours, inputProof)`
- Creates a new raffle with encrypted prize amount and entry fee

### Enter Raffle
- `enterRaffle(raffleId, encAmount, inputProof)`
- Enter a raffle with an encrypted entry amount

### View Raffles
- `getRaffleCount()` - Get total number of raffles
- `getRaffleMeta(raffleId)` - Get raffle metadata
- `getEncryptedPrizeAmount(raffleId)` - Get encrypted prize amount
- `getEncryptedEntryFee(raffleId)` - Get encrypted entry fee
- `getEntryCount(raffleId)` - Get number of entries
- `hasEntered(raffleId, participant)` - Check if address has entered

### Draw Winner
- `drawWinner(raffleId)` - Draw the winner (only creator can call after expiration)

## Deployment

### Local Network
```bash
npx hardhat deploy --network hardhat
```

### Sepolia Testnet
1. Set up environment variables:
```bash
npx hardhat vars setup
```

2. Deploy:
```bash
npx hardhat deploy --network sepolia
```

3. Update frontend contract address in `ui/src/config/contracts.ts` or set `VITE_CONTRACT_ADDRESS` environment variable.

## Project Structure

```
fair-luck-secret/
├── contracts/          # Solidity smart contracts
│   └── FHERaffle.sol
├── test/              # Test files
│   ├── FHERaffle.ts
│   └── FHERaffleSepolia.ts
├── deploy/            # Deployment scripts
│   └── deploy.ts
├── ui/                # Frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── config/
│   │   └── lib/
│   └── public/
└── types/             # Generated TypeScript types
```

## Environment Variables

Create a `.env` file in the root directory:
```
MNEMONIC=your_mnemonic_phrase
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

For frontend, create `ui/.env`:
```
VITE_CONTRACT_ADDRESS=your_contract_address
```

## Testing

### Local Tests
Tests run against a mock FHEVM environment:
```bash
npm test
```

### Sepolia Tests
Tests run against Sepolia testnet (requires deployed contract):
```bash
npm run test:sepolia
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
# Test commit for Geoffrey870 configuration
