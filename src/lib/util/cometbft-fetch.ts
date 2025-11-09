/**
 * Utility function for making HTTP requests to CometBFT
 * Handles timeouts and errors gracefully
 */

export async function cometbftFetch(port: number, path: string, timeout: number = 5000): Promise<any> {
    try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
            signal: AbortSignal.timeout(timeout),
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        // Log the error but don't expose internal details
        console.error(`CometBFT request failed for ${path}:`, error);
        throw error;
    }
}
