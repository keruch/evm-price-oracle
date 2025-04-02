// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Basic price oracle contract structure for rollapp-evm
 */
contract PriceOracle is Ownable {
    struct AssetInfo {
        address localNetworkName;
        string oracleNetworkName;
        uint256 precision;
    }

    struct PriceProof {
        uint256 creationHeight;
        uint256 creationTimeUnixMs;
        uint256 height;
        uint256 revision;
        bytes merkleProof;
    }

    struct PriceWithProof {
        uint256 price;
        PriceProof proof;
    }

    struct PriceWithExpiration {
        uint256 price;
        uint256 expirationTimeUnixMs;
        bool exists;
    }

    struct GetPriceResponse {
        uint256 price;
        bool is_inverse;
    }

    // Represents the time offset for price expiration in seconds.
    uint256 public expirationOffsetSec;
    // Represents the percentage threshold for acceptable price deviations.
    // For example, if boundThreshold is 10, it means prices can deviate by up to 10% from the oracle's price.
    uint8 public boundThresholdPercentage;
    // Represents the scaling factor for the price stored in this contract.
    // Currently, is not used but is useful for contract clients to know the scale of the prices.
    // Typically, it is 10^18.
    uint256 public scaleFactor;

    mapping(address => mapping(address => PriceWithExpiration)) public prices_cache;
    mapping(address => AssetInfo) public assetInfos; // localNetworkName => AssetInfo

    event PriceUpdated(
        address indexed base,
        address indexed quote,
        uint256 price,
        uint256 expirationTimeUnixMs
    );

    constructor(
        uint256 _expirationOffsetSec,
        AssetInfo[] memory _assetInfos,
        uint8 _boundThreshold,
        uint256 _scaleFactor
    ) Ownable(msg.sender) {
        expirationOffsetSec = _expirationOffsetSec;
        scaleFactor = _scaleFactor;

        // Validate threshold is between 0 and 100
        require(_boundThreshold <= 100, "PriceOracle: threshold must be between 0 and 100");
        boundThresholdPercentage = _boundThreshold;
        
        for (uint256 i = 0; i < _assetInfos.length; i++) {
            assetInfos[_assetInfos[i].localNetworkName] = _assetInfos[i];
        }
    }

    /**
     * @dev Checks if the provided price is within the acceptable threshold.
     * @param base The base token address.
     * @param quote The quote token address.
     * @param price The price to check.
     * @return bool True if the price is within the acceptable threshold, false otherwise.
     */
    function priceInBound(address base, address quote, uint256 price) public view returns (bool) {
        // Get oracle price
        GetPriceResponse memory oraclePrice = this.getPrice(base, quote);

        // Calculate acceptable bounds using percentage
        // boundThreshold is now a percentage (0-100), so we divide by 100 to get the actual percentage
        uint256 lowerBound = (oraclePrice.price * (100 - boundThresholdPercentage)) / 100;
        uint256 upperBound = (oraclePrice.price * (100 + boundThresholdPercentage)) / 100;

        // Check if provided price is within bounds
        require(price >= lowerBound, "Price is below the acceptable threshold");
        require(price <= upperBound, "Price is above the acceptable threshold");

        return true;
    }

    /**
     * @dev Retrieves the price for a given base and quote token pair.
     * @param base The base token address.
     * @param quote The quote token address.
     * @return GetPriceResponse memory The price response containing the price and a boolean indicating if it's an inverse price.
     */
    function getPrice(address base, address quote) external view returns (GetPriceResponse memory) {
        // This function tries to retrieve a stored price for the (base, quote) pair.
        // If it's not available directly, it checks for the inverse pair (quote, base)
        // and calculates the inverted price if found.

        PriceWithExpiration memory priceWithExpiration = prices_cache[base][quote];
        if (priceWithExpiration.exists) {
            require((block.timestamp * 1000) <= priceWithExpiration.expirationTimeUnixMs, "PriceOracle: price expired");
            return GetPriceResponse(priceWithExpiration.price, false);
        }

        priceWithExpiration = prices_cache[quote][base];
        if (priceWithExpiration.exists) {
            require((block.timestamp * 1000) <= priceWithExpiration.expirationTimeUnixMs, "PriceOracle: price expired");
            require(priceWithExpiration.price > 0, "PriceOracle: invalid price for inversion");

            // When we need the inverted price, we're essentially calculating 1 / (quote->base price).
            // However, due to internal scaling, we must adjust for both the base token's precision
            // and the contract's overall scaling factor (SCALE_FACTOR).

            // 1) Multiplying by 10**precisionMapping[base]:
            //    Each token might have a different number of decimals. By raising 10 to the power of
            //    precisionMapping[base], we ensure the "unit" for the base token is aligned correctly.
            //    This step normalizes the inverted price so that it reflects the correct scale for
            //    the base token's decimal system.

            // 2) Multiplying by SCALE_FACTOR (10^18):
            //    After adjusting for the token's precision, we also incorporate a uniform scaling factor
            //    (SCALE_FACTOR) that the contract uses to represent all prices internally at a high-precision,
            //    standardized scale. This ensures consistent calculations and comparisons across all tokens
            //    and price pairs, regardless of their native decimal representation.
            uint256 invertedPrice = (10**assetInfos[base].precision) / priceWithExpiration.price;

            return GetPriceResponse(invertedPrice, true);
        }

        revert("PriceOracle: price not found");
    }

    function updatePrice(address base, address quote, PriceWithProof calldata priceWithProof) external onlyOwner {
        // TODO: add add price proof verification once it's implemented

        require(priceWithProof.price > 0, "Price should be non-zero");

        uint256 proofExpiryTimeUnixMs = priceWithProof.proof.creationTimeUnixMs + (expirationOffsetSec * 1000);

        require(
            (block.timestamp * 1000) <= proofExpiryTimeUnixMs,
            "PriceOracle: price proof expired"
        );

        require(
            bytes(assetInfos[base].oracleNetworkName).length > 0,
            "PriceOracle: base denom not registered in local_network_to_oracle_network_denoms"
        );

        require(
            bytes(assetInfos[quote].oracleNetworkName).length > 0,
            "PriceOracle: quote denom not registered in local_network_to_oracle_network_denoms"
        );

        // Ensure that the new price's expiration is later than the currently cached price's expiration
        // to prevent updating the cache with an outdated price
        PriceWithExpiration memory cachedPriceWithExpiration = prices_cache[base][quote];
        if (cachedPriceWithExpiration.exists) {
            require(
                cachedPriceWithExpiration.expirationTimeUnixMs < proofExpiryTimeUnixMs,
                "PriceOracle: cannot update with an older price"
            );
        }

        prices_cache[base][quote] = PriceWithExpiration(
            priceWithProof.price,
            proofExpiryTimeUnixMs,
            true
        );

        emit PriceUpdated(base, quote, priceWithProof.price, proofExpiryTimeUnixMs);
    }
}
