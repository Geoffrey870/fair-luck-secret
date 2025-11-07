/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const FHERaffleABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "participant",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "createdAt",
          "type": "uint64"
        }
      ],
      "name": "EntrySubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "createdAt",
          "type": "uint64"
        }
      ],
      "name": "RaffleCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "drawnAt",
          "type": "uint64"
        }
      ],
      "name": "RaffleDrawn",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "prizeAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "entryFee",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "maxEntries",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "durationHours",
          "type": "uint32"
        }
      ],
      "name": "createRaffle",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        },
        {
          "internalType": "externalEuint32",
          "name": "encAmount",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "inputProof",
          "type": "bytes"
        }
      ],
      "name": "enterRaffle",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        }
      ],
      "name": "drawWinner",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRaffleCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        }
      ],
      "name": "getRaffleMeta",
      "outputs": [
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "prizeAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "entryFee",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "maxEntries",
          "type": "uint32"
        },
        {
          "internalType": "uint64",
          "name": "expireAt",
          "type": "uint64"
        },
        {
          "internalType": "uint32",
          "name": "currentEntries",
          "type": "uint32"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isDrawn",
          "type": "bool"
        },
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "internalType": "uint64",
          "name": "createdAt",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        }
      ],
      "name": "getEntryFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "entryIndex",
          "type": "uint256"
        }
      ],
      "name": "getEntry",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "encAmount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "participant",
          "type": "address"
        },
        {
          "internalType": "uint64",
          "name": "createdAt",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        }
      ],
      "name": "getPrizeAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "raffleId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "participant",
          "type": "address"
        }
      ],
      "name": "hasEntered",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
} as const;

