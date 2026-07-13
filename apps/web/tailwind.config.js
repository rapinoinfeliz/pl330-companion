/** @type {import('tailwindcss').Config} */
export default { content: ["./index.html", "./src/**/*.{ts,tsx}"], darkMode: "class", theme: { extend: { colors: { ink: "#08110f", panel: "#101c19", mint: "#6ee7b7", amber: "#fbbf24" }, fontFamily: { mono: ["IBM Plex Mono", "ui-monospace", "monospace"] } } }, plugins: [] };
