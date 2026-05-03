import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev frontend on 5174, /api proxied to service-1 backend.
// Hardcoded port — keep config trivial; bump if SERVICE1_PORT differs.
export default defineConfig({
  plugins: [react()],
  envDir: "../../",
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:8080",
      "/ingest": "http://localhost:8080",
    },
  },
});
