import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  // networks: {
  //   sepolia: {
  //     url: "https://rpc.ankr.com/eth_sepolia",
  //     accounts: [""],
  //   },
  //   amoy: {
  //     url: "https://rpc.ankr.com/polygon_amoy",
  //     accounts: [""],
  //   },
  // },
  // etherscan: {
  //   apiKey: ""
  // },
  solidity: "0.8.28",
};

export default config;
