import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts:{
        mnemonic: "flat chase injury position debris raise champion auto recipe pen upper add convince fantasy west shiver elbow young shed coach obey render outer distance",
      }
    },
  }
};

export default config;
