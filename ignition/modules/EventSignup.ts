// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TestEventSignupModule10", (m) => {
  const now = Math.floor(Date.now() / 1000);
  const signupStartTime = now + 100;
  const signupEndTime = now + 2000;
  const redemptionTime = now + 3000;

  const eventSignup = m.contract("EventSignup", [
    "Blockchain Conference",
    "A conference about blockchain technology",
    2, // Max capacity
    signupStartTime,
    signupEndTime,
    redemptionTime
  ]);

  return { eventSignup };
});
