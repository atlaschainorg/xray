import { t } from "$lib/trpc/t";
import { z } from "zod";
import http from "http";

export const transaction = t.procedure
    .input(
        z.object({
            account: z.string().optional(),
            isMainnet: z.boolean(),
            transaction: z.string(),
        })
    )
    .query(async ({ input }) => {
        try {
            const port = input.isMainnet ? 26667 : 26657;

            // Fetch transaction from CometBFT using tx_search or tx endpoint
            // The transaction hash from the URL is already in hex format
            const txHash = input.transaction.toUpperCase();

            const txData = await new Promise<any>((resolve, reject) => {
                const options = {
                    hostname: "127.0.0.1",
                    port: port,
                    path: `/tx?hash=0x${txHash}`,
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
                            resolve(parsed);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on("error", (error) => {
                    reject(error);
                });

                req.end();
            });

            if (txData.error || !txData.result) {
                return { data: null, error: "Transaction not found" };
            }

            const tx = txData.result;

            // Parse CometBFT transaction into our format
            // Get timestamp in seconds (format-date expects seconds if < 13 digits)
            const timestampMs = Date.now(); // We don't have tx timestamp from CometBFT /tx endpoint
            const timestampSec = Math.floor(timestampMs / 1000);

            const parsed = {
                signature: txHash,
                type: "UNKNOWN",
                source: "ATLAS_CHAIN",
                fee: 0,
                timestamp: timestampSec,
                primaryUser: input.account || "",
                accounts: [],
                actions: [
                    {
                        actionType: "TRANSACTION",
                        amount: 0,
                        from: "",
                        to: "",
                    }
                ],
                raw: {
                    height: tx.height,
                    hash: tx.hash,
                    tx: tx.tx,
                    tx_result: tx.tx_result,
                    index: tx.index,
                },
            };

            return parsed;
        } catch (error) {
            console.error("Error fetching transaction:", error);
            return { data: null, error: "Transaction not found" };
        }
    });
