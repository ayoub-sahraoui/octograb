import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { blockIcons } from "@/components/block-icons";
import {
  blockTypes,
  definition,
  type BlockType,
  type Placement,
} from "@/lib/blueprint";
import { cn } from "@/lib/utils";

export function BlockPalette({
  placement,
  onClose,
  onChoose,
}: {
  placement: Placement | null;
  onClose: () => void;
  onChoose: (type: BlockType) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const visible = blockTypes.filter((type) => {
    const def = definition(type);
    return (
      (category === "All" || category === def.category) &&
      `${def.title} ${def.description}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  return (
    <Dialog
      open={placement !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
        else {
          setSearch("");
          setCategory("All");
        }
      }}
    >
      <DialogContent
        className="flex max-h-[90dvh] max-w-[calc(100vw-24px)] flex-col gap-4 overflow-hidden p-5 sm:max-w-md"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">Add a block</DialogTitle>
          <DialogDescription>
            Choose what happens{" "}
            {placement?.parentId
              ? "inside this container"
              : "next in your workflow"}
            .
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Find a block…"
            aria-label="Find a block"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="Block category">
          {["All", "Actions", "Control", "Data"].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={category === item ? "secondary" : "ghost"}
              aria-pressed={category === item}
              className="h-8 px-2.5 text-xs"
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="min-h-0 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No blocks found. Try another search.
            </p>
          ) : (
            <div className="space-y-1">
              {visible.map((type) => {
                const def = definition(type);
                const Icon = blockIcons[type];
                return (
                  <button
                    key={type}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-muted"
                    onClick={() => {
                      onChoose(type);
                      setSearch("");
                      setCategory("All");
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        def.category === "Actions"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : def.category === "Control"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {def.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                        {def.description}
                      </span>
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
