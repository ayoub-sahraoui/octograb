import { makeAutoObservable, runInAction } from "mobx";
import { browser } from "wxt/browser";
import { findBlock, type Block, type Blueprint } from "../lib/blueprint";
import {
  csv,
  message,
  prepareBlueprint,
  website,
  type PageReply,
  type Run,
  type Scope,
} from "../runtime/model";
import type { EditorStore } from "./editor-store";

function itemScopes(
  blocks: Block[],
  id: string,
  scopes: Scope[] = [],
): Scope[] {
  for (const block of blocks) {
    if (block.id === id) return scopes;
    const next =
      block.type === "withPage"
        ? []
        : block.type === "forEach"
          ? [
              ...scopes,
              {
                selector: String(block.config.selector),
                index: 0,
                identity: "",
              },
            ]
          : scopes;
    for (const children of Object.values(block.children))
      if (findBlock(children, id)) return itemScopes(children, id, next);
  }
  return [];
}
export class RuntimeStore {
  available =
    location.protocol === "chrome-extension:" && Boolean(browser?.runtime?.id);
  runs: Run[] = [];
  selectedRunId = "";
  error = "";
  busy = false;
  picking = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private polling = false;
  constructor() {
    makeAutoObservable<this, "timer" | "polling">(
      this,
      { timer: false, polling: false },
      { autoBind: true },
    );
    if (this.available) {
      void this.refresh();
      this.timer = setInterval(() => {
        if (this.active?.status === "running") void this.refresh();
      }, 1000);
    }
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
  }
  get active() {
    return this.runs.find((run) =>
      ["running", "paused", "interrupted"].includes(run.status),
    );
  }
  get selected() {
    return (
      this.runs.find((run) => run.id === this.selectedRunId) ?? this.runs[0]
    );
  }
  select(id: string) {
    this.selectedRunId = id;
  }
  async call(action: string, payload: Record<string, unknown> = {}) {
    if (!this.available)
      throw new Error(
        "Load the extension in Chrome to pick elements and run blueprints. The web preview supports editing only.",
      );
    const response = await browser.runtime.sendMessage({
      type: "octograb:control",
      action,
      ...payload,
    });
    if (!response?.ok)
      throw new Error(response?.error ?? "The runner is unavailable.");
    return response.value;
  }
  async refresh() {
    if (this.polling) return;
    this.polling = true;
    try {
      const runs: Run[] = await this.call("state");
      runInAction(() => {
        this.runs = runs;
      });
    } catch (error) {
      runInAction(() => {
        this.error = message(error);
      });
    } finally {
      this.polling = false;
    }
  }
  async start(blueprint: Blueprint) {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      const prepared = prepareBlueprint(JSON.parse(JSON.stringify(blueprint)));
      // Request synchronously from the Run button's user gesture.
      if (!this.available) await this.call("start");
      const granted = await browser.permissions.request({
        origins: prepared.origins.map((origin) => `${origin}/*`),
      });
      if (!granted)
        throw new Error(
          "Website access was declined. Your blueprint is still saved.",
        );
      const id: string = await this.call("start", {
        blueprint: prepared.blueprint,
      });
      runInAction(() => {
        this.selectedRunId = id;
      });
      await this.refresh();
    } catch (error) {
      runInAction(() => {
        this.error = message(error);
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }
  async control(action: "pause" | "resume" | "stop", id: string) {
    try {
      this.error = "";
      await this.call(action, { id });
      await this.refresh();
    } catch (error) {
      runInAction(() => {
        this.error = message(error);
      });
    }
  }
  async pick(editor: EditorStore, blockId: string, fieldId?: string) {
    const blueprint = editor.current;
    if (!blueprint || this.picking) return;
    this.picking = true;
    this.error = "";
    const blueprintId = blueprint.id;
    try {
      const origin = website(blueprint.startUrl).origin;
      if (!this.available) await this.call("pick");
      const granted = await browser.permissions.request({
        origins: [`${origin}/*`],
      });
      if (!granted) throw new Error("Website access was declined.");
      const scopes = itemScopes(blueprint.blocks, blockId);
      const block = findBlock(blueprint.blocks, blockId)?.block;
      editor.selectBlock(null);
      editor.setNotice(
        scopes.length
          ? "Select an element inside the first matched item. Escape cancels."
          : "Select an element on the website. Escape cancels.",
      );
      const reply: PageReply = await this.call("pick", {
        blueprint: { startUrl: blueprint.startUrl },
        scopes,
        multiple: block?.type === "forEach" && !fieldId,
      });
      runInAction(() => {
        const saved = editor.blueprints.find((b) => b.id === blueprintId);
        const target = saved && findBlock(saved.blocks, blockId)?.block;
        if (!reply.cancelled && reply.selector && target) {
          if (fieldId) {
            const field = target.fields.find((f) => f.id === fieldId);
            if (field) field.selector = reply.selector;
          } else target.config.selector = reply.selector;
          saved!.revision++;
          saved!.updatedAt = new Date().toISOString();
          editor.setNotice(
            `${reply.count} match(es) · ${reply.example || reply.selector}`,
          );
        } else editor.setNotice("Element selection cancelled.");
        if (editor.current?.id === blueprintId && target)
          editor.selectBlock(blockId);
      });
    } catch (error) {
      runInAction(() => {
        this.error = message(error);
        if (editor.current?.id === blueprintId) editor.selectBlock(blockId);
      });
    } finally {
      runInAction(() => {
        this.picking = false;
      });
    }
  }
  async cancelPick() {
    try {
      await this.call("cancelPick");
    } catch (error) {
      runInAction(() => {
        this.error = message(error);
      });
    }
  }
  export(format: "csv" | "json") {
    const run = this.selected;
    if (!run) return;
    const content =
      format === "csv"
        ? csv(run.rows)
        : JSON.stringify(
            run.rows.map(({ dataset, values, pageUrl }) => ({
              dataset,
              values,
              pageUrl,
            })),
            null,
            2,
          );
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `octograb-${run.id.slice(0, 8)}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
