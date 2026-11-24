import {
  createBlock,
  createBlueprint,
  type Block,
  type BlockType,
  type FieldMapping,
} from "./blueprint.ts";
function block(type: BlockType, config: Block["config"] = {}, body?: Block[]) {
  const value = createBlock(type);
  Object.assign(value.config, config);
  if (body) value.children.body = body;
  return value;
}
function field(
  name: string,
  selector: string,
  read: FieldMapping["read"] = "text",
  extra: Partial<FieldMapping> = {},
): FieldMapping {
  return { id: crypto.randomUUID(), name, selector, read, ...extra };
}
export function catalogBenchmark(
  mode: "pagination" | "load-more" | "last-page" = "pagination",
) {
  const blueprint = createBlueprint(
    mode === "last-page"
      ? "Catalog · final page"
      : mode === "load-more"
        ? "Catalog · load more"
        : "Catalog · pagination + details",
  );
  blueprint.startUrl = `https://webscraper.io/test-sites/${mode === "load-more" ? "load-more" : "pagination"}${mode === "last-page" ? "?page=17" : ""}`;
  blueprint.description =
    "Web Scraper practice catalog. At most two passes and two detail visits per pass (four rows). Captures listing values, opens each detail in a separate tab, then saves one row. Increase Maximum items per pass to collect more.";
  const capture = block("readValues");
  capture.fields = [
    field("listing_title", ".card-title a"),
    field("detail_url", ".card-title a", "href"),
  ];
  const save = block("emitRecord", { dataset: "Cars", dedupe: "url" });
  save.fields = [
    field("url", "", "text", { source: "captured", value: "detail_url" }),
    field("listing_title", "", "text", {
      source: "captured",
      value: "listing_title",
    }),
    field("title", "h2.title"),
    field("price", ".title-section .price"),
    field("make", ".vehicle-details td.make"),
    field("year", ".vehicle-details td.year"),
    field("image", "#main-product-image", "src"),
    field("transmission", "#transmission-select", "value"),
    field("optional_note", ".optional-note", "text", { required: false }),
  ];
  const detail = block("withPage", { url: "{{detail_url}}" }, [
    block("wait", { selector: "h2.title", timeout: 20000 }),
    save,
  ]);
  const each = block(
    "forEach",
    { selector: ".test-sites-card", maxItems: mode === "last-page" ? 10 : 2 },
    [capture, detail],
  );
  const next = mode === "load-more" ? "button.load-more-btn" : 'a[rel="next"]';
  const repeat = block("repeatUntil", { selector: next, maxIterations: 2 }, [
    each,
  ]);
  repeat.children.between = [
    block("click", { selector: next }),
    block(
      "wait",
      mode === "load-more"
        ? { selector: "button.load-more-btn:not(:disabled)", timeout: 20000 }
        : { selector: ".test-sites-card", timeout: 20000 },
    ),
  ];
  if (mode === "load-more") {
    // Appended cards repeat in later passes; Save row deduplicates by the captured URL.
    each.config.maxItems = 12;
    blueprint.description =
      "Two passes through an append-only list, at most 12 items per pass. Save row deduplicates by URL, so earlier cars are not saved twice. Up to 12 unique rows.";
  }
  blueprint.blocks = [
    block("wait", { selector: ".test-sites-card", timeout: 20000 }),
    repeat,
  ];
  return blueprint;
}
