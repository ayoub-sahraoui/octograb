import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const extension = path.resolve(".output/chrome-mv3");
const profile = await mkdtemp(path.join(tmpdir(), "octograb-browser-"));
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  viewport: { width: 360, height: 800 },
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
});
const errors = [];
try {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).hostname;
  const behavior = await worker.evaluate(() =>
    chrome.sidePanel.getPanelBehavior(),
  );
  assert.equal(behavior.openPanelOnActionClick, true);
  const manifest = JSON.parse(
    await readFile(path.join(extension, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.side_panel.default_path, "sidepanel.html");
  assert.deepEqual(manifest.permissions, ["sidePanel", "scripting", "activeTab"]);
  assert.deepEqual(manifest.optional_host_permissions, ["https://*/*", "http://*/*"]);
  assert.equal(manifest.action.default_icon[32], "icons/32.png");
  for (const size of [16, 32, 48, 128]) {
    assert.ok(
      (await readFile(path.join(extension, manifest.icons[size]))).length > 0,
    );
  }

  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(
    page.getByRole("heading", { name: "Untitled blueprint" }),
  ).toBeVisible();
  async function imageReady(locator) {
    await expect(locator).toBeVisible();
    await expect
      .poll(() =>
        locator.evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
  }
  await imageReady(page.locator('header img[src="/brand/octograb-mark.webp"]'));
  await imageReady(
    page.locator(
      '.workflow-surface img[src="/illustrations/blueprint-builder.webp"]',
    ),
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/icons/32.png",
  );
  await page.screenshot({
    path: ".output/sidebar-empty.png",
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitem", { name: "dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.screenshot({
    path: ".output/sidebar-empty-dark.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitem", { name: "light", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass("dark");

  await page
    .getByRole("button", { name: "Saved blueprints", exact: true })
    .click();
  await page.getByLabel("Find a blueprint").fill("no-such-blueprint");
  await expect(
    page.getByRole("heading", { name: "No matching blueprints" }),
  ).toBeVisible();
  await imageReady(
    page.locator('img[src="/illustrations/blueprint-library.webp"]'),
  );
  await page.screenshot({
    path: ".output/sidebar-library-empty.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Untitled blueprint", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Blueprint editor", exact: true })
    .click();

  await page.getByRole("tab", { name: "Details" }).click();
  await page.getByLabel("Blueprint name").fill("Research blueprint");
  await page.getByLabel("Starting website").fill("https://example.com");
  await page
    .getByLabel("Description (optional)")
    .fill("Collect a repeated list and its detail fields.");
  await page.getByRole("tab", { name: "Workflow" }).click();

  await page.getByRole("button", { name: "Add your first block" }).click();
  await page
    .getByRole("button", { name: "Navigate Open a website URL." })
    .click();
  await expect(page.getByLabel("Website URL")).toHaveValue(
    "https://example.com",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();

  async function add(type, config = async () => {}) {
    await page.getByRole("button", { name: "Add block", exact: true }).click();
    await page.getByRole("button", { name: type }).click();
    await config();
    await page.getByRole("button", { name: "Done", exact: true }).click();
  }
  await add("Wait Wait for an element or a delay.", async () =>
    page.getByLabel("Element selector", { exact: true }).fill(".listing"),
  );
  await add("For each item Repeat steps inside each matched item.", async () =>
    page.getByLabel("Item selector").fill(".item-card"),
  );
  await page
    .getByRole("button", { name: "Add step to For each item body" })
    .click();
  await page
    .getByRole("button", {
      name: "Save row Map fields into one output record.",
    })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("title");
  await page
    .getByLabel("Element selector", { exact: true })
    .fill(".item-title");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Configure Save row" }),
  ).toBeVisible();
  await expect(page.getByText("4 steps", { exact: true })).toBeVisible();
  await page.screenshot({
    path: ".output/sidebar-light.png",
    animations: "disabled",
  });

  await page
    .getByRole("button", { name: "Configure Wait", exact: true })
    .click();
  await page.getByLabel("Move this step").click();
  await page
    .getByRole("option", { name: "For each item · Steps inside" })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("octograb:workspace:v1")),
  );
  let current = saved.blueprints.find(
    (blueprint) => blueprint.id === saved.activeBlueprintId,
  );
  assert.equal(current.blocks.length, 2);
  assert.deepEqual(
    current.blocks[1].children.body.map((block) => block.type),
    ["emitRecord", "wait"],
  );

  await add("Click Click a button or link.", async () =>
    page.getByLabel("Element selector", { exact: true }).fill('a[rel="next"]'),
  );
  const firstId = current.blocks[0].id;
  const transfer = await page.evaluateHandle((id) => {
    const data = new DataTransfer();
    data.setData("application/x-octograb-block", JSON.stringify({ id }));
    return data;
  }, firstId);
  await page
    .locator(".workflow-surface > ol > li:last-child .drop-zone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("octograb:workspace:v1")),
  );
  current = saved.blueprints.find(
    (blueprint) => blueprint.id === saved.activeBlueprintId,
  );
  assert.equal(current.blocks.at(-1).type, "navigate");

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page
    .getByRole("button", { name: "Blueprint editor", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Research blueprint" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.getByRole("button", { name: "Configure Save row" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".output/sidebar-dark.png",
    animations: "disabled",
  });

  await page
    .getByRole("button", { name: "Saved blueprints", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your blueprints" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Options for Research blueprint" })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Research blueprint copy" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export blueprint JSON" }).click();
  const file = await downloadPromise;
  const exported = JSON.parse(await readFile(await file.path(), "utf8"));
  assert.equal(exported.name, "Research blueprint copy");
  assert.equal(exported.blocks.length, 3);

  await page
    .getByRole("button", { name: "Saved blueprints", exact: true })
    .click();
  await page.getByLabel("Import blueprint file").setInputFiles({
    name: "roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(
    page.getByRole("heading", { name: "Research blueprint copy" }),
  ).toBeVisible();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("octograb:workspace:v1")),
  );
  assert.equal(saved.blueprints.length, 3);

  await page
    .getByRole("button", { name: "Saved blueprints", exact: true })
    .click();
  await page.getByLabel("Import blueprint file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.getByRole("status")).toContainText("not valid JSON");
  await page.getByRole("button", { name: "Dismiss message" }).click();

  await page
    .getByRole("button", { name: "Blueprint editor", exact: true })
    .click();
  await page.setViewportSize({ width: 320, height: 650 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Configure For each item" }).click();
  await page.getByRole("button", { name: "Delete step", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("all 2 steps inside it");
  await page.getByRole("button", { name: "Delete steps", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Configure Save row" }),
  ).toHaveCount(0);

  await page
    .getByRole("button", { name: "Saved blueprints", exact: true })
    .click();
  for (let index = 0; index < 3; index++) {
    await page
      .getByRole("button", { name: /^Options for / })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete blueprint", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "A fresh workspace" }),
  ).toBeVisible();
  await imageReady(
    page.locator('img[src="/illustrations/blueprint-library.webp"]'),
  );
  await page.screenshot({
    path: ".output/sidebar-library-fresh.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Blueprint editor", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build your first blueprint" }),
  ).toBeVisible();
  await imageReady(
    page.locator('img[src="/illustrations/blueprint-builder.webp"]'),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Passed: native sidebar registration, brand assets and icons, empty states, editor navigation, block configuration, nesting, keyboard move controls, drop reordering, persistence, themes, import/export, narrow layout, and deletion.",
  );
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
