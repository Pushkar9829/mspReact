import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Dev proxy: the browser talks to the Vite origin only (same-site), so the httpOnly refresh
  // cookie (path /api/v1/auth) is first-party. Point this at the backend you want to use.
  const proxyTarget = process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || "http://127.0.0.1:5000";
  const proxy = { target: proxyTarget, changeOrigin: true, secure: false };

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: "VITE_",
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: {
        "/api": proxy,
        "/uploads": proxy,
        "/socket.io": { ...proxy, ws: true },
      },
    },
    preview: {
      proxy: {
        "/api": proxy,
        "/uploads": proxy,
        "/socket.io": { ...proxy, ws: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[\/](react|react-dom|scheduler|react-router|react-router-dom)[\/]/.test(id)) return "react";
            if (/[\/]@capacitor[\/]/.test(id)) return "capacitor";
            if (/[\/]@tanstack[\/]react-query|[\/]@tanstack[\/]query-core/.test(id)) return "query";
            if (/[\/](react-day-picker|date-fns)[\/]/.test(id)) return "dates";
            if (/[\/](socket\.io-client|engine\.io-client|socket\.io-parser|engine\.io-parser)[\/]/.test(id)) return "realtime";
            return undefined;
          },
        },
      },
    },
  };
});
