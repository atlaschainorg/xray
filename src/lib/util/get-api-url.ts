// Atlas ABCI Application Endpoints
export function getAPIUrl(path: string, isMainnet: boolean = false) {
    // Default to testnet (ABCI Node 1) unless mainnet is explicitly true
    const baseUrl = isMainnet
        ? "http://localhost:26658" // ABCI Primary - Mainnet
        : "http://localhost:26659"; // ABCI Node 1 - Testnet/Devnet
    // Remove API key from path if present
    const cleanPath = path.replace(/\?api-key=[^&]*&?/g, '?').replace(/\?$/, '');
    return `${baseUrl}${cleanPath}`;
}
