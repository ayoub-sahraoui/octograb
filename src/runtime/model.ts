import {
  blockIssues,
  flattenBlocks,
  isWebsiteUrl,
  parseBlueprint,
  type Blueprint,
  type FieldMapping,
} from "../lib/blueprint.ts";

export type Value = string | string[] | null;
export type Values = Record<string, Value>;
export interface Scope {
  selector: string;
  index: number;
  identity: string;
}
export interface Context {
  tabId: number;
  document: string;
  scopes: Scope[];
  values: Values;
  path: string;
}
export interface Frame {
  kind: "sequence" | "items" | "repeat" | "page";
  context: Context;
  ids: string[];
  index: number;
  blockId?: string;
  items?: Scope[];
  phase?: "body" | "check" | "between";
}
export interface RecordRow {
  id: string;
  dataset: string;
  values: Values;
  pageUrl: string;
}
export interface Run {
  id: string;
  blueprint: Blueprint;
  status:
    "running" | "paused" | "completed" | "stopped" | "failed" | "interrupted";
  createdAt: string;
  updatedAt: string;
  allowedOrigins: string[];
  frames: Frame[];
  rows: RecordRow[];
  ownedTabs: number[];
  currentBlockId: string;
  error: string;
  note: string;
  commands: number;
  navigations: number;
  elapsedMs: number;
  pending: boolean;
}
export interface PageCommand {
  action:
    | "hello"
    | "collect"
    | "condition"
    | "read"
    | "click"
    | "fill"
    | "select"
    | "scroll"
    | "pick"
    | "cancelPick";
  selector?: string;
  scopes?: Scope[];
  document?: string;
  fields?: FieldMapping[];
  value?: string;
  condition?: string;
  direction?: string;
  distance?: number;
  allowedOrigins?: string[];
  multiple?: boolean;
  pickId?: string;
}
export interface PageReply {
  document: string;
  url: string;
  items?: Scope[];
  values?: Values;
  condition?: boolean;
  selector?: string;
  count?: number;
  example?: string;
  cancelled?: boolean;
}
export const LIMITS = {
  rows: 1000,
  navigations: 250,
  commands: 10000,
  duration: 300000,
};
export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
export function binding(template: string, values: Values): string {
  return template.replace(/\{\{([\w.-]+)\}\}/g, (_, name: string) => {
    if (!Object.hasOwn(values, name) || values[name] === null)
      throw new Error(`Captured value “${name}” is missing.`);
    if (Array.isArray(values[name]))
      throw new Error(`“${name}” is a list; use a text value here.`);
    return values[name] as string;
  });
}
export function website(value: string): URL {
  if (!isWebsiteUrl(value))
    throw new Error("Use a complete HTTP or HTTPS website URL.");
  const url = new URL(value);
  if (url.username || url.password)
    throw new Error("Website URLs cannot contain credentials.");
  return url;
}
export function assertOrigin(value: string, origins: string[]) {
  const url = website(value);
  if (!origins.includes(url.origin))
    throw new Error(
      `Website access for ${url.origin} was not included in this run. Add its URL to the blueprint and start again.`,
    );
  return url.href;
}
export function prepareBlueprint(raw: unknown) {
  const blueprint = parseBlueprint(raw);
  const origins = new Set([website(blueprint.startUrl).origin]);
  if (!blueprint.blocks.length)
    throw new Error("Add at least one block before running.");
  for (const block of flattenBlocks(blueprint.blocks)) {
    const issues = blockIssues(block);
    if (issues.length) throw new Error(`${block.label}: ${issues.join(" ")}`);
    for (const key of ["maxItems", "maxIterations"]) {
      if (
        block.config[key] !== undefined &&
        (!Number.isInteger(block.config[key]) ||
          Number(block.config[key]) > 1000)
      )
        throw new Error(
          `${block.label}: ${key} must be a whole number between 1 and 1000.`,
        );
    }
    if (block.type === "wait" && Number(block.config.timeout) > 60000)
      throw new Error("Each wait must be at most 60 seconds.");
    if (
      ["navigate", "withPage"].includes(block.type) &&
      !String(block.config.url).includes("{{")
    )
      origins.add(website(String(block.config.url)).origin);
  }
  return { blueprint, origins: [...origins] };
}
export function sequence(ids: string[], context: Context): Frame {
  return { kind: "sequence", ids, index: 0, context };
}
export function newRun(
  blueprint: Blueprint,
  allowedOrigins: string[],
  tabId: number,
): Run {
  return {
    id: crypto.randomUUID(),
    blueprint,
    allowedOrigins,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    frames: [
      sequence(
        blueprint.blocks.map((b) => b.id),
        { tabId, document: "", scopes: [], values: {}, path: "root" },
      ),
    ],
    rows: [],
    ownedTabs: [tabId],
    currentBlockId: "",
    error: "",
    note: "",
    commands: 0,
    navigations: 1,
    elapsedMs: 0,
    pending: false,
  };
}
export function addRecord(run: Run, row: RecordRow, uniqueField: string) {
  if (
    uniqueField &&
    (!Object.hasOwn(row.values, uniqueField) ||
      row.values[uniqueField] === null ||
      row.values[uniqueField] === "")
  )
    throw new Error(`Unique field “${uniqueField}” must have a value.`);
  if (
    run.rows.some(
      (existing) =>
        existing.id === row.id ||
        (uniqueField &&
          existing.dataset === row.dataset &&
          JSON.stringify(existing.values[uniqueField]) ===
            JSON.stringify(row.values[uniqueField])),
    )
  )
    return;
  if (run.rows.length >= LIMITS.rows)
    throw new Error(
      `The ${LIMITS.rows}-row run limit was reached. Export these results and narrow the blueprint.`,
    );
  run.rows.push(row);
}
export function csv(rows: RecordRow[]) {
  const names = [...new Set(rows.flatMap((row) => Object.keys(row.values)))];
  let datasetColumn = "$dataset";
  while (names.includes(datasetColumn)) datasetColumn = "_" + datasetColumn;
  const cell = (raw: unknown) => {
    let value = Array.isArray(raw) ? JSON.stringify(raw) : String(raw ?? "");
    // Spreadsheet exports are text; prevent extracted formulas from executing.
    if (/^[\s]*[=+\-@]/.test(value)) value = "'" + value;
    return `"${value.replaceAll('"', '""')}"`;
  };
  return [
    [datasetColumn, ...names].map(cell).join(","),
    ...rows.map((row) =>
      [cell(row.dataset), ...names.map((name) => cell(row.values[name]))].join(
        ",",
      ),
    ),
  ].join("\r\n");
}
