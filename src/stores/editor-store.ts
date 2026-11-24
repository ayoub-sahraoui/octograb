import { makeAutoObservable, reaction } from "mobx";
import {
  blockIssues,
  cloneBlock,
  createBlock,
  createBlueprint,
  destination,
  findBlock,
  flattenBlocks,
  moveBlock,
  parseBlueprint,
  parseBlueprintFile,
  type BlockType,
  type ConfigValue,
  type FieldMapping,
  type Placement,
  type Theme,
} from "../lib/blueprint.ts";

export type View = "editor" | "blueprints" | "settings";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
// Drafts use localStorage; run checkpoints and results use IndexedDB.
const STORAGE_KEY = "octograb:workspace:v1";

export class EditorStore {
  blueprints = [createBlueprint()];
  activeBlueprintId = this.blueprints[0]?.id ?? "";
  view: View = "editor";
  theme: Theme = "system";
  selectedBlockId: string | null = null;
  storageError = "";
  notice = "";
  private persistenceBlocked = false;
  private storage: StorageAccess | null;
  private stopPersistence: () => void;

  constructor(storage: StorageAccess | null = null) {
    this.storage = storage;
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved) {
        const workspace = JSON.parse(saved);
        if (
          workspace.version !== 1 ||
          !Array.isArray(workspace.blueprints) ||
          workspace.blueprints.length > 100
        )
          throw new Error("Invalid workspace.");
        const blueprints = workspace.blueprints.map(parseBlueprint);
        if (
          new Set(blueprints.map((b: { id: string }) => b.id)).size !==
          blueprints.length
        )
          throw new Error("Duplicate blueprint IDs.");
        this.blueprints = blueprints;
        this.activeBlueprintId = blueprints.some(
          (b: { id: string }) => b.id === workspace.activeBlueprintId,
        )
          ? workspace.activeBlueprintId
          : (blueprints[0]?.id ?? "");
        if (["light", "dark", "system"].includes(workspace.theme))
          this.theme = workspace.theme;
      }
    } catch {
      this.persistenceBlocked = true;
      this.storageError =
        "Saved data could not be read. Auto-save is disabled to preserve it; export your current work before closing.";
    }
    if (!storage)
      this.storageError =
        "Local storage is unavailable. Export your blueprint before closing.";
    makeAutoObservable<
      EditorStore,
      "storage" | "stopPersistence" | "persistenceBlocked"
    >(
      this,
      { storage: false, stopPersistence: false, persistenceBlocked: false },
      { autoBind: true },
    );
    this.stopPersistence = reaction(
      () => this.serializedWorkspace,
      this.persist,
      { fireImmediately: true },
    );
  }

  get current() {
    return this.blueprints.find(
      (blueprint) => blueprint.id === this.activeBlueprintId,
    );
  }
  get blocks() {
    return this.current ? flattenBlocks(this.current.blocks) : [];
  }
  get selectedBlock() {
    return this.current && this.selectedBlockId
      ? findBlock(this.current.blocks, this.selectedBlockId)?.block
      : undefined;
  }
  get unconfiguredCount() {
    return this.blocks.filter((block) => blockIssues(block).length > 0).length;
  }
  get serializedWorkspace() {
    return JSON.stringify({
      version: 1,
      blueprints: this.blueprints,
      activeBlueprintId: this.activeBlueprintId,
      theme: this.theme,
    });
  }

  private persist(value: string) {
    if (!this.storage || this.persistenceBlocked) return;
    try {
      this.storage.setItem(STORAGE_KEY, value);
      this.storageError = "";
    } catch {
      this.storageError =
        "Changes could not be saved locally. Export your blueprint to keep your work.";
    }
  }

  dispose() {
    this.stopPersistence();
  }
  setView(view: View) {
    this.view = view;
    this.selectedBlockId = null;
  }
  setTheme(theme: Theme) {
    this.theme = theme;
  }
  selectBlock(id: string | null) {
    this.selectedBlockId = id;
  }
  setNotice(message: string) {
    this.notice = message;
  }

  openBlueprint(id: string) {
    if (!this.blueprints.some((blueprint) => blueprint.id === id)) return;
    this.activeBlueprintId = id;
    this.view = "editor";
    this.selectedBlockId = null;
  }

  newBlueprint() {
    if (this.blueprints.length >= 100) {
      this.notice = "You can keep up to 100 blueprints in this workspace.";
      return;
    }
    const blueprint = createBlueprint();
    this.blueprints.unshift(blueprint);
    this.openBlueprint(blueprint.id);
  }

  duplicateBlueprint(id: string) {
    const original = this.blueprints.find((blueprint) => blueprint.id === id);
    if (!original || this.blueprints.length >= 100) return;
    const copy = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} copy`.slice(0, 160),
      revision: 1,
      updatedAt: new Date().toISOString(),
      blocks: original.blocks.map(cloneBlock),
    };
    this.blueprints.unshift(copy);
    this.openBlueprint(copy.id);
    this.notice = "Blueprint duplicated.";
  }

  deleteBlueprint(id: string) {
    this.blueprints = this.blueprints.filter(
      (blueprint) => blueprint.id !== id,
    );
    if (this.activeBlueprintId === id)
      this.activeBlueprintId = this.blueprints[0]?.id ?? "";
    this.selectedBlockId = null;
    this.view = "blueprints";
    this.notice = "Blueprint deleted.";
  }

  touch() {
    if (!this.current) return;
    this.current.updatedAt = new Date().toISOString();
    this.current.revision++;
  }

  updateBlueprint(key: "name" | "description" | "startUrl", value: string) {
    if (!this.current) return;
    this.current[key] = value;
    this.touch();
  }

  addBlock(
    type: BlockType,
    placement: Placement = { parentId: null, slot: "root" },
  ) {
    if (!this.current) return;
    if (this.blocks.length >= 500) {
      this.notice = "A blueprint can contain up to 500 blocks.";
      return;
    }
    const target = destination(this.current.blocks, placement);
    const depth = placement.parentId
      ? (findBlock(this.current.blocks, placement.parentId)?.depth ?? 0) + 1
      : 0;
    if (!target || depth > 11) {
      this.notice = "This step cannot be added at that position.";
      return;
    }
    const block = createBlock(type);
    if (type === "navigate" && this.current.startUrl)
      block.config.url = this.current.startUrl;
    const index = placement.index ?? target.length;
    if (index < 0 || index > target.length) return;
    target.splice(index, 0, block);
    this.touch();
    this.selectedBlockId = block.id;
  }

  updateBlockLabel(value: string) {
    if (this.selectedBlock) {
      this.selectedBlock.label = value;
      this.touch();
    }
  }
  updateConfig(key: string, value: ConfigValue) {
    if (
      this.selectedBlock &&
      (typeof value !== "number" || Number.isFinite(value))
    ) {
      this.selectedBlock.config[key] = value;
      this.touch();
    }
  }

  updateField(
    id: string,
    key: "name" | "selector" | "read" | "source" | "value" | "required",
    value: string | boolean,
  ) {
    const field = this.selectedBlock?.fields.find((field) => field.id === id);
    if (!field) return;
    if (
      key === "read" &&
      !["text", "href", "src", "value"].includes(String(value))
    )
      return;
    if (key === "required") {
      if (typeof value !== "boolean") return;
      field.required = value;
    } else if (typeof value === "string") {
      if (key === "source") {
        if (!["element", "captured", "literal", "pageUrl"].includes(value))
          return;
        field.source = value as FieldMapping["source"];
      } else if (key === "read") field.read = value as FieldMapping["read"];
      else field[key] = value;
    }
    this.touch();
  }

  addField() {
    if (!this.selectedBlock || this.selectedBlock.fields.length >= 100) return;
    this.selectedBlock.fields.push({
      id: crypto.randomUUID(),
      name: "",
      selector: "",
      read: "text",
    });
    this.touch();
  }
  removeField(id: string) {
    if (this.selectedBlock) {
      this.selectedBlock.fields = this.selectedBlock.fields.filter(
        (field) => field.id !== id,
      );
      this.touch();
    }
  }

  move(id: string, placement: Placement) {
    if (!this.current || !moveBlock(this.current.blocks, id, placement)) {
      this.notice =
        "A block cannot be moved into itself, its children, or an invalid slot.";
      return false;
    }
    this.touch();
    return true;
  }

  moveSibling(id: string, direction: -1 | 1) {
    if (!this.current) return;
    const location = findBlock(this.current.blocks, id);
    if (
      !location ||
      location.index + direction < 0 ||
      location.index + direction >= location.siblings.length
    )
      return;
    this.move(id, {
      parentId: location.parentId,
      slot: location.slot,
      index: location.index + (direction > 0 ? 2 : -1),
    });
  }

  duplicateBlock(id: string) {
    if (!this.current) return;
    const location = findBlock(this.current.blocks, id);
    if (!location) return;
    if (this.blocks.length + flattenBlocks([location.block]).length > 500) {
      this.notice = "Duplicating this block would exceed the 500-block limit.";
      return;
    }
    const copy = cloneBlock(location.block);
    location.siblings.splice(location.index + 1, 0, copy);
    this.touch();
    this.selectedBlockId = copy.id;
  }

  removeBlock(id: string) {
    if (!this.current) return;
    const location = findBlock(this.current.blocks, id);
    if (!location) return;
    location.siblings.splice(location.index, 1);
    if (
      this.selectedBlockId === id ||
      !this.blocks.some((block) => block.id === this.selectedBlockId)
    )
      this.selectedBlockId = null;
    this.touch();
  }

  importBlueprint(content: string) {
    if (this.blueprints.length >= 100)
      throw new Error("The workspace already contains 100 blueprints.");
    const blueprint = parseBlueprintFile(content);
    blueprint.id = crypto.randomUUID();
    blueprint.blocks = blueprint.blocks.map(cloneBlock);
    blueprint.updatedAt = new Date().toISOString();
    this.blueprints.unshift(blueprint);
    this.openBlueprint(blueprint.id);
    this.notice = "Blueprint imported.";
  }
}
