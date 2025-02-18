import { ethers } from "ethers";
import TokenABI from "../artifacts/contracts/ShearesToken.sol/ShearesToken.json";
import EventFactoryABI from "../artifacts/contracts/EventFactory.sol/EventFactory.json";
import WelfareFactoryABI from "../artifacts/contracts/WelfareFactory.sol/WelfareFactory.json";

const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/polygon_amoy");
export const signer = new ethers.Wallet("", provider);
export const EventFactoryContract = new ethers.Contract("", EventFactoryABI.abi, signer);
export const WelfareFactoryContract = new ethers.Contract("", WelfareFactoryABI.abi, signer);
export const TokenContract = new ethers.Contract("", TokenABI.abi, signer);