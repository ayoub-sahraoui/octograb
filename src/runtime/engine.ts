import { findBlock, type Block, type FieldMapping } from "../lib/blueprint.ts";
import {
  addRecord,
  binding,
  sequence,
  type Context,
  type PageCommand,
  type PageReply,
  type Run,
  type Values,
} from "./model.ts";

export interface Driver {
  command(context: Context, command: PageCommand): Promise<PageReply>;
  navigate(context: Context, url: string): Promise<void>;
  open(url: string): Promise<Context>;
  close(tabId: number): Promise<void>;
  wait(context: Context, block: Block): Promise<void>;
}
function valuesFor(
  fields: FieldMapping[],
  context: Context,
  page: PageReply,
): Values {
  const values: Values = {};
  for (const field of fields) {
    const source = field.source ?? "element";
    const value =
      source === "element"
        ? (page.values?.[field.name.trim()] ?? null)
        : source === "captured"
          ? Object.hasOwn(context.values, field.value ?? "")
            ? (context.values[field.value ?? ""] ?? null)
            : null
          : source === "pageUrl"
            ? page.url
            : (field.value ?? "");
    if (value === null && field.required !== false)
      throw new Error(`Required field “${field.name}” is missing.`);
    Object.defineProperty(values, field.name.trim(), {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return values;
}
export async function step(run: Run, driver: Driver) {
  const frame = run.frames.at(-1);
  if (!frame) {
    run.status = "completed";
    return;
  }
  const context = frame.context;
  const get = (id: string) => {
    const block = findBlock(run.blueprint.blocks, id)?.block;
    if (!block) throw new Error("A saved execution step is missing.");
    return block;
  };
  const push = (blocks: Block[], next = context) =>
    run.frames.push(
      sequence(
        blocks.map((b) => b.id),
        next,
      ),
    );
  if (frame.kind === "page") {
    await driver.close(context.tabId);
    run.ownedTabs = run.ownedTabs.filter((id) => id !== context.tabId);
    run.frames.pop();
    return;
  }
  if (frame.kind === "items") {
    const item = frame.items?.[frame.index];
    if (!item) {
      run.frames.pop();
      return;
    }
    const block = get(frame.blockId!);
    push(block.children.body ?? [], {
      ...context,
      values: { ...context.values },
      scopes: [...context.scopes, item],
      path: `${context.path}/${block.id}:${frame.index++}`,
    });
    return;
  }
  if (frame.kind === "repeat") {
    const block = get(frame.blockId!);
    if (frame.phase === "body") {
      frame.phase = "check";
      push(block.children.body ?? [], {
        ...context,
        path: `${context.path}/${block.id}:${frame.index}`,
        values: { ...context.values },
      });
    } else if (frame.phase === "check") {
      const reply = await driver.command(context, {
        action: "condition",
        selector: String(block.config.selector),
        condition: String(block.config.condition),
      });
      if (
        reply.condition ||
        frame.index + 1 >= Number(block.config.maxIterations)
      ) {
        if (!reply.condition)
          run.note = "Stopped at the configured repetition limit.";
        run.frames.pop();
      } else {
        frame.phase = "between";
      }
    } else {
      frame.phase = "body";
      frame.index++;
      push(block.children.between ?? []);
    }
    return;
  }
  const id = frame.ids[frame.index];
  if (!id) {
    run.frames.pop();
    return;
  }
  const block = get(id);
  run.currentBlockId = id;
  frame.index++;
  const config = block.config;
  switch (block.type) {
    case "group":
      push(block.children.body ?? []);
      break;
    case "forEach": {
      const reply = await driver.command(context, {
        action: "collect",
        selector: String(config.selector),
      });
      context.document = reply.document;
      run.frames.push({
        kind: "items",
        context: { ...context },
        ids: [],
        blockId: id,
        index: 0,
        items: reply.items?.slice(0, Number(config.maxItems)) ?? [],
      });
      break;
    }
    case "repeatUntil":
      run.frames.push({
        kind: "repeat",
        context,
        ids: [],
        blockId: id,
        index: 0,
        phase: "body",
      });
      break;
    case "if": {
      const reply = await driver.command(context, {
        action: "condition",
        selector: String(config.selector),
        condition: String(config.condition),
      });
      push(block.children[reply.condition ? "then" : "else"] ?? []);
      break;
    }
    case "withPage": {
      const next = await driver.open(
        binding(String(config.url), context.values),
      );
      if (!run.ownedTabs.includes(next.tabId)) run.ownedTabs.push(next.tabId);
      next.values = { ...context.values };
      next.path = `${context.path}/${id}`;
      run.frames.push({ kind: "page", context: next, ids: [], index: 0 });
      push(block.children.body ?? [], next);
      break;
    }
    case "navigate":
      await driver.navigate(
        context,
        binding(String(config.url), context.values),
      );
      break;
    case "wait":
      await driver.wait(context, block);
      break;
    case "readValues":
    case "emitRecord": {
      const reply = await driver.command(context, {
        action: "read",
        fields: block.fields.filter((f) => !f.source || f.source === "element"),
      });
      const values = valuesFor(block.fields, context, reply);
      if (block.type === "readValues") Object.assign(context.values, values);
      else
        addRecord(
          run,
          {
            id: `${context.path}/${id}`,
            dataset: String(config.dataset),
            values,
            pageUrl: reply.url,
          },
          String(config.dedupe),
        );
      break;
    }
    case "transform": {
      const source = String(config.source);
      if (
        !Object.hasOwn(context.values, source) ||
        typeof context.values[source] !== "string"
      )
        throw new Error(`Captured text “${source}” is missing.`);
      const value = context.values[source] as string;
      const result =
        config.operation === "Trim whitespace"
          ? value.trim()
          : config.operation === "Split text"
            ? value.split(String(config.find))
            : value.replaceAll(String(config.find), String(config.replacement));
      Object.defineProperty(context.values, String(config.output), {
        value: result,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      break;
    }
    case "stop": {
      if (config.scope === "Blueprint") {
        run.status = "completed";
        break;
      }
      const index = run.frames.findLastIndex(
        (f) => f.kind === "items" || f.kind === "repeat",
      );
      if (index < 0)
        throw new Error("Stop current loop requires a surrounding loop.");
      for (const popped of run.frames.slice(index))
        if (popped.kind === "page") {
          await driver.close(popped.context.tabId);
          run.ownedTabs = run.ownedTabs.filter(
            (id) => id !== popped.context.tabId,
          );
        }
      run.frames.splice(index);
      break;
    }
    default:
      await driver.command(context, {
        action: block.type,
        selector: String(config.selector),
        value: binding(String(config.value ?? ""), context.values),
        direction: String(config.direction),
        distance: Number(config.distance),
      });
  }
}
