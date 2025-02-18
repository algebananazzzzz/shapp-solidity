import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ShearesToken", function () {
    async function deployTokenFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("ShearesToken");
        const token = await Token.deploy("Sheares Token", "SHR", 1000);

        const MINTER_ROLE = await token.MINTER_ROLE();
        const BURNER_ROLE = await token.BURNER_ROLE();
        const PAUSER_ROLE = await token.PAUSER_ROLE();

        return { token, owner, addr1, addr2, addr3, MINTER_ROLE, BURNER_ROLE, PAUSER_ROLE };
    }

    it("Should assign initial supply to the admin", async function () {
        const { token, owner } = await loadFixture(deployTokenFixture);
        const adminBalance = await token.balanceOf(owner.address);
        expect(adminBalance).to.equal(1000);
    });

    it("Should allow only MINTER_ROLE to mint tokens", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.mint(addr1.address, 100);
        expect(await token.balanceOf(addr1.address)).to.equal(100);
    });

    it("Should prevent non-minters from minting", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await expect(token.connect(addr1).mint(addr1.address, 50))
            .to.be.revertedWith(`AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${await token.MINTER_ROLE()}`);
    });

    it("Should allow only BURNER_ROLE to burn tokens", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.mint(addr1.address, 100);
        await token.burn(addr1.address, 50);
        expect(await token.balanceOf(addr1.address)).to.equal(50);
    });

    it("Should prevent non-burners from burning", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.mint(addr1.address, 50);
        await expect(token.connect(addr1).burn(addr1.address, 10))
            .to.be.revertedWith(
                `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${await token.BURNER_ROLE()}`);
    });

    it("Should allow only PAUSER_ROLE to pause and unpause", async function () {
        const { token } = await loadFixture(deployTokenFixture);
        await token.pause();
        expect(await token.paused()).to.be.true;

        await token.unpause();
        expect(await token.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.pause();
        await expect(token.transfer(addr1.address, 10))
            .to.be.revertedWith("Pausable: paused");
    });

    it("Should allow transfers when unpaused", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.transfer(addr1.address, 10);
        expect(await token.balanceOf(addr1.address)).to.equal(10);
    });

    it("Should calculate circulating supply correctly", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.mint(addr1.address, 200);
        const circulating = await token.circulatingSupply();
        expect(circulating).to.equal(200);
    });

    it("Should return admin balance correctly", async function () {
        const { token, owner } = await loadFixture(deployTokenFixture);
        const adminBalance = await token.adminBalance();
        expect(adminBalance).to.equal(await token.balanceOf(owner.address));
    });

    it("Should prevent burning more tokens than available", async function () {
        const { token, addr1 } = await loadFixture(deployTokenFixture);
        await token.mint(addr1.address, 50);
        await expect(token.burn(addr1.address, 100))
            .to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
});