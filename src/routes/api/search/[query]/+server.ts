import { json, type RequestEvent } from "@sveltejs/kit";

// Search for Atlas Chain items (transaction hashes, block heights, addresses)
export async function GET({ params, url }: RequestEvent) {
    const query = params?.query || "";
    const network = url.searchParams.get("network") || "testnet";

    if (!query) {
        return json({ type: "unknown", value: null });
    }

    // Check if it's a number (block height)
    if (/^\d+$/.test(query)) {
        return json({
            type: "block",
            value: parseInt(query),
        });
    }

    // Check if it's a transaction hash (hex string, 64 characters)
    if (/^[0-9A-Fa-f]{64}$/.test(query)) {
        return json({
            type: "transaction",
            value: query.toLowerCase(),
        });
    }

    // Check if it's an account/address (hex string, typically 40 characters for Ethereum-style)
    // Adjust this based on your address format
    if (/^[0-9A-Fa-f]{40,66}$/.test(query)) {
        return json({
            type: "account",
            value: query.toLowerCase(),
        });
    }

    // Default: treat as transaction hash and let the tx page handle "not found"
    return json({
        type: "transaction",
        value: query.toLowerCase(),
    });
}
