import { signer, TokenContract } from "../PolygonContext";
import { EventContract, CreateEventInput } from "../utils/EventSignup";
import { getCurrentBalance, getTotalReceivedTokens } from "../utils/Token";

const FIVE_MINUTES = 5 * 60 * 1000;

async function main() {
    const signupStartTime = new Date(Date.now() + FIVE_MINUTES);
    const signupEndTime = new Date(signupStartTime.getTime() + FIVE_MINUTES);
    const eventStartTime = new Date(signupEndTime.getTime() + FIVE_MINUTES);
    const eventEndTime = new Date(eventStartTime.getTime() + FIVE_MINUTES);

    const eventDetails: CreateEventInput = {
        name: "Blockchain Conference",
        description: "A Web3 Event",
        maxCapacity: 2,
        rewardCost: 1,
        signupStartTime,
        signupEndTime,
        eventStartTime,
        eventEndTime,
    }
    // await EventContract.createContract(eventDetails)


    const activeContracts = await EventContract.getActiveContracts()

    activeContracts.forEach(contract => { console.log(contract.getDetails()) })

    let eventContract: EventContract = activeContracts[1];

    console.log(await eventContract.hasSignedUp())

    await eventContract.signUp("Metadata 1")
    await eventContract.checkIn()

    const balance = await getCurrentBalance()
    const receivedTokens = await getTotalReceivedTokens()
    const metadata = await eventContract.getMetadata()
    console.log(balance, metadata, receivedTokens)

}

main().then(() => process.exit(0)).catch((err) => {
    // console.error(err);
    process.exit(1);
});