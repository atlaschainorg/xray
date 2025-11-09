<script lang="ts">
    import { onMount } from "svelte";

    type NetworkType = "mainnet" | "devnet" | "testnet";
    let selectedNetwork: NetworkType = "testnet";

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        const network = params.get("network") as NetworkType;
        if (network && ["mainnet", "devnet", "testnet"].includes(network)) {
            selectedNetwork = network;
        } else {
            selectedNetwork = "testnet";
        }
    });

    function changeNetwork(event: Event) {
        selectedNetwork = (event.target as HTMLSelectElement).value as NetworkType;
        const params = new URLSearchParams(window.location.search);
        params.set("network", selectedNetwork);
        history.replaceState({}, "", "?" + params.toString());
        history.go(0);
    }

    export let compact = false;
</script>

{#if compact}
    <select
        class="select select-bordered select-sm max-w-xs bg-base-200 text-xs font-semibold"
        bind:value={selectedNetwork}
        on:change={changeNetwork}
    >
        <option value="mainnet">Mainnet</option>
        <option value="testnet">Testnet</option>
        <option value="devnet">Devnet</option>
    </select>
{:else}
    <div class="flex flex-col gap-2">
        <label class="label">
            <span class="label-text font-semibold">Network</span>
        </label>
        <select
            class="select select-bordered w-full max-w-xs bg-base-200"
            bind:value={selectedNetwork}
            on:change={changeNetwork}
        >
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
            <option value="devnet">Devnet</option>
        </select>
    </div>
{/if}
