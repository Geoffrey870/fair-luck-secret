import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHERaffle = await deploy("FHERaffle", {
    from: deployer,
    log: true,
  });

  console.log(`FHERaffle contract: `, deployedFHERaffle.address);
};
export default func;
func.id = "deploy_fheRaffle"; // id required to prevent reexecution
func.tags = ["FHERaffle"];
