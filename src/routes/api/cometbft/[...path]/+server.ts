import { json, type RequestEvent } from "@sveltejs/kit";
import http from "http";

export async function GET({ params, url }: RequestEvent) {
    const network = url.searchParams.get("network");
    const isMainnet = network === "mainnet";

    // Use different ports based on network
    const port = isMainnet ? 26667 : 26657;
    const path = params.path || "";

    // Build query string
    const queryString = url.search;
    const fullPath = `/${path}${queryString.replace("?network=" + network, "").replace("&&", "&").replace("?&", "?")}`;

    return new Promise((resolve) => {
        const options = {
            hostname: "127.0.0.1",
            port: port,
            path: fullPath,
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        };

        const req = http.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(json(parsed));
                } catch (error) {
                    resolve(json({ error: "Invalid JSON response" }, { status: 500 }));
                }
            });
        });

        req.on("error", (error) => {
            console.error("CometBFT proxy error:", error);
            resolve(json({ error: error.message }, { status: 500 }));
        });

        req.end();
    });
}
