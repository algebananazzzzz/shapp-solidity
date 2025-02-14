const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("EventSignup Contract", function () {
  async function deployEventSignupFixture() {
    const [creator, attendee1, attendee2] = await ethers.getSigners();

    // Event parameters
    const name = "Blockchain Event";
    const description = "Learn about smart contracts";
    const maxCapacity = 2;
    const tokensPerCheckIn = 2;

    // Time setup
    const currentTime = await time.latest();
    const signupStartTime = currentTime + 100; // Signup starts in 100 seconds
    const signupEndTime = currentTime + 1000;  // Signup ends in 1000 seconds
    const eventStartTime = currentTime + 1100; // Event starts in 1100 seconds
    const eventEndTime = currentTime + 2000;   // Event ends in 2000 seconds

    // Deploy ShearesToken
    const Token = await ethers.getContractFactory("ShearesToken");
    const token = await Token.deploy("ShearesToken", "SHR", 1000000);

    // Deploy contract
    const EventSignup = await ethers.getContractFactory("EventSignup");
    const eventSignup = await EventSignup.deploy(
      name,
      description,
      maxCapacity,
      signupStartTime,
      signupEndTime,
      eventStartTime,
      eventEndTime,
      tokensPerCheckIn,
      token.getAddress()
    );

    await token.increaseAllowance(eventSignup.getAddress(), maxCapacity * tokensPerCheckIn)
    return { eventSignup, creator, attendee1, attendee2, signupStartTime, signupEndTime, eventStartTime, eventEndTime, token };
  }

  it("Should deploy the contract with correct event details", async function () {
    const { eventSignup } = await loadFixture(deployEventSignupFixture);
    const eventDetails = await eventSignup.eventDetails();
    expect(eventDetails.name).to.equal("Blockchain Event");
    expect(eventDetails.maxCapacity).to.equal(2);
  });

  it("Should allow users to sign up during the sign-up period", async function () {
    const { eventSignup, attendee1, signupStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to after signupStartTime
    await time.increaseTo(signupStartTime + 10);

    await eventSignup.connect(attendee1).signUp();
    const isSignedUp = await eventSignup.attendees(attendee1.address);
    expect(isSignedUp).to.be.true;
  });

  it("Should prevent sign-up before the sign-up period starts", async function () {
    const { eventSignup, attendee1 } = await loadFixture(deployEventSignupFixture);
    await expect(eventSignup.connect(attendee1).signUp()).to.be.revertedWith("Signup has not started yet");
  });

  it("Should prevent sign-up after the sign-up period ends", async function () {
    const { eventSignup, attendee1, signupEndTime } = await loadFixture(deployEventSignupFixture);

    // Move time to after signupEndTime
    await time.increaseTo(signupEndTime + 10);

    await expect(eventSignup.connect(attendee1).signUp()).to.be.revertedWith("Signup has ended");
  });

  it("Should prevent sign-up if event is full", async function () {
    const { eventSignup, attendee1, attendee2, signupStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to after signupStartTime
    await time.increaseTo(signupStartTime + 10);

    await eventSignup.connect(attendee1).signUp();
    await eventSignup.connect(attendee2).signUp();

    // Another attendee tries to sign up but capacity is full
    const [_, __, ___, attendee3] = await ethers.getSigners();
    await expect(eventSignup.connect(attendee3).signUp()).to.be.revertedWith("Event is full");
  });

  it("Should allow users to check in during the event time", async function () {
    const { eventSignup, attendee1, signupStartTime, eventStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 10);
    await eventSignup.connect(attendee1).signUp();

    // Move time to event start
    await time.increaseTo(eventStartTime + 10);

    await eventSignup.connect(attendee1).checkIn();
    const hasRedeemed = await eventSignup.redeemed(attendee1.address);
    expect(hasRedeemed).to.be.true;
  });

  it("Should prevent check-in before the event starts", async function () {
    const { eventSignup, attendee1, signupStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 10);
    await eventSignup.connect(attendee1).signUp();

    // Try to check in before event starts
    await expect(eventSignup.connect(attendee1).checkIn()).to.be.revertedWith("Event has not started yet");
  });

  it("Should prevent check-in after the event ends", async function () {
    const { eventSignup, attendee1, signupStartTime, eventEndTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 10);
    await eventSignup.connect(attendee1).signUp();

    // Move time to after event ends
    await time.increaseTo(eventEndTime + 10);

    await expect(eventSignup.connect(attendee1).checkIn()).to.be.revertedWith("Event has ended");
  });

  it("Should prevent duplicate check-in", async function () {
    const { eventSignup, attendee1, signupStartTime, eventStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 10);
    await eventSignup.connect(attendee1).signUp();

    // Move time to event start
    await time.increaseTo(eventStartTime + 10);

    // First check-in
    await eventSignup.connect(attendee1).checkIn();

    // Attempt duplicate check-in
    await expect(eventSignup.connect(attendee1).checkIn()).to.be.revertedWith("You have already checked in for the event");
  });

  it("Should allow the creator to deactivate the event", async function () {
    const { eventSignup, creator } = await loadFixture(deployEventSignupFixture);
    await eventSignup.connect(creator).deactivate();
    const eventDetails = await eventSignup.eventDetails();
    expect(eventDetails.isActive).to.be.false;
  });

  it("Should prevent non-creators from deactivating the event", async function () {
    const { eventSignup, attendee1 } = await loadFixture(deployEventSignupFixture);
    await expect(eventSignup.connect(attendee1).deactivate()).to.be.revertedWith("Only the creator can perform this action");
  });
});
