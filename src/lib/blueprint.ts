export type ChildSlot = "body" | "then" | "else" | "between";
export type Slot = ChildSlot | "root";
export type ConfigValue = string | number;
export type Theme = "light" | "dark" | "system";

export interface ConfigField {
  key: string;
  label: string;
  kind?: "number" | "select" | "textarea";
  placeholder?: string;
  help?: string;
  required?: boolean;
  added?: boolean;
  min?: number;
  options?: readonly string[];
  default?: ConfigValue;
}

interface BlockDefinition {
  title: string;
  description: string;
  category: "Actions" | "Control" | "Data";
  fields: readonly ConfigField[];
  slots: readonly ChildSlot[];
  mappings?: boolean;
}

const target: ConfigField = {
  key: "selector",
  label: "Element selector",
  placeholder: '.button, #content, a[rel="next"]',
  required: true,
  help: "Enter a CSS selector for the element on the website.",
};
const url: ConfigField = {
  key: "url",
  label: "Website URL",
  placeholder: "https://example.com",
  required: true,
  help: "Use an HTTP URL or a captured value, such as {{detail_url}}.",
};

export const BLOCKS = {
  navigate: {
    title: "Navigate",
    description: "Open a website URL.",
    category: "Actions",
    fields: [url],
    slots: [],
  },
  click: {
    title: "Click",
    description: "Click a button or link.",
    category: "Actions",
    fields: [target],
    slots: [],
  },
  wait: {
    title: "Wait",
    description: "Wait for an element or a delay.",
    category: "Actions",
    fields: [
      {
        key: "mode",
        label: "Wait for",
        kind: "select",
        options: ["Element appears", "Element disappears", "Fixed delay"],
        default: "Element appears",
      },
      target,
      {
        key: "timeout",
        label: "Timeout / delay (milliseconds)",
        kind: "number",
        min: 1,
        default: 20000,
      },
    ],
    slots: [],
  },
  fill: {
    title: "Fill input",
    description: "Enter text into a field.",
    category: "Actions",
    fields: [
      target,
      { key: "value", label: "Text to enter", placeholder: "Search text" },
    ],
    slots: [],
  },
  select: {
    title: "Choose option",
    description: "Choose a native dropdown option.",
    category: "Actions",
    fields: [target, { key: "value", label: "Option value", required: true }],
    slots: [],
  },
  scroll: {
    title: "Scroll",
    description: "Reveal more content on the page.",
    category: "Actions",
    fields: [
      {
        key: "selector",
        label: "Scroll container",
        placeholder: "Leave empty to scroll the page",
      },
      {
        key: "direction",
        label: "Direction",
        kind: "select",
        options: ["Down", "Up"],
        default: "Down",
      },
      {
        key: "distance",
        label: "Distance (pixels)",
        kind: "number",
        min: 1,
        default: 600,
      },
    ],
    slots: [],
  },
  forEach: {
    title: "For each item",
    description: "Repeat steps inside each matched item.",
    category: "Control",
    fields: [
      { ...target, label: "Item selector", placeholder: ".item-card" },
      {
        key: "maxItems",
        label: "Maximum items per pass",
        kind: "number",
        min: 1,
        default: 100,
        added: true,
      },
    ],
    slots: ["body"],
  },
  if: {
    title: "If condition",
    description: "Choose a branch based on the page.",
    category: "Control",
    fields: [
      target,
      {
        key: "condition",
        label: "Condition",
        kind: "select",
        options: ["Element exists", "Element is missing", "Element is visible"],
        default: "Element exists",
      },
    ],
    slots: ["then", "else"],
  },
  repeatUntil: {
    title: "Repeat until",
    description: "Repeat a sequence until a condition is met.",
    category: "Control",
    fields: [
      target,
      {
        key: "condition",
        label: "Stop when",
        kind: "select",
        options: ["Element is missing", "Element exists"],
        default: "Element is missing",
      },
      {
        key: "maxIterations",
        label: "Maximum repetitions",
        kind: "number",
        min: 1,
        default: 25,
      },
    ],
    slots: ["body", "between"],
  },
  withPage: {
    title: "With page",
    description: "Run child steps on another page.",
    category: "Control",
    fields: [url],
    slots: ["body"],
  },
  group: {
    title: "Group",
    description: "Organize related steps together.",
    category: "Control",
    fields: [],
    slots: ["body"],
  },
  stop: {
    title: "Stop",
    description: "End the current loop or blueprint.",
    category: "Control",
    fields: [
      {
        key: "scope",
        label: "Stop",
        kind: "select",
        options: ["Current loop", "Blueprint"],
        default: "Blueprint",
      },
    ],
    slots: [],
  },
  readValues: {
    title: "Read values",
    description: "Capture fields for later steps.",
    category: "Data",
    fields: [],
    slots: [],
    mappings: true,
  },
  transform: {
    title: "Transform value",
    description: "Clean a captured value.",
    category: "Data",
    fields: [
      {
        key: "source",
        label: "Captured value name",
        placeholder: "title",
        required: true,
      },
      {
        key: "operation",
        label: "Operation",
        kind: "select",
        options: ["Trim whitespace", "Replace text", "Split text"],
        default: "Trim whitespace",
      },
      { key: "find", label: "Find text / separator" },
      { key: "replacement", label: "Replacement text" },
      {
        key: "output",
        label: "Save as captured name",
        default: "cleaned_value",
        required: true,
        added: true,
      },
    ],
    slots: [],
  },
  emitRecord: {
    title: "Save row",
    description: "Map fields into one output record.",
    category: "Data",
    fields: [
      {
        key: "dataset",
        label: "Dataset name",
        default: "Results",
        required: true,
      },
      {
        key: "dedupe",
        label: "Unique field name (optional)",
        help: "Skip a row when this field value was already saved in this dataset.",
        default: "",
        added: true,
      },
    ],
    slots: [],
    mappings: true,
  },
} satisfies Record<string, BlockDefinition>;

export type BlockType = keyof typeof BLOCKS;
export const blockTypes = Object.keys(BLOCKS) as BlockType[];
export const slotLabels: Record<ChildSlot, string> = {
  body: "Steps inside",
  then: "When true",
  else: "Otherwise",
  between: "Between repetitions",
};

export interface FieldMapping {
  id: string;
  name: string;
  selector: string;
  read: "text" | "href" | "src" | "value";
  source?: "element" | "captured" | "literal" | "pageUrl";
  value?: string;
  required?: boolean;
}

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  config: Record<string, ConfigValue>;
  fields: FieldMapping[];
  children: Partial<Record<ChildSlot, Block[]>>;
}

export interface Blueprint {
  formatVersion: 1;
  id: string;
  name: string;
  description: string;
  startUrl: string;
  revision: number;
  updatedAt: string;
  blocks: Block[];
}

export interface Placement {
  parentId: string | null;
  slot: Slot;
  index?: number;
}

export function definition(type: BlockType): BlockDefinition {
  return BLOCKS[type];
}

export function createBlock(type: BlockType): Block {
  const def = definition(type);
  return {
    id: crypto.randomUUID(),
    type,
    label: def.title,
    config: Object.fromEntries(
      def.fields.map((field) => [field.key, field.default ?? ""]),
    ),
    fields: def.mappings
      ? [{ id: crypto.randomUUID(), name: "", selector: "", read: "text" }]
      : [],
    children: Object.fromEntries(def.slots.map((slot) => [slot, []])),
  };
}

export function createBlueprint(name = "Untitled blueprint"): Blueprint {
  return {
    formatVersion: 1,
    id: crypto.randomUUID(),
    name,
    description: "",
    startUrl: "",
    revision: 1,
    updatedAt: new Date().toISOString(),
    blocks: [],
  };
}

export function flattenBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => [
    block,
    ...Object.values(block.children).flatMap(flattenBlocks),
  ]);
}

export function findBlock(
  blocks: Block[],
  id: string,
  parentId: string | null = null,
  slot: Slot = "root",
  depth = 0,
):
  | {
      block: Block;
      siblings: Block[];
      index: number;
      parentId: string | null;
      slot: Slot;
      depth: number;
    }
  | undefined {
  for (const [index, block] of blocks.entries()) {
    if (block.id === id)
      return { block, siblings: blocks, index, parentId, slot, depth };
    for (const childSlot of definition(block.type).slots) {
      const found = findBlock(
        block.children[childSlot] ?? [],
        id,
        block.id,
        childSlot,
        depth + 1,
      );
      if (found) return found;
    }
  }
}

export function destination(
  blocks: Block[],
  placement: Placement,
): Block[] | undefined {
  if (!placement.parentId)
    return placement.slot === "root" ? blocks : undefined;
  const parent = findBlock(blocks, placement.parentId)?.block;
  if (
    !parent ||
    !definition(parent.type).slots.includes(placement.slot as ChildSlot)
  )
    return;
  return parent.children[placement.slot as ChildSlot];
}

function treeHeight(block: Block): number {
  const children = Object.values(block.children).flat();
  return 1 + Math.max(0, ...children.map(treeHeight));
}

export function moveBlock(
  blocks: Block[],
  id: string,
  placement: Placement,
): boolean {
  const source = findBlock(blocks, id);
  const target = destination(blocks, placement);
  if (!source || !target) return false;
  if (
    placement.parentId &&
    (placement.parentId === id ||
      findBlock(
        Object.values(source.block.children).flat(),
        placement.parentId,
      ))
  )
    return false;
  const targetDepth = placement.parentId
    ? (findBlock(blocks, placement.parentId)?.depth ?? 0) + 1
    : 0;
  if (targetDepth + treeHeight(source.block) > 12) return false;
  let index = placement.index ?? target.length;
  if (!Number.isInteger(index) || index < 0 || index > target.length)
    return false;
  if (target === source.siblings && source.index < index) index--;
  source.siblings.splice(source.index, 1);
  target.splice(index, 0, source.block);
  return true;
}

export function cloneBlock(block: Block): Block {
  return {
    ...block,
    id: crypto.randomUUID(),
    config: { ...block.config },
    fields: block.fields.map((field) => ({
      ...field,
      id: crypto.randomUUID(),
    })),
    children: Object.fromEntries(
      Object.entries(block.children).map(([slot, children]) => [
        slot,
        children.map(cloneBlock),
      ]),
    ),
  };
}

export function blockIssues(block: Block): string[] {
  const issues: string[] = [];
  for (const field of definition(block.type).fields) {
    if (
      block.type === "wait" &&
      block.config.mode === "Fixed delay" &&
      field.key === "selector"
    )
      continue;
    if (
      block.type === "transform" &&
      block.config.operation === "Trim whitespace" &&
      ["find", "replacement"].includes(field.key)
    )
      continue;
    const value = block.config[field.key];
    if (field.required && (value === undefined || String(value).trim() === ""))
      issues.push(`${field.label} is required.`);
    if (
      field.kind === "number" &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < (field.min ?? 0))
    )
      issues.push(`${field.label} must be at least ${field.min ?? 0}.`);
    if (
      field.key === "url" &&
      value &&
      !isWebsiteUrl(String(value)) &&
      !/\{\{[\w.-]+\}\}/.test(String(value))
    )
      issues.push("Use a complete HTTP or HTTPS URL.");
  }
  if (definition(block.type).mappings) {
    if (!block.fields.length) issues.push("Add at least one field.");
    const names = new Set<string>();
    for (const field of block.fields) {
      if (!field.name.trim()) issues.push("Each field needs a name.");
      if (
        (!field.source || field.source === "element") &&
        !field.selector.trim()
      )
        issues.push("Element fields need a selector.");
      if (field.source === "captured" && !field.value?.trim())
        issues.push("Choose a captured value name.");
      if (["__proto__", "constructor", "prototype"].includes(field.name.trim()))
        issues.push("Choose a different field name.");
      if (names.has(field.name.trim()))
        issues.push("Field names must be unique within this step.");
      names.add(field.name.trim());
    }
  }
  return [...new Set(issues)];
}

export function isWebsiteUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string, max = 2000): string {
  if (typeof value !== "string" || value.length > max)
    throw new Error(`Invalid ${label}.`);
  return value;
}

export function parseBlueprint(value: unknown): Blueprint {
  if (!object(value) || value.formatVersion !== 1)
    throw new Error(
      "This is not a supported OctoGrab blueprint (format version 1).",
    );
  const ids = new Set<string>();
  let count = 0;
  function parseBlocks(value: unknown, depth: number): Block[] {
    if (!Array.isArray(value) || (value.length > 0 && depth > 11))
      throw new Error("Invalid block list or nesting exceeds 12 levels.");
    return value.map((raw): Block => {
      if (
        !object(raw) ||
        typeof raw.type !== "string" ||
        !blockTypes.includes(raw.type as BlockType)
      )
        throw new Error("The blueprint contains an unsupported block.");
      if (++count > 500)
        throw new Error("A blueprint may contain at most 500 blocks.");
      const id = text(raw.id, "block ID", 100);
      if (!id || ids.has(id))
        throw new Error("Block IDs must be nonempty and unique.");
      ids.add(id);
      const type = raw.type as BlockType;
      const def = definition(type);
      if (
        !object(raw.config) ||
        !object(raw.children) ||
        !Array.isArray(raw.fields)
      )
        throw new Error("Invalid block configuration.");
      const config: Record<string, ConfigValue> = {};
      for (const [key, value] of Object.entries(raw.config)) {
        const field = def.fields.find((field) => field.key === key);
        if (
          !field ||
          (typeof value !== "string" && typeof value !== "number") ||
          (typeof value === "number" && !Number.isFinite(value))
        )
          throw new Error(`Invalid configuration in ${def.title}.`);
        if (typeof value === "string" && value.length > 10000)
          throw new Error("A configuration value is too long.");
        if (field.kind === "select" && !field.options?.includes(String(value)))
          throw new Error(`Invalid option in ${def.title}.`);
        if (
          field.kind === "number"
            ? typeof value !== "number" && value !== ""
            : typeof value !== "string"
        )
          throw new Error(`Invalid value type in ${def.title}.`);
        config[key] = value;
      }
      for (const field of def.fields) {
        if (!(field.key in config) && field.added)
          config[field.key] = field.default ?? "";
        else if (!(field.key in config))
          throw new Error(`Missing ${field.label} configuration.`);
      }
      if (raw.fields.length > 100 || (!def.mappings && raw.fields.length > 0))
        throw new Error("Invalid field mappings.");
      const fieldIds = new Set<string>();
      const fields = raw.fields.map((field): FieldMapping => {
        if (
          !object(field) ||
          !["text", "href", "src", "value"].includes(String(field.read))
        )
          throw new Error("Invalid field mapping.");
        const id = text(field.id, "field ID", 100);
        if (!id || fieldIds.has(id))
          throw new Error("Field IDs must be unique.");
        fieldIds.add(id);
        if (
          field.source !== undefined &&
          !["element", "captured", "literal", "pageUrl"].includes(
            String(field.source),
          )
        )
          throw new Error("Invalid field source.");
        if (field.required !== undefined && typeof field.required !== "boolean")
          throw new Error("Invalid required field flag.");
        return {
          id,
          name: text(field.name, "field name", 160),
          selector: text(field.selector, "field selector", 2000),
          read: field.read as FieldMapping["read"],
          ...(field.source !== undefined
            ? { source: field.source as FieldMapping["source"] }
            : {}),
          ...(field.value !== undefined
            ? { value: text(field.value, "field value", 10000) }
            : {}),
          ...(field.required !== undefined ? { required: field.required } : {}),
        };
      });
      if (
        Object.keys(raw.children).some(
          (slot) => !def.slots.includes(slot as ChildSlot),
        )
      )
        throw new Error("A block has an unsupported child slot.");
      const rawChildren = raw.children;
      const children = Object.fromEntries(
        def.slots.map((slot) => [
          slot,
          parseBlocks(rawChildren[slot], depth + 1),
        ]),
      );
      return {
        id,
        type,
        label: text(raw.label, "block label", 160),
        config,
        fields,
        children,
      };
    });
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1)
    throw new Error("Invalid blueprint revision.");
  const updatedAt = text(value.updatedAt, "updated date", 100);
  if (!Number.isFinite(Date.parse(updatedAt)))
    throw new Error("Invalid blueprint date.");
  const id = text(value.id, "blueprint ID", 100);
  if (!id) throw new Error("Missing blueprint ID.");
  return {
    formatVersion: 1,
    id,
    name: text(value.name, "blueprint name", 160),
    description: text(value.description, "description"),
    startUrl: text(value.startUrl, "starting URL", 2048),
    revision: Number(value.revision),
    updatedAt,
    blocks: parseBlocks(value.blocks, 0),
  };
}

export function parseBlueprintFile(content: string): Blueprint {
  if (content.length > 1_000_000)
    throw new Error("Blueprint files must be smaller than 1 MB.");
  try {
    return parseBlueprint(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("The file is not valid JSON.");
    throw error;
  }
}
