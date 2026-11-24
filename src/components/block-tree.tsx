import { useState, type DragEvent } from "react";
import { observer } from "mobx-react-lite";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { blockIcons } from "@/components/block-icons";
import {
  blockIssues,
  definition,
  slotLabels,
  type Block,
  type Placement,
  type Slot,
} from "@/lib/blueprint";
import { cn } from "@/lib/utils";
import type { EditorStore } from "@/stores/editor-store";

const DRAG_TYPE = "application/x-octograb-block";

function summary(block: Block) {
  if (block.type === "wait" && block.config.mode === "Fixed delay")
    return `${Number(block.config.timeout) / 1000} second delay`;
  if (block.config.url) return String(block.config.url);
  if (block.config.selector) return String(block.config.selector);
  if (definition(block.type).mappings)
    return `${block.fields.length} field${block.fields.length === 1 ? "" : "s"}${block.type === "emitRecord" ? ` → ${block.config.dataset}` : ""}`;
  if (definition(block.type).slots.length) {
    const count = Object.values(block.children).flat().length;
    return `${count} child step${count === 1 ? "" : "s"}`;
  }
  return definition(block.type).description;
}

function DropZone({
  store,
  placement,
  empty = false,
}: {
  store: EditorStore;
  placement: Placement;
  empty?: boolean;
}) {
  const [over, setOver] = useState(false);
  const accepted = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes(DRAG_TYPE);
  return (
    <div
      className={cn(
        "drop-zone",
        empty &&
          "flex min-h-9 items-center justify-center border border-dashed bg-card/60 text-[10px] text-muted-foreground",
      )}
      data-over={over}
      onDragOver={(event) => {
        if (accepted(event)) {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        if (!accepted(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        try {
          const data = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
          if (typeof data.id === "string") store.move(data.id, placement);
        } catch {
          store.setNotice("That block could not be moved.");
        }
      }}
    >
      {empty && "Drop a step here"}
    </div>
  );
}

export const BlockTree = observer(function BlockTree({
  store,
  blocks,
  parentId,
  slot,
  onAdd,
  onDelete,
}: {
  store: EditorStore;
  blocks: Block[];
  parentId: string | null;
  slot: Slot;
  onAdd: (placement: Placement) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ol
      className="m-0 list-none p-0"
      aria-label={slot === "root" ? "Blueprint steps" : `${slot} steps`}
    >
      {blocks.map((block, index) => {
        const def = definition(block.type);
        const Icon = blockIcons[block.type];
        const needsSetup = blockIssues(block).length > 0;
        return (
          <li key={block.id}>
            <DropZone store={store} placement={{ parentId, slot, index }} />
            <div
              className={cn(
                "block-row flex items-center gap-1 rounded-xl border bg-card px-1.5 py-1.5 shadow-xs",
                store.selectedBlockId === block.id &&
                  "border-primary ring-1 ring-primary/15",
              )}
              draggable
              data-block-id={block.id}
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData(
                  DRAG_TYPE,
                  JSON.stringify({ id: block.id }),
                );
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <span
                title="Drag to move this block; the menu also has move controls"
                className="flex h-9 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/50"
              >
                <GripVertical className="size-3.5" />
              </span>
              <button
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left"
                onClick={() => store.selectBlock(block.id)}
                aria-label={`Configure ${block.label || def.title}`}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    def.category === "Actions"
                      ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      : def.category === "Control"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">
                    {block.label || def.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {needsSetup ? "Needs setup" : summary(block)}
                  </span>
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-label={`Actions for ${block.label || def.title}`}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => store.selectBlock(block.id)}>
                    <Settings2 />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === 0}
                    onClick={() => store.moveSibling(block.id, -1)}
                  >
                    <ArrowUp />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === blocks.length - 1}
                    onClick={() => store.moveSibling(block.id, 1)}
                  >
                    <ArrowDown />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => store.duplicateBlock(block.id)}
                  >
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(block.id)}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {def.slots.map((childSlot) => (
              <div className="block-children pb-1 pt-3" key={childSlot}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
                    {slotLabels[childSlot]}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 text-muted-foreground"
                    aria-label={`Add step to ${block.label} ${childSlot}`}
                    title="Add child step"
                    onClick={() =>
                      onAdd({ parentId: block.id, slot: childSlot })
                    }
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <BlockTree
                  store={store}
                  blocks={block.children[childSlot] ?? []}
                  parentId={block.id}
                  slot={childSlot}
                  onAdd={onAdd}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </li>
        );
      })}
      <li>
        <DropZone
          store={store}
          placement={{ parentId, slot, index: blocks.length }}
          empty={blocks.length === 0 && parentId !== null}
        />
      </li>
    </ol>
  );
});
