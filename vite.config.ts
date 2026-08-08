import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev runs two processes: Vite (client) proxying /api to the Express server.
// Both ports are env-overridable so a stray process on a default port never
// blocks `npm run dev` — and so CI can run on whatever is free.
//   API_PORT / PORT  → Express port that /api is proxied to (default 8787)
//   WEB_PORT         → Vite dev server port (default 5173)
// In production none of this applies: Express serves the built dist/ itself.
const API_PORT = Number(process.env.API_PORT || process.env.PORT || 8787);
const WEB_PORT = Number(process.env.WEB_PORT || 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    proxy: {
      "/api": `http://localhost:${API_PORT}`,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "server/**/*.test.js"],
  },
});
