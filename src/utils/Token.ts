import { signer, TokenContract } from "../PolygonContext";

export async function getCurrentBalance(): Promise<Number> {
    const address = await signer.getAddress();
    return TokenContract.balanceOf(address);
}

export async function getTotalReceivedTokens(): Promise<Number> {
    return TokenContract.getMyReceivedVolume();
}
