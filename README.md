# FHE Raffle - Encrypted On-Chain Raffle System

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://fair-luck-secret.vercel.app/) [![Demo Video](https://img.shields.io/badge/Demo-Video-blue)](https://github.com/Geoffrey870/fair-luck-secret/blob/main/fair-luck-secret.mov)

A decentralized raffle system built with Fully Homomorphic Encryption (FHE) that ensures complete privacy of entry amounts until the draw is completed. Entry amounts remain encrypted throughout the raffle process and can only be decrypted by the participants themselves.

## 🌐 Live Demo

**Try it now:** **[fair-luck-secret.vercel.app](https://fair-luck-secret.vercel.app/)**

The live demo is deployed on Vercel and connected to Sepolia testnet. You can:
- Create raffles with encrypted entry amounts
- Enter raffles using MetaMask or Rainbow wallet
- Decrypt your entry amounts using FHE
- Experience complete privacy protection

## 🎥 Demo Video

Watch the full demo: **[fair-luck-secret.mov](https://github.com/Geoffrey870/fair-luck-secret/blob/main/fair-luck-secret.mov)** (11MB)

The video demonstrates:
- Creating encrypted raffles with public prize amounts and entry fees
- Entering raffles with encrypted entry amounts
- Decrypting personal entry amounts using FHE
- Complete privacy protection of betting amounts

## ✨ Features

- **🔐 Fully Homomorphic Encryption**: Entry amounts are encrypted using FHE and remain private until manually decrypted
- **🎯 Public Raffle Parameters**: Prize amounts and entry fees are public, only entry amounts are encrypted
- **🏆 Decentralized Winner Selection**: Trustless winner selection using blockchain randomness
- **👛 Rainbow Wallet Integration**: Seamless wallet connection using RainbowKit
- **📱 Modern UI**: Beautiful React interface with shadcn/ui components
- **⛓️ Multi-Network Support**: Works on Hardhat local network and Sepolia testnet

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity ^0.8.24**
- **FHEVM (Zama)**: Fully Homomorphic Encryption Virtual Machine
- **@fhevm/solidity**: FHE types and operations
- **SepoliaConfig**: FHE configuration for testnet
- **Hardhat**: Development environment and deployment

### Frontend
- **React 18 + TypeScript**: Modern frontend framework
- **Vite**: Fast build tool and dev server
- **RainbowKit + Wagmi**: Wallet connection and blockchain interaction
- **@zama-fhe/relayer-sdk**: FHE encryption/decryption client
- **shadcn/ui + Tailwind CSS**: Beautiful UI components
- **React Router**: Client-side routing

## 🔐 FHE Encryption & Decryption Logic

### Smart Contract Design

The contract uses a hybrid approach: **public raffle parameters** + **encrypted entry amounts**.

#### Data Structures
```solidity
struct Raffle {
    address creator;
    string title;
    string description;
    uint256 prizeAmount;    // PUBLIC: Prize amount in wei
    uint256 entryFee;       // PUBLIC: Entry fee in wei
    uint32 maxEntries;
    uint64 expireAt;
    uint32 currentEntries;
    bool isActive;
    bool isDrawn;
    address winner;
    uint64 createdAt;
}

struct Entry {
    address participant;
    euint32 amount;          // ENCRYPTED: Entry amount using FHE
    uint64 createdAt;
}
```

#### Key Functions

**Creating Raffles:**
```solidity
function createRaffle(
    string calldata title,
    string calldata description,
    uint256 prizeAmount,      // Public parameter
    uint256 entryFee,         // Public parameter
    uint32 maxEntries,
    uint32 durationHours
) external
```

**Entering Raffles:**
```solidity
function enterRaffle(
    uint256 raffleId,
    externalEuint32 encAmount,  // Encrypted entry amount
    bytes calldata inputProof   // Zama FHE proof
) external
```

**Retrieving Encrypted Data:**
```solidity
function getEntry(uint256 raffleId, uint256 entryIndex)
    external view
    returns (euint32 encAmount, address participant, uint64 createdAt)
```

### Frontend Encryption Flow

#### 1. Creating Encrypted Input
```typescript
// Initialize FHE instance
const zamaInstance = await createInstance(SepoliaConfig);

// Create encrypted input for raffle entry
const input = zamaInstance.createEncryptedInput(contractAddress, userAddress);
input.add32(entryAmount);  // Add entry amount as 32-bit encrypted value

// Encrypt and get proof
const encryptedInput = await input.encrypt();

// Submit to contract
await contract.enterRaffle(raffleId, encryptedInput.handles[0], encryptedInput.inputProof);
```

#### 2. Decrypting Entry Amounts

**Step 1: Generate Keypair**
```typescript
const keypair = zamaInstance.generateKeypair();
```

**Step 2: Create EIP712 Signature**
```typescript
const eip712 = zamaInstance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  Math.floor(Date.now() / 1000),
  "10"  // Duration in days
);

// Sign with wallet
const signature = await walletClient.signTypedData({
  domain: eip712.domain,
  types: eip712.types,
  primaryType: 'UserDecryptRequestVerification',
  message: eip712.message
});
```

**Step 3: Format FHE Handle**
```typescript
// Convert contract's bigint to 32-byte hex handle
let handleHex = encryptedAmount.toString(16);
handleHex = handleHex.padStart(64, '0');  // Ensure 64 characters
const handle = '0x' + handleHex;
```

**Step 4: Execute Decryption**
```typescript
const result = await zamaInstance.userDecrypt(
  [{
    handle: handle,
    contractAddress: contractAddress
  }],
  keypair.privateKey,
  keypair.publicKey,
  signature.replace("0x", ""),
  [contractAddress],
  userAddress,
  startTimeStamp,
  durationDays
);

// Extract decrypted value
const decryptedAmount = result[handle];  // bigint
const amountInEth = Number(decryptedAmount) / 1e18;
```

### Privacy Model

- **Public Information**: Raffle title, description, prize amount, entry fee, participant addresses
- **Encrypted Information**: Individual entry amounts (only decryptable by the participant)
- **Access Control**: Participants can only decrypt their own entry amounts
- **Zero-Knowledge**: No one (including contract owner) can see entry amounts without decryption permission

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

## 📋 Smart Contract API

### Core Functions

#### `createRaffle(string title, string description, uint256 prizeAmount, uint256 entryFee, uint32 maxEntries, uint32 durationHours)`
Creates a new raffle with public prize amount and entry fee.
- **Parameters**:
  - `title`: Raffle title
  - `description`: Raffle description
  - `prizeAmount`: Prize amount in wei (public)
  - `entryFee`: Entry fee in wei (public)
  - `maxEntries`: Maximum number of participants
  - `durationHours`: Raffle duration in hours

#### `enterRaffle(uint256 raffleId, externalEuint32 encAmount, bytes inputProof)`
Enter a raffle with an encrypted entry amount.
- **Parameters**:
  - `raffleId`: ID of the raffle to enter
  - `encAmount`: Encrypted entry amount (FHE)
  - `inputProof`: Zama FHE proof for encryption verification

#### `drawWinner(uint256 raffleId)`
Draw the winner using blockchain randomness (only creator can call after expiration).

### View Functions

#### `getRaffleCount() → uint256`
Returns total number of raffles created.

#### `getRaffleMeta(uint256 raffleId) → (address creator, string title, string description, uint256 prizeAmount, uint256 entryFee, uint32 maxEntries, uint32 currentEntries, uint64 expireAt, bool isActive, bool isDrawn, address winner, uint64 createdAt)`
Returns complete raffle metadata including public prize amount and entry fee.

#### `getEntryCount(uint256 raffleId) → uint256`
Returns number of entries for a specific raffle.

#### `getEntry(uint256 raffleId, uint256 entryIndex) → (euint32 encAmount, address participant, uint64 createdAt)`
Returns encrypted entry data for a specific entry.

#### `hasEntered(uint256 raffleId, address participant) → bool`
Checks if an address has entered a specific raffle.

### Public vs Private Data

| Data Type | Visibility | Storage |
|-----------|------------|---------|
| Raffle Title/Description | Public | Plaintext |
| Prize Amount | Public | Plaintext (uint256) |
| Entry Fee | Public | Plaintext (uint256) |
| Participant Addresses | Public | Plaintext |
| Entry Amounts | Private | FHE Encrypted (euint32) |
| Winner Selection | Trustless | Blockchain Randomness |

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
