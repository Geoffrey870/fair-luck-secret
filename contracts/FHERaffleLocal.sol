// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FHERaffle - Local Development Version (No FHE)
/// @notice Simplified raffle system for local development without FHE encryption
/// @dev This version uses regular uint256 for entry amounts
/// @dev Use this contract on Hardhat local network (chainId 31337)
contract FHERaffleLocal {
    struct Raffle {
        address creator;
        string title;
        string description;
        uint256 prizeAmount; // Prize amount in wei (public)
        uint256 entryFee; // Entry fee in wei (public)
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
        uint256 amount; // Plain entry amount (not encrypted)
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
        uint256 amount, // Plain amount
        uint64 createdAt
    );
    event RaffleDrawn(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 totalEntryAmount, // Total entry amount
        uint64 drawnAt
    );

    /// @notice Create a new raffle
    function createRaffle(
        string calldata title,
        string calldata description,
        uint256 prizeAmount,
        uint256 entryFee,
        uint32 maxEntries,
        uint32 durationHours
    ) external {
        require(maxEntries >= 2, "Max entries must be at least 2");
        require(durationHours > 0, "Duration must be positive");
        require(prizeAmount > 0, "Prize amount must be positive");
        require(entryFee > 0, "Entry fee must be positive");

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

        emit RaffleCreated(raffleId, msg.sender, title, raffle.createdAt);
    }

    /// @notice Enter a raffle with a plain amount
    /// @param raffleId The ID of raffle to enter
    /// @param amount Entry amount in wei
    function enterRaffle(
        uint256 raffleId,
        uint256 amount
    ) external payable {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        Raffle storage raffle = _raffles[raffleId];
        require(raffle.isActive, "Raffle is not active");
        require(block.timestamp < raffle.expireAt, "Raffle has expired");
        require(raffle.currentEntries < raffle.maxEntries, "Raffle is full");
        require(!_hasEntered[raffleId][msg.sender], "Already entered");
        require(amount >= raffle.entryFee, "Entry amount must be >= entry fee");

        // Note: Since this is local dev, we accept plain amounts
        // No actual encryption needed for development

        Entry memory entry;
        entry.participant = msg.sender;
        entry.amount = amount;
        entry.createdAt = uint64(block.timestamp);

        _entries[raffleId].push(entry);
        _hasEntered[raffleId][msg.sender] = true;
        raffle.currentEntries++;

        emit EntrySubmitted(raffleId, msg.sender, amount, entry.createdAt);
    }

    /// @notice Get the total number of raffles
    function getRaffleCount() external view returns (uint256 count) {
        return _raffles.length;
    }

    /// @notice Get raffle metadata
    function getRaffleMeta(uint256 raffleId)
        external
        view
        returns (
            address creator,
            string memory title,
            string memory description,
            uint256 prizeAmount,
            uint256 entryFee,
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
            raffle.prizeAmount,
            raffle.entryFee,
            raffle.maxEntries,
            raffle.currentEntries,
            raffle.expireAt,
            raffle.isActive,
            raffle.isDrawn,
            raffle.winner,
            raffle.createdAt
        );
    }

    /// @notice Get prize amount for a raffle
    function getPrizeAmount(uint256 raffleId)
        external
        view
        returns (uint256 prizeAmount)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _raffles[raffleId].prizeAmount;
    }

    /// @notice Get entry fee for a raffle
    function getEntryFee(uint256 raffleId)
        external
        view
        returns (uint256 entryFee)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _raffles[raffleId].entryFee;
    }

    /// @notice Get the number of entries for a raffle
    function getEntryCount(uint256 raffleId)
        external
        view
        returns (uint256 count)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _entries[raffleId].length;
    }

    /// @notice Get plain entry amount for a specific entry
    function getEntry(
        uint256 raffleId,
        uint256 entryIndex
    )
        external
        view
        returns (
            uint256 amount, // Plain amount (not encrypted)
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
    function hasEntered(uint256 raffleId, address participant)
        external
        view
        returns (bool)
    {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        return _hasEntered[raffleId][participant];
    }

    /// @notice Draw winner (only creator can call, after expiration)
    function drawWinner(uint256 raffleId) external {
        require(raffleId < _raffles.length, "Invalid raffle ID");
        Raffle storage raffle = _raffles[raffleId];
        require(msg.sender == raffle.creator, "Only creator can draw");
        require(raffle.isActive, "Raffle is not active");
        require(block.timestamp >= raffle.expireAt, "Raffle has not expired");
        require(!raffle.isDrawn, "Winner already drawn");
        require(_entries[raffleId].length > 0, "No entries");

        // Find entry with highest amount (plain comparison in local dev)
        uint256 highestAmount = 0;
        uint256 winnerIndex = 0;
        address winnerAddress;

        for (uint256 i = 0; i < _entries[raffleId].length; i++) {
            Entry storage entry = _entries[raffleId][i];
            if (entry.amount > highestAmount) {
                highestAmount = entry.amount;
                winnerIndex = i;
                winnerAddress = entry.participant;
            }
        }

        raffle.winner = winnerAddress;
        raffle.isDrawn = true;
        raffle.isActive = false;

        emit RaffleDrawn(raffleId, winnerAddress, highestAmount, uint64(block.timestamp));
    }
}

