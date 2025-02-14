import { ethers, EthersError } from "ethers";
import { abi, signer } from "./PolygonContext";

interface EventDetails {
  name: string;
  description: string;
  maxCapacity: number;
  signupStartTime: Date;
  signupEndTime: Date;
  eventStartTime: Date;
  eventEndTime: Date;
  creator: string;
  attendeeCount: number;
}

export class EventContract {
  private event: EventDetails;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor(event: EventDetails, contract: ethers.Contract, addr: string) {
    this.event = event;
    this.contract = contract;
    this.contractAddress = addr; // Save contract address for logging
  }

  static async getContract(addr: string): Promise<EventContract> {
    try {
      const contract = new ethers.Contract(addr, abi, signer);
      const eventDetails = await contract.eventDetails();

      const event = {
        name: eventDetails.name,
        description: eventDetails.description,
        maxCapacity: Number(eventDetails.maxCapacity),
        signupStartTime: new Date(Number(eventDetails.signupStartTime) * 1000), // Convert to milliseconds
        signupEndTime: new Date(Number(eventDetails.signupEndTime) * 1000),
        eventStartTime: new Date(Number(eventDetails.eventStartTime) * 1000),
        eventEndTime: new Date(Number(eventDetails.eventEndTime) * 1000),
        creator: eventDetails.creator,
        attendeeCount: Number(eventDetails.attendeeCount),
      };

      console.log(`Successfully fetched event details for contract: ${addr}`);
      return new EventContract(event, contract, addr);
    } catch (error) {
      console.error(`Error fetching event details for contract: ${addr}`, error);
      throw error;
    }
  }

  public getDetails(): EventDetails {
    return this.event;
  }

  // Helper function to check if the current date is within the signup period
  public isWithinSignupPeriod(): boolean {
    const now = new Date();
    return now >= this.event.signupStartTime && now <= this.event.signupEndTime;
  }

  // Helper function to check if the current date is within the redemption period (after signup end, before redemption end)
  public isWithinRedemptionPeriod(): boolean {
    const now = new Date();
    return now > this.event.signupEndTime && now <= this.event.redemptionEndTime;
  }

  public async hasSignedUp(): Promise<boolean> {
    try {
      const attendees = await this.contract.attendees(signer.address);
      console.log(`Checked signup status for address ${signer.address} on event contract: ${this.contractAddress}`);
      return attendees;
    } catch (error) {
      console.error(`Error checking if user is signed up for event contract: ${this.contractAddress}`, error);
      throw error;
    }
  }

  public async signUpForWelfare(): Promise<void> {
    try {
      if (!this.isWithinSignupPeriod()) {
        console.log(`Cannot sign up for event. Current date is outside of signup period.`);
        return;
      }

      console.log(`Attempting to sign up for event on contract: ${this.contractAddress}`);
      const tx = await this.contract.signUpForWelfare(); // Renamed to signUpForWelfare
      await tx.wait();
      console.log(`Successfully signed up for event on contract: ${this.contractAddress}`);
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error signing up for event on contract: ${this.contractAddress}`, error.shortMessage);
    }
  }

  public async redeemWelfare(): Promise<void> {
    try {
      if (!this.isWithinRedemptionPeriod()) {
        console.log(`Cannot redeem event. Current date is outside of redemption period.`);
        return;
      }

      console.log(`Attempting to redeem event on contract: ${this.contractAddress}`);
      const tx = await this.contract.redeemWelfare(); // Renamed to redeemWelfare
      await tx.wait();
      console.log(`Successfully redeemed event on contract: ${this.contractAddress}`);
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error redeeming event on contract: ${this.contractAddress}`, error.shortMessage);
    }
  }
}
