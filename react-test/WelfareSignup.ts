import { ethers, EthersError } from "ethers";
import { abi, signer } from "./PolygonContext";

interface WelfareDetails {
  name: string;
  description: string;
  maxCapacity: number;
  signupStartTime: Date;
  signupEndTime: Date;
  redemptionEndTime: Date;
  creator: string;
  attendeeCount: number;
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
      const contract = new ethers.Contract(addr, abi, signer);
      const welfareDetails = await contract.welfareDetails(); // Renamed to welfareDetails

      const welfare = {
        name: welfareDetails.name,
        description: welfareDetails.description,
        maxCapacity: Number(welfareDetails.maxCapacity),
        signupStartTime: new Date(Number(welfareDetails.signupStartTime) * 1000), // Convert to milliseconds
        signupEndTime: new Date(Number(welfareDetails.signupEndTime) * 1000),
        redemptionEndTime: new Date(Number(welfareDetails.redemptionEndTime) * 1000),
        creator: welfareDetails.creator,
        attendeeCount: Number(welfareDetails.attendeeCount),
      };

      console.log(`Successfully fetched welfare details for contract: ${addr}`);
      return new WelfareContract(welfare, contract, addr);
    } catch (error) {
      console.error(`Error fetching welfare details for contract: ${addr}`, error);
      throw error;
    }
  }

  public getDetails(): WelfareDetails {
    return this.welfare;
  }

  // Helper function to check if the current date is within the signup period
  public isWithinSignupPeriod(): boolean {
    const now = new Date();
    return now >= this.welfare.signupStartTime && now <= this.welfare.signupEndTime;
  }

  // Helper function to check if the current date is within the redemption period (after signup end, before redemption end)
  public isWithinRedemptionPeriod(): boolean {
    const now = new Date();
    return now > this.welfare.signupEndTime && now <= this.welfare.redemptionEndTime;
  }

  public async hasSignedUp(): Promise<boolean> {
    try {
      const attendees = await this.contract.attendees(signer.address);
      console.log(`Checked signup status for address ${signer.address} on welfare contract: ${this.contractAddress}`);
      return attendees;
    } catch (error) {
      console.error(`Error checking if user is signed up for welfare contract: ${this.contractAddress}`, error);
      throw error;
    }
  }

  public async signUpForWelfare(): Promise<void> {
    try {
      if (!this.isWithinSignupPeriod()) {
        console.log(`Cannot sign up for welfare. Current date is outside of signup period.`);
        return;
      }

      console.log(`Attempting to sign up for welfare on contract: ${this.contractAddress}`);
      const tx = await this.contract.signUpForWelfare(); // Renamed to signUpForWelfare
      await tx.wait();
      console.log(`Successfully signed up for welfare on contract: ${this.contractAddress}`);
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error signing up for welfare on contract: ${this.contractAddress}`, error.shortMessage);
    }
  }

  public async redeemWelfare(): Promise<void> {
    try {
      if (!this.isWithinRedemptionPeriod()) {
        console.log(`Cannot redeem welfare. Current date is outside of redemption period.`);
        return;
      }

      console.log(`Attempting to redeem welfare on contract: ${this.contractAddress}`);
      const tx = await this.contract.redeemWelfare(); // Renamed to redeemWelfare
      await tx.wait();
      console.log(`Successfully redeemed welfare on contract: ${this.contractAddress}`);
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error redeeming welfare on contract: ${this.contractAddress}`, error.shortMessage);
    }
  }
}
