import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	define: {
		__ENVIRONMENT__: JSON.stringify(process.env.CLOUDFLARE_ENV ?? "production"),
	},
	plugins: [react(), tailwindcss(), cloudflare()],
	server: {
		port: 8787,
	},
});
