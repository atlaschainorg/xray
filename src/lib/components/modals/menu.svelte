<script>
    import Network from "../network.svelte";

    // Get current network from URL
    const params = new URLSearchParams(window.location.search);
    const network = params.get("network") || "testnet";
</script>

{#each [
    { name: "Home", url: "/" },
    { name: "Stats", url: `/stats?network=${network}` },
    { name: "About Atlas Chain", url: "https://atlaschain.org" },
    { name: "Contribute", url: "https://github.com/atlaschainorg/xray" }
] as { name, url }}
    <a
        href={url}
        data-sveltekit-reload
        class="btn-ghost btn w-full">{name}</a
    >
{/each}
<Network />
