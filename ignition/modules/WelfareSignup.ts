// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("WelfareSignupModule", (m) => {
    const now = Math.floor(Date.now() / 1000);
    const eventName = "Test Welfare";
    const eventDescription = "A test welfare for redemption";
    const maxCapacity = 3;
    const signupStartTime = now + 60;  // Starts in 1 minute
    const signupEndTime = now + 120;   // Ends in 2 minutes
    const redemptionEndTime = now + 180; // Ends in 3 minutes

    const eventSignup = m.contract("WelfareSignup", [
        eventName,
        eventDescription,
        maxCapacity,
        signupStartTime,
        signupEndTime,
        redemptionEndTime
    ]);

    return { eventSignup };
});
