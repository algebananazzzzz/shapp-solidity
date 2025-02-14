import { getWelfareContractDetails } from "./WelfareSignup";

getWelfareContractDetails("0x46078aD1DA7fc3711801Fe3D1504C1C6a738bB7F").then(
    (event) => {
        console.log(event.event)
    }
)