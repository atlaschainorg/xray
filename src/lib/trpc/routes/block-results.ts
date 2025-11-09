import { t } from "$lib/trpc/t";
import { z } from "zod";
import http from "http";

export const blockResults = t.procedure
    .input(
        z.object({
            isMainnet: z.boolean(),
            height: z.number(),
        })
    )
    .query(async ({ input }) => {
        const port = input.isMainnet ? 26667 : 26657;

        try {
            // Fetch block results from CometBFT
            const resultsData = await new Promise<any>((resolve, reject) => {
                const options = {
                    hostname: "127.0.0.1",
                    port: port,
                    path: `/block_results?height=${input.height}`,
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

            if (resultsData.error || !resultsData.result) {
                return { data: null, error: "Block results not found" };
            }

            const result = resultsData.result;

            return {
                height: result.height,
                txs_results: result.txs_results || [],
                begin_block_events: result.begin_block_events || [],
                end_block_events: result.end_block_events || [],
                validator_updates: result.validator_updates || [],
                consensus_param_updates: result.consensus_param_updates || null,
                raw: result,
            };
        } catch (error) {
            console.error("Error fetching block results:", error);
            return { data: null, error: "Block results not found" };
        }
    });
