import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { createBlock, createBlueprint } from "../src/lib/blueprint.ts";

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  const card = (id) =>
    `<article class="card" data-id="${id}"><h2><a class="title" href="/detail/${id}">Car ${id}</a></h2>${id === 1 ? '<span class="note">First only</span>' : ""}</article>`;
  const page = Number(url.searchParams.get("page") || 1);
  let body;
  if (url.pathname.startsWith("/detail/")) {
    const id = url.pathname.split("/").at(-1);
    body = `<h1 class="detail-title">Car ${id}</h1><p class="price">${id}00</p><input class="search"><select class="transmission"><option value="Manual">Manual</option><option value="Automatic">Automatic</option></select><button class="toggle" onclick="document.querySelector('.status').textContent='Clicked'">Change</button><p class="status">Ready</p>`;
  } else if (url.pathname === "/load")
    body = `<main class="items">${card(1)}${card(2)}</main><button class="load">Load more</button><script>document.querySelector('.load').onclick = function(){this.disabled=true;setTimeout(()=>{document.querySelector('main').insertAdjacentHTML('beforeend', ${JSON.stringify(card(3) + card(4))});this.remove()},400)}</script>`;
  else
    body = `<main class="items">${card(page === 1 ? 1 : 3)}${card(page === 1 ? 2 : 4)}</main>${page === 1 ? '<a rel="next" href="/?page=2">Next</a>' : "<span>Next</span>"}`;
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(
    `<!doctype html><html><head><title>OctoGrab test catalog</title><style>body{font:16px system-ui;padding:30px}.card{border:1px solid;padding:20px;margin:10px}</style></head><body>${body}</body></html>`,
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const extension = path.resolve(".output/chrome-mv3");
const profile = await mkdtemp(path.join(tmpdir(), "octograb-runtime-"));
const options = {
  channel: "chromium",
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  ignoreHTTPSErrors: true,
  viewport: { width: 360, height: 850 },
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    "--disable-popup-blocking",
  ],
};
const setup = await chromium.launchPersistentContext(profile, options);
const setupWorker =
  setup.serviceWorkers()[0] || (await setup.waitForEvent("serviceworker"));
const setupId = new URL(setupWorker.url()).hostname;
await setup.close();
const preferencesPath = path.join(profile, "Default", "Preferences");
const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
const extensionPreferences = preferences.extensions.settings[setupId];
// Headless Chromium cannot answer native permission dialogs. Grant only test origins in this disposable profile.
for (const key of ["active_permissions", "granted_permissions"]) {
  extensionPreferences[key] ??= {};
  extensionPreferences[key].explicit_host = [
    origin + "/*",
    "https://webscraper.io/*",
  ];
}
await writeFile(preferencesPath, JSON.stringify(preferences));
const context = await chromium.launchPersistentContext(profile, options);
const errors = [];
function b(type, config = {}, body) {
  const value = createBlock(type);
  Object.assign(value.config, config);
  if (body) value.children.body = body;
  return value;
}
function f(name, selector, extra = {}) {
  return { id: crypto.randomUUID(), name, selector, read: "text", ...extra };
}
function fixture(load = false) {
  const blueprint = createBlueprint(
    load ? "Append fixture" : "Pagination fixture",
  );
  blueprint.startUrl = origin + (load ? "/load" : "/");
  const capture = b("readValues");
  capture.fields = [
    f("url", ".title", { read: "href" }),
    f("listing", ".title"),
    f("note", ".note", { required: false }),
  ];
  const save = b("emitRecord", { dedupe: "url" });
  save.fields = [
    f("url", "", { source: "captured", value: "url" }),
    f("listing", "", { source: "captured", value: "listing" }),
    f("note", "", { source: "captured", value: "note", required: false }),
    f("title", ".detail-title"),
    f("price", ".price"),
    f("transmission", ".transmission", { read: "value" }),
    f("input", ".search", { read: "value" }),
    f("status", ".status"),
  ];
  const detail = b("withPage", { url: "{{url}}" }, [
    b("wait", { selector: ".detail-title", timeout: 2000 }),
    b("fill", { selector: ".search", value: "{{listing}}" }),
    b("select", { selector: ".transmission", value: "Automatic" }),
    b("click", { selector: ".toggle" }),
    save,
  ]);
  const each = b("forEach", { selector: ".card", maxItems: 10 }, [
    capture,
    detail,
  ]);
  const loop = b(
    "repeatUntil",
    { selector: load ? ".load" : 'a[rel="next"]', maxIterations: 3 },
    [each],
  );
  loop.children.between = [
    b("click", { selector: load ? ".load" : 'a[rel="next"]' }),
    b("wait", {
      selector: load ? ".load:disabled" : ".card",
      mode: load ? "Element disappears" : "Element appears",
      timeout: 2000,
    }),
  ];
  blueprint.blocks = [b("wait", { selector: ".card", timeout: 2000 }), loop];
  return blueprint;
}
try {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).hostname;
  const panel = await context.newPage();
  panel.on("pageerror", (error) => errors.push(error.message));
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const control = async (action, payload = {}) =>
    panel.evaluate(
      async ({ action, payload }) => {
        const reply = await chrome.runtime.sendMessage({
          type: "octograb:control",
          action,
          ...payload,
        });
        if (!reply.ok) throw new Error(reply.error);
        return reply.value;
      },
      { action, payload },
    );
  async function install(blueprint) {
    await panel
      .getByRole("button", { name: "Saved blueprints", exact: true })
      .click();
    await panel.getByLabel("Import blueprint file").setInputFiles({
      name: "fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(blueprint)),
    });
    await expect(
      panel.getByRole("heading", { name: blueprint.name, exact: true }),
    ).toBeVisible();
  }
  async function start() {
    const previous = (await control("state"))[0]?.id;
    await panel
      .getByRole("button", { name: "Run blueprint", exact: true })
      .click();
    await expect
      .poll(async () => (await control("state"))[0]?.id, { timeout: 15000 })
      .not.toBe(previous)
      .catch(async (error) => {
        console.log(await panel.locator("body").innerText());
        throw error;
      });
    return (await control("state"))[0].id;
  }
  async function done(id, expectedStatus = "completed") {
    await expect
      .poll(
        async () =>
          (await control("state")).find((run) => run.id === id)?.status,
        { timeout: 60000 },
      )
      .toBe(expectedStatus);
    return (await control("state")).find((run) => run.id === id);
  }
  await install(fixture());
  const id = await start();
  const run = await done(id);
  assert.deepEqual(
    run.rows.map((row) => row.values.listing),
    ["Car 1", "Car 2", "Car 3", "Car 4"],
  );
  assert.deepEqual(
    run.rows.map((row) => row.values.note),
    ["First only", null, null, null],
  );
  assert.ok(
    run.rows.every(
      (row) =>
        row.values.transmission === "Automatic" &&
        row.values.input === row.values.listing &&
        row.values.status === "Clicked",
    ),
  );
  assert.equal(new Set(run.rows.map((row) => row.values.url)).size, 4);
  await expect(
    panel.getByText("completed · 4 rows", { exact: true }),
  ).toBeVisible();
  const download = panel.waitForEvent("download");
  await panel.getByRole("button", { name: "JSON", exact: true }).click();
  assert.equal(
    JSON.parse(await readFile(await (await download).path(), "utf8")).length,
    4,
  );
  await panel.reload();
  await panel.getByRole("tab", { name: "Results", exact: true }).click();
  await expect(
    panel.getByText("completed · 4 rows", { exact: true }),
  ).toBeVisible();
  await panel.screenshot({ path: ".output/sidebar-results.png" });
  console.log(
    "Passed: real extension pagination, detail captures, fill/select/click, final-page retention, optional fields, results export and sidebar reopen.",
  );

  await install(fixture(true));
  const appendRun = await done(await start());
  assert.equal(appendRun.rows.length, 4);
  console.log("Passed: append-only list deduplicates earlier rows.");

  const wait = createBlueprint("Pause fixture");
  wait.startUrl = origin;
  wait.blocks = [b("wait", { mode: "Fixed delay", timeout: 10000 })];
  await install(wait);
  const pausedId = await start();
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
  await done(pausedId, "paused");
  await panel
    .getByRole("button", { name: "Saved blueprints", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Resume", exact: true }).click();
  await panel.getByRole("button", { name: "Stop", exact: true }).click();
  await done(pausedId, "stopped");
  console.log("Passed: pause, resume and stop.");

  const broken = createBlueprint("Selector fixture");
  broken.startUrl = origin;
  const bad = b("emitRecord");
  bad.fields = [f("title", "[")];
  broken.blocks = [bad];
  await install(broken);
  const badRun = await done(await start(), "failed");
  assert.match(badRun.error, /Invalid CSS/);
  assert.equal(badRun.rows.length, 0);

  const ambiguous = createBlueprint("Ambiguous fixture");
  ambiguous.startUrl = origin;
  const many = b("emitRecord");
  many.fields = [f("title", ".title")];
  ambiguous.blocks = [many];
  await install(ambiguous);
  const manyRun = await done(await start(), "failed");
  assert.match(manyRun.error, /matched 2/);
  console.log(
    "Passed: invalid and ambiguous selectors fail without emitting a row.",
  );

  const versions = new Map();
  const cdp = await context.newCDPSession(panel);
  cdp.on("ServiceWorker.workerVersionUpdated", ({ versions: updates }) => {
    for (const version of updates) versions.set(version.versionId, version);
  });
  await cdp.send("ServiceWorker.enable");
  const recovery = createBlueprint("Interruption fixture");
  recovery.startUrl = origin;
  const saved = b("emitRecord");
  saved.fields = [f("saved", "", { source: "literal", value: "kept" })];
  recovery.blocks = [saved, b("wait", { mode: "Fixed delay", timeout: 10000 })];
  await install(recovery);
  const interruptedId = await start();
  await expect
    .poll(
      async () =>
        (await control("state")).find((run) => run.id === interruptedId)?.rows
          .length,
    )
    .toBe(1);
  await expect
    .poll(() =>
      [...versions.values()].some(
        (v) => v.scriptURL === worker.url() && v.runningStatus === "running",
      ),
    )
    .toBe(true);
  const version = [...versions.values()].find(
    (v) => v.scriptURL === worker.url() && v.runningStatus === "running",
  );
  await cdp.send("ServiceWorker.stopWorker", { versionId: version.versionId });
  const recovered = await done(interruptedId, "interrupted");
  assert.equal(recovered.rows.length, 1);
  assert.equal(recovered.rows[0].values.saved, "kept");
  await assert.rejects(
    control("resume", { id: interruptedId }),
    /cannot safely resume/,
  );
  await panel.getByRole("button", { name: "Stop", exact: true }).click();
  await done(interruptedId, "stopped");
  await cdp.detach();
  console.log(
    "Passed: service-worker termination preserves rows and refuses to replay an uncertain step.",
  );

  // Exercise the picker with the actual content overlay and browser mouse input.
  const picked = createBlueprint("Picker fixture");
  picked.startUrl = origin;
  const pickBlock = b("click", { selector: ".title" });
  picked.blocks = [pickBlock];
  await install(picked);
  await panel
    .getByRole("button", { name: "Configure Click", exact: true })
    .click();
  const site = await context.newPage();
  await site.goto(origin);
  await panel
    .getByRole("button", { name: "Pick on website", exact: true })
    .click();
  await expect
    .poll(async () =>
      context.pages().some((page) => page.url().startsWith(origin)),
    )
    .toBe(true);
  const pickerPage = context
    .pages()
    .filter((page) => page.url().startsWith(origin))
    .at(-1);
  await expect(pickerPage.locator("[data-octograb-picker]")).toBeAttached();
  await pickerPage.locator(".title").first().hover();
  await pickerPage.locator(".title").first().click();
  await expect(
    panel.getByLabel("Element selector", { exact: true }),
  ).not.toHaveValue(".title");
  assert.equal(
    await pickerPage
      .locator(
        await panel
          .getByLabel("Element selector", { exact: true })
          .inputValue(),
      )
      .count(),
    1,
  );
  console.log(
    "Passed: website picker captures a specific selector and restores the configuration dialog.",
  );
  await panel.getByRole("button", { name: "Done", exact: true }).click();

  if (process.env.OCTOGRAB_LIVE_TEST === "1") {
    await panel.getByRole("tab", { name: "Details", exact: true }).click();
    await panel
      .getByRole("button", { name: "Pagination + details", exact: true })
      .click();
    const live = await done(await start());
    assert.equal(live.rows.length, 4);
    assert.equal(new Set(live.rows.map((row) => row.values.url)).size, 4);
    assert.ok(
      live.rows.every(
        (row) =>
          row.values.title &&
          row.values.price &&
          row.values.make &&
          row.values.image.startsWith("https://webscraper.io/") &&
          row.values.optional_note === null,
      ),
    );
    await writeFile(
      ".output/live-catalog-results.json",
      JSON.stringify(live.rows, null, 2),
    );
    console.log(
      `Passed: live Web Scraper practice catalog, ${live.rows.length} unique cars across listing pages 1 and 2, with details.`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
}
