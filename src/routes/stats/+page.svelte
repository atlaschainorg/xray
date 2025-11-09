<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { trpcWithQuery } from "$lib/trpc/client";
    import formatMoney from "$lib/util/format-money";
    import { SOL } from "$lib/xray";

    const client = trpcWithQuery($page);
    const params = new URLSearchParams(window.location.search);
    const network = params.get("network");
    const isMainnetValue = network === "mainnet";

    // Price query (server-side is fine for this)
    const price = client.price.createQuery(SOL);

    // Client-side data
    let currentTPS = 0;
    let currentBlockHeight = 0;
    let isLoadingTPS = true;
    let isLoadingBlock = true;
    let tpsError = false;
    let blockError = false;

    // TPS History tracking - 60 minutes at 5-second intervals = 720 data points
    let tpsHistory: { time: string; value: number }[] = [];
    let maxTpsHistoryLength = 720;

    // Price change tracking
    let previousPrice = 0;
    let priceChange = 0;
    let priceChangePercent = 0;

    // Auto-refresh interval
    let refreshInterval: any;

    // Use our proxy endpoint to avoid CORS issues
    const networkParam = network || "testnet";

    // Fetch TPS from CometBFT via proxy
    async function fetchTPS() {
        try {
            isLoadingTPS = true;
            tpsError = false;

            // Get current status to find latest block
            const statusResponse = await fetch(`/api/cometbft/status?network=${networkParam}`);
            const statusData = await statusResponse.json();

            if (statusData.error) {
                throw new Error(statusData.error);
            }

            const latestHeight = parseInt(statusData.result.sync_info.latest_block_height);

            // Get last 10 blocks to calculate TPS
            const numBlocks = 10;
            const minHeight = Math.max(1, latestHeight - numBlocks);

            const blocksResponse = await fetch(`/api/cometbft/blockchain?minHeight=${minHeight}&maxHeight=${latestHeight}&network=${networkParam}`);
            const blocksData = await blocksResponse.json();

            if (blocksData.error) {
                throw new Error(blocksData.error);
            }

            if (!blocksData.result || !blocksData.result.block_metas) {
                currentTPS = 0;
                isLoadingTPS = false;
                return;
            }

            const blocks = blocksData.result.block_metas;

            // Count total transactions
            let totalTxs = 0;
            blocks.forEach((blockMeta: any) => {
                totalTxs += blockMeta.num_txs || 0;
            });

            // Calculate time span
            if (blocks.length < 2) {
                currentTPS = 0;
                isLoadingTPS = false;
                return;
            }

            const firstBlock = blocks[blocks.length - 1];
            const lastBlock = blocks[0];

            console.log("=== Block Data ===");
            console.log("First block height:", firstBlock.header.height);
            console.log("Last block height:", lastBlock.header.height);
            console.log("First block time:", firstBlock.header.time);
            console.log("Last block time:", lastBlock.header.time);

            // Parse timestamps - handle both ISO format and potential nanosecond timestamps
            let firstTime = new Date(firstBlock.header.time).getTime();
            let lastTime = new Date(lastBlock.header.time).getTime();

            // Check if parsing failed (NaN) or if times look like nanoseconds
            if (isNaN(firstTime) || isNaN(lastTime)) {
                console.error("Failed to parse block timestamps");
                currentTPS = 0;
                isLoadingTPS = false;

                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                tpsHistory = [...tpsHistory, { time: timeStr, value: 0 }];
                if (tpsHistory.length > maxTpsHistoryLength) {
                    tpsHistory = tpsHistory.slice(-maxTpsHistoryLength);
                }
                tpsHistory = tpsHistory;
                return;
            }

            const timeDiffMs = lastTime - firstTime;
            const timeSpanSeconds = timeDiffMs / 1000;

            console.log("First time (ms):", firstTime);
            console.log("Last time (ms):", lastTime);
            console.log("Time diff (ms):", timeDiffMs);
            console.log("Time span (sec):", timeSpanSeconds);
            console.log("Total txs:", totalTxs);
            console.log("Blocks count:", blocks.length);

            // Validate time span - must be at least 1 second and less than 1 hour
            // (1 second minimum ensures reasonable TPS calculation)
            if (isNaN(timeSpanSeconds) || timeSpanSeconds < 1 || timeSpanSeconds > 3600) {
                console.error("Invalid time span:", {
                    firstTime,
                    lastTime,
                    reason: timeSpanSeconds < 1 ? "Too short (< 1 sec)" : "Too long or invalid",
                    timeDiffMs,
                    timeSpanSeconds
                });
                currentTPS = 0;
                isLoadingTPS = false;

                // Still add to history with 0 TPS
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                tpsHistory = [...tpsHistory, { time: timeStr, value: 0 }];
                if (tpsHistory.length > maxTpsHistoryLength) {
                    tpsHistory = tpsHistory.slice(-maxTpsHistoryLength);
                }
                tpsHistory = tpsHistory;
                return;
            }

            // Calculate TPS
            let tps = totalTxs / timeSpanSeconds;
            console.log("Raw calculated TPS:", tps);
            console.log("totalTxs:", totalTxs);
            console.log("timeSpanSeconds:", timeSpanSeconds);

            // Comprehensive sanity check - must be done BEFORE any Math operations
            if (!Number.isFinite(tps) || isNaN(tps) || tps < 0) {
                console.error("Invalid TPS (Infinity/NaN/Negative) - setting to 0");
                tps = 0;
            } else if (tps > 100000) {
                console.error("TPS too high (" + tps + ") - clamping to 100000");
                tps = 100000;
            }

            // Now it's safe to do Math operations
            const roundedTPS = Math.round(tps * 100) / 100;

            // Final safety check after rounding
            if (!Number.isFinite(roundedTPS) || isNaN(roundedTPS) || roundedTPS < 0) {
                currentTPS = 0;
            } else if (roundedTPS > 100000) {
                currentTPS = 100000;
            } else {
                currentTPS = roundedTPS;
            }

            console.log("Final TPS (after all checks):", currentTPS);

            // Add to history - always add entry to build up the graph
            const now = new Date();
            const timeStr = now.toLocaleTimeString();

            // Always add to history (not just when value changes)
            tpsHistory = [...tpsHistory, { time: timeStr, value: currentTPS }];

            if (tpsHistory.length > maxTpsHistoryLength) {
                tpsHistory = tpsHistory.slice(-maxTpsHistoryLength);
            }

            console.log("=== TPS Update ===");
            console.log("Current TPS (final):", currentTPS);
            console.log("History length BEFORE add:", tpsHistory.length);

            // Force reactivity update BEFORE logging
            tpsHistory = tpsHistory;

            console.log("History length AFTER add:", tpsHistory.length);
            console.log("Latest 3 entries:", tpsHistory.slice(-3));
            console.log("Full history:", tpsHistory);
            console.log("=================");

            isLoadingTPS = false;
        } catch (error) {
            console.error("Error calculating TPS:", error);
            currentTPS = 0;
            tpsError = true;
            isLoadingTPS = false;
        }
    }

    // Fetch block height from CometBFT via proxy
    async function fetchBlockHeight() {
        try {
            isLoadingBlock = true;
            blockError = false;

            const response = await fetch(`/api/cometbft/status?network=${networkParam}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const blockHeight = parseInt(data.result.sync_info.latest_block_height);

            currentBlockHeight = blockHeight;
            isLoadingBlock = false;
        } catch (error) {
            console.error("Error fetching block height:", error);
            currentBlockHeight = 0;
            blockError = true;
            isLoadingBlock = false;
        }
    }

    onMount(() => {
        // Initial fetch
        fetchTPS();
        fetchBlockHeight();

        // Refresh data every 5 seconds
        refreshInterval = setInterval(() => {
            fetchTPS();
            fetchBlockHeight();
            $price.refetch();
        }, 5000);
    });

    onDestroy(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });

    // Track price changes
    $: if ($price.data !== undefined && !$price.isLoading) {
        if (previousPrice > 0) {
            priceChange = $price.data - previousPrice;
            priceChangePercent = (priceChange / previousPrice) * 100;
        }
        previousPrice = $price.data;
    }

    // Safe TPS display - ensure value is always valid and readable
    $: safeTPS = (() => {
        // Check if currentTPS is a valid, finite number
        if (!Number.isFinite(currentTPS) || isNaN(currentTPS)) {
            return 0;
        }

        // Clamp to reasonable range (0 to 100,000)
        const clamped = Math.max(0, Math.min(100000, currentTPS));

        // Check if still astronomical (scientific notation detection)
        if (clamped > 100000 || clamped !== clamped) {
            return 0;
        }

        return clamped;
    })();
</script>

<div class="min-h-screen bg-black p-8">
    <div class="mx-auto max-w-6xl">
        <h1 class="mb-8 text-4xl font-bold">
            Network Statistics
        </h1>

        <!-- Current Stats Cards -->
        <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <!-- TPS Card -->
            <div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div class="mb-2 text-sm opacity-50">Transactions Per Second</div>
                {#if !isLoadingTPS}
                    <div class="text-4xl font-bold">
                        {safeTPS.toFixed(2)}
                    </div>
                    {#if tpsError}
                        <div class="mt-2 text-xs text-red-500">Connection error</div>
                    {/if}
                {:else}
                    <div class="pulse h-10 w-24 rounded bg-gray-700"></div>
                {/if}
            </div>

            <!-- Price Card -->
            <div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div class="mb-2 text-sm opacity-50">ATLAS/USD</div>
                {#if !$price.isLoading}
                    <div class="text-4xl font-bold">
                        {formatMoney($price.data)}
                    </div>
                    {#if priceChange !== 0}
                        <div class="mt-2 text-sm {priceChange > 0 ? 'text-green-500' : 'text-red-500'}">
                            {priceChange > 0 ? '+' : ''}{formatMoney(priceChange)} ({priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                        </div>
                    {/if}
                {:else}
                    <div class="pulse h-10 w-24 rounded bg-gray-700"></div>
                {/if}
            </div>

            <!-- Block Height Card -->
            <div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div class="mb-2 text-sm opacity-50">Current Block Height</div>
                {#if !isLoadingBlock}
                    <div class="text-4xl font-bold">
                        {currentBlockHeight.toLocaleString()}
                    </div>
                    <div class="mt-2">
                        <a
                            href="/block/{currentBlockHeight}?network={isMainnetValue ? 'mainnet' : 'testnet'}"
                            class="text-sm text-blue-400 hover:text-blue-300"
                        >
                            View Block →
                        </a>
                    </div>
                    {#if blockError}
                        <div class="mt-2 text-xs text-red-500">Connection error</div>
                    {/if}
                {:else}
                    <div class="pulse h-10 w-32 rounded bg-gray-700"></div>
                {/if}
            </div>
        </div>

        <!-- TPS History Chart -->
        <div class="mb-8 rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h2 class="mb-4 text-2xl font-bold">TPS History (Last 60 Minutes)</h2>
            <div class="mb-2 text-xs opacity-50">
                Data points: {tpsHistory.length} / 720 | Auto-refresh every 5 seconds | Showing: {tpsHistory.length > 0 ? Math.round(tpsHistory.length * 5 / 60) : 0} minutes
            </div>
            <div class="relative h-64 rounded bg-gray-950 p-4">
                {#if tpsHistory.length > 0}
                    <!-- Debug info -->
                    <div class="mb-2 text-xs text-yellow-400">
                        Chart showing {tpsHistory.length} bars | Max TPS: {Math.max(...tpsHistory.map(e => e.value), 0).toFixed(2)}
                    </div>
                    <div class="flex h-56 items-end gap-px overflow-x-auto">
                        {#each tpsHistory as entry, idx}
                            {@const maxTps = Math.max(...tpsHistory.map(e => e.value), 1)}
                            {@const heightPercent = maxTps > 0 ? (entry.value / maxTps) * 100 : 0}
                            {@const minHeight = 3}
                            {@const finalHeight = entry.value === 0 ? minHeight : Math.max(heightPercent, minHeight)}
                            <div
                                class="flex flex-shrink-0 flex-col items-center justify-end"
                                style="width: 8px; min-width: 8px;"
                            >
                                <div
                                    class="w-full rounded-t transition-all"
                                    style="height: {finalHeight}%; background: {entry.value === 0 ? 'linear-gradient(to top, #1e3a8a, #1e40af)' : 'linear-gradient(to top, #2563eb, #60a5fa)'};"
                                    title="{entry.time}: {entry.value.toFixed(2)} TPS"
                                ></div>
                            </div>
                        {/each}
                    </div>
                    <div class="mt-2 flex justify-between text-xs opacity-50">
                        <span>{tpsHistory[0]?.time || ''}</span>
                        <span>Current: {safeTPS.toFixed(2)} TPS</span>
                        <span>{tpsHistory[tpsHistory.length - 1]?.time || ''}</span>
                    </div>
                {:else}
                    <div class="flex h-full items-center justify-center flex-col gap-2">
                        <div class="text-gray-500">Collecting first data point...</div>
                        {#if tpsError}
                            <div class="text-red-500 text-sm">Error fetching TPS data - Check if CometBFT is running</div>
                        {:else if !isLoadingTPS}
                            <div class="text-yellow-500 text-sm">Loading...</div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Network Info -->
        <div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h2 class="mb-4 text-2xl font-bold">Network Info</h2>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <div class="text-sm opacity-50">Network</div>
                    <div class="text-lg font-bold capitalize">
                        {network || 'testnet'}
                    </div>
                </div>
                <div>
                    <div class="text-sm opacity-50">Status</div>
                    <div class="flex items-center gap-2">
                        <div class="h-3 w-3 rounded-full bg-green-500"></div>
                        <div class="text-lg font-bold">Online</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
