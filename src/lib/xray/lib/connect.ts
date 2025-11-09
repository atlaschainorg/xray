import { Connection } from "@solana/web3.js";

const networks = {
    devnet: `http://localhost:26657`, // CometBFT RPC - Single Node Testing
    testnet: `http://localhost:26657`, // CometBFT RPC - Testnet (same as devnet for now)
    mainnet: `http://localhost:26667`, // Validator 1 (Primary)
    atlasMainnet: `http://localhost:26667`, // Validator 1 (Primary)
    validator1: `http://localhost:26667`, // Validator 1 (Primary)
    validator2: `http://localhost:26668`, // Validator 2
    validator3: `http://localhost:26669`, // Validator 3
    validator4: `http://localhost:26670`, // Validator 4
};

export type Network = keyof typeof networks;

export const connect = (network: Network = "testnet", apiKey?: string) => {
    let url = networks[network];

    // No API key needed for local validators
    // if (apiKey) {
    //     url += `?api-key=${apiKey}`;
    // }

    return new Connection(url, "confirmed");
};
