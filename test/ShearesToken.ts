import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ShearesToken Contract", function () {
    let shearesToken: any;
    let admin: any;
    let addr1: any;
    let addr2: any;

    const initialSupply = 1000000; // 1 million tokens

    async function deployShearesTokenFixture() {
        [admin, addr1, addr2] = await ethers.getSigners();

        // Deploy the contract
        const ShearesToken = await ethers.getContractFactory("ShearesToken");
        const shearesToken = await ShearesToken.deploy("ShearesToken", "SHR", initialSupply);
        return shearesToken
    }

    it("Should deploy with the correct initial supply", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const totalSupply = await shearesToken.totalSupply();
        expect(totalSupply).to.equal(initialSupply);

        const adminBalance = await shearesToken.balanceOf(await admin.getAddress());
        expect(adminBalance).to.equal(initialSupply);
    });

    it("Should mint tokens correctly", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const mintAmount = 500;
        await shearesToken.mint(await addr1.getAddress(), mintAmount);

        const addr1Balance = await shearesToken.balanceOf(await addr1.getAddress());
        expect(addr1Balance).to.equal(mintAmount);

        const totalSupply = await shearesToken.totalSupply();
        expect(totalSupply).to.equal(initialSupply + mintAmount);
    });

    it("Should burn tokens correctly", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const burnAmount = 1000;
        await shearesToken.burn(await admin.getAddress(), burnAmount);

        const adminBalance = await shearesToken.balanceOf(await admin.getAddress());
        expect(adminBalance).to.equal(initialSupply - burnAmount);

        const totalSupply = await shearesToken.totalSupply();
        expect(totalSupply).to.equal(initialSupply - burnAmount);
    });

    it("Should correctly calculate circulating supply", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const mintAmount = 5000;
        await shearesToken.mint(await addr1.getAddress(), mintAmount);

        const circulatingSupply = await shearesToken.circulatingSupply();
        expect(circulatingSupply).to.equal(mintAmount);
    });

    it("Should correctly return the admin balance", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const adminBalance = await shearesToken.adminBalance();
        expect(adminBalance).to.equal(initialSupply);
    });

    it("Should pause and unpause the contract", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        await shearesToken.pause();
        await expect(
            shearesToken.transfer(await addr1.getAddress(), 100)
        ).to.be.revertedWith("Pausable: paused");

        await shearesToken.unpause();
        await shearesToken.transfer(await addr1.getAddress(), 100);
        const addr1Balance = await shearesToken.balanceOf(await addr1.getAddress());
        expect(addr1Balance).to.equal(100);
    });

    it("Should only allow minter to mint tokens", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const mintAmount = 1000;
        await expect(
            shearesToken.connect(addr1).mint(await addr1.getAddress(), mintAmount)
        ).to.be.revertedWith(
            `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${await shearesToken.MINTER_ROLE()}`
        );
    });

    it("Should only allow burner to burn tokens", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        const burnAmount = 100;
        await expect(
            shearesToken.connect(addr1).burn(await admin.getAddress(), burnAmount)
        ).to.be.revertedWith(
            `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${await shearesToken.BURNER_ROLE()}`
        );
    });

    it("Should only allow pauser to pause the contract", async function () {
        shearesToken = await loadFixture(deployShearesTokenFixture);

        await expect(shearesToken.connect(addr1).pause()).to.be.revertedWith(
            `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${await shearesToken.PAUSER_ROLE()}`
        );
    });
});
