import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createBlock,
  createBlueprint,
  parseBlueprint,
  type Block,
  type FieldMapping,
} from "../src/lib/blueprint.ts";
import { step, type Driver } from "../src/runtime/engine.ts";
import {
  addRecord,
  assertOrigin,
  binding,
  csv,
  newRun,
  prepareBlueprint,
  type Context,
  type PageCommand,
  type PageReply,
} from "../src/runtime/model.ts";
function b(type: Block["type"], config: Block["config"] = {}, body?: Block[]) {
  const block = createBlock(type);
  Object.assign(block.config, config);
  if (body) block.children.body = body;
  return block;
}
function f(
  name: string,
  source: FieldMapping["source"] = "element",
  value = "",
): FieldMapping {
  return {
    id: crypto.randomUUID(),
    name,
    selector: `.${name}`,
    read: "text",
    source,
    value,
  };
}
function fake(
  command: (context: Context, command: PageCommand) => PageReply,
): Driver {
  return {
    async command(c, m) {
      return command(c, m);
    },
    async navigate(c) {
      c.document = "next";
      c.scopes = [];
    },
    async open() {
      return { tabId: 2, document: "detail", scopes: [], values: {}, path: "" };
    },
    async close() {},
    async wait() {},
  };
}
async function finish(blocks: Block[], driver: Driver) {
  const blueprint = createBlueprint();
  blueprint.startUrl = "https://example.com";
  blueprint.blocks = blocks;
  const run = newRun(blueprint, ["https://example.com"], 1);
  for (let i = 0; i < 200 && run.status === "running"; i++)
    await step(run, driver);
  assert.equal(run.status, "completed");
  return run;
}
test("repeat processes the last page before checking stop, and between runs only when needed", async () => {
  const saved = b("emitRecord");
  saved.fields = [f("page")];
  const loop = b("repeatUntil", { selector: ".next", maxIterations: 5 }, [
    saved,
  ]);
  loop.children.between = [b("click", { selector: ".next" })];
  let pageNumber = 1;
  let clicks = 0;
  const run = await finish(
    [loop],
    fake((_, cmd) => {
      if (cmd.action === "click") {
        pageNumber++;
        clicks++;
      }
      return {
        document: "listing",
        url: "https://example.com",
        values: { page: String(pageNumber) },
        condition: pageNumber === 3,
      };
    }),
  );
  assert.deepEqual(
    run.rows.map((row) => row.values.page),
    ["1", "2", "3"],
  );
  assert.equal(clicks, 2);
});
test("item captures are isolated, inherited on detail pages, and optional fields never reuse a prior item", async () => {
  const read = b("readValues");
  read.fields = [f("url"), f("optional")];
  read.fields[1]!.required = false;
  const save = b("emitRecord");
  save.fields = [
    f("url", "captured", "url"),
    f("optional", "captured", "optional"),
    f("price"),
  ];
  save.fields[1]!.required = false;
  const detail = b("withPage", { url: "{{url}}" }, [save]);
  const each = b("forEach", { selector: ".card", maxItems: 10 }, [
    read,
    detail,
  ]);
  const run = await finish(
    [each],
    fake((context, cmd): PageReply => ({
      document: context.tabId === 1 ? "listing" : "detail",
      url: "https://example.com",
      items: [0, 1].map((index) => ({
        selector: ".card",
        index,
        identity: String(index),
      })),
      values:
        cmd.action === "collect"
          ? {}
          : context.tabId === 1
            ? {
                url: `https://example.com/${context.scopes.at(-1)!.index}`,
                optional: context.scopes.at(-1)!.index === 0 ? "first" : null,
              }
            : { price: "10" },
    })),
  );
  assert.deepEqual(
    run.rows.map((row) => row.values),
    [
      { url: "https://example.com/0", optional: "first", price: "10" },
      { url: "https://example.com/1", optional: null, price: "10" },
    ],
  );
  assert.equal(run.ownedTabs.length, 1);
});
test("record id and business key deduplication do not double save append-only pages", () => {
  const run = newRun(createBlueprint(), [], 1);
  addRecord(
    run,
    { id: "a", dataset: "Cars", values: { url: "car1" }, pageUrl: "" },
    "url",
  );
  addRecord(
    run,
    { id: "b", dataset: "Cars", values: { url: "car1" }, pageUrl: "" },
    "url",
  );
  addRecord(
    run,
    { id: "a", dataset: "Cars", values: { url: "car2" }, pageUrl: "" },
    "",
  );
  addRecord(
    run,
    { id: "c", dataset: "Cars", values: { url: "car2" }, pageUrl: "" },
    "url",
  );
  assert.equal(run.rows.length, 2);
  assert.throws(
    () =>
      addRecord(
        run,
        { id: "d", dataset: "Cars", values: { url: null }, pageUrl: "" },
        "url",
      ),
    /must have a value/,
  );
});
test("required captured fields fail atomically before any row is committed", async () => {
  const save = b("emitRecord");
  save.fields = [f("missing", "captured", "missing")];
  const run = newRun({ ...createBlueprint(), blocks: [save] }, [], 1);
  await assert.rejects(
    step(
      run,
      fake(() => ({ document: "doc", url: "https://example.com" })),
    ),
    /Required field/,
  );
  assert.equal(run.rows.length, 0);
});
test("bindings are inert text and reviewed origins constrain captured URLs", () => {
  assert.equal(
    binding("{{url}}", { url: "https://example.com/a?x=$(evil)" }),
    "https://example.com/a?x=$(evil)",
  );
  assert.throws(() => binding("{{constructor}}", {}), /missing/);
  assert.throws(() => binding("{{parts}}", { parts: ["a"] }), /list/);
  assert.throws(
    () => assertOrigin("javascript:alert(1)", ["https://example.com"]),
    /HTTP/,
  );
  assert.throws(
    () => assertOrigin("https://other.example/a", ["https://example.com"]),
    /not included/,
  );
  assert.throws(
    () =>
      assertOrigin("https://user:pass@example.com/a", ["https://example.com"]),
    /credentials/,
  );
});
test("legacy mappings remain valid, new configuration defaults migrate, and invalid sources are rejected", () => {
  const each = b("forEach");
  delete each.config.maxItems;
  const save = b("emitRecord");
  delete save.config.dedupe;
  const blueprint = { ...createBlueprint(), blocks: [each, save] };
  const parsed = parseBlueprint(blueprint);
  assert.equal(parsed.blocks[0]!.config.maxItems, 100);
  assert.equal(parsed.blocks[1]!.config.dedupe, "");
  const invalid = JSON.parse(JSON.stringify(blueprint));
  invalid.blocks[1].fields[0].source = "javascript";
  assert.throws(() => parseBlueprint(invalid), /Invalid field source/);
});
test("preflight rejects unsafe budgets and reports unconfigured blocks before opening tabs", () => {
  const blueprint = {
    ...createBlueprint(),
    startUrl: "https://example.com",
    blocks: [b("forEach", { selector: ".card", maxItems: 1.5 })],
  };
  assert.throws(() => prepareBlueprint(blueprint), /whole number/);
  blueprint.blocks = [b("click")];
  assert.throws(() => prepareBlueprint(blueprint), /selector.*required/);
});
test("CSV quotes multiline values and neutralizes spreadsheet formulas", () => {
  const value = csv([
    {
      id: "1",
      dataset: "D",
      pageUrl: "",
      values: { name: 'A,"B"\nC', formula: "=1+1", missing: null },
    },
  ]);
  assert.equal(
    value,
    '"$dataset","name","formula","missing"\r\n"D","A,""B""\nC","\'=1+1",""',
  );
});
test("a saved execution stack resumes without repeating previously emitted rows", async () => {
  const save = b("emitRecord");
  save.fields = [f("title")];
  const each = b("forEach", { selector: ".card", maxItems: 2 }, [save]);
  const run = newRun({ ...createBlueprint(), blocks: [each] }, [], 1);
  const driver = fake((context) => ({
    document: "doc",
    url: "https://example.com",
    items: [0, 1].map((index) => ({
      selector: ".card",
      index,
      identity: String(index),
    })),
    values: { title: String(context.scopes.at(-1)?.index) },
  }));
  while (run.rows.length < 1) await step(run, driver);
  const checkpoint = structuredClone(run);
  while (checkpoint.status === "running") await step(checkpoint, driver);
  assert.deepEqual(
    checkpoint.rows.map((row) => row.values.title),
    ["0", "1"],
  );
});
