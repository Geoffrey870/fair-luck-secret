import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Removed 'Cross-Origin-Opener-Policy': 'same-origin' 
      // Base Account SDK requires COEP to not be set to 'same-origin'
      // See: https://docs.base.org/smart-wallet/quickstart#cross-origin-opener-policy
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis', // Required for FHE SDK
  },
  optimizeDeps: {
    include: ['@zama-fhe/relayer-sdk/bundle'], // Include bundle for optimization
  },
}));
