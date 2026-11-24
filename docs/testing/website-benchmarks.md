# Websites for testing OctoGrab

Checked on 2026-10-11. The public catalog pagination blueprint now executes in the built OctoGrab extension: a bounded smoke run saved four unique cars from listing pages 1 and 2, including their detail fields. Manual browser/source checks cover the other public endpoints. Use Web Scraper's vehicle demos as the main stress target and Books to Scrape as the predictable baseline.

## Recommended sequence

| Website                                                                                                        | Evidence and useful coverage                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Books to Scrape](https://books.toscrape.com/)** — predictable baseline                                      | The operator describes a scraping sandbox with 1,000 items, pagination, up to 20 items per page, and no JavaScript requirement. [Operator description](https://sites.toscrape.com/). Inspected page 1 and [page 2](https://books.toscrape.com/catalogue/page-2.html) each show 20 book entries, prices, stock labels, and separate detail links.                                                                                                                 |
| **[Web Scraper: Load More](https://webscraper.io/test-sites/load-more)** — main stress target                  | The operator documents button-driven item loading. [Official test list](https://webscraper.io/test-sites). Manual browser checks observed six initial vehicle cards, then 12 cards and 12 distinct detail URLs after one Load More click, with the button enabled again. [The first detail page](https://webscraper.io/test-sites/product/mercedes-benz-w123-280e-1955-c001) adds specifications, seller information, image galleries, and interactive controls. |
| **[Web Scraper: pagination](https://webscraper.io/test-sites/pagination)** — same detail model, numbered pages | Manual browser checks verified six cards on each of pages 1 and 2 with disjoint detail URLs, and four cards on [final page 17](https://webscraper.io/test-sites/pagination?page=17). The final page retains noninteractive Next text but has no clickable next anchor.                                                                                                                                                                                           |
| **[Web Scraper: Scroll](https://webscraper.io/test-sites/scroll)** — next progression                          | The operator documents scrolling to load items. [Official test list](https://webscraper.io/test-sites). Tests repeated scrolling, detecting newly added items, duplicate prevention, and bounded stopping; successful loading has not been established by the source inspection.                                                                                                                                                                                 |
| **[Quotes to Scrape: delayed JavaScript](https://quotes.toscrape.com/js-delayed/)** — wait behavior            | The operator documents JavaScript-generated content and configurable delay, including `?delay=10000`. [Operator endpoint guide](https://sites.toscrape.com/). Use to distinguish “not loaded yet” from “selector missing.”                                                                                                                                                                                                                                       |

These are purpose-built practice sites. Books is explicitly offered for validating scraping technologies, and Web Scraper offers its test sites for training. [Books operator](https://sites.toscrape.com/), [Web Scraper operator](https://webscraper.io/test-sites). Their fictional prices and listings are test data. [Books notice](https://books.toscrape.com/), [vehicle demo notice](https://webscraper.io/test-sites/load-more).

**Use the current links above.** The Web Scraper index still mentions categories/subcategories, but its linked pages currently show vehicles. Historical e-commerce paths should not be assumed to represent the current demos. [Current index](https://webscraper.io/test-sites), [current pagination demo](https://webscraper.io/test-sites/pagination).

## Books blueprint to exercise listing → details → pagination

Target output: `title`, `listing_price`, `detail_url`, `upc`, `stock`, `description`, `source_listing_url`.

```text
Navigate to Books to Scrape
Repeat pages, with an explicit page limit
  Wait for book cards and the current page indicator
  For each book card, with an explicit item limit
    Read title, listing price, and absolute detail URL within this card
    With page: captured detail URL
      Wait for the product heading and information table
      Save one row combining captured listing values and detail fields
    Restore the listing page context
  If Next is absent: stop successfully
  Click Next
  Wait for the page indicator and card identities to change
```

Resolve relative links against the page they were read from. Capture values before visiting details; page elements must not be reused after navigation. Stop on exhausted pages independently of reaching a test budget.

### Finite test budgets and assertions

- **Smoke test:** one listing page and two detail visits; two committed rows, two distinct detail URLs, no missing required title/UPC.
- **Pagination test:** first three pages, at most five detail visits per page; 15 detail visits and 15 unique rows. Record all 20 card identities on each list page to prove page progression without opening all details. One action at a time, at least one second between navigations, a 15-second wait timeout, and a five-minute run cap are proposed budgets, not current app settings.
- **Final-page test:** open [page 50](https://books.toscrape.com/catalogue/page-50.html) directly and confirm successful termination when Next is absent; source inspection shows 20 entries, “Page 50 of 50,” and Previous only.
- Check title/price association within each card, price agreement between listing and detail, and absolute detail URLs on the expected host. Check uniqueness using detail URL and then UPC. Required-field failures must not commit a partial row or reuse a previous item's values.
- A useful first fixture is [A Light in the Attic](https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html): title `A Light in the Attic`, price `£51.77`, UPC `a897fe39b1053632`, stock count `22`, and a nonempty description. These are inspected values, not immutable promises.
- Deliberately use an invalid required-field selector and confirm a visible block error with no row committed. Cancel after a saved row and verify retained records; retry/resume must not duplicate that row. These are future runner acceptance tests.

## Vehicle stress benchmark

### Observed live structures

Manual browser inspection of [Load More](https://webscraper.io/test-sites/load-more) established these selectors and cardinalities:

| Selection                            | Observed rule                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeated listing wrapper             | `.test-sites-card`: six before clicking Load More, 12 after one click.                                                                                                                   |
| Title and detail URL within one card | `.card-title a`; all 12 loaded cards had distinct absolute detail URLs after the click.                                                                                                  |
| Load control                         | `button.load-more-btn`; enabled again after the first append completed.                                                                                                                  |
| Detail transmission                  | `#transmission-select` on [the first detail page](https://webscraper.io/test-sites/product/mercedes-benz-w123-280e-1955-c001): native select with Manual, Semi-automatic, and Automatic. |

The inspected detail page also has three gallery thumbnails plus a main product image, Red/Black/Silver/Blue color buttons, seller information, and two Vehicle Details tables. These browser checks only verified the controls' presence; they did not exercise changes in transmission, colors, or gallery selection. [Inspected vehicle detail](https://webscraper.io/test-sites/product/mercedes-benz-w123-280e-1955-c001).

### Observed numbered pagination and final-page edge case

On [vehicle page 1](https://webscraper.io/test-sites/pagination), six `.test-sites-card` wrappers were present. The visible Next anchor had class `page-link next`, `rel="next"`, and an absolute [page 2](https://webscraper.io/test-sites/pagination?page=2) URL. Clicking it yielded six cards whose six detail URLs were all different from page 1; the next anchor then pointed to page 3.

Clicking the visible page 17 link opened [the final page](https://webscraper.io/test-sites/pagination?page=17), which had four cards, zero `a[rel="next"]` matches, and one `a[rel="prev"]`. Noninteractive Next text remained visible. Therefore match the actionable next anchor, not the word “Next.”

Process the current page's cards **before** checking whether another page exists. A loop that checks “Next is missing” before its body will skip the final four rows. Proposed flow:

```text
Navigate to the vehicle pagination demo
Repeat with a finite page budget
  Wait for the listing cards
  For each card
    Capture listing values and the detail URL
    With page: captured detail URL
      Read detail fields and save one row
    Restore the listing context
  If a[rel="next"] is absent: stop successfully
  Click a[rel="next"]
  Wait for URL and card identities to change
```

The [system design](../../SYSTEM_DESIGN.md) already specifies body → stop condition → between steps for Repeat until. The future runner must implement that order to process the final page. The editor exposes the child slots, but does not execute those semantics yet.

Proposed pagination budget: two listing pages and at most two detail visits per page, producing four detailed rows; inspect all six listing URLs on each page for disjoint identities. Separately start on page 17 and save four listing rows with no next click. Recheck observed counts before asserting them. These are future OctoGrab tests, not accomplished runs.

### Proposed runtime acceptance checks

For [Load More](https://webscraper.io/test-sites/load-more), capture current item identities, click the button, wait for the item count or identity set to change, and process only unseen items. Follow captured detail links, restore the listing, and repeat within a budget. Snapshot loaded identities so visiting details does not lose work or repeat earlier records.

Proposed budget: at most two Load More clicks, 18 listing records, four detail visits, one action at a time, 15-second waits, and three minutes total. The first observed click added six items; do not assume every later click does. Assert that each successful load introduces new IDs and previously captured records remain intact. A temporarily disabled control may indicate loading; only confirmed terminal absence/disablement should end the run. A click followed by no progress must time out visibly. Transmission/color changes, if later exercised, should be a separate small test of select/click behavior.

For Scroll, allow at most three scroll attempts and 30 records, stopping earlier on confirmed exhaustion. For delayed Quotes, inspect one page with the documented 10-second delay and use a wait timeout greater than that delay. Never interpret the initial empty DOM as successful extraction.

## Current OctoGrab boundary

OctoGrab currently authors, saves, imports, and exports block trees. It has no on-page picker or execution engine, as stated by [the current UI](../../src/components/app.tsx). `With page` accepts a literal URL and does not bind a URL captured from the current item; see [the block definition](../../src/lib/blueprint.ts). The flows above identify capabilities to validate as implementation develops; they cannot currently be run end to end in the extension.

This research did not execute a blueprint, perform a full scrape, establish resume behavior, or perform purchases, bids, or login actions. Live browser checks sampled vehicle pagination pages 1, 2, and 17, one detail page, and one Load More click; all 17 pages were not scanned. The temporary browser tab was closed and app data/code were untouched. These observations do not prove an OctoGrab selector engine or runner handles the workflows correctly. Live sites may change, so recheck counts and sampled fixtures before recording a benchmark result.

## Implemented benchmark and execution evidence

Use **Details → Practice catalog** in the extension, or import one of these files:

- [Pagination and details](./blueprints/catalog-pagination.octograb.json): two listing passes, two detail visits per pass.
- [Final page](./blueprints/catalog-last-page.octograb.json): starts at page 17; saves its cards before checking for an absent Next anchor.
- [Load more](./blueprints/catalog-load-more.octograb.json): two passes, at most 12 items per pass, row deduplication by captured URL. Earlier detail pages are visited again; this version does not skip their navigation.

The built extension's live pagination check saved cars `c001`, `c002`, `c007`, and `c008`: four distinct source URLs with listing title, detail title, price, make, year, image URL, and transmission. The deliberately absent optional field was `null` for every row. Evidence from that run is written to `.output/live-catalog-results.json`; the test uses an isolated profile and does not change the user's saved blueprints.

The local browser fixtures also passed pagination to the last page, appended lists without duplicate rows, field scoping across detail tabs, input/select/click actions, optional-field isolation, JSON download, persisted results after panel reload, invalid/ambiguous selector failures, pause/resume/stop, and selector picking. Killing the real extension worker preserved a previously saved row and marked the unfinished step as uncertain; Resume was rejected instead of replaying it.

Run these checks after building with `npm run test:runner`. Set `OCTOGRAB_LIVE_TEST=1` to include the bounded public run. Public Load More and final-page presets have source/manual browser evidence; their complete OctoGrab executions were not part of this live smoke check. Scroll and delayed Quotes remain future benchmark cases.
