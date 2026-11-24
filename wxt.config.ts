import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "OctoGrab",
    description:
      "Build reusable website extraction blueprints with visual blocks.",
    permissions: ["sidePanel", "scripting", "activeTab"],
    optional_host_permissions: ["https://*/*", "http://*/*"],
    minimum_chrome_version: "120",
    action: {
      default_title: "Open OctoGrab",
      default_icon: {
        16: "icons/16.png",
        32: "icons/32.png",
        48: "icons/48.png",
      },
    },
    icons: {
      16: "icons/16.png",
      32: "icons/32.png",
      48: "icons/48.png",
      128: "icons/128.png",
    },
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
