import { ContractTransactionReceipt, ethers, EthersError, EventLog } from "ethers";
import { WelfareFactoryContract, signer, TokenContract } from "../PolygonContext";
import contractABI from "../contracts/WelfareSignup.sol/WelfareSignup.json";

export interface WelfareDetails {
  name: string;
  description: string;
  maxCapacity: number;
  signupStartTime: Date;
  signupEndTime: Date;
  redemptionEndTime: Date;
  redemptionCost: number;
  attendeeCount: number;
}

export interface CreateWelfareInput {
  name: string;
  description: string;
  maxCapacity: number;
  signupStartTime: Date;
  signupEndTime: Date;
  redemptionEndTime: Date;
  redemptionCost: number;
}

export class WelfareContract {
  private welfare: WelfareDetails;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor(welfare: WelfareDetails, contract: ethers.Contract, addr: string) {
    this.welfare = welfare;
    this.contract = contract;
    this.contractAddress = addr; // Save contract address for logging
  }

  static async getContract(addr: string): Promise<WelfareContract> {
    try {
      const contract = new ethers.Contract(addr, contractABI.abi, signer);
      const welfareDetails = await contract.welfareDetails();

      const welfare = {
        name: welfareDetails.name,
        description: welfareDetails.description,
        maxCapacity: Number(welfareDetails.maxCapacity),
        signupStartTime: new Date(Number(welfareDetails.signupStartTime) * 1000),
        signupEndTime: new Date(Number(welfareDetails.signupEndTime) * 1000),
        redemptionEndTime: new Date(Number(welfareDetails.redemptionEndTime) * 1000),
        creator: welfareDetails.creator,
        redemptionCost: Number(welfareDetails.redemptionCost),
        attendeeCount: Number(welfareDetails.attendeeCount),
      };

      console.log(`Successfully fetched welfare details for contract: ${addr}`);
      return new WelfareContract(welfare, contract, addr);
    } catch (error) {
      console.error(`Error fetching welfare details for contract: ${addr}`, error);
      throw error;
    }
  }

  static async getActiveContracts(): Promise<WelfareContract[]> {
    try {
      const welfareAddresses: string[] = await WelfareFactoryContract.getActiveWelfares();

      if (!welfareAddresses.length) {
        console.log("No active welfares found.");
        return [];
      }

      const contracts: WelfareContract[] = await Promise.all(
        welfareAddresses.map(addr => WelfareContract.getContract(addr))
      );

      return contracts;
    } catch (error) {
      console.error("Error fetching active contracts:", error);
      throw new Error("Failed to fetch active welfare contracts.");
    }
  }

  static async createContract(welfareDetails: CreateWelfareInput): Promise<WelfareContract> {
    // 1. Send transaction to create the welfare
    const tx = await WelfareFactoryContract.createWelfare(
      welfareDetails.name,
      welfareDetails.description,
      welfareDetails.maxCapacity,
      Math.floor(welfareDetails.signupStartTime.getTime() / 1000),
      Math.floor(welfareDetails.signupEndTime.getTime() / 1000),
      Math.floor(welfareDetails.redemptionEndTime.getTime() / 1000),
      welfareDetails.redemptionCost
    );

    const receipt: ContractTransactionReceipt = await tx.wait();

    const welfareLog = receipt?.logs.find(log => {
      try {
        return WelfareFactoryContract.interface.parseLog(log) !== null;
      } catch {
        return false;
      }
    }) as EventLog;


    if (!welfareLog || !welfareLog.args) {
      throw new Error("WelfareDeployed welfare not found in transaction logs.");
    }

    const deployedAddress: string = welfareLog.args[0];
    const contract = new ethers.Contract(deployedAddress, contractABI.abi, signer);
    const details = { ...welfareDetails, attendeeCount: 0 }
    return new WelfareContract(details, contract, deployedAddress);
  }

  public getDetails(): WelfareDetails {
    return this.welfare;
  }

  public isWithinSignupPeriod(): boolean {
    const now = new Date();
    return now >= this.welfare.signupStartTime && now <= this.welfare.signupEndTime;
  }

  public isWithinRedemptionPeriod(): boolean {
    const now = new Date();
    return now <= this.welfare.redemptionEndTime;
  }

  public async hasSignedUp(): Promise<boolean> {
    try {
      const signedUp = await this.contract.isAttendee();
      console.log(`Checked signup is ${signedUp} for address ${signer.address} on welfare contract: ${this.contractAddress}`);
      return signedUp;
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error checking if signed up for welfare on contract: ${this.contractAddress}`,
        error.shortMessage || error.message
      );
      throw error;
    }
  }

  public async signUp(): Promise<void> {
    try {
      if (!this.isWithinSignupPeriod()) {
        console.log(`Cannot sign up for welfare. Current date is outside of signup period.`);
        return;
      }

      await TokenContract.approve(this.contract.target, this.welfare.redemptionCost);

      console.log(`Attempting to sign up for welfare on contract: ${this.contractAddress}`);
      const tx = await this.contract.signUp(); // Renamed to signUpForWelfare
      await tx.wait();
      console.log(`Successfully signed up for welfare on contract: ${this.contractAddress}`);
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error signing up for welfare on contract: ${this.contractAddress}`,
        error.shortMessage || error.message
      );
      throw error;
    }
  }

  public async redeem(): Promise<void> {
    try {
      if (!this.isWithinRedemptionPeriod()) {
        console.error(`Error checking in on contract: ${this.contractAddress}: Current date is outside of the redemption period.`);
        throw new Error(`Error checking in on contract: ${this.contractAddress}: Current date is outside of the redemption period.`);
      }

      console.log(`Attempting to redeem welfare on contract: ${this.contractAddress}`);

      // Send transaction and wait for receipt
      const tx = await this.contract.redeem();
      await tx.wait();
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error checking in on contract: ${this.contractAddress}`, error.shortMessage || error.message);
      throw error;
    }
  }
}
