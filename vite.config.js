import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: "VITE_",
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/uploads": { target: apiTarget, changeOrigin: true },
        "/socket.io": { target: apiTarget, ws: true, changeOrigin: true },
      },
    },
  };
});
