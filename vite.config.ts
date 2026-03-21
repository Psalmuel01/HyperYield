import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@reown/appkit-scaffold-ui/basic": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/w3m-modal": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/embedded-wallet": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/email": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/socials": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/swaps": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/send": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/receive": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/onramp": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/transactions": path.resolve(__dirname, "./src/shims/reown/noop.ts"),
      "@reown/appkit-scaffold-ui/utils": path.resolve(__dirname, "./src/shims/reown/utils.ts"),
    },
  },
}));
