import { writable } from "svelte/store";
import { browser } from "$app/environment";

export type Theme = "atlas-dark" | "atlas-light";

// Get initial theme from localStorage or default to dark
const getInitialTheme = (): Theme => {
    if (!browser) return "atlas-dark";

    const stored = localStorage.getItem("theme");
    if (stored === "atlas-light" || stored === "atlas-dark") {
        return stored;
    }

    return "atlas-dark";
};

export const theme = writable<Theme>(getInitialTheme());

// Subscribe to theme changes and persist to localStorage
if (browser) {
    theme.subscribe((value) => {
        localStorage.setItem("theme", value);
        document.documentElement.setAttribute("data-theme", value);
    });
}

export function toggleTheme() {
    theme.update((current) =>
        current === "atlas-dark" ? "atlas-light" : "atlas-dark"
    );
}
