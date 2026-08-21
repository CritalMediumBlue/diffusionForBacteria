import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "handy-diffusion": path.resolve(__dirname, "src/index.ts"),
        },
    },
});
