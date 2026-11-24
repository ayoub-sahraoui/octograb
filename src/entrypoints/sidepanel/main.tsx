import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/app";
import { EditorStore } from "@/stores/editor-store";
import { RuntimeStore } from "@/stores/runtime-store";
import "@/styles.css";

let storage: Storage | null = null;
try {
  storage = window.localStorage;
} catch {
  /* Storage failures are shown by the editor. */
}
const store = new EditorStore(storage);
const runtime = new RuntimeStore();
import.meta.hot?.dispose(() => {
  store.dispose();
  runtime.dispose();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App store={store} runtime={runtime} />
  </StrictMode>,
);
