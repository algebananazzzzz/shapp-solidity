import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { EventLog } from "ethers";

describe("EventFactory", function () {
    async function deployFixture() {
        const [treasury, owner, attendee1] = await ethers.getSigners();

        // Deploy Token
        const Token = await ethers.getContractFactory("Token");
        const token = await Token.deploy(" Token", "SHR", 100000);
        await token.waitForDeployment();

        // Deploy EventFactory
        const EventFactory = await ethers.getContractFactory("EventFactory");
        const factory = await EventFactory.deploy(token.getAddress());
        await token.connect(treasury).transfer(factory.getAddress(), 10000);
        console.log("Factory Token Balance:", await token.balanceOf(factory.getAddress()));


        return { token, factory, treasury, owner, attendee1 };
    }

    it("Should deploy with correct treasury address", async function () {
        const { token, factory } = await loadFixture(deployFixture);
        expect(await factory.treasury()).to.equal(await token.treasury());
    });

    it("Should create an event successfully", async function () {
        const { token, factory, owner, attendee1 } = await loadFixture(deployFixture);
        const rewardCost = 10;
        const maxCapacity = 5;
        const signupStartTime = await time.latest();
        const signupEndTime = signupStartTime + 3600;
        const eventStartTime = signupEndTime + 3600;
        const eventEndTime = eventStartTime + 7200;

        const tx = await factory.connect(owner).createEvent(
            "Test Event",
            "An amazing event",
            maxCapacity,
            signupStartTime,
            signupEndTime,
            eventStartTime,
            eventEndTime,
            rewardCost
        );

        const activeEvents = await factory.getActiveEvents();
        expect(activeEvents.length).to.equal(1);

        const receipt = await tx.wait();

        // Find and parse the event log
        const eventLog = receipt?.logs.find(log => {
            try {
                return factory.interface.parseLog(log) !== null;
            } catch {
                return false;
            }
        }) as EventLog;
        const eventSignup = await ethers.getContractAt("EventSignup", eventLog?.args[0]);
        await time.increaseTo(signupStartTime + 10);

        await expect(eventSignup.connect(attendee1).signUp("Attendee1 Metadata"))
            .to.emit(eventSignup, "SignedUp")
            .withArgs(attendee1.getAddress(), "Attendee1 Metadata");

        // Fast-forward time to event start
        await time.increaseTo(eventStartTime + 10);

        // Check balance before check-in
        const balanceBefore = await token.balanceOf(attendee1.getAddress());

        // Check-in
        await expect(eventSignup.connect(attendee1).checkIn()).to.emit(eventSignup, "CheckedIn");

        // Check balance after check-in
        const balanceAfter = await token.balanceOf(attendee1.getAddress());
        expect(balanceAfter).to.equal(balanceBefore + BigInt(rewardCost));
    });

    it("Should archive an event successfully", async function () {
        const { factory, owner } = await loadFixture(deployFixture);
        const rewardCost = 10;
        const maxCapacity = 5;
        const signupStartTime = await time.latest();
        const signupEndTime = signupStartTime + 3600;
        const eventStartTime = signupEndTime + 3600;
        const eventEndTime = eventStartTime + 7200;

        await factory.connect(owner).createEvent(
            "Test Event",
            "An amazing event",
            maxCapacity,
            signupStartTime,
            signupEndTime,
            eventStartTime,
            eventEndTime,
            rewardCost
        );

        let activeEvents = await factory.getActiveEvents();
        const eventAddress = activeEvents[0];

        await expect(factory.connect(owner).archiveEvent(eventAddress))
            .to.emit(factory, "EventArchived")
            .withArgs(eventAddress);

        activeEvents = await factory.getActiveEvents();
        expect(activeEvents.length).to.equal(0);

        const inactiveEvents = await factory.getInactiveEvents();
        expect(inactiveEvents.length).to.equal(1);
    });

    it("Should prevent non-owners from archiving an event", async function () {
        const { factory, owner, attendee1 } = await loadFixture(deployFixture);
        const rewardCost = 10;
        const maxCapacity = 5;
        const signupStartTime = await time.latest();
        const signupEndTime = signupStartTime + 3600;
        const eventStartTime = signupEndTime + 3600;
        const eventEndTime = eventStartTime + 7200;

        await factory.connect(owner).createEvent(
            "Test Event",
            "An amazing event",
            maxCapacity,
            signupStartTime,
            signupEndTime,
            eventStartTime,
            eventEndTime,
            rewardCost
        );

        const activeEvents = await factory.getActiveEvents();
        const eventAddress = activeEvents[0];

        await expect(factory.connect(attendee1).archiveEvent(eventAddress))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should return active and inactive event lists correctly", async function () {
        const { factory, owner } = await loadFixture(deployFixture);
        const rewardCost = 10;
        const maxCapacity = 5;
        const signupStartTime = await time.latest();
        const signupEndTime = signupStartTime + 3600;
        const eventStartTime = signupEndTime + 3600;
        const eventEndTime = eventStartTime + 7200;

        await factory.connect(owner).createEvent(
            "Event 1",
            "First event",
            maxCapacity,
            signupStartTime,
            signupEndTime,
            eventStartTime,
            eventEndTime,
            rewardCost
        );

        await factory.connect(owner).createEvent(
            "Event 2",
            "Second event",
            maxCapacity,
            signupStartTime,
            signupEndTime,
            eventStartTime,
            eventEndTime,
            rewardCost
        );

        let activeEvents = await factory.connect(owner).getActiveEvents();
        expect(activeEvents.length).to.equal(2);

        await factory.connect(owner).archiveEvent(activeEvents[0]);

        activeEvents = await factory.connect(owner).getActiveEvents();
        const inactiveEvents = await factory.connect(owner).getInactiveEvents();

        expect(activeEvents.length).to.equal(1);
        expect(inactiveEvents.length).to.equal(1);
    });
});
