// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHERaffle - Encrypted Raffle System with FHE
/// @notice A raffle system where entry amounts are encrypted using FHE until the draw
/// @dev Entry amounts are stored as encrypted euint32 values
contract FHERaffle is SepoliaConfig {
    struct Raffle {
        address creator;
        string title;
        string description;
        euint32 prizeAmount; // Encrypted prize amount (in wei, scaled by 1e18)
        euint32 entryFee; // Encrypted entry fee (in wei, scaled by 1e18)
        uint32 maxEntries;
        uint64 expireAt; // Unix timestamp
        uint32 currentEntries;
        bool isActive;
        bool isDrawn;
        address winner;
        uint64 createdAt;
    }

    struct Entry {
        address participant;
        euint32 amount; // Encrypted entry amount
        uint64 createdAt;
    }

    Raffle[] private _raffles;
    mapping(uint256 => Entry[]) private _entries; // raffleId => entries
    mapping(uint256 => mapping(address => bool)) private _hasEntered; // raffleId => address => hasEntered

    event RaffleCreated(
        uint256 indexed raffleId,
        address indexed creator,
        string title,
        uint64 createdAt
    );
    event EntrySubmitted(
        uint256 indexed raffleId,
        address indexed participant,
        uint64 createdAt
    );
    event RaffleDrawn(
        uint256 indexed raffleId,
        address indexed winner,
        uint64 drawnAt
    );

    /// @notice Create a new raffle
    /// @param title The title of the raffle
    /// @param description The description of the raffle
    /// @param encPrizeAmount Encrypted prize amount (external handle)
    /// @param encEntryFee Encrypted entry fee (external handle)
    /// @param maxEntries Maximum number of entries allowed
    /// @param durationHours Duration in hours until raffle expires
    /// @param inputProof The Zama input proof for encrypted values
    function createRaffle(
        string calldata title,
        string calldata description,
        externalEuint32 encPrizeAmount,
        externalEuint32 encEntryFee,
        uint32 maxEntries,
        uint32 durationHours,
        bytes calldata inputProof
    ) external {
        require(maxEntries >= 2, "Max entries must be at least 2");
        require(durationHours > 0, "Duration must be positive");

        euint32 prizeAmount = FHE.fromExternal(encPrizeAmount, inputProof);
        euint32 entryFee = FHE.fromExternal(encEntryFee, inputProof);

        Raffle memory raffle;
        raffle.creator = msg.sender;
        raffle.title = title;
        raffle.description = description;
        raffle.prizeAmount = prizeAmount;
        raffle.entryFee = entryFee;
        raffle.maxEntries = maxEntries;
        raffle.expireAt = uint64(block.timestamp + (durationHours * 3600));
        raffle.currentEntries = 0;
        raffle.isActive = true;
        raffle.isDrawn = false;
        raffle.createdAt = uint64(block.timestamp);

        uint256 raffleId = _raffles.length;
        _raffles.push(raffle);

        // ACL: allow contract and creator to access encrypted values
        FHE.allowThis(_raffles[raffleId].prizeAmount);
        FHE.allow(_raffles[raffleId].prizeAmount, msg.sender);
        FHE.allowThis(_raffles[raffleId].entryFee);
        FHE.allow(_raffles[raffleId].entryFee, msg.sender);

        emit RaffleCreated(raffleId, msg.sender, title, raffle.createdAt);
    }

    /// @notice Enter a raffle with an encrypted amount
    /// @param raffleId The ID of the raffle to enter
    /// @param encAmount Encrypted entry amount (external handle)
    /// @param inputProof The Zama input proof for encrypted amount
    function enterRaffle(
        uint256 raffleId,
        externalEuint32 encAmount,
        bytes calldata inputProof
    ) external {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        Raffle storage raffle = _raffles[raffleId];
        require(raffle.isActive, "Raffle is not active");
        require(block.timestamp < raffle.expireAt, "Raffle has expired");
        require(raffle.currentEntries < raffle.maxEntries, "Raffle is full");
        require(!_hasEntered[raffleId][msg.sender], "Already entered");

        euint32 amount = FHE.fromExternal(encAmount, inputProof);

        Entry memory entry;
        entry.participant = msg.sender;
        entry.amount = amount;
        entry.createdAt = uint64(block.timestamp);

        _entries[raffleId].push(entry);
        _hasEntered[raffleId][msg.sender] = true;
        raffle.currentEntries++;

        // ACL: allow contract and participant to access encrypted amount
        FHE.allowThis(_entries[raffleId][_entries[raffleId].length - 1].amount);
        FHE.allow(_entries[raffleId][_entries[raffleId].length - 1].amount, msg.sender);

        emit EntrySubmitted(raffleId, msg.sender, entry.createdAt);
    }

    /// @notice Get the total number of raffles
    /// @return count The total number of raffles
    function getRaffleCount() external view returns (uint256 count) {
        return _raffles.length;
    }

    /// @notice Get raffle metadata
    /// @param raffleId The ID of the raffle
    /// @return creator Creator address
    /// @return title Title string
    /// @return description Description string
    /// @return maxEntries Maximum entries allowed
    /// @return currentEntries Current number of entries
    /// @return expireAt Expiration timestamp
    /// @return isActive Whether the raffle is active
    /// @return isDrawn Whether the raffle has been drawn
    /// @return winner Winner address (if drawn)
    /// @return createdAt Creation timestamp
    function getRaffleMeta(uint256 raffleId)
        external
        view
        returns (
            address creator,
            string memory title,
            string memory description,
            uint32 maxEntries,
            uint32 currentEntries,
            uint64 expireAt,
            bool isActive,
            bool isDrawn,
            address winner,
            uint64 createdAt
        )
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        Raffle storage raffle = _raffles[raffleId];
        return (
            raffle.creator,
            raffle.title,
            raffle.description,
            raffle.maxEntries,
            raffle.currentEntries,
            raffle.expireAt,
            raffle.isActive,
            raffle.isDrawn,
            raffle.winner,
            raffle.createdAt
        );
    }

    /// @notice Get encrypted prize amount for a raffle
    /// @param raffleId The ID of the raffle
    /// @return encPrizeAmount Encrypted prize amount
    function getEncryptedPrizeAmount(uint256 raffleId)
        external
        view
        returns (euint32 encPrizeAmount)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _raffles[raffleId].prizeAmount;
    }

    /// @notice Get encrypted entry fee for a raffle
    /// @param raffleId The ID of the raffle
    /// @return encEntryFee Encrypted entry fee
    function getEncryptedEntryFee(uint256 raffleId)
        external
        view
        returns (euint32 encEntryFee)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _raffles[raffleId].entryFee;
    }

    /// @notice Get the number of entries for a raffle
    /// @param raffleId The ID of the raffle
    /// @return count Number of entries
    function getEntryCount(uint256 raffleId)
        external
        view
        returns (uint256 count)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _entries[raffleId].length;
    }

    /// @notice Get encrypted entry amount for a specific entry
    /// @param raffleId The ID of the raffle
    /// @param entryIndex The index of the entry
    /// @return encAmount Encrypted entry amount
    /// @return participant Participant address
    /// @return createdAt Creation timestamp
    function getEntry(
        uint256 raffleId,
        uint256 entryIndex
    )
        external
        view
        returns (
            euint32 encAmount,
            address participant,
            uint64 createdAt
        )
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        require(entryIndex < _entries[raffleId].length, "Invalid entry index");
        Entry storage entry = _entries[raffleId][entryIndex];
        return (entry.amount, entry.participant, entry.createdAt);
    }

    /// @notice Check if an address has entered a raffle
    /// @param raffleId The ID of the raffle
    /// @param participant The address to check
    /// @return hasEntered Whether the address has entered
    function hasEntered(uint256 raffleId, address participant)
        external
        view
        returns (bool hasEntered)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _hasEntered[raffleId][participant];
    }

    /// @notice Draw the winner (only creator can call, after expiration)
    /// @param raffleId The ID of the raffle
    /// @dev This is a simplified version - in production, you'd use FHE comparison
    /// to find the entry with the highest amount. For MVP, we'll use a simple random selection.
    function drawWinner(uint256 raffleId) external {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        Raffle storage raffle = _raffles[raffleId];
        require(msg.sender == raffle.creator, "Only creator can draw");
        require(raffle.isActive, "Raffle is not active");
        require(block.timestamp >= raffle.expireAt, "Raffle has not expired");
        require(!raffle.isDrawn, "Winner already drawn");
        require(_entries[raffleId].length > 0, "No entries");

        // Simple random selection based on block data
        // In production, you'd use FHE comparison to find highest entry
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    raffleId
                )
            )
        ) % _entries[raffleId].length;

        raffle.winner = _entries[raffleId][randomIndex].participant;
        raffle.isDrawn = true;
        raffle.isActive = false;

        emit RaffleDrawn(raffleId, raffle.winner, uint64(block.timestamp));
    }
}

