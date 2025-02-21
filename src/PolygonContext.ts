import { ethers } from "ethers";
import TokenABI from "./contracts/Token.sol/Token.json";
import EventFactoryABI from "./contracts/EventFactory.sol/EventFactory.json";
import WelfareFactoryABI from "./contracts/WelfareFactory.sol/WelfareFactory.json";

const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/polygon_amoy");
export const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
export const EventFactoryContract = new ethers.Contract("", EventFactoryABI.abi, signer);
export const WelfareFactoryContract = new ethers.Contract("", WelfareFactoryABI.abi, signer);
export const TokenContract = new ethers.Contract("", TokenABI.abi, signer);