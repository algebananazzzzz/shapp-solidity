// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_AMT: bigint = 10_000n;
const INITIAL_FACTORY_AMT: bigint = 1_000n;

const TokenModule = buildModule("TokenModule", (m) => {
    const name = "Hall Welfare Token";
    const symbol = "HWT";
    const initialSupply = m.getParameter("lockedAmount", INITIAL_AMT);
    const initialFactorySupply = m.getParameter("lockedAmount", INITIAL_FACTORY_AMT);

    const token = m.contract("Token", [name, symbol, initialSupply]);

    const eventFactory = m.contract("EventFactory", [token])
    const welfareFactory = m.contract("WelfareFactory", [token])

    m.call(token, "transfer", [eventFactory, initialFactorySupply]);

    return { token, eventFactory, welfareFactory };
});

export default TokenModule;
