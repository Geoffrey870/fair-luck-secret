import { ethers } from "hardhat";

async function main() {
  console.log("Testing Sepolia contract connection...");

  const contractAddress = "0xFfFC34216aCa5Ed8597AE3B1EEd884C19cfbD9FB";
  const FHERaffle = await ethers.getContractFactory("FHERaffle");
  const contract = FHERaffle.attach(contractAddress);

  console.log("Contract address:", contractAddress);

  try {
    // Test basic contract call
    const raffleCount = await contract.getRaffleCount();
    console.log("✅ Raffle count:", raffleCount.toString());

    // Test if we can call getEntry (if there are entries)
    if (raffleCount > 0) {
      console.log("Testing getEntry call...");
      try {
        // Try to get first entry of first raffle
        const entry = await contract.getEntry(0, 0);
        console.log("✅ Entry data retrieved:", {
          participant: entry.participant,
          createdAt: entry.createdAt.toString(),
          // encAmount is encrypted, we can't log it directly
        });
      } catch (entryError) {
        console.log("ℹ️ No entries found or entry retrieval failed:", entryError.message);
      }
    } else {
      console.log("ℹ️ No raffles found, skipping entry test");
    }

    console.log("✅ Sepolia contract connection test passed!");
  } catch (error) {
    console.error("❌ Contract connection test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
