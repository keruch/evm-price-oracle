import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PriceOracle", function () {
    // Reusable Constants
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const DEFAULT_PRICE_EXPIRY = 3600; // 1 hour
    const BTC_ERC20_ADDRESS = "0x1234567890123456789012345678901234567890";
    const USDC_ERC20_ADDRESS = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
    const USDT_ERC20_ADDRESS = "0xF6f30F7b6845E019D4e8BAe87BC8715fd569e12C";
    const DYM_ERC20_ADDRESS = "0xc7870fbBE3e63E1F7b3F90C47C3e57E0C47a3580";

    // Fixture to reuse the same setup in every test
    async function deployPriceOracleFixture(targetBlockNumber: number = 150) {
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const assetInfos = [
            {
                localNetworkName: BTC_ERC20_ADDRESS, // Token address
                oracleNetworkName: "btc",    // Corresponding token name in oracle
                precision: 8    // Decimal precision for the token
            },
            {
                localNetworkName: USDC_ERC20_ADDRESS,
                oracleNetworkName: "usdc",
                precision: 18
            },
            {
                localNetworkName: USDT_ERC20_ADDRESS,
                oracleNetworkName: "usdt",
                precision: 6
            },
            {
                localNetworkName: DYM_ERC20_ADDRESS,
                oracleNetworkName: "dym",
                precision: 18
            }
        ];

        const SCALE_FACTOR = 10n ** 18n;
    const THRESHOLD_PRICE_BOUND = 10;

        const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(DEFAULT_PRICE_EXPIRY, assetInfos, THRESHOLD_PRICE_BOUND, SCALE_FACTOR);

        // Mine additional blocks to reach the target block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        if (currentBlockNumber < targetBlockNumber) {
            const blocksToMine = targetBlockNumber - currentBlockNumber;
            for (let i = 0; i < blocksToMine; i++) {
                await hre.ethers.provider.send("evm_mine", []);
            }
        }

        return { priceOracle, owner, otherAccount };
    }

    // Helper function to initialize the contract
    async function initializePriceOracle(priceOracle: any) {
        await priceOracle.initialize();
        expect(await priceOracle.initialized()).to.equal(true);
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { priceOracle, owner } = await loadFixture(deployPriceOracleFixture);
            expect(await priceOracle.owner()).to.equal(owner.address);
        });
    });

    describe("Asset Info", function () {
        it("Should correctly map asset info", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const btcAssetInfo = await priceOracle.assetInfos(BTC_ERC20_ADDRESS);
            expect(btcAssetInfo.oracleNetworkName).to.equal("btc");
            expect(btcAssetInfo.precision).to.equal(8);

            const usdcAssetInfo = await priceOracle.assetInfos(USDC_ERC20_ADDRESS);
            expect(usdcAssetInfo.oracleNetworkName).to.equal("usdc");
            expect(usdcAssetInfo.precision).to.equal(18);
        });
    });

    describe("UpdatePrice", function () {
        it("Should reject expired prices", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const block = await hre.ethers.provider.getBlock("latest");
            const expiredPriceProof = {
                creationHeight: block!.number - 100,
                creationTimeUnixMs: block!.timestamp * 1000 - 2 * 60 * 60 * 1000,
                height: block!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const expirecPriceWithProof = {
                price: 1000,
                proof: expiredPriceProof,
            };

            await expect(
                priceOracle.updatePrice(
                    BTC_ERC20_ADDRESS,
                    USDC_ERC20_ADDRESS,
                    expirecPriceWithProof,
                )
            ).to.be.revertedWith("PriceOracle: price proof expired");
        });

        it("Should reject if update with an older price", async function() {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const block = await hre.ethers.provider.getBlock("latest");
            const priceProof = {
                creationHeight: block!.number,
                creationTimeUnixMs: block!.timestamp * 1000,
                height: block!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const priceWithProof = {
                price: 1000,
                proof: priceProof,
            };

            await expect(
                priceOracle.updatePrice(
                    BTC_ERC20_ADDRESS,
                    USDC_ERC20_ADDRESS,
                    priceWithProof,
                )
            ).not.to.be.revertedWith("PriceOracle: price proof expired");

            await hre.ethers.provider.send("evm_mine", []); // move one block

            const olderPriceProof = {
                creationHeight: block!.number - 1,
                creationTimeUnixMs: block!.timestamp * 1000 - 60 * 1000, // 1 minute ago
                height: block!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const olderPriceWithProof = {
                price: 1000,
                proof: olderPriceProof,
            };

            await expect(
                priceOracle.updatePrice(
                    BTC_ERC20_ADDRESS,
                    USDC_ERC20_ADDRESS,
                    olderPriceWithProof,
                )
            ).to.be.revertedWith("PriceOracle: cannot update with an older price");
        });

        it("Should reject when base token is not registered", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const block = await hre.ethers.provider.getBlock("latest");
            const priceProof = {
                creationHeight: block!.number,
                creationTimeUnixMs: block!.timestamp * 1000,
                height: block!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const priceWithProof = {
                price: 1000,
                proof: priceProof,
            };

            // Using an unregistered base token address
            const unregisteredAddress = "0x9999999999999999999999999999999999999999";

            await expect(
                priceOracle.updatePrice(
                    unregisteredAddress,
                    USDC_ERC20_ADDRESS,
                    priceWithProof
                )
            ).to.be.revertedWith("PriceOracle: base denom not registered in local_network_to_oracle_network_denoms");
        });

        it("Should reject when quote token is not registered", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const block = await hre.ethers.provider.getBlock("latest");
            const priceProof = {
                creationHeight: block!.number,
                creationTimeUnixMs: block!.timestamp * 1000,
                height: block!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const priceWithProof = {
                price: 1000,
                proof: priceProof,
            };

            // Using registered base but unregistered quote token address
            const unregisteredAddress = "0x9999999999999999999999999999999999999999";

            await expect(
                priceOracle.updatePrice(
                    BTC_ERC20_ADDRESS,
                    unregisteredAddress,
                    priceWithProof
                )
            ).to.be.revertedWith("PriceOracle: quote denom not registered in local_network_to_oracle_network_denoms");
        });

        describe("Price Precision Adjustment", function () {
            it("Should correctly adjust price when quote precision > base precision", async function () {
                const { priceOracle } = await loadFixture(deployPriceOracleFixture);

                const block = await hre.ethers.provider.getBlock("latest");
                const priceProof = {
                    creationHeight: block!.number,
                    creationTimeUnixMs: block!.timestamp * 1000,
                    height: block!.number,
                    revision: 1,
                    merkleProof: "0x42",
                };

                const baseToken = BTC_ERC20_ADDRESS; // 8 decimals
                const quoteToken = USDC_ERC20_ADDRESS; // 18 decimals
                const price = 1000n;

                await priceOracle.updatePrice(
                    baseToken,
                    quoteToken,
                    {
                        price: price,
                        proof: priceProof,
                    }
                );

                const storedPrice = await priceOracle.getPrice(baseToken, quoteToken);
                expect(storedPrice.price).to.equal(price);
            });

            

            it("Should correctly adjust price when quote precision < base precision", async function () {
                const { priceOracle } = await loadFixture(deployPriceOracleFixture);

                const block = await hre.ethers.provider.getBlock("latest");
                const priceProof = {
                    creationHeight: block!.number,
                    creationTimeUnixMs: block!.timestamp * 1000,
                    height: block!.number,
                    revision: 1,
                    merkleProof: "0x42",
                };

                const baseToken = USDC_ERC20_ADDRESS; // 18 decimals
                const quoteToken = BTC_ERC20_ADDRESS; // 8 decimals
                const price = 1000n;

                await priceOracle.updatePrice(
                    baseToken,
                    quoteToken,
                    {
                        price: price,
                        proof: priceProof,
                    }
                );

                const storedPrice = await priceOracle.getPrice(baseToken, quoteToken);
                expect(storedPrice.price).to.equal(price);
            });
        });
    });

    describe("GetPrice", function () {
        it("should return the correct price when the price is set and has not expired", async function () {
            const { priceOracle, owner } = await loadFixture(deployPriceOracleFixture);

            const base = BTC_ERC20_ADDRESS;
            const quote = USDC_ERC20_ADDRESS;
            const price = 50000n;
            const currentBlock = await hre.ethers.provider.getBlock("latest");
            const creationTimeUnixMs = currentBlock!.timestamp * 1000;

            const priceProof = {
                creationHeight: currentBlock!.number,
                creationTimeUnixMs: creationTimeUnixMs,
                height: currentBlock!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const priceWithProof = {
                price: price,
                proof: priceProof,
            };

            await expect(priceOracle.updatePrice(base, quote, priceWithProof))
                .to.emit(priceOracle, "PriceUpdated")
                .withArgs(base, quote, price, creationTimeUnixMs + (DEFAULT_PRICE_EXPIRY * 1000));

            const fetchedPrice = await priceOracle.getPrice(base, quote);
            expect(fetchedPrice.price).to.equal(price);
            expect(fetchedPrice.is_inverse).to.be.false;

            const inverseFetchedPrice = await priceOracle.getPrice(quote, base);
            expect(inverseFetchedPrice.price).to.equal((10n**18n) / fetchedPrice.price); // Adjusted with Scale factor and
            expect(inverseFetchedPrice.is_inverse).to.be.true;
        });

        it("should revert if the price does not exist", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const base = BTC_ERC20_ADDRESS;
            const quote = USDC_ERC20_ADDRESS;

            await expect(priceOracle.getPrice(base, quote)).to.be.revertedWith(
                "PriceOracle: price not found"
            );
        });

        it("should revert if the price has expired", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const base = BTC_ERC20_ADDRESS;
            const quote = USDC_ERC20_ADDRESS;
            const price = 50000n;

            const currentBlock = await hre.ethers.provider.getBlock("latest");
            const creationTimeUnixMs = currentBlock!.timestamp * 1000;

            const priceProof = {
                creationHeight: currentBlock!.number,
                creationTimeUnixMs: creationTimeUnixMs,
                height: currentBlock!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            const priceWithProof = {
                price: price,
                proof: priceProof,
            };

            await expect(priceOracle.updatePrice(base, quote, priceWithProof))
                .to.emit(priceOracle, "PriceUpdated")
                .withArgs(base, quote, price, creationTimeUnixMs + (DEFAULT_PRICE_EXPIRY * 1000));

            // Advance time to expire the price
            await hre.network.provider.send("evm_increaseTime", [DEFAULT_PRICE_EXPIRY + 1]);
            await hre.network.provider.send("evm_mine", []);

            await expect(priceOracle.getPrice(base, quote)).to.be.revertedWith(
                "PriceOracle: price expired"
            );
        });
    });

    describe("PriceInBound", function () {
        it("Should return true when price is within acceptable bounds", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const base = BTC_ERC20_ADDRESS;
            const quote = USDC_ERC20_ADDRESS;
            const price = 50000n;

            const currentBlock = await hre.ethers.provider.getBlock("latest");
            const priceProof = {
                creationHeight: currentBlock!.number,
                creationTimeUnixMs: currentBlock!.timestamp * 1000,
                height: currentBlock!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            // First set the oracle price
            await priceOracle.updatePrice(base, quote, {
                price: price,
                proof: priceProof,
            });

            // Test price within bounds (same as oracle price)
            const result = await priceOracle.priceInBound(base, quote, price);
            expect(result).to.be.true;
        });

        it("Should revert when price is below acceptable threshold", async function () {
            const { priceOracle } = await loadFixture(deployPriceOracleFixture);

            const base = BTC_ERC20_ADDRESS;
            const quote = USDC_ERC20_ADDRESS;
            const oraclePrice = 50000n;

            const currentBlock = await hre.ethers.provider.getBlock("latest");
            const priceProof = {
                creationHeight: currentBlock!.number,
                creationTimeUnixMs: currentBlock!.timestamp * 1000,
                height: currentBlock!.number,
                revision: 1,
                merkleProof: "0x42",
            };

            // Set the oracle price
            await priceOracle.updatePrice(base, quote, {
                price: oraclePrice,
                proof: priceProof,
            });

            // Test with a price that's too low (e.g., 80% of oracle price)
            const lowPrice = (oraclePrice * 80n) / 100n;
            await expect(
                priceOracle.priceInBound(base, quote, lowPrice)
            ).to.be.revertedWith("Price is below the acceptable threshold");
        });
    });
});