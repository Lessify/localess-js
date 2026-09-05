import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { localess } from "@localess/react/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    localess({
      origin: "https://demo.localess.org", // Replace it for your origin
      spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
      token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
      debug: true,
      // Components are auto-discovered from this directory — no manual registry.
      componentsDir: "app/components/localess",
      componentNaming: "camelCase",
    }),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
