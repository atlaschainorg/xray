// Atlas local validator network RPC URLs
export function getRPCUrl(path: string, isMainnet: boolean = false) {
    // Default to testnet (localhost:26657) unless mainnet is explicitly true
    const baseUrl = isMainnet
        ? "http://localhost:26667" // Validator 1 (Primary) - Mainnet
        : "http://localhost:26657"; // CometBFT RPC - Testnet/Devnet
    // Remove leading slash from path if present and API key query params
    const cleanPath = path.replace(/^\//, '').replace(/\?api-key=.*$/, '');
    return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
}
