import { signer, TokenContract } from "../PolygonContext";
import { getCurrentBalance, getTotalReceivedTokens } from "../utils/Token";
import { CreateWelfareInput, WelfareContract } from "../utils/WelfareSignup";

const FIVE_MINUTES = 5 * 60 * 1000;

async function main() {
    const signupStartTime = new Date(Date.now() + FIVE_MINUTES);
    const signupEndTime = new Date(signupStartTime.getTime() + FIVE_MINUTES);
    const redemptionEndTime = new Date(signupEndTime.getTime() + FIVE_MINUTES * 10);

    const eventDetails: CreateWelfareInput = {
        name: "Blockchain Conference",
        description: "A Web3 Event",
        maxCapacity: 2,
        redemptionCost: 1,
        signupStartTime,
        signupEndTime,
        redemptionEndTime,
    }
    // await WelfareContract.createContract(eventDetails)


    const activeContracts = await WelfareContract.getActiveContracts()

    activeContracts.forEach(contract => { console.log(contract.getDetails()) })

    let eventContract: WelfareContract = activeContracts[0];

    console.log(await eventContract.hasSignedUp())

    await eventContract.signUp()
    await eventContract.redeem()

    const balance = await getCurrentBalance()
    const receivedTokens = await getTotalReceivedTokens()

    console.log(balance, receivedTokens)

}

main().then(() => process.exit(0)).catch((err) => {
    // console.error(err);
    process.exit(1);
});