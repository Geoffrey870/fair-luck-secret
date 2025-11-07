import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHERaffle, FHERaffle__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHERaffle")) as FHERaffle__factory;
  const fheRaffleContract = (await factory.deploy()) as FHERaffle;
  const fheRaffleContractAddress = await fheRaffleContract.getAddress();

  return { fheRaffleContract, fheRaffleContractAddress };
}

describe("FHERaffle", function () {
  let signers: Signers;
  let fheRaffleContract: FHERaffle;
  let fheRaffleContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheRaffleContract, fheRaffleContractAddress } = await deployFixture());
  });

  it("should create a raffle with encrypted values", async function () {
    const prizeAmount = 5 * 1e18; // 5 ETH in wei
    const entryFee = 0.1 * 1e18; // 0.1 ETH in wei
    const maxEntries = 10;
    const durationHours = 24;

    // Encrypt prize amount
    const encryptedPrize = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(prizeAmount / 1e12)) // Scale down for euint32
      .encrypt();

    // Encrypt entry fee
    const encryptedEntryFee = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(entryFee / 1e12)) // Scale down for euint32
      .encrypt();

    const tx = await fheRaffleContract
      .connect(signers.alice)
      .createRaffle(
        "Test Raffle",
        "A test raffle",
        encryptedPrize.handles[0],
        encryptedEntryFee.handles[0],
        maxEntries,
        durationHours,
        encryptedPrize.inputProof
      );
    await tx.wait();

    const meta = await fheRaffleContract.getRaffleMeta(0);
    expect(meta.title).to.eq("Test Raffle");
    expect(meta.creator).to.eq(signers.alice.address);
    expect(meta.maxEntries).to.eq(maxEntries);
    expect(meta.isActive).to.eq(true);
  });

  it("should allow users to enter a raffle with encrypted amount", async function () {
    // First create a raffle
    const prizeAmount = 5 * 1e18;
    const entryFee = 0.1 * 1e18;

    const encryptedPrize = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(prizeAmount / 1e12))
      .encrypt();

    const encryptedEntryFee = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(entryFee / 1e12))
      .encrypt();

    await fheRaffleContract
      .connect(signers.alice)
      .createRaffle(
        "Test Raffle",
        "A test raffle",
        encryptedPrize.handles[0],
        encryptedEntryFee.handles[0],
        10,
        24,
        encryptedPrize.inputProof
      );

    // Bob enters the raffle
    const bobEntryAmount = 0.15 * 1e18;
    const encryptedBobAmount = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.bob.address)
      .add32(Math.floor(bobEntryAmount / 1e12))
      .encrypt();

    const tx = await fheRaffleContract
      .connect(signers.bob)
      .enterRaffle(0, encryptedBobAmount.handles[0], encryptedBobAmount.inputProof);
    await tx.wait();

    const meta = await fheRaffleContract.getRaffleMeta(0);
    expect(meta.currentEntries).to.eq(1);

    const hasEntered = await fheRaffleContract.hasEntered(0, signers.bob.address);
    expect(hasEntered).to.eq(true);
  });

  it("should prevent duplicate entries", async function () {
    // Create raffle
    const prizeAmount = 5 * 1e18;
    const entryFee = 0.1 * 1e18;

    const encryptedPrize = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(prizeAmount / 1e12))
      .encrypt();

    const encryptedEntryFee = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(entryFee / 1e12))
      .encrypt();

    await fheRaffleContract
      .connect(signers.alice)
      .createRaffle(
        "Test Raffle",
        "A test raffle",
        encryptedPrize.handles[0],
        encryptedEntryFee.handles[0],
        10,
        24,
        encryptedPrize.inputProof
      );

    // Bob enters first time
    const bobEntryAmount = 0.15 * 1e18;
    const encryptedBobAmount = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.bob.address)
      .add32(Math.floor(bobEntryAmount / 1e12))
      .encrypt();

    await fheRaffleContract
      .connect(signers.bob)
      .enterRaffle(0, encryptedBobAmount.handles[0], encryptedBobAmount.inputProof);

    // Bob tries to enter again - should fail
    await expect(
      fheRaffleContract
        .connect(signers.bob)
        .enterRaffle(0, encryptedBobAmount.handles[0], encryptedBobAmount.inputProof)
    ).to.be.revertedWith("Already entered");
  });

  it("should allow creator to draw winner after expiration", async function () {
    // Create raffle with short duration
    const prizeAmount = 5 * 1e18;
    const entryFee = 0.1 * 1e18;

    const encryptedPrize = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(prizeAmount / 1e12))
      .encrypt();

    const encryptedEntryFee = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(entryFee / 1e12))
      .encrypt();

    await fheRaffleContract
      .connect(signers.alice)
      .createRaffle(
        "Test Raffle",
        "A test raffle",
        encryptedPrize.handles[0],
        encryptedEntryFee.handles[0],
        10,
        1, // 1 hour duration
        encryptedPrize.inputProof
      );

    // Add entries
    const bobEntryAmount = 0.15 * 1e18;
    const encryptedBobAmount = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.bob.address)
      .add32(Math.floor(bobEntryAmount / 1e12))
      .encrypt();

    await fheRaffleContract
      .connect(signers.bob)
      .enterRaffle(0, encryptedBobAmount.handles[0], encryptedBobAmount.inputProof);

    const charlieEntryAmount = 0.2 * 1e18;
    const encryptedCharlieAmount = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.charlie.address)
      .add32(Math.floor(charlieEntryAmount / 1e12))
      .encrypt();

    await fheRaffleContract
      .connect(signers.charlie)
      .enterRaffle(0, encryptedCharlieAmount.handles[0], encryptedCharlieAmount.inputProof);

    // Fast forward time (in mock environment)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Draw winner
    const tx = await fheRaffleContract.connect(signers.alice).drawWinner(0);
    await tx.wait();

    const meta = await fheRaffleContract.getRaffleMeta(0);
    expect(meta.isDrawn).to.eq(true);
    expect(meta.isActive).to.eq(false);
    expect(meta.winner).to.be.oneOf([signers.bob.address, signers.charlie.address]);
  });
});

