import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("EventSignup", function () {
  async function deployEventSignupFixture() {
    // Get signers
    const [treasury, owner, attendee1, attendee2, attendee3] = await ethers.getSigners();

    // Deploy ShearesToken (ERC20)
    const ShearesToken = await ethers.getContractFactory("ShearesToken");
    const token = await ShearesToken.deploy("Sheares Token", "SHR", 1000);

    // Define event details
    const eventName = "Blockchain Conference";
    const eventDescription = "A Web3 Event";
    const maxCapacity = 2;
    const rewardCost = 10;
    const signupStartTime = await time.latest() + 1800;
    const signupEndTime = signupStartTime + 3600; // +1 hour
    const eventStartTime = signupEndTime + 3600; // +1 hour
    const eventEndTime = eventStartTime + 7200; // +2 hours

    // Deploy EventSignup contract
    const EventSignup = await ethers.getContractFactory("EventSignup");
    const eventSignup = await EventSignup.connect(owner).deploy(
      eventName,
      eventDescription,
      maxCapacity,
      signupStartTime,
      signupEndTime,
      eventStartTime,
      eventEndTime,
      rewardCost,
      token.getAddress()
    );
    await token.transfer(eventSignup.getAddress(), maxCapacity * rewardCost);

    // Treasury approves eventSignup to transfer tokens
    await token.connect(treasury).approve(eventSignup.target, rewardCost * maxCapacity);

    return {
      token,
      eventSignup,
      eventName,
      eventDescription,
      maxCapacity,
      signupStartTime: signupStartTime + 10,
      signupEndTime: signupEndTime + 10,
      eventStartTime: eventStartTime + 10,
      eventEndTime: eventEndTime + 10,
      rewardCost,
      treasury,
      owner,
      attendee1,
      attendee2,
      attendee3
    };
  }

  it("Should deploy the contract with correct event details", async function () {
    const { eventSignup, eventName, eventDescription, maxCapacity } = await loadFixture(deployEventSignupFixture);
    const eventDetails = await eventSignup.eventDetails();
    expect(eventDetails.name).to.equal(eventName);
    expect(eventDetails.description).to.equal(eventDescription);
    expect(eventDetails.maxCapacity).to.equal(maxCapacity);
  });

  it("Should allow users to sign up with metadata", async function () {
    const { eventSignup, attendee1, signupStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to after signupStartTime
    await time.increaseTo(signupStartTime + 1);

    await expect(eventSignup.connect(attendee1).signUp("Attendee1 Metadata"))
      .to.emit(eventSignup, "SignedUp")
      .withArgs(attendee1.getAddress(), "Attendee1 Metadata");

    const attendeeData = await eventSignup.getAddressMetadata(attendee1.getAddress());
    expect(attendeeData).to.equal("Attendee1 Metadata");

    const isSignedUp = await eventSignup.connect(attendee1).isAttendee();
    expect(isSignedUp).to.be.true;
  });

  it("Should prevent sign-up before the sign-up period starts", async function () {
    const { eventSignup, attendee1 } = await loadFixture(deployEventSignupFixture);
    await expect(eventSignup.connect(attendee1).signUp("Attendee1 Metadata")).to.be.revertedWith("Signup not started");
  });

  it("Should prevent sign-up after the sign-up period ends", async function () {
    const { eventSignup, attendee1, signupEndTime } = await loadFixture(deployEventSignupFixture);

    // Move time to after signupEndTime
    await time.increaseTo(signupEndTime + 1);

    await expect(eventSignup.connect(attendee1).signUp("Attendee1 Metadata")).to.be.revertedWith("Signup ended");
  });

  it("Should prevent sign-up if event is full", async function () {
    const { eventSignup, attendee1, attendee2, attendee3, signupStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to after signupStartTime
    await time.increaseTo(signupStartTime + 1);

    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");
    await eventSignup.connect(attendee2).signUp("Attendee2 Metadata");

    // Another attendee tries to sign up but capacity is full
    await expect(eventSignup.connect(attendee3).signUp("Attendee3 Metadata")).to.be.revertedWith("Event full");
  });

  it("Should prevent duplicate signups", async function () {
    const { eventSignup, signupStartTime, attendee1 } = await loadFixture(deployEventSignupFixture);

    await time.increaseTo(signupStartTime + 1);

    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");

    await expect(eventSignup.connect(attendee1).signUp("Duplicate Metadata")).to.be.revertedWith(
      "Already signed up"
    );
  });

  it("Should allow check-in and reward tokens", async function () {
    const { token, eventSignup, signupStartTime, eventStartTime, attendee1, rewardCost } = await loadFixture(deployEventSignupFixture);

    await time.increaseTo(signupStartTime + 1);

    // Sign up the attendee
    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");

    // Fast-forward time to event start
    await time.increaseTo(eventStartTime + 1);

    // Check balance before check-in
    const balanceBefore = await token.balanceOf(attendee1.getAddress());

    // Check-in
    await expect(eventSignup.connect(attendee1).checkIn()).to.emit(eventSignup, "CheckedIn");

    // Check balance after check-in
    const balanceAfter = await token.balanceOf(attendee1.getAddress());
    expect(balanceAfter).to.equal(balanceBefore + BigInt(rewardCost));
  });

  it("Should prevent check-in before the event starts", async function () {
    const { eventSignup, attendee1, signupStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 1);
    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");

    // Try to check in before event starts
    await expect(eventSignup.connect(attendee1).checkIn()).to.be.revertedWith("Event not started");
  });

  it("Should prevent check-in after the event ends", async function () {
    const { eventSignup, attendee1, signupStartTime, eventEndTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 1);
    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");

    // Move time to after event ends
    await time.increaseTo(eventEndTime + 1);

    await expect(eventSignup.connect(attendee1).checkIn()).to.be.revertedWith("Event ended");
  });

  it("Should prevent duplicate check-in", async function () {
    const { eventSignup, attendee1, signupStartTime, eventStartTime } = await loadFixture(deployEventSignupFixture);

    // Move time to signup period and sign up
    await time.increaseTo(signupStartTime + 1);
    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");

    // Move time to event start
    await time.increaseTo(eventStartTime + 1);

    // First check-in
    await eventSignup.connect(attendee1).checkIn();

    // Attempt duplicate check-in
    await expect(eventSignup.connect(attendee1).checkIn()).to.be.revertedWith("Already checked in");
  });

  it("Should allow owner to deactivate the event", async function () {
    const { eventSignup, owner } = await loadFixture(deployEventSignupFixture);
    await eventSignup.connect(owner).deactivate();
    const eventDetails = await eventSignup.eventDetails();
    expect(eventDetails.isActive).to.be.false;
  });

  it("Should prevent non-owners from deactivating the event", async function () {
    const { eventSignup, attendee1 } = await loadFixture(deployEventSignupFixture);
    await expect(eventSignup.connect(attendee1).deactivate()).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should prevent signups after event is deactivated", async function () {
    const { eventSignup, attendee1, owner } = await loadFixture(deployEventSignupFixture);

    await eventSignup.connect(owner).deactivate();

    await expect(eventSignup.connect(attendee1).signUp("Metadata")).to.be.revertedWith(
      "Event is not active"
    );
  });

  it("Should allow owner to retrieve all attendee metadata", async function () {
    const { eventSignup, signupStartTime, attendee1, attendee2, owner } = await loadFixture(deployEventSignupFixture);

    await time.increaseTo(signupStartTime + 1);

    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");
    await eventSignup.connect(attendee2).signUp("Attendee2 Metadata");

    const metadataList = await eventSignup.connect(owner).getAllMetadata();
    expect(metadataList).to.deep.equal(["Attendee1 Metadata", "Attendee2 Metadata"]);
  });

  it("Should prevent non-owners from retrieving metadata", async function () {
    const { eventSignup, signupStartTime, attendee1, attendee2 } = await loadFixture(deployEventSignupFixture);

    await time.increaseTo(signupStartTime + 1);

    await eventSignup.connect(attendee1).signUp("Attendee1 Metadata");

    await expect(eventSignup.connect(attendee2).getAllMetadata()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });
});
