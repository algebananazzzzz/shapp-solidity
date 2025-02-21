import { ContractTransactionReceipt, ethers, EthersError, EventLog } from "ethers";
import { EventFactoryContract, signer } from "../PolygonContext";
import contractABI from "../contracts/EventSignup.sol/EventSignup.json";

export interface EventDetails {
  name: string;
  description: string;
  maxCapacity: number;
  signupStartTime: Date;
  signupEndTime: Date;
  eventStartTime: Date;
  eventEndTime: Date;
  rewardCost: number;
  attendeeCount: number;
}

export interface CreateEventInput {
  name: string;
  description: string;
  maxCapacity: number;
  signupStartTime: Date;
  signupEndTime: Date;
  eventStartTime: Date;
  eventEndTime: Date;
  rewardCost: number;
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
      const contract = new ethers.Contract(addr, contractABI.abi, signer);
      const eventDetails = await contract.eventDetails();

      const event = {
        name: eventDetails.name,
        description: eventDetails.description,
        maxCapacity: Number(eventDetails.maxCapacity),
        signupStartTime: new Date(Number(eventDetails.signupStartTime) * 1000),
        signupEndTime: new Date(Number(eventDetails.signupEndTime) * 1000),
        eventStartTime: new Date(Number(eventDetails.eventStartTime) * 1000),
        eventEndTime: new Date(Number(eventDetails.eventEndTime) * 1000),
        rewardCost: Number(eventDetails.rewardCost),
        attendeeCount: Number(eventDetails.attendeeCount),
      };

      console.log(`Successfully fetched event details for contract: ${addr}`);
      return new EventContract(event, contract, addr);
    } catch (error) {
      console.error(`Error fetching event details for contract: ${addr}`, error);
      throw error;
    }
  }

  static async getActiveContracts(): Promise<EventContract[]> {
    try {
      const eventAddresses: string[] = await EventFactoryContract.getActiveEvents();

      if (!eventAddresses.length) {
        console.log("No active events found.");
        return [];
      }

      const contracts: EventContract[] = await Promise.all(
        eventAddresses.map(addr => EventContract.getContract(addr))
      );

      return contracts;
    } catch (error) {
      console.error("Error fetching active contracts:", error);
      throw new Error("Failed to fetch active event contracts.");
    }
  }

  static async createContract(eventDetails: CreateEventInput): Promise<EventContract> {
    // 1. Send transaction to create the event
    const tx = await EventFactoryContract.createEvent(
      eventDetails.name,
      eventDetails.description,
      eventDetails.maxCapacity,
      Math.floor(eventDetails.signupStartTime.getTime() / 1000),
      Math.floor(eventDetails.signupEndTime.getTime() / 1000),
      Math.floor(eventDetails.eventStartTime.getTime() / 1000),
      Math.floor(eventDetails.eventEndTime.getTime() / 1000),
      eventDetails.rewardCost
    );

    const receipt: ContractTransactionReceipt = await tx.wait();

    const eventLog = receipt?.logs.find(log => {
      try {
        return EventFactoryContract.interface.parseLog(log) !== null;
      } catch {
        return false;
      }
    }) as EventLog;


    if (!eventLog || !eventLog.args) {
      throw new Error("EventDeployed event not found in transaction logs.");
    }

    const deployedAddress: string = eventLog.args[0];
    const contract = new ethers.Contract(deployedAddress, contractABI.abi, signer);
    const details: EventDetails = { ...eventDetails, attendeeCount: 0 }

    return new EventContract(details, contract, deployedAddress);
  }

  public getDetails(): EventDetails {
    return this.event;
  }

  public isWithinSignupPeriod(): boolean {
    const now = new Date();
    return now >= this.event.signupStartTime && now <= this.event.signupEndTime;
  }

  public isWithinEventPeriod(): boolean {
    const now = new Date();
    return now > this.event.eventStartTime && now <= this.event.eventEndTime;
  }

  public async hasSignedUp(): Promise<boolean> {
    try {
      const signedUp = await this.contract.isAttendee();
      console.log(`Checked signup is ${signedUp} for address ${signer.address} on event contract: ${this.contractAddress}`);
      return signedUp;
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error checking if signed up for event on contract: ${this.contractAddress}`,
        error.shortMessage || error.message
      );
      throw error;
    }
  }

  public async signUp(metadata: string): Promise<void> {
    try {
      if (!this.isWithinSignupPeriod()) {
        console.log(`Cannot sign up for event. Current date is outside of signup period.`);
        return;
      }

      console.log(`Attempting to sign up for event on contract: ${this.contractAddress}`);
      const tx = await this.contract.signUp(metadata); // Renamed to signUpForWelfare
      await tx.wait();
      console.log(`Successfully signed up for event on contract: ${this.contractAddress}`);
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error signing up for event on contract: ${this.contractAddress}`,
        error.shortMessage || error.message
      );
      throw error;
    }
  }

  public async getMetadata(): Promise<string> {
    try {
      return await this.contract.getMetadata();
    } catch (err) {
      const error = err as EthersError;
      console.error(
        `Error getting metadata on contract: ${this.contractAddress}`,
        error.shortMessage || error.message
      );
      throw error;
    }
  }

  public async checkIn(): Promise<void> {
    try {
      if (!this.isWithinEventPeriod()) {
        console.error(`Error checking in on contract: ${this.contractAddress}: Current date is outside of the event period.`);
        throw new Error(`Error checking in on contract: ${this.contractAddress}: Current date is outside of the event period.`);
      }

      console.log(`Attempting to check in on contract: ${this.contractAddress}`);

      // Send transaction and wait for receipt
      const tx = await this.contract.checkIn();
      await tx.wait();
    } catch (err) {
      const error = err as EthersError;
      console.error(`Error checking in on contract: ${this.contractAddress}`, error.shortMessage || error.message);
      throw error;
    }
  }
}
