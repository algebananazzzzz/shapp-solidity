import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("WelfareSignup Contract", function () {
    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;
    let addr4: any;
    let welfareSignup: any;

    const welfareName = "Test Welfare";
    const welfareDescription = "A test welfare for redemption";
    const maxCapacity = 3;
    const signupStartTime = 60;  // Starts in 1 minute
    const signupEndTime = 120;   // Ends in 2 minutes
    const redemptionEndTime = 180; // Ends in 3 minutes
    const redemptionCost = 2;

    async function deployWelfareSignupFixture() {
        // Get the signers (accounts)
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        // Deploy ShearesToken
        const Token = await ethers.getContractFactory("ShearesToken");
        const token = await Token.deploy("ShearesToken", "SHR", 1000000);

        // Deploy the WelfareSignup contract
        const WelfareSignup = await ethers.getContractFactory("WelfareSignup");
        const welfareSignup = await WelfareSignup.deploy(
            welfareName,
            welfareDescription,
            maxCapacity,
            (await time.latest()) + signupStartTime, // Start time is now + 60 seconds
            (await time.latest()) + signupEndTime,   // End time is now + 120 seconds
            (await time.latest()) + redemptionEndTime, // Redemption end time is now + 180 seconds
            redemptionCost,
            token.getAddress()

        );
        await token.transfer(addr1, 50)
        await token.transfer(addr2, 50)
        await token.transfer(addr3, 50)
        await token.transfer(addr4, 50)

        return { token, welfareSignup };
    }

    it("should create the welfare correctly", async function () {
        const { welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        const welfareDetails = await welfareSignup.welfareDetails();
        expect(welfareDetails.name).to.equal(welfareName);
        expect(welfareDetails.description).to.equal(welfareDescription);
        expect(welfareDetails.maxCapacity).to.equal(maxCapacity);
        expect(welfareDetails.signupStartTime).to.be.closeTo((await time.latest()) + signupStartTime, 100);
        expect(welfareDetails.signupEndTime).to.be.closeTo((await time.latest()) + signupEndTime, 100);
        expect(welfareDetails.redemptionEndTime).to.be.closeTo((await time.latest()) + redemptionEndTime, 100);
        expect(welfareDetails.attendeeCount).to.equal(0);
        expect(welfareDetails.isActive).to.equal(true);
    });

    it("should allow user to sign up during signup period", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        const balanceBefore = await token.balanceOf(addr1.getAddress());

        // Fast forward time to the signup start time
        await time.increaseTo((await time.latest()) + signupStartTime + 1);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)

        await welfareSignup.connect(addr1).signUp();

        const welfareDetails = await welfareSignup.welfareDetails();
        expect(welfareDetails.attendeeCount).to.equal(1);
        expect(await welfareSignup.attendees(addr1.address)).to.equal(true);


        // Check balance after check-in
        const balanceAfter = await token.balanceOf(addr1.getAddress());
        expect(balanceAfter).to.equal(balanceBefore - BigInt(redemptionCost));

        const balanceToken = await token.balanceOf(welfareSignup.getAddress());
        expect(balanceToken).to.equal(redemptionCost);
    });

    it("should not allow user to sign up after signup end time", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to after the signup period
        await time.increaseTo((await time.latest()) + signupEndTime + 1);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)
        await expect(welfareSignup.connect(addr1).signUp()).to.be.revertedWith("Signup has ended");
    });

    it("should not allow user to sign up before signup start time", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to before the signup start time
        const currentTime = await time.latest();
        const beforeSignupStartTime = currentTime + signupStartTime - 50;
        await time.increaseTo(beforeSignupStartTime);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)
        await expect(welfareSignup.connect(addr1).signUp()).to.be.revertedWith("Signup has not started yet");
    });

    it("should not allow user to sign up if welfare is full", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to signup period
        await time.increaseTo((await time.latest()) + signupStartTime + 1);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)
        await token.connect(addr2).approve(welfareSignup.target, redemptionCost)
        await token.connect(addr3).approve(welfareSignup.target, redemptionCost)

        // Sign up maxCapacity number of users
        await welfareSignup.connect(addr1).signUp();
        await welfareSignup.connect(addr2).signUp();
        await welfareSignup.connect(addr3).signUp();


        // Try to sign up one more user when the welfare is full
        await expect(welfareSignup.connect(addr4).signUp()).to.be.revertedWith("Welfare is full");
    });

    it("should not allow user to sign up more than once", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to signup period
        await time.increaseTo((await time.latest()) + signupStartTime + 1);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)
        await welfareSignup.connect(addr1).signUp();

        await expect(welfareSignup.connect(addr1).signUp()).to.be.revertedWith("Already signed up");
    });

    it("should allow redemption within the redemption period", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to after signup start time
        await time.increaseTo((await time.latest()) + signupStartTime + 1);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)
        // Sign up the user
        await welfareSignup.connect(addr1).signUp();

        await welfareSignup.connect(addr1).redeem();
        expect(await welfareSignup.redeemed(addr1.address)).to.equal(true);
    });

    it("should not allow redemption after redemption period", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to after redemption end time
        await time.increaseTo((await time.latest()) + redemptionEndTime + 1);

        // Try redemption after the period
        await expect(welfareSignup.connect(addr1).redeem()).to.be.revertedWith("Redemption time has ended");
    });

    it("should not allow redemption if the user has not signed up", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to after signup period
        await time.increaseTo((await time.latest()) + signupEndTime + 1);

        // Try redemption without signing up
        await expect(welfareSignup.connect(addr1).redeem()).to.be.revertedWith("You are not signed up for the welfare");
    });

    it("should not allow redemption more than once", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        // Fast forward time to after signup start time
        await time.increaseTo((await time.latest()) + signupStartTime + 1);

        await token.connect(addr1).approve(welfareSignup.target, redemptionCost)
        // Sign up and redeem
        await welfareSignup.connect(addr1).signUp();

        await welfareSignup.connect(addr1).redeem();

        // Try redemption again
        await expect(welfareSignup.connect(addr1).redeem()).to.be.revertedWith("You have already redeemed your reward");
    });

    it("should allow the creator to deactivate the welfare", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        await welfareSignup.connect(owner).deactivate();
        const welfareDetails = await welfareSignup.welfareDetails();
        expect(welfareDetails.isActive).to.equal(false);

        // Try to sign up after deactivation
        await expect(welfareSignup.connect(addr1).signUp()).to.be.revertedWith("Welfare is not active");
    });

    it("should not allow non-creator to deactivate the welfare", async function () {
        const { token, welfareSignup } = await loadFixture(deployWelfareSignupFixture);

        await expect(welfareSignup.connect(addr1).deactivate()).to.be.revertedWith("Ownable: caller is not the owner");
    });
});
