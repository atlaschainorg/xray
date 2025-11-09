import { t } from "$lib/trpc/t";
import { z } from "zod";
import http from "http";

export const latestBlocks = t.procedure
    .input(
        z.object({
            isMainnet: z.boolean(),
            limit: z.number().min(1).max(100).optional(),
        })
    )
    .query(async ({ input }) => {
        const limit = input.limit ?? 20;
        const port = input.isMainnet ? 26667 : 26657;

        try {
            // First, get current block height
            const statusData = await new Promise<any>((resolve, reject) => {
                const options = {
                    hostname: "127.0.0.1",
                    port: port,
                    path: "/status",
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

            if (statusData.error || !statusData.result) {
                return [];
            }

            const latestHeight = parseInt(statusData.result.sync_info.latest_block_height);
            const minHeight = Math.max(1, latestHeight - limit + 1);

            // Fetch blockchain data
            const blocksData = await new Promise<any>((resolve, reject) => {
                const options = {
                    hostname: "127.0.0.1",
                    port: port,
                    path: `/blockchain?minHeight=${minHeight}&maxHeight=${latestHeight}`,
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

            if (blocksData.error || !blocksData.result || !blocksData.result.block_metas) {
                return [];
            }

            // Parse block metas into simplified format
            const blocks = blocksData.result.block_metas.map((blockMeta: any) => {
                const timestampMs = new Date(blockMeta.header.time).getTime();
                const timestampSec = Math.floor(timestampMs / 1000);

                return {
                    height: parseInt(blockMeta.header.height),
                    timestamp: timestampSec,
                    numTxs: blockMeta.num_txs || 0,
                    proposer: blockMeta.header.proposer_address,
                    hash: blockMeta.block_id.hash,
                };
            });

            // Return in reverse order (newest first)
            return blocks.reverse();
        } catch (error) {
            console.error("Error fetching latest blocks:", error);
            return [];
        }
    });
