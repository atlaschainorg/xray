//@ts-nocheck
import { t } from "$lib/trpc/t";
import { z } from "zod";
import http from "http";

export const blockTransactions = t.procedure
    .input(
        z.object({
            cursor: z.string().optional(),
            isMainnet: z.boolean(),
            limit: z.number().min(1).max(100).optional(),
            slot: z.number(),
        })
    )
    .output(
        z.object({
            oldest: z.string(),
            result: z.array(
                z.object({
                    accounts: z.array(
                        z.object({
                            account: z.string(),
                            changes: z.array(
                                z.object({
                                    amount: z.number(),
                                    mint: z.string(),
                                })
                            ),
                        })
                    ),
                    actions: z.array(
                        z.object({
                            actionType: z.string(),
                            amount: z.number(),
                            from: z.string(),
                            fromName: z.string().optional(),
                            received: z.string().optional(),
                            sent: z.string().optional(),
                            to: z.string(),
                            toName: z.string().optional(),
                        })
                    ),
                    fee: z.number(),
                    primaryUser: z.string(),
                    raw: z.any(),
                    signature: z.string(),
                    source: z.string(),
                    timestamp: z.number(),
                    type: z.string(),
                })
            ),
        })
    )
    .query(async ({ input }) => {
        const limit = input.limit ?? 100;
        const port = input.isMainnet ? 26667 : 26657;

        try {
            // Fetch block data from CometBFT
            const blockData = await new Promise<any>((resolve, reject) => {
                const options = {
                    hostname: "127.0.0.1",
                    port: port,
                    path: `/block?height=${input.slot}`,
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

            if (!blockData.result || !blockData.result.block) {
                return {
                    oldest: "",
                    result: [],
                };
            }

            const block = blockData.result.block;
            const txs = block.data?.txs || [];

            if (txs.length === 0) {
                return {
                    oldest: "",
                    result: [],
                };
            }

            // Parse transactions from CometBFT block
            const result = txs.map((txData: string, index: number) => {
                // Generate a transaction hash (in CometBFT this would be the tx hash)
                const txHash = Buffer.from(txData, "base64").toString("hex").substring(0, 64);

                // Get timestamp in seconds (format-date expects seconds if < 13 digits)
                const timestampMs = new Date(block.header.time).getTime();
                const timestampSec = Math.floor(timestampMs / 1000);

                return {
                    signature: txHash,
                    type: "UNKNOWN",
                    source: "ATLAS_CHAIN",
                    fee: 0,
                    timestamp: timestampSec,
                    primaryUser: "",
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
                        height: block.header.height,
                        time: block.header.time,
                        txData: txData,
                    },
                };
            });

            // Apply cursor pagination
            let paginatedResult = result;
            if (input.cursor) {
                const cursorIndex = result.findIndex(tx => tx.signature === input.cursor);
                if (cursorIndex >= 0) {
                    paginatedResult = result.slice(cursorIndex + 1);
                }
            }

            // Apply limit
            paginatedResult = paginatedResult.slice(0, limit);

            return {
                oldest: paginatedResult[paginatedResult.length - 1]?.signature || "",
                result: paginatedResult,
            };
        } catch (error) {
            console.error("Error fetching block transactions:", error);
            return {
                oldest: "",
                result: [],
            };
        }
    });
