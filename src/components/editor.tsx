import { useState } from "react";
import { observer } from "mobx-react-lite";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FilePenLine,
  Globe2,
  Plus,
  Settings2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockTree } from "@/components/block-tree";
import { BlockPalette } from "@/components/block-palette";
import { BlockSettings } from "@/components/block-settings";
import {
  findBlock,
  flattenBlocks,
  isWebsiteUrl,
  type Placement,
} from "@/lib/blueprint";
import { RunControls, RunResults } from "./run-panel";
import { catalogBenchmark } from "@/lib/benchmark";
import type { RuntimeStore } from "@/stores/runtime-store";
import type { EditorStore } from "@/stores/editor-store";

export const Editor = observer(function Editor({
  store,
  onExport,
  runtime,
}: {
  store: EditorStore;
  runtime: RuntimeStore;
  onExport: () => void;
}) {
  const [tab, setTab] = useState("workflow");
  const [palette, setPalette] = useState<Placement | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const blueprint = store.current;
  if (!blueprint && runtime.runs.length)
    return (
      <>
        <div className="shrink-0 border-b p-4">
          <Button size="sm" onClick={store.newBlueprint}>
            <Plus />
            New blueprint
          </Button>
        </div>
        <RunResults runtime={runtime} />
        <RunControls runtime={runtime} onResults={() => {}} />
      </>
    );
  if (!blueprint)
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <img
          src="/illustrations/blueprint-builder.webp"
          alt=""
          width={640}
          height={480}
          className="mb-5 w-56 max-w-full object-contain"
          draggable={false}
        />
        <h1 className="text-lg font-semibold">Build your first blueprint</h1>
        <p className="my-3 text-xs leading-relaxed text-muted-foreground">
          Arrange steps to describe what you want to collect.
        </p>
        <Button onClick={store.newBlueprint}>
          <Plus />
          New blueprint
        </Button>
      </div>
    );

  const add = (placement: Placement) => {
    store.selectBlock(null);
    setPalette(placement);
  };
  const remove = (id: string) => {
    store.selectBlock(null);
    setDeleting(id);
  };
  const deleteBlock = deleting
    ? findBlock(blueprint.blocks, deleting)?.block
    : undefined;
  const deleteCount = deleteBlock ? flattenBlocks([deleteBlock]).length : 0;
  return (
    <>
      <div className="shrink-0 px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              YOUR WORKFLOW
            </p>
            <h1 className="truncate text-[19px] font-semibold tracking-[-0.5px]">
              {blueprint.name || "Untitled blueprint"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 size-8 shrink-0 text-muted-foreground"
            aria-label="Export blueprint JSON"
            title="Export blueprint JSON"
            onClick={onExport}
          >
            <Download className="size-4" />
          </Button>
        </div>
        <button
          className="mt-3 flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-xs"
          onClick={() => setTab("details")}
        >
          <Globe2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {blueprint.startUrl || "Set a starting website"}
          </span>
          <Settings2 className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 border-b px-4 pb-3">
          <TabsList className="grid h-9 w-full grid-cols-3 bg-muted">
            <TabsTrigger
              value="workflow"
              className="text-xs text-muted-foreground"
            >
              <Workflow className="mr-1.5 size-3.5" />
              Workflow
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="text-xs text-muted-foreground"
            >
              <FilePenLine className="mr-1.5 size-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="text-xs text-muted-foreground"
            >
              Results
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="workflow"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="workflow-surface min-h-0 flex-1 overflow-y-auto p-4">
            {blueprint.blocks.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <img
                  src="/illustrations/blueprint-builder.webp"
                  alt=""
                  width={640}
                  height={480}
                  className="empty-state-art mb-4 w-56 max-w-full shrink-0 object-contain"
                  draggable={false}
                />
                <h2 className="text-base font-semibold tracking-tight">
                  Every blueprint starts
                  <br />
                  with a first step.
                </h2>
                <p className="mb-4 mt-2 max-w-52 text-xs leading-relaxed text-muted-foreground">
                  Add an action, then connect it to the next thing you want to
                  do.
                </p>
                <Button
                  size="sm"
                  onClick={() => add({ parentId: null, slot: "root" })}
                >
                  <Plus className="size-4" />
                  Add your first block
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Start
                </div>
                <BlockTree
                  store={store}
                  blocks={blueprint.blocks}
                  parentId={null}
                  slot="root"
                  onAdd={add}
                  onDelete={remove}
                />
                <div className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="size-1.5 rounded-full border border-muted-foreground/60" />
                  End of blueprint
                </div>
              </>
            )}
          </div>
          <div className="shrink-0 border-t bg-card p-4">
            <Button
              variant="outline"
              className="w-full border-dashed bg-background"
              onClick={() => add({ parentId: null, slot: "root" })}
            >
              <Plus className="size-4" />
              Add block
              <ChevronDown className="ml-auto size-3.5 text-muted-foreground" />
            </Button>
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                {store.blocks.length} step{store.blocks.length === 1 ? "" : "s"}
                {store.unconfiguredCount > 0 &&
                  ` · ${store.unconfiguredCount} need setup`}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {!store.storageError && (
                  <Check className="size-3 text-primary" />
                )}
                {store.storageError ? "Save unavailable" : "Saved locally"}
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="details"
          className="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden"
        >
          <div className="space-y-5">
            <section className="rounded-xl border bg-card p-3.5 space-y-3">
              <h2 className="text-xs font-medium">Practice catalog</h2>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Create a ready-to-run blueprint for Web Scraper’s public
                practice site. Pagination visits at most four detail pages.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["pagination", "load-more", "last-page"] as const).map(
                  (mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        store.importBlueprint(
                          JSON.stringify(catalogBenchmark(mode)),
                        );
                        setTab("workflow");
                      }}
                    >
                      {mode === "pagination"
                        ? "Pagination + details"
                        : mode === "load-more"
                          ? "Load more"
                          : "Final page"}
                    </Button>
                  ),
                )}
              </div>
            </section>
            <div className="space-y-2">
              <Label htmlFor="blueprint-name">Blueprint name</Label>
              <Input
                id="blueprint-name"
                value={blueprint.name}
                maxLength={160}
                onChange={(event) =>
                  store.updateBlueprint("name", event.target.value)
                }
                placeholder="Untitled blueprint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-url">Starting website</Label>
              <Input
                id="start-url"
                value={blueprint.startUrl}
                maxLength={2048}
                onChange={(event) =>
                  store.updateBlueprint("startUrl", event.target.value)
                }
                placeholder="https://example.com"
                type="url"
                aria-invalid={Boolean(
                  blueprint.startUrl && !isWebsiteUrl(blueprint.startUrl),
                )}
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                The page where this workflow begins.
              </p>
              {blueprint.startUrl && !isWebsiteUrl(blueprint.startUrl) && (
                <p role="alert" className="text-xs text-destructive">
                  Enter a complete HTTP or HTTPS URL.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="blueprint-description">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="blueprint-description"
                value={blueprint.description}
                maxLength={2000}
                onChange={(event) =>
                  store.updateBlueprint("description", event.target.value)
                }
                placeholder="What does this blueprint collect?"
                className="min-h-24 resize-y"
              />
            </div>
            <div className="rounded-xl border bg-card p-3.5">
              <h2 className="text-xs font-medium">Make it reusable</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Give each step a clear name. Use containers to repeat steps or
                choose a different path.
              </p>
              <button
                className="mt-3 flex items-center gap-1 text-xs font-medium text-primary"
                onClick={() => setTab("workflow")}
              >
                Back to your workflow
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </TabsContent>
        <TabsContent
          value="results"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <RunResults runtime={runtime} />
        </TabsContent>
      </Tabs>
      <RunControls
        runtime={runtime}
        blueprint={blueprint}
        onResults={() => setTab("results")}
      />

      <BlockPalette
        placement={palette}
        onClose={() => setPalette(null)}
        onChoose={(type) => {
          if (palette) {
            store.addBlock(type, palette);
            setPalette(null);
          }
        }}
      />
      <BlockSettings
        store={store}
        runtime={runtime}
        onAdd={add}
        onDelete={remove}
      />
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="max-w-[calc(100vw-24px)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete {deleteCount > 1 ? "these steps" : "this step"}?
            </DialogTitle>
            <DialogDescription>
              {deleteCount > 1
                ? `This removes the container and all ${deleteCount - 1} steps inside it.`
                : "This removes the step from your blueprint."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) store.removeBlock(deleting);
                setDeleting(null);
              }}
            >
              Delete {deleteCount > 1 ? "steps" : "step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
