import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "FHERaffle";

// <root>/fair-luck-secret
const rel = "../..";

// <root>/fair-luck-secret/ui/abi
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/${dirname}${line}`
  );
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments/localhost");

function readDeployment(chainName, chainId, contractName, optional) {
  // For localhost, the deployment file is directly in deployments/localhost/
  const deploymentFile = path.join(deploymentsDir, `${contractName}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(
      `${line}Unable to locate '${deploymentFile}' file.\n\n1. Goto '${dirname}' directory\n2. Run 'npx hardhat deploy --network localhost'.${line}`
    );
    if (!optional) {
      console.error(`${line}Attempting auto-deployment...${line}`);
      try {
        execSync(`cd "${dir}" && npx hardhat deploy --network localhost`, { stdio: 'inherit' });
      } catch (e) {
        console.error(`${line}Auto-deployment failed: ${e.message}${line}`);
        process.exit(1);
      }
    } else {
      return undefined;
    }
  }

  const jsonString = fs.readFileSync(deploymentFile, "utf-8");
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;

  return obj;
}

// Localhost deployment (required)
const deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, false);

// Sepolia is optional
let deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true);
if (!deploySepolia) {
  deploySepolia = { 
    abi: deployLocalhost.abi, 
    address: "0x0000000000000000000000000000000000000000" 
  };
}

if (deployLocalhost && deploySepolia) {
  if (
    JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)
  ) {
    console.error(
      `${line}Deployments on localhost and Sepolia differ. Can't use the same abi on both networks. Consider re-deploying the contracts on both networks.${line}`
    );
    process.exit(1);
  }
}

const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: deployLocalhost.abi }, null, 2)} as const;
`;

const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = { 
  "11155111": { address: "${deploySepolia.address}", chainId: 11155111, chainName: "sepolia" },
  "31337": { address: "${deployLocalhost.address}", chainId: 31337, chainName: "hardhat" },
};
`;

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);

console.log("✅ ABI generation completed successfully!");

