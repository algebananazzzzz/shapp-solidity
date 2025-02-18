import { ethers } from "hardhat";

let TokenContract: any | null = null;
let EventFactoryContract: any | null = null;
let WelfareFactoryContract: any | null = null;

export async function getTokenContract() {
    if (!TokenContract) {
        const Token = await ethers.getContractFactory("Token");
        TokenContract = await Token.deploy(" Token", "SHR", 100000);
        console.log("Token contract deployed to:", await TokenContract.getAddress());
    }
    return TokenContract
}

export async function getEventFactoryContract() {
    if (!EventFactoryContract) {
        const TokenContract = await getTokenContract()
        const EventFactory = await ethers.getContractFactory("EventFactory");
        EventFactoryContract = await EventFactory.deploy(TokenContract.getAddress());
        await TokenContract.transfer(EventFactoryContract.getAddress(), 10000);

        console.log("EventFactory contract deployed to:", await EventFactoryContract.getAddress());
    }

    return EventFactoryContract
}

export async function getWelfareFactoryContract() {
    if (!WelfareFactoryContract) {
        const WelfareFactory = await ethers.getContractFactory("WelfareFactory");
        WelfareFactoryContract = await WelfareFactory.deploy((await getTokenContract()).getAddress());
        console.log("WelfareFactory contract deployed to:", await WelfareFactoryContract.getAddress());
    }

    return WelfareFactoryContract
}


export async function getSigner() {
    const [treasury, owner, attendee1] = await ethers.getSigners();
    return attendee1
}