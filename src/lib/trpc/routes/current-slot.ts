import { t } from "$lib/trpc/t";
import { z } from "zod";
import { cometbftFetch } from "$lib/util/cometbft-fetch";

export const currentSlot = t.procedure
    .input(z.tuple([z.boolean()]))
    .query(async ({ input }) => {
        const [isMainnet] = input;
        const port = isMainnet ? 26667 : 26657;

        try {
            const statusData = await cometbftFetch(port, "/status");

            if (statusData.error || !statusData.result) {
                return 0;
            }

            // Get the latest block height from CometBFT
            const blockHeight = parseInt(statusData.result.sync_info.latest_block_height);

            return blockHeight;
        } catch (error) {
            console.error("Error fetching current block height:", error);
            return 0;
        }
    });
