import { t } from "$lib/trpc/t";
import { z } from "zod";
import http from "http";

export const txSearch = t.procedure
    .input(
        z.object({
            isMainnet: z.boolean(),
            query: z.string(),
            page: z.number().min(1).optional(),
            per_page: z.number().min(1).max(100).optional(),
            order_by: z.enum(["asc", "desc"]).optional(),
        })
    )
    .query(async ({ input }) => {
        const port = input.isMainnet ? 26667 : 26657;
        const page = input.page ?? 1;
        const perPage = input.per_page ?? 20;
        const orderBy = input.order_by ?? "desc";

        try {
            // Build query string
            const queryParams = new URLSearchParams({
                query: input.query,
                page: page.toString(),
                per_page: perPage.toString(),
                order_by: orderBy,
            });

            // Fetch transaction search results from CometBFT
            const searchData = await new Promise<any>((resolve, reject) => {
                const options = {
                    hostname: "127.0.0.1",
                    port: port,
                    path: `/tx_search?${queryParams.toString()}`,
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

            if (searchData.error || !searchData.result) {
                return {
                    txs: [],
                    total_count: 0,
                };
            }

            const result = searchData.result;

            // Parse transactions into simplified format
            const txs = (result.txs || []).map((tx: any) => {
                // Get timestamp in seconds
                const timestampMs = Date.now(); // CometBFT tx_search doesn't include timestamp
                const timestampSec = Math.floor(timestampMs / 1000);

                return {
                    hash: tx.hash,
                    height: parseInt(tx.height),
                    index: tx.index,
                    tx_result: {
                        code: tx.tx_result.code,
                        data: tx.tx_result.data,
                        log: tx.tx_result.log,
                        info: tx.tx_result.info,
                        gas_wanted: tx.tx_result.gas_wanted,
                        gas_used: tx.tx_result.gas_used,
                        events: tx.tx_result.events || [],
                    },
                    tx: tx.tx,
                    timestamp: timestampSec,
                };
            });

            return {
                txs,
                total_count: parseInt(result.total_count || "0"),
            };
        } catch (error) {
            console.error("Error searching transactions:", error);
            return {
                txs: [],
                total_count: 0,
            };
        }
    });
