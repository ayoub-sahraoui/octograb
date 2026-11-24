import { observer } from "mobx-react-lite";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  MousePointer2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blockIcons } from "@/components/block-icons";
import {
  blockIssues,
  definition,
  findBlock,
  flattenBlocks,
  slotLabels,
  type Placement,
} from "@/lib/blueprint";
import type { RuntimeStore } from "@/stores/runtime-store";
import type { EditorStore } from "@/stores/editor-store";

export const BlockSettings = observer(function BlockSettings({
  store,
  onAdd,
  onDelete,
  runtime,
}: {
  store: EditorStore;
  runtime: RuntimeStore;
  onAdd: (placement: Placement) => void;
  onDelete: (id: string) => void;
}) {
  const block = store.selectedBlock;
  const def = block ? definition(block.type) : undefined;
  const Icon = block ? blockIcons[block.type] : null;
  const issues = block ? blockIssues(block) : [];
  const location =
    block && store.current
      ? findBlock(store.current.blocks, block.id)
      : undefined;
  const descendants = new Set(
    block ? flattenBlocks([block]).map((child) => child.id) : [],
  );
  const places: { label: string; placement: Placement }[] = [
    { label: "Top level", placement: { parentId: null, slot: "root" } },
    ...store.blocks
      .filter((parent) => !descendants.has(parent.id))
      .flatMap((parent) =>
        definition(parent.type).slots.map((slot) => ({
          label: `${parent.label || definition(parent.type).title} · ${slotLabels[slot]}`,
          placement: { parentId: parent.id, slot },
        })),
      ),
  ];

  return (
    <Dialog
      open={Boolean(block)}
      onOpenChange={(open) => {
        if (!open) store.selectBlock(null);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] max-w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b p-5 pr-12">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            {Icon && <Icon className="size-5 text-primary" strokeWidth={1.7} />}
            {def?.title}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs">
            {def?.description}
          </DialogDescription>
        </DialogHeader>
        {block && def && (
          <>
            <div className="min-h-0 space-y-5 overflow-y-auto p-5">
              {runtime.error && (
                <p role="alert" className="text-xs text-destructive">
                  {runtime.error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="step-name">Step name</Label>
                <Input
                  id="step-name"
                  value={block.label}
                  maxLength={160}
                  onChange={(event) =>
                    store.updateBlockLabel(event.target.value)
                  }
                  placeholder={def.title}
                />
              </div>
              {def.fields
                .filter(
                  (field) =>
                    !(
                      block.type === "wait" &&
                      block.config.mode === "Fixed delay" &&
                      field.key === "selector"
                    ) &&
                    !(
                      block.type === "transform" &&
                      block.config.operation === "Trim whitespace" &&
                      ["find", "replacement"].includes(field.key)
                    ),
                )
                .map((field) => (
                  <div className="space-y-2" key={field.key}>
                    <Label htmlFor={`config-${field.key}`}>{field.label}</Label>
                    {field.kind === "select" ? (
                      <Select
                        value={String(block.config[field.key])}
                        onValueChange={(value) =>
                          store.updateConfig(field.key, value)
                        }
                      >
                        <SelectTrigger
                          id={`config-${field.key}`}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem value={option} key={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`config-${field.key}`}
                        value={block.config[field.key] ?? ""}
                        onChange={(event) =>
                          store.updateConfig(
                            field.key,
                            field.kind === "number" && event.target.value !== ""
                              ? Number(event.target.value)
                              : event.target.value,
                          )
                        }
                        type={field.kind === "number" ? "number" : "text"}
                        min={field.min}
                        maxLength={field.kind === "number" ? undefined : 2000}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.key === "selector" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={runtime.picking || Boolean(runtime.active)}
                        onClick={() => void runtime.pick(store, block.id)}
                      >
                        <MousePointer2 className="size-3.5" />
                        Pick on website
                      </Button>
                    )}
                    {field.key === "url" && (
                      <p className="text-[11px] text-muted-foreground">
                        Captured names:{" "}
                        {store.blocks
                          .filter((item) => item.type === "readValues")
                          .flatMap((item) =>
                            item.fields.map((mapping) => mapping.name),
                          )
                          .filter(Boolean)
                          .join(", ") || "Add a Read values step first"}
                      </p>
                    )}
                    {field.help && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {field.help}
                      </p>
                    )}
                  </div>
                ))}

              {def.mappings && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      Fields to {block.type === "emitRecord" ? "save" : "read"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {block.fields.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {block.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="space-y-3 rounded-lg border bg-background p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Field {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground"
                            aria-label={`Remove field ${index + 1}`}
                            onClick={() => store.removeField(field.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`field-name-${field.id}`}
                            className="text-xs"
                          >
                            Name
                          </Label>
                          <Input
                            id={`field-name-${field.id}`}
                            value={field.name}
                            maxLength={160}
                            placeholder="e.g. title"
                            onChange={(event) =>
                              store.updateField(
                                field.id,
                                "name",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`field-source-${field.id}`}
                            className="text-xs"
                          >
                            Source
                          </Label>
                          <Select
                            value={field.source ?? "element"}
                            onValueChange={(value) =>
                              store.updateField(field.id, "source", value)
                            }
                          >
                            <SelectTrigger
                              id={`field-source-${field.id}`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="element">
                                Website element
                              </SelectItem>
                              <SelectItem value="captured">
                                Captured value
                              </SelectItem>
                              <SelectItem value="literal">
                                Fixed text
                              </SelectItem>
                              <SelectItem value="pageUrl">
                                Current page URL
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {!field.source || field.source === "element" ? (
                          <div className="space-y-1.5">
                            <Label
                              htmlFor={`field-selector-${field.id}`}
                              className="text-xs"
                            >
                              Element selector
                            </Label>
                            <Input
                              id={`field-selector-${field.id}`}
                              value={field.selector}
                              maxLength={2000}
                              placeholder="e.g. .item-title"
                              onChange={(event) =>
                                store.updateField(
                                  field.id,
                                  "selector",
                                  event.target.value,
                                )
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                runtime.picking || Boolean(runtime.active)
                              }
                              onClick={() =>
                                void runtime.pick(store, block.id, field.id)
                              }
                            >
                              <MousePointer2 className="size-3.5" />
                              Pick on website
                            </Button>
                          </div>
                        ) : (
                          field.source !== "pageUrl" && (
                            <div className="space-y-1.5">
                              <Label
                                htmlFor={`field-value-${field.id}`}
                                className="text-xs"
                              >
                                {field.source === "captured"
                                  ? "Captured name"
                                  : "Text"}
                              </Label>
                              <Input
                                id={`field-value-${field.id}`}
                                value={field.value ?? ""}
                                maxLength={10000}
                                placeholder={
                                  field.source === "captured"
                                    ? "detail_url"
                                    : "Text to save"
                                }
                                onChange={(event) =>
                                  store.updateField(
                                    field.id,
                                    "value",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          )
                        )}
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={field.required !== false}
                            onChange={(event) =>
                              store.updateField(
                                field.id,
                                "required",
                                event.target.checked,
                              )
                            }
                          />
                          Required (optional missing fields save as empty)
                        </label>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`field-read-${field.id}`}
                            className="text-xs"
                          >
                            Read (element source)
                          </Label>
                          <Select
                            value={field.read}
                            onValueChange={(value) =>
                              store.updateField(field.id, "read", value)
                            }
                          >
                            <SelectTrigger
                              className="w-full"
                              id={`field-read-${field.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text content</SelectItem>
                              <SelectItem value="href">
                                Link URL (href)
                              </SelectItem>
                              <SelectItem value="src">
                                Image URL (src)
                              </SelectItem>
                              <SelectItem value="value">Input value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={store.addField}
                    disabled={block.fields.length >= 100}
                  >
                    <Plus className="size-3.5" />
                    Add field
                  </Button>
                </section>
              )}

              {def.slots.length > 0 && (
                <section className="space-y-2">
                  <h3 className="mb-3 text-sm font-medium">Child steps</h3>
                  {def.slots.map((slot) => (
                    <Button
                      key={slot}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => onAdd({ parentId: block.id, slot })}
                    >
                      <Plus className="size-3.5" />
                      {slotLabels[slot]}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {block.children[slot]?.length ?? 0}
                      </span>
                    </Button>
                  ))}
                  {block.type === "repeatUntil" && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Run the steps, check the stop condition, then run the
                      between steps before repeating.
                    </p>
                  )}
                </section>
              )}

              {issues.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                    <AlertCircle className="size-3.5" />
                    Needs setup
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <section className="space-y-2 border-t pt-4">
                <Label htmlFor="move-step">Move this step</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const place = places[Number(value)];
                    if (place) store.move(block.id, place.placement);
                  }}
                >
                  <SelectTrigger id="move-step" className="w-full">
                    <SelectValue placeholder="Choose a container…" />
                  </SelectTrigger>
                  <SelectContent>
                    {places.map((place, index) => (
                      <SelectItem
                        key={`${place.placement.parentId}:${place.placement.slot}`}
                        value={String(index)}
                      >
                        {place.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            </div>
            <div className="flex shrink-0 items-center gap-1 border-t p-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Move step up"
                disabled={!location || location.index === 0}
                onClick={() => store.moveSibling(block.id, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Move step down"
                disabled={
                  !location || location.index === location.siblings.length - 1
                }
                onClick={() => store.moveSibling(block.id, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Duplicate step"
                onClick={() => store.duplicateBlock(block.id)}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                aria-label="Delete step"
                onClick={() => onDelete(block.id)}
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                className="ml-auto"
                size="sm"
                onClick={() => store.selectBlock(null)}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
