import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deploy: DeployFunction<Record<string, never>> = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployer } = await hre.getNamedAccounts();
    
    console.log('Deploying FHERaffleLocal contract...');
    console.log('Deployer address:', deployer);

    // Deploy the local version contract (without FHE)
    const raffleContract = await hre.ethers.deployContract(
        'FHERaffleLocal',
        [],
        {}
    );

    await raffleContract.waitForDeployment();
    
    const address = await raffleContract.getAddress();
    console.log('FHERaffleLocal deployed to:', address);

    // Verify deployment
    if (await raffleContract.deploymentTransaction()?.wait()) {
        console.log('Deployment confirmed');
    }

    return {
        FHERaffleLocal: {
            address: address,
            deployer: deployer
        }
    };
};

export default deploy;

// Tags for hardhat-deploy
deploy.tags = ['all'];

