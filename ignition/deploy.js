// Import ethers from Hardhat
const { ethers } = require("hardhat");

async function main() {
    [ deployer ] = await ethers.getSigners();
    console.log("Deploying PriceOracle contract with the account:", deployer.address);

    const USDT = "0xF6f30F7b6845E019D4e8BAe87BC8715fd569e12C";
    const USDC = "0x6333A2f50EA1d8c37BdAB2b894D4a420117256FC";
    const WBTC = "0x1cb923B38308360D93f9438eE8be03437fD20EC5";
    const DYM = "0xc7870fbBE3e63E1F7b3F90C47C3e57E0C47a3580";

    const PriceOracle = await ethers.getContractFactory("PriceOracle", deployer);

    const expirationOffset = 3600; // 1 hour in seconds
    const assetInfos = [
        {
            localNetworkName: WBTC,
            oracleNetworkName: "WBTC",
            precision: 8,
        },
        {
            localNetworkName: USDC,
            oracleNetworkName: "USDC",
            precision: 6,
        },
        {
            localNetworkName: USDT,
            oracleNetworkName: "USDT",
            precision: 6,
        },
        {
            localNetworkName: DYM,
            oracleNetworkName: "DYM",
            precision: 18,
        },
    ];
    const boundThreshold = 10;
    const scaleFactor = 10n ** 18n;

    const deployOptions = {
        maxFeePerGas: ethers.parseUnits('30', 'gwei'), // Adjust as needed
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'), // Adjust as needed
    };

    try {
        const priceOracle = await PriceOracle.deploy(
            expirationOffset,
            assetInfos,
            boundThreshold,
            scaleFactor,
            deployOptions
        );

        await priceOracle.waitForDeployment();

        console.log("Price Oracle deployed at:", priceOracle.target);
    } catch (error) {
        console.error("Error during deployment:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });