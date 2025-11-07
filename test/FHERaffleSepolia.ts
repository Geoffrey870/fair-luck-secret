import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { FHERaffle } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("FHERaffleSepolia", function () {
  let signers: Signers;
  let fheRaffleContract: FHERaffle;
  let fheRaffleContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const FHERaffleDeployment = await deployments.get("FHERaffle");
      fheRaffleContractAddress = FHERaffleDeployment.address;
      fheRaffleContract = await ethers.getContractAt("FHERaffle", FHERaffleDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should create a raffle on Sepolia", async function () {
    steps = 8;
    this.timeout(4 * 40000);

    const prizeAmount = 5 * 1e18;
    const entryFee = 0.1 * 1e18;

    progress("Encrypting prize amount...");
    const encryptedPrize = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(prizeAmount / 1e12))
      .encrypt();

    progress("Encrypting entry fee...");
    const encryptedEntryFee = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.alice.address)
      .add32(Math.floor(entryFee / 1e12))
      .encrypt();

    progress(`Creating raffle on contract ${fheRaffleContractAddress}...`);
    const tx = await fheRaffleContract
      .connect(signers.alice)
      .createRaffle(
        "Sepolia Test Raffle",
        "A test raffle on Sepolia",
        encryptedPrize.handles[0],
        encryptedEntryFee.handles[0],
        10,
        24,
        encryptedPrize.inputProof
      );
    await tx.wait();

    progress("Fetching raffle metadata...");
    const meta = await fheRaffleContract.getRaffleMeta(0);
    progress(`Raffle created: ${meta.title}`);

    expect(meta.title).to.eq("Sepolia Test Raffle");
    expect(meta.creator).to.eq(signers.alice.address);
    expect(meta.isActive).to.eq(true);
  });

  it("should allow entry into raffle on Sepolia", async function () {
    steps = 10;
    this.timeout(4 * 40000);

    // Assume raffle 0 exists from previous test
    progress("Checking raffle exists...");
    const raffleCount = await fheRaffleContract.getRaffleCount();
    expect(raffleCount).to.be.gt(0);

    const entryAmount = 0.15 * 1e18;
    progress("Encrypting entry amount...");
    const encryptedAmount = await fhevm
      .createEncryptedInput(fheRaffleContractAddress, signers.bob.address)
      .add32(Math.floor(entryAmount / 1e12))
      .encrypt();

    progress(`Submitting entry to raffle 0...`);
    const tx = await fheRaffleContract
      .connect(signers.bob)
      .enterRaffle(0, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    progress("Checking entry was recorded...");
    const meta = await fheRaffleContract.getRaffleMeta(0);
    progress(`Current entries: ${meta.currentEntries}`);

    const hasEntered = await fheRaffleContract.hasEntered(0, signers.bob.address);
    expect(hasEntered).to.eq(true);
  });
});

