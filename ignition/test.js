const {ethers} = require("ethers");

async function main() {
    const contractABI = [
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_expirationOffset",
                    "type": "uint256"
                },
                {
                    "components": [
                        {
                            "internalType": "address",
                            "name": "localNetworkName",
                            "type": "address"
                        },
                        {
                            "internalType": "string",
                            "name": "oracleNetworkName",
                            "type": "string"
                        },
                        {
                            "internalType": "uint256",
                            "name": "localNetworkPrecision",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct PriceOracle.AssetInfo[]",
                    "name": "_assetInfos",
                    "type": "tuple[]"
                },
                {
                    "internalType": "uint256",
                    "name": "boundThreshold",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "initializer",
                    "type": "address"
                }
            ],
            "name": "OracleInitialized",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "base",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "quote",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                }
            ],
            "name": "PriceUpdated",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "SCALE_FACTOR",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "boundThreshold",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "expirationOffset",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "base",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "quote",
                    "type": "address"
                }
            ],
            "name": "getPrice",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "price",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bool",
                            "name": "is_inverse",
                            "type": "bool"
                        }
                    ],
                    "internalType": "struct PriceOracle.GetPriceResponse",
                    "name": "",
                    "type": "tuple"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "initialize",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "initialized",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "localNetworkToOracleNetworkDenoms",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "precisionMapping",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "base",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "quote",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                }
            ],
            "name": "priceInBound",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "prices_cache",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "expiration",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "exists",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "base",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "quote",
                    "type": "address"
                },
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "price",
                            "type": "uint256"
                        },
                        {
                            "components": [
                                {
                                    "internalType": "uint256",
                                    "name": "creationHeight",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "creationTimeUnixMs",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "height",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "revision",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "bytes",
                                    "name": "merkleProof",
                                    "type": "bytes"
                                }
                            ],
                            "internalType": "struct PriceOracle.PriceProof",
                            "name": "proof",
                            "type": "tuple"
                        }
                    ],
                    "internalType": "struct PriceOracle.PriceWithProof",
                    "name": "priceWithProof",
                    "type": "tuple"
                }
            ],
            "name": "updatePrice",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]

    const provider = await new ethers.JsonRpcProvider("https://evm.odysphere.io")
    const tx = await provider.getTransaction("0xe221fb5e2a3937c2a8c85d77ae7db59a31dd3c9fd273c5cb8658794791ed5f9d")

    const txData = tx.data;

    const iface = new ethers.Interface(contractABI);
    const parsedTx = iface.parseTransaction({ data: txData });

    console.log("Parsed Tx: ", parsedTx);
}

main().catch((error) => {
    console.error("Error in script execution:", error);
    process.exitCode = 1;
});
