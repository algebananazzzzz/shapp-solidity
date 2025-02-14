import { ethers, EthersError } from "ethers";
import contractABI from "../artifacts/contracts/WelfareSignup.sol/WelfareSignup.json";

const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/polygon_amoy");
export const signer = new ethers.Wallet("", provider);
export const abi = contractABI.abi
