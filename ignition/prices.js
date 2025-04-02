const {ethers} = require("hardhat");

async function main() {
    // Localhost Addr
    const addr = "0x6037b610D229eb112605BdC6faAea7Cb51910b81";
    // Mainnet Addr
    // const addr = "0x424b4B1aBD18CbD3a5012C5988187e596Ab9E08B";

    const oracle = await ethers.getContractAt("PriceOracle", addr);

    const USDT = "0xF6f30F7b6845E019D4e8BAe87BC8715fd569e12C";
    const USDC = "0x6333A2f50EA1d8c37BdAB2b894D4a420117256FC";
    const WBTC = "0x1cb923B38308360D93f9438eE8be03437fD20EC5";
    const DYM = "0xc7870fbBE3e63E1F7b3F90C47C3e57E0C47a3580";

    // DYM-USDT
    // const priceResponse = await oracle.getPrice(DYM, USDT);
    const [cachePrice, cacheExpiration, cacheExists] = await oracle.prices_cache(WBTC, USDC);

    // console.log(priceResponse)

    // BTC-USDC
    // const [cachePrice, cacheExpiration, cacheExists] = await oracle.prices_cache(WBTC, USDC);
    const expOffset = await oracle.expirationOffsetSec();

    // console.log("Price Response: ", priceResponse);

    const currentTime = new Date(Date.now())
    const expirationTime = new Date(Number(cacheExpiration));

    console.log("Cache Exists: ", cacheExists);
    console.log("Cache Price : ", cachePrice);
    console.log("Cache Exp   : ", new Date(Number(cacheExpiration)));
    console.log("Current Time: ", new Date(Date.now()));
    console.log("Expiration Offset: ", expOffset);

    if (cacheExists && expirationTime > currentTime) {
        console.log("Price is still valid");
        const priceResponse = await oracle.getPrice(WBTC, USDC);
        console.log("Price Response: ", priceResponse);
    }
}

main().catch((error) => {
    console.error("Error in script execution:", error);
    process.exitCode = 1;
});
