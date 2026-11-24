import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  Copy,
  Download,
  FileJson2,
  FolderOpen,
  Globe2,
  Layers3,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  Sun,
  Monitor,
  Trash2,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Editor } from "@/components/editor";
import { RunControls } from "@/components/run-panel";
import { flattenBlocks, type Blueprint, type Theme } from "@/lib/blueprint";
import { cn } from "@/lib/utils";
import type { RuntimeStore } from "@/stores/runtime-store";
import type { EditorStore, View } from "@/stores/editor-store";

function download(blueprint: Blueprint) {
  const blob = new Blob([JSON.stringify(blueprint, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${
    blueprint.name
      .trim()
      .replace(/[^a-z0-9_-]+/gi, "-")
      .slice(0, 80) || "blueprint"
  }.octograb.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const navigation = [
  { view: "editor", label: "Blueprint editor", icon: Workflow },
  { view: "blueprints", label: "Saved blueprints", icon: FolderOpen },
] satisfies { view: View; label: string; icon: typeof Workflow }[];

export const App = observer(function App({
  store,
  runtime,
}: {
  store: EditorStore;
  runtime: RuntimeStore;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        store.theme === "dark" || (store.theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [store, store.theme]);

  return (
    <div className="flex h-dvh min-w-[280px] flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4">
        <button
          className="flex items-center gap-2.5 rounded-md text-left"
          onClick={() => store.setView("editor")}
          aria-label="OctoGrab blueprint editor"
        >
          <img
            src="/brand/octograb-mark.webp"
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain"
            draggable={false}
          />
          <span className="text-[17px] font-semibold tracking-[-0.6px]">
            OctoGrab<span className="text-primary">.</span>
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Change theme"
              className="size-8 text-muted-foreground"
            >
              {store.theme === "dark" ? (
                <Moon />
              ) : store.theme === "light" ? (
                <Sun />
              ) : (
                <Monitor />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["light", "dark", "system"] as Theme[]).map((theme) => (
              <DropdownMenuItem
                key={theme}
                onClick={() => store.setTheme(theme)}
              >
                <span className="capitalize">{theme}</span>
                {store.theme === theme && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Main navigation"
          className="flex w-[52px] shrink-0 flex-col items-center gap-2 border-r bg-card px-2 py-4"
        >
          {navigation.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              title={label}
              aria-label={label}
              aria-current={store.view === view ? "page" : undefined}
              data-active={store.view === view}
              className="nav-item relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => store.setView(view)}
            >
              <Icon className="size-[18px]" strokeWidth={1.7} />
            </button>
          ))}
          <div className="mt-auto" />
          <button
            title="Settings"
            aria-label="Settings"
            aria-current={store.view === "settings" ? "page" : undefined}
            data-active={store.view === "settings"}
            className="nav-item relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            onClick={() => store.setView("settings")}
          >
            <Settings2 className="size-[18px]" strokeWidth={1.7} />
          </button>
        </nav>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {store.storageError && (
            <div
              role="alert"
              className="flex gap-2 border-b bg-destructive/10 px-4 py-3 text-xs leading-relaxed text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {store.storageError}
            </div>
          )}
          {store.view === "editor" && (
            <Editor
              store={store}
              runtime={runtime}
              onExport={() => {
                if (store.current) download(store.current);
              }}
            />
          )}
          {store.view === "blueprints" && (
            <Library
              store={store}
              onImport={() => importInput.current?.click()}
              onExport={download}
            />
          )}
          {store.view === "settings" && (
            <Settings
              store={store}
              onImport={() => importInput.current?.click()}
            />
          )}
          {runtime.active && store.view !== "editor" && (
            <RunControls
              runtime={runtime}
              blueprint={runtime.active.blueprint}
              onResults={() => store.setView("editor")}
            />
          )}
          {store.notice && (
            <div
              role="status"
              className="flex shrink-0 items-center gap-2 border-t bg-card px-3 py-3 text-xs leading-relaxed"
            >
              <span className="min-w-0 flex-1">{store.notice}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label="Dismiss message"
                onClick={() => store.setNotice("")}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}
        </main>
      </div>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Import blueprint file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            if (file.size > 1_000_000)
              throw new Error("Blueprint files must be smaller than 1 MB.");
            store.importBlueprint(await file.text());
          } catch (error) {
            store.setNotice(
              error instanceof Error
                ? error.message
                : "The blueprint could not be imported.",
            );
          }
        }}
      />
    </div>
  );
});

const Library = observer(function Library({
  store,
  onImport,
  onExport,
}: {
  store: EditorStore;
  onImport: () => void;
  onExport: (blueprint: Blueprint) => void;
}) {
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const visible = store.blueprints.filter((blueprint) =>
    `${blueprint.name} ${blueprint.description} ${blueprint.startUrl}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="shrink-0 border-b px-4 pb-4 pt-5">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            Your blueprints
          </h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {store.blueprints.length}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Reusable steps, ready to make your own.
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="min-w-0 flex-1" onClick={store.newBlueprint}>
            <Plus className="size-4" />
            New blueprint
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onImport}
            aria-label="Import blueprint"
            title="Import blueprint"
          >
            <Upload className="size-4" />
          </Button>
        </div>
        <Input
          className="mt-3 bg-card"
          placeholder="Find a blueprint…"
          aria-label="Find a blueprint"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <img
              src="/illustrations/blueprint-library.webp"
              alt=""
              width={640}
              height={480}
              className="mb-5 w-48 max-w-full object-contain"
              draggable={false}
            />
            <h2 className="font-medium">
              {search ? "No matching blueprints" : "A fresh workspace"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {search
                ? "Try another name or website."
                : "Create a blueprint or import one to get started."}
            </p>
            {search && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((blueprint) => (
              <article
                key={blueprint.id}
                className="rounded-xl border bg-card p-3.5"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded-lg bg-accent p-2 text-primary">
                    <FileJson2 className="size-4" />
                  </span>
                  <button
                    className="min-w-0 flex-1 rounded text-left"
                    onClick={() => store.openBlueprint(blueprint.id)}
                  >
                    <h2 className="truncate font-medium">
                      {blueprint.name || "Untitled blueprint"}
                    </h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {blueprint.startUrl
                        ? displayWebsite(blueprint.startUrl)
                        : "No starting website"}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        aria-label={`Options for ${blueprint.name || "Untitled blueprint"}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => store.duplicateBlueprint(blueprint.id)}
                      >
                        <Copy />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport(blueprint)}>
                        <Download />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleting(blueprint.id)}
                        className="text-destructive"
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {blueprint.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {blueprint.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers3 className="size-3.5" />
                    {flattenBlocks(blueprint.blocks).length} steps
                  </span>
                  <button
                    className="flex items-center gap-1 text-xs font-medium text-primary"
                    onClick={() => store.openBlueprint(blueprint.id)}
                  >
                    Open
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="max-w-[calc(100vw-24px)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this blueprint?</DialogTitle>
            <DialogDescription>
              This removes the blueprint and its steps from this device. Export
              it first if you want to keep a copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) store.deleteBlueprint(deleting);
                setDeleting(null);
              }}
            >
              Delete blueprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export function displayWebsite(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

const Settings = observer(function Settings({
  store,
  onImport,
}: {
  store: EditorStore;
  onImport: () => void;
}) {
  const choices = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] satisfies { value: Theme; label: string; icon: typeof Sun }[];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-5">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Make your workspace feel like yours.
      </p>
      <section className="mt-7">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">
          Choose a theme, or follow your device.
        </p>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Appearance theme"
        >
          {choices.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              aria-pressed={store.theme === value}
              onClick={() => store.setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border bg-card px-1 py-4 text-xs text-muted-foreground",
                store.theme === value &&
                  "border-primary bg-accent text-primary",
              )}
            >
              <Icon className="size-5" strokeWidth={1.6} />
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-7 border-t pt-5">
        <h2 className="text-sm font-medium">Local workspace</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Blueprint drafts save automatically in this browser. Export a
          blueprint to back it up or move it to another device.
        </p>
        <div className="mt-4 rounded-xl border bg-card px-3 py-3">
          <div className="flex items-center gap-2 text-xs">
            <CheckCheck className="size-4 text-primary" />
            {store.blueprints.length} saved blueprint
            {store.blueprints.length === 1 ? "" : "s"}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Globe2 className="size-4" />
            Website access requested when you pick or run
          </div>
        </div>
        <Button variant="outline" className="mt-4 w-full" onClick={onImport}>
          <Upload className="size-4" />
          Import a blueprint
        </Button>
      </section>
      <section className="mt-7 border-t pt-5">
        <h2 className="text-sm font-medium">This first version</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Pick elements, run nested blocks in your browser, and export saved
          rows. Edit selectors when a website changes. Runs are limited to 1,000
          rows, 250 page visits, and five minutes of active execution.
        </p>
      </section>
    </div>
  );
});
