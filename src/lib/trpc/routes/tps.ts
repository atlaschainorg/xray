import { t } from "$lib/trpc/t";
import { z } from "zod";
import { cometbftFetch } from "$lib/util/cometbft-fetch";

export const tps = t.procedure.input(z.boolean()).query(async ({ input }) => {
    const isMainnet = input;
    const port = isMainnet ? 26667 : 26657;

    try {
        // Get current status to find latest block
        const statusData = await cometbftFetch(port, "/status");

        if (statusData.error || !statusData.result) {
            return 0;
        }

        const latestHeight = parseInt(statusData.result.sync_info.latest_block_height);

        // Get last 10 blocks to calculate TPS
        const numBlocks = 10;
        const minHeight = Math.max(1, latestHeight - numBlocks);

        const blocksData = await cometbftFetch(
            port,
            `/blockchain?minHeight=${minHeight}&maxHeight=${latestHeight}`
        );

        if (!blocksData.result || !blocksData.result.block_metas) {
            return 0;
        }

        const blocks = blocksData.result.block_metas;

        // Count total transactions
        let totalTxs = 0;
        blocks.forEach((blockMeta: any) => {
            totalTxs += blockMeta.num_txs || 0;
        });

        // Calculate time span
        if (blocks.length < 2) {
            return 0;
        }

        const firstBlock = blocks[blocks.length - 1];
        const lastBlock = blocks[0];

        const firstTime = new Date(firstBlock.header.time).getTime();
        const lastTime = new Date(lastBlock.header.time).getTime();
        const timeSpanSeconds = (lastTime - firstTime) / 1000;

        // Validate time span
        if (isNaN(timeSpanSeconds) || timeSpanSeconds < 1 || timeSpanSeconds > 3600) {
            return 0;
        }

        // Calculate TPS
        let tps = totalTxs / timeSpanSeconds;

        // Comprehensive sanity check
        if (!Number.isFinite(tps) || isNaN(tps) || tps < 0) {
            tps = 0;
        } else if (tps > 100000) {
            tps = 100000;
        }

        return Math.round(tps * 100) / 100; // Round to 2 decimal places
    } catch (error) {
        console.error("Error calculating TPS:", error);
        return 0;
    }
});
