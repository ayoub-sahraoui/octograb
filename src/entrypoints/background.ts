import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { loadRuns, saveRun } from "../runtime/database";
import { step, type Driver } from "../runtime/engine";
import {
  assertOrigin,
  LIMITS,
  message,
  newRun,
  prepareBlueprint,
  type Context,
  type PageCommand,
  type PageReply,
  type Run,
} from "../runtime/model";

export default defineBackground(() => {
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
  let runs: Run[] = [];
  let pumping = false;
  let requested: "pause" | "stop" | null = null;
  let pickingTab: number | undefined;
  let stepStarted = 0;
  let starting = false;
  const ready = loadRuns().then(async (saved) => {
    runs = saved;
    for (const run of runs.filter((r) => r.status === "running")) {
      run.status = run.pending ? "interrupted" : "paused";
      run.error = run.pending
        ? "The browser interrupted a step whose outcome is unknown. Inspect the page and start a new run; this run will not replay the action."
        : "The browser stopped the runner. Resume from the last saved checkpoint.";
      await saveRun(run);
    }
  });
  const delay = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  class Interrupted extends Error {}
  function check(run: Run) {
    if (requested) throw new Interrupted();
    if (
      run.elapsedMs + (stepStarted ? Date.now() - stepStarted : 0) >
      LIMITS.duration
    )
      throw new Error(
        "The five-minute active run limit was reached. Saved rows are available to export.",
      );
    if (run.commands >= LIMITS.commands)
      throw new Error("The run reached its 10,000-command limit.");
  }
  async function page(tabId: number, command: PageCommand): Promise<PageReply> {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "octograb:page",
      command,
    });
    if (!response?.ok)
      throw new Error(
        response?.error ?? "The page could not complete this step.",
      );
    return response.value;
  }
  async function attach(tabId: number, origins: string[]) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const tab = await browser.tabs.get(tabId);
      if (tab.url && tab.url !== "about:blank") assertOrigin(tab.url, origins);
      if (tab.status === "complete" && tab.url && tab.url !== "about:blank") {
        await browser.scripting.executeScript({
          target: { tabId },
          files: ["/content-scripts/page.js"],
        });
        return page(tabId, { action: "hello" });
      }
      await delay(100);
    }
    throw new Error("The website did not finish loading within 20 seconds.");
  }
  function driver(run: Run): Driver {
    async function navigate(context: Context, value: string) {
      if (++run.navigations > LIMITS.navigations)
        throw new Error("The 250-page navigation limit was reached.");
      const url = assertOrigin(value, run.allowedOrigins);
      await browser.tabs.update(context.tabId, { url });
      const reply = await attach(context.tabId, run.allowedOrigins);
      context.document = reply.document;
      context.scopes = [];
      for (const frame of run.frames)
        if (
          frame.context.tabId === context.tabId &&
          !frame.context.scopes.length
        )
          frame.context.document = reply.document;
    }
    async function command(context: Context, command: PageCommand) {
      check(run);
      run.commands++;
      const tab = await browser.tabs.get(context.tabId);
      if (tab.status !== "complete" || !tab.url || tab.url === "about:blank")
        await attach(context.tabId, run.allowedOrigins);
      else assertOrigin(tab.url, run.allowedOrigins);
      // Injection is idempotent and is needed again after a full page navigation.
      await browser.scripting.executeScript({
        target: { tabId: context.tabId },
        files: ["/content-scripts/page.js"],
      });
      const result = await page(context.tabId, {
        ...command,
        scopes: context.scopes,
        document: context.document,
        allowedOrigins: run.allowedOrigins,
      });
      context.document = result.document;
      if (command.action === "click") {
        await delay(250);
        const after = await attach(context.tabId, run.allowedOrigins);
        if (after.document !== context.document) {
          if (context.scopes.length)
            throw new Error(
              "A click navigated away from the current item. Capture its URL and use With page for details.",
            );
          context.document = after.document;
          for (const frame of run.frames)
            if (
              frame.context.tabId === context.tabId &&
              !frame.context.scopes.length
            )
              frame.context.document = after.document;
        }
      }
      return result;
    }
    return {
      command,
      navigate,
      async open(value) {
        if (++run.navigations > LIMITS.navigations)
          throw new Error("The 250-page navigation limit was reached.");
        const url = assertOrigin(value, run.allowedOrigins);
        const tab = await browser.tabs.create({ url, active: false });
        const tabId = tab.id!;
        // Save ownership before loading, so a worker interruption cannot orphan an untracked tab.
        run.ownedTabs.push(tabId);
        await saveRun(run);
        const reply = await attach(tabId, run.allowedOrigins);
        return {
          tabId,
          document: reply.document,
          scopes: [],
          values: {},
          path: "",
        };
      },
      async close(tabId) {
        if (run.ownedTabs.includes(tabId))
          await browser.tabs.remove(tabId).catch(() => {});
      },
      async wait(context, block) {
        const timeout = Number(block.config.timeout);
        const start = Date.now();
        do {
          check(run);
          if (block.config.mode !== "Fixed delay") {
            const reply = await command(context, {
              action: "condition",
              selector: String(block.config.selector),
              condition:
                block.config.mode === "Element disappears"
                  ? "Element is missing"
                  : "Element exists",
            });
            if (reply.condition) return;
          }
          await delay(Math.min(200, timeout));
          // Fixed delays also call a browser API so an active bounded wait can finish.
          if (block.config.mode === "Fixed delay")
            await browser.tabs.get(context.tabId);
        } while (Date.now() - start < timeout);
        if (block.config.mode !== "Fixed delay")
          throw new Error(`Timed out waiting for “${block.config.selector}”.`);
      },
    };
  }
  async function cleanup(run: Run) {
    // Keep the listing tab for inspection; close only detail tabs created by this run.
    const listing = run.ownedTabs[0];
    await Promise.all(
      run.ownedTabs
        .filter((id) => id !== listing)
        .map((id) => browser.tabs.remove(id).catch(() => {})),
    );
    run.ownedTabs = listing === undefined ? [] : [listing];
  }
  async function pump(run: Run) {
    if (pumping) return;
    pumping = true;
    requested = null;
    try {
      while (run.status === "running") {
        if (requested) {
          run.status = requested === "stop" ? "stopped" : "paused";
          break;
        }
        check(run);
        const before = structuredClone(run);
        const started = Date.now();
        stepStarted = started;
        run.pending = true;
        await saveRun(run);
        try {
          await step(run, driver(run));
        } catch (error) {
          if (error instanceof Interrupted) {
            // Observational waits can restart safely; other in-flight outcomes require review.
            Object.assign(run, before);
            run.status = requested === "stop" ? "stopped" : "paused";
          } else {
            run.status = "failed";
            run.error = message(error);
          }
        }
        run.elapsedMs += Date.now() - started;
        stepStarted = 0;
        run.pending = false;
        run.updatedAt = new Date().toISOString();
        await saveRun(run);
        if (run.status === "running") await delay(30);
      }
      if (["completed", "failed", "stopped"].includes(run.status))
        await cleanup(run);
      await saveRun(run);
    } catch (error) {
      run.status = "failed";
      run.error = message(error);
      await cleanup(run);
      await saveRun(run).catch(() => {});
    } finally {
      pumping = false;
      requested = null;
      stepStarted = 0;
    }
  }
  async function handle(raw: {
    action: string;
    blueprint?: unknown;
    id?: string;
    scopes?: Context["scopes"];
    multiple?: boolean;
  }) {
    await ready;
    const active = runs.find((run) =>
      ["running", "paused", "interrupted"].includes(run.status),
    );
    if (raw.action === "state") return runs;
    if (raw.action === "start") {
      if (active || starting || pickingTab !== undefined)
        throw new Error(
          "Stop the current run or selection before starting another.",
        );
      starting = true;
      try {
        const { blueprint, origins } = prepareBlueprint(raw.blueprint);
        if (
          !(await browser.permissions.contains({
            origins: origins.map((origin) => `${origin}/*`),
          }))
        )
          throw new Error("Website access was not granted.");
        const tab = await browser.tabs.create({
          url: blueprint.startUrl,
          active: true,
        });
        const run = newRun(blueprint, origins, tab.id!);
        runs.unshift(run);
        await saveRun(run);
        void pump(run);
        return run.id;
      } finally {
        starting = false;
      }
    }
    if (["pause", "stop", "resume"].includes(raw.action)) {
      const run = runs.find((run) => run.id === raw.id);
      if (!run) throw new Error("This run is missing.");
      if (raw.action === "resume") {
        if (run.status !== "paused" || run.pending)
          throw new Error(
            "This run cannot safely resume. Start a new run after reviewing the page.",
          );
        for (const frame of run.frames) {
          const reply = await attach(frame.context.tabId, run.allowedOrigins);
          if (
            frame.context.document &&
            reply.document !== frame.context.document
          )
            throw new Error(
              "A run page was changed or reloaded. Start a new run to avoid stale item scopes.",
            );
        }
        run.status = "running";
        run.error = "";
        await saveRun(run);
        void pump(run);
      } else if (run.status === "running")
        requested = raw.action === "stop" ? "stop" : "pause";
      else if (
        raw.action === "stop" &&
        ["paused", "interrupted"].includes(run.status)
      ) {
        run.status = "stopped";
        run.pending = false;
        await cleanup(run);
        await saveRun(run);
      }
      return true;
    }
    if (raw.action === "cancelPick") {
      if (pickingTab !== undefined)
        await page(pickingTab, { action: "cancelPick" });
      return true;
    }
    if (raw.action === "pick") {
      if (active || starting)
        throw new Error("Stop the run before selecting an element.");
      if (pickingTab !== undefined)
        throw new Error("An element selection is already in progress.");
      const { blueprint, origins } = preparePicker(raw.blueprint);
      const [current] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      const tab =
        current?.id &&
        current.url &&
        origins.includes(new URL(current.url).origin)
          ? current
          : await browser.tabs.create({
              url: blueprint.startUrl,
              active: true,
            });
      pickingTab = tab.id!;
      try {
        await attach(pickingTab, origins);
        await browser.tabs.update(pickingTab, { active: true });
        return await page(pickingTab, {
          action: "pick",
          scopes: raw.scopes ?? [],
          multiple: raw.multiple,
        });
      } finally {
        pickingTab = undefined;
      }
    }
    throw new Error("Unknown runner command.");
  }
  function preparePicker(raw: unknown) {
    // Drafts can be picked before all their blocks are configured.
    const input = raw as { startUrl?: unknown };
    const url = assertOrigin(String(input?.startUrl ?? ""), [
      new URL(String(input?.startUrl ?? "")).origin,
    ]);
    return { blueprint: { startUrl: url }, origins: [new URL(url).origin] };
  }
  browser.runtime.onMessage.addListener((raw, sender, respond) => {
    if (
      raw?.type !== "octograb:control" ||
      sender.id !== browser.runtime.id ||
      sender.url !== browser.runtime.getURL("/sidepanel.html")
    )
      return;
    handle(raw).then(
      (value) => respond({ ok: true, value }),
      (error) => respond({ ok: false, error: message(error) }),
    );
    return true;
  });
});
