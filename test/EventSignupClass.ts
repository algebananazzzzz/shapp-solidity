// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
// import { EventContract, CreateEventInput } from "./utils/EventSignup";
// import { getTokenContract } from "./Context";

// describe("EventSignupClass", function () {
//   let eventContract: EventContract;
//   let treasury, owner, attendee1, attendee2, attendee3;
//   let signupStartTime, signupEndTime, eventStartTime, eventEndTime;

//   before(async function () {
//     // Get signers
//     [treasury, owner, attendee1, attendee2, attendee3] = await ethers.getSigners();

//     const token = await getTokenContract()
//     await EventContract.initialize()

//     // Define event details
//     const name = "Blockchain Conference";
//     const description = "A Web3 Event";
//     const maxCapacity = 2;
//     const rewardCost = 10;
//     signupStartTime = new Date().setSeconds(0);
//     signupEndTime = signupStartTime.setSeconds(); // +1 hour
//     eventStartTime = signupEndTime + 20; // +1 hour
//     eventEndTime = eventStartTime + 30; // +2 hours

//     const createEventInput: CreateEventInput = {
//       name,
//       description,
//       maxCapacity,
//       signupStartTime: new Date(signupStartTime * 1000),
//       signupEndTime: new Date(signupEndTime * 1000),
//       eventStartTime: new Date(eventStartTime * 1000),
//       eventEndTime: new Date(eventEndTime * 1000),
//       rewardCost,
//     }

//     eventContract = await EventContract.createContract(createEventInput, owner)
//   })


//   it("Should deploy the contract with correct event details", async function () {
//     const eventDetails = await eventContract.getDetails();
//     expect(eventDetails.name).to.equal("Blockchain Conference");
//     expect(eventDetails.description).to.equal("A Web3 Event");
//     expect(eventDetails.maxCapacity).to.equal(2);
//   });

//   it("Should allow users to sign up with metadata", async function () {
//     // Move time to after signupStartTime

//     // sign up using attendee 1
//     await eventContract.signUp("Attendee1 Metadata");

//     const attendeeData = await eventContract.getMetadata();
//     expect(attendeeData).to.equal("Attendee1 Metadata");

//     const isSignedUp = await eventContract.isAttendee();
//     expect(isSignedUp).to.be.true;
//   });
// })