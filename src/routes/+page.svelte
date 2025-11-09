<style>
    .intro {
        min-height: 65vh;
    }

    .transition-section {
        border-radius: 100%;
    }
</style>

<script lang="ts">
    import { onMount } from "svelte";

    import { fly } from "svelte/transition";

    import Icon from "$lib/components/icon.svelte";
    import Search from "$lib/components/search.svelte";
    import IntersectionObserver from "svelte-intersection-observer";

    import { browser } from "$app/environment";
    // @ts-ignore
    import { LottiePlayer } from "@lottiefiles/svelte-lottie-player";

    let searchError = "";

    let exploreELement: HTMLElement;
    let atlasElement: HTMLElement;

    let isFocused = false;

    let clearSearch = () => null;
    let focusInput = () => null;

    onMount(() => {
        setTimeout(() => {
            focusInput();
        }, 100);
    });
</script>

<div class="relative flex h-screen w-full flex-col items-center justify-center px-4">
    <div class="mx-auto w-full max-w-2xl text-center">
        <div class="mb-12 sm:mb-16">
            <h1 class="text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl">
                Summit Explorer
            </h1>
            <p class="mt-4 text-sm opacity-60 sm:text-base">
                Atlas Blockchain Explorer
            </p>
        </div>

        <div class="relative w-full">
            <Search
                size="lg"
                {searchError}
                bind:focusInput
                bind:clearSearch
                on:focusin={() => (isFocused = true)}
                on:focusout={() => (isFocused = false)}
            />
        </div>
    </div>
</div>

<!-- Features section removed for cleaner Orb-style UX -->
<!-- Uncomment below if you want to show features later -->
<!--
<IntersectionObserver
    once={true}
    rootMargin="100px"
    element={exploreELement}
    let:intersecting
>
    <section
        bind:this={exploreELement}
        class="transition-section relative z-10 mx-auto overflow-hidden bg-black py-24"
    >
        {#if intersecting}
            <div
                class="relative mx-auto max-w-2xl text-center"
                in:fly={{
                    duration: 750,
                    y: 100,
                }}
            >
                <h1 class="my-4 text-6xl font-bold">
                    <span
                        class="bg-gradient-to-br from-orange-700 to-yellow-400 bg-clip-text text-transparent"
                    >
                        Explore
                    </span>
                    the Atlas Blockchain
                </h1>
            </div>
        {/if}
    </section>
    <section class="px- mx-auto mb-20 max-w-6xl py-10">
        <div class="mx-auto grid grid-cols-1 gap-10 px-5 md:grid-cols-3">
            <div>
                <div class="rounded-lg">
                    <div
                        class="mb-5 flex h-12 w-12 items-center justify-center rounded-full border"
                    >
                        <Icon
                            id="lightning"
                            size="lg"
                        />
                    </div>

                    <div>
                        <h1 class="text-xl font-bold">Explorer</h1>
                        <p class="opacity-50">
                            We categorize and parse transaction data to provide
                            an interface that intuitively groups transaction
                            history by type.
                        </p>
                    </div>
                </div>
            </div>
            <div>
                <div class="rounded-lg">
                    <div
                        class="mb-5 flex h-12 w-12 items-center justify-center rounded-full border"
                    >
                        <Icon
                            id="sale"
                            size="lg"
                        />
                    </div>

                    <div>
                        <h1 class="text-xl font-bold">NFT Buy/Sell History</h1>
                        <p class="opacity-50">
                            View the NFTs and tokens held by a specified account
                            or the transaction history of a particular token.
                            This lets you do things like see all of the bids,
                            sales, listings on a certain NFT.
                        </p>
                    </div>
                </div>
            </div>
            <div>
                <div class="rounded-lg">
                    <div
                        class="mb-5 flex h-12 w-12 items-center justify-center rounded-full border"
                    >
                        <h1>.sol</h1>
                    </div>

                    <div>
                        <h1 class="text-xl font-bold">Lookup by Domain</h1>
                        <p class="opacity-50">
                            Not only can you lookup any account, token or
                            transaction, you can also search .sol, .abc, .poor,
                            and .bonk domains.
                        </p>
                    </div>
                </div>
            </div>
            <div>
                <div class="rounded-lg">
                    <div
                        class="mb-5 flex h-12 w-12 items-center justify-center rounded-full border"
                    >
                        <h1>🎒</h1>
                    </div>
                </div>
            </div>
        </div>
    </section>
</IntersectionObserver>
-->
