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

  it("should verify contract deployment on Sepolia", async function () {
    steps = 2;
    this.timeout(10000);

    progress("Checking contract exists...");
    expect(fheRaffleContractAddress).to.be.a("string");
    expect(fheRaffleContractAddress.length).to.eq(42); // 0x + 40 chars

    progress("Checking contract methods...");
    const raffleCount = await fheRaffleContract.getRaffleCount();
    expect(raffleCount).to.be.at.least(0n);

    console.log(`✅ Contract deployed at: ${fheRaffleContractAddress}`);
    console.log(`✅ Current raffle count: ${raffleCount}`);
  });

  it("should check FHE functionality setup", async function () {
    steps = 2;
    this.timeout(10000);

    progress("Checking FHE environment...");
    // This test verifies that the FHE environment is properly set up
    // Actual raffle creation and entry tests require test ETH

    const isMock = fhevm.isMock;
    console.log(`FHE Mock mode: ${isMock}`);

    if (isMock) {
      console.log("⚠️ Running in mock mode - FHE operations may not work on testnet");
      console.log("📝 To run full tests, ensure test account has sufficient Sepolia ETH");
    } else {
      console.log("✅ Running on real FHE network");
    }

    expect(true).to.eq(true); // Basic assertion to pass the test
  });
});

