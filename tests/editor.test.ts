import assert from "node:assert/strict";
import test from "node:test";
import {
  blockTypes,
  cloneBlock,
  createBlock,
  createBlueprint,
  definition,
  findBlock,
  flattenBlocks,
  moveBlock,
  parseBlueprintFile,
} from "../src/lib/blueprint.ts";
import { EditorStore } from "../src/stores/editor-store.ts";

test("every built-in block can be serialized and imported, including unconfigured drafts", () => {
  const blueprint = createBlueprint("All block types");
  blueprint.blocks = blockTypes.map(createBlock);
  const restored = parseBlueprintFile(JSON.stringify(blueprint));
  assert.deepEqual(restored, blueprint);
  assert.equal(restored.blocks.length, 15);
});

test("moving a container into a descendant is rejected without losing either block", () => {
  const parent = createBlock("group");
  const child = createBlock("forEach");
  parent.children.body!.push(child);
  const blocks = [parent];
  const original = JSON.stringify(blocks);
  assert.equal(
    moveBlock(blocks, parent.id, { parentId: child.id, slot: "body" }),
    false,
  );
  assert.equal(
    moveBlock(blocks, parent.id, { parentId: parent.id, slot: "body" }),
    false,
  );
  assert.equal(JSON.stringify(blocks), original);
});

test("same-list and cross-slot moves preserve order and nested contents", () => {
  const a = createBlock("navigate");
  const b = createBlock("click");
  const branch = createBlock("if");
  const blocks = [a, b, branch];
  assert.equal(
    moveBlock(blocks, a.id, { parentId: null, slot: "root", index: 2 }),
    true,
  );
  assert.deepEqual(
    blocks.map((b) => b.id),
    [b.id, a.id, branch.id],
  );
  assert.equal(
    moveBlock(blocks, a.id, { parentId: branch.id, slot: "then" }),
    true,
  );
  assert.equal(branch.children.then![0]?.id, a.id);
  assert.equal(
    moveBlock(blocks, a.id, { parentId: branch.id, slot: "else" }),
    true,
  );
  assert.equal(branch.children.then!.length, 0);
  assert.equal(branch.children.else![0]?.id, a.id);
  assert.equal(flattenBlocks(blocks).length, 3);
});

test("invalid destinations and indexes never remove the source", () => {
  const block = createBlock("click");
  const blocks = [block];
  assert.equal(
    moveBlock(blocks, block.id, { parentId: block.id, slot: "body" }),
    false,
  );
  assert.equal(
    moveBlock(blocks, block.id, { parentId: null, slot: "root", index: -1 }),
    false,
  );
  assert.equal(
    moveBlock(blocks, block.id, { parentId: null, slot: "root", index: 0.5 }),
    false,
  );
  assert.equal(
    moveBlock(blocks, "missing", { parentId: null, slot: "root" }),
    false,
  );
  assert.equal(blocks[0], block);
});

test("duplicated subtrees receive fresh IDs and independent field mappings", () => {
  const container = createBlock("group");
  const row = createBlock("emitRecord");
  container.children.body!.push(row);
  const copy = cloneBlock(container);
  assert.notEqual(copy.id, container.id);
  assert.notEqual(copy.children.body![0]?.id, row.id);
  assert.notEqual(copy.children.body![0]?.fields[0]?.id, row.fields[0]?.id);
  copy.children.body![0]!.fields[0]!.name = "changed";
  assert.equal(row.fields[0]?.name, "");
});

test("import rejects duplicate IDs, unexpected children, unsupported blocks, and invalid value types", () => {
  const blueprint = createBlueprint();
  blueprint.blocks = [createBlock("click")];
  assert.throws(
    () =>
      parseBlueprintFile(
        JSON.stringify({
          ...blueprint,
          blocks: [blueprint.blocks[0], blueprint.blocks[0]],
        }),
      ),
    /unique/,
  );
  const block = blueprint.blocks[0]!;
  assert.throws(
    () =>
      parseBlueprintFile(
        JSON.stringify({
          ...blueprint,
          blocks: [{ ...block, children: { body: [] } }],
        }),
      ),
    /child slot/,
  );
  assert.throws(
    () =>
      parseBlueprintFile(
        JSON.stringify({
          ...blueprint,
          blocks: [{ ...block, type: "executeJavaScript" }],
        }),
      ),
    /unsupported block/,
  );
  assert.throws(
    () =>
      parseBlueprintFile(
        JSON.stringify({
          ...blueprint,
          blocks: [{ ...block, config: { selector: 12 } }],
        }),
      ),
    /value type/,
  );
  assert.throws(() => parseBlueprintFile("not JSON"), /valid JSON/);
  assert.throws(() => parseBlueprintFile(" ".repeat(1_000_001)), /1 MB/);
});

test("12 nested levels round-trip, and deeper imported trees are rejected", () => {
  const blueprint = createBlueprint();
  let list = blueprint.blocks;
  for (let i = 0; i < 12; i++) {
    const block = createBlock("group");
    list.push(block);
    list = block.children.body!;
  }
  assert.equal(
    flattenBlocks(parseBlueprintFile(JSON.stringify(blueprint)).blocks).length,
    12,
  );
  list.push(createBlock("click"));
  assert.throws(
    () => parseBlueprintFile(JSON.stringify(blueprint)),
    /12 levels/,
  );
});

test("configuration edits persist and restore the active blueprint and theme", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const store = new EditorStore(storage);
  store.updateBlueprint("name", "Research");
  store.setTheme("dark");
  store.addBlock("navigate");
  store.updateConfig("url", "https://example.com");
  const restored = new EditorStore(storage);
  assert.equal(restored.current?.name, "Research");
  assert.equal(restored.theme, "dark");
  assert.equal(restored.current?.blocks[0]?.config.url, "https://example.com");
  assert.equal(restored.storageError, "");
  store.dispose();
  restored.dispose();
});

test("corrupt stored data is preserved rather than overwritten", () => {
  let writes = 0;
  const store = new EditorStore({
    getItem: () => "broken existing data",
    setItem: () => {
      writes++;
    },
  });
  store.updateBlueprint("name", "Unsaved work");
  assert.equal(writes, 0);
  assert.match(store.storageError, /preserve/);
  assert.equal(store.current?.name, "Unsaved work");
  store.dispose();
});

test("storage quota failure is reported while the current in-memory draft remains usable", () => {
  const store = new EditorStore({
    getItem: () => null,
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  });
  store.updateBlueprint("name", "Keep this draft");
  assert.match(store.storageError, /could not be saved/);
  assert.equal(store.current?.name, "Keep this draft");
  store.dispose();
});

test("a duplicated blueprint is independent, and imports do not overwrite existing IDs", () => {
  const store = new EditorStore();
  store.addBlock("group");
  const parentId = store.selectedBlockId!;
  store.addBlock("click", { parentId, slot: "body" });
  const original = store.current!;
  const source = JSON.stringify(original);
  store.duplicateBlueprint(original.id);
  assert.notEqual(store.current?.id, original.id);
  assert.notEqual(store.current?.blocks[0]?.id, parentId);
  store.importBlueprint(source);
  assert.equal(store.blueprints.length, 3);
  assert.equal(
    new Set(store.blueprints.map((blueprint) => blueprint.id)).size,
    3,
  );
  assert.equal(flattenBlocks(original.blocks).length, 2);
  store.dispose();
});

test("removing a container clears a selected descendant and sibling moves work in nested branches", () => {
  const store = new EditorStore();
  store.addBlock("if");
  const parent = store.selectedBlock!;
  store.addBlock("click", { parentId: parent.id, slot: "else" });
  const first = store.selectedBlock!;
  store.addBlock("wait", { parentId: parent.id, slot: "else" });
  const second = store.selectedBlock!;
  store.moveSibling(second.id, -1);
  assert.deepEqual(
    parent.children.else!.map((block) => block.id),
    [second.id, first.id],
  );
  store.moveSibling(second.id, 1);
  assert.equal(findBlock(store.current!.blocks, second.id)?.index, 1);
  store.removeBlock(parent.id);
  assert.equal(store.selectedBlockId, null);
  assert.equal(store.blocks.length, 0);
  store.dispose();
});

test("nonfinite numeric edits do not corrupt saved JSON", () => {
  const store = new EditorStore();
  store.addBlock("wait");
  store.updateConfig("timeout", Infinity);
  assert.equal(store.selectedBlock?.config.timeout, 20000);
  assert.equal(definition("wait").slots.length, 0);
  store.dispose();
});
