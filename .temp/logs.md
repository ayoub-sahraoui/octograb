[2026-04-05T17:22:14.932Z] [INFO] ▶ Starting blueprint: Books to Scrape - Full Product List with Pagination and Details (tab 2100541214)
[2026-04-05T17:22:15.018Z] [BLOCK] ▶ Executing: Go to Books to Scrape [No Scope]
[2026-04-05T17:22:15.019Z] [INFO]   📋 Config: {"url":"https://books.toscrape.com/","behavior":"same_tab","timeout":30000}
[2026-04-05T17:22:15.019Z] [INFO]   🔧 Compiled: executor=executeNavigate, parent=root, branch=root, children=0, elseChildren=0
[2026-04-05T17:22:15.019Z] [INFO]   🧭 Runtime: scope=none, macros=none, vars(local=0, global=0, blueprint=0)
[2026-04-05T17:22:15.019Z] [INFO] 🌐 Navigating to: https://books.toscrape.com/
[2026-04-05T17:22:15.019Z] [INFO]   📍 Behavior: same_tab
[2026-04-05T17:22:15.019Z] [INFO]   ⏱ Timeout: 30000ms
[2026-04-05T17:22:15.019Z] [INFO]   🎯 Current tab ID: 2100541214
[2026-04-05T17:22:15.019Z] [INFO]   🔄 Navigating in current tab 2100541214...
[2026-04-05T17:22:15.225Z] [INFO]   ⏳ Waiting for content script to be ready...
[2026-04-05T17:22:15.337Z] [SUCCESS] ✓ Navigated to: https://books.toscrape.com/
[2026-04-05T17:22:15.427Z] [INFO]   ⏱ Execution time: 408ms
[2026-04-05T17:22:15.535Z] [BLOCK] ▶ Executing: Paginate through all pages [No Scope]
[2026-04-05T17:22:15.536Z] [INFO]   📋 Config: {"paginationType":"button","nextButtonSelector":{"type":"css","value":"ul.pager li.next > a"},"maxPa...
[2026-04-05T17:22:15.536Z] [INFO]   🔧 Compiled: executor=executeLoopPagination, parent=root, branch=root, children=1, elseChildren=0
[2026-04-05T17:22:15.536Z] [INFO]   🧭 Runtime: scope=none, macros=none, vars(local=0, global=0, blueprint=0)
[2026-04-05T17:22:15.536Z] [INFO]   📄 Loop Pagination
[2026-04-05T17:22:15.536Z] [INFO]   🔄 Pagination type: button
[2026-04-05T17:22:15.536Z] [INFO]     Max pages: 50
[2026-04-05T17:22:15.536Z] [INFO]   ⏱ Delay between pages: 2000ms
[2026-04-05T17:22:15.536Z] [INFO]   👶 Children per page: 1
[2026-04-05T17:22:15.536Z] [INFO]   🎯 Next button selector: ul.pager li.next > a
[2026-04-05T17:22:15.536Z] [INFO]   📌 Selector type: css
[2026-04-05T17:22:15.536Z] [INFO]   ⚠ On no next button: stop
[2026-04-05T17:22:15.616Z] [INFO]   ━━━ Page 1 ━━━
[2026-04-05T17:22:15.617Z] [INFO]     👶 Executing 1 children on this page...
[2026-04-05T17:22:15.682Z] [BLOCK] ▶ Executing: Extract each book from the listing [No Scope]
[2026-04-05T17:22:15.682Z] [INFO]   📋 Config: {"selector":{"type":"css","value":"ol.row > li"},"maxIterations":100}
[2026-04-05T17:22:15.682Z] [INFO]   🔧 Compiled: executor=executeLoopElements, parent=e279d069-bc3a-4932-8046-2a989a1b2f33, branch=children, children=2, elseChildren=0
[2026-04-05T17:22:15.682Z] [INFO]   🧭 Runtime: scope=none, macros=none, vars(local=0, global=0, blueprint=0)
[2026-04-05T17:22:15.682Z] [INFO]   🔁 Loop Elements
[2026-04-05T17:22:15.682Z] [INFO]   🎯 Selector: ol.row > li
[2026-04-05T17:22:15.682Z] [INFO]   📌 Selector type: css
[2026-04-05T17:22:15.682Z] [INFO]   🔍 Has parent scope: No
[2026-04-05T17:22:15.757Z] [INFO]   📍 Loop start URL: https://books.toscrape.com/
[2026-04-05T17:22:15.823Z] [INFO]   📊 Found 20 elements
[2026-04-05T17:22:15.824Z] [INFO]   🔄 Max iterations: 100
[2026-04-05T17:22:15.824Z] [INFO]   ▶️ Will iterate: 20 times
[2026-04-05T17:22:15.824Z] [INFO]   👶 Children per iteration: 2
[2026-04-05T17:22:15.896Z] [INFO]   ━━━ Item 1/20 ━━━
[2026-04-05T17:22:15.896Z] [INFO]     🔍 Checking if element at index 0 exists...
[2026-04-05T17:22:15.988Z] [INFO]     ✓ Element exists (20 total elements, check attempt 1)
[2026-04-05T17:22:16.072Z] [BLOCK] ▶ Executing: Extract book metadata from listing [Scope: ol.row > li[0]]
[2026-04-05T17:22:16.072Z] [INFO]   📋 Config: {"fields":[{"key":"title","selector":{"type":"css","value":"h3 > a"},"attribute":"text","label":"Boo...
[2026-04-05T17:22:16.073Z] [INFO]   🔧 Compiled: executor=executeExtractScope, parent=a9495c68-fd4b-4a83-b795-98056484f611, branch=children, children=0, elseChildren=0
[2026-04-05T17:22:16.073Z] [INFO]   🧭 Runtime: scope=css:ol.row > li[0], macros=none, vars(local=0, global=0, blueprint=0)
[2026-04-05T17:22:16.073Z] [INFO]   📦 Extract Scope
[2026-04-05T17:22:16.073Z] [INFO]   📊 Fields to extract: 6
[2026-04-05T17:22:16.073Z] [INFO]   🔄 Reset scope: No
[2026-04-05T17:22:16.073Z] [INFO]   🔍 Has parent scope: Yes
[2026-04-05T17:22:16.073Z] [INFO]     1. title: selector="h3 > a" attr="text"
[2026-04-05T17:22:16.073Z] [INFO]     2. price: selector=".price_color" attr="text"
[2026-04-05T17:22:16.073Z] [INFO]        🔧 Transformers (1):
[2026-04-05T17:22:16.073Z] [INFO]     3. rating: selector="p.star-rating" attr="class"
[2026-04-05T17:22:16.073Z] [INFO]        🔧 Transformers (1):
[2026-04-05T17:22:16.073Z] [INFO]     4. availability: selector=".instock.availability" attr="text"
[2026-04-05T17:22:16.073Z] [INFO]        🔧 Transformers (1):
[2026-04-05T17:22:16.073Z] [INFO]     5. image_url: selector=".image_container > a > img" attr="src"
[2026-04-05T17:22:16.073Z] [INFO]        🔧 Transformers (1):
[2026-04-05T17:22:16.074Z] [INFO]     6. detail_url: selector="h3 > a" attr="href"
[2026-04-05T17:22:16.074Z] [INFO]        🔧 Transformers (1):
[2026-04-05T17:22:16.074Z] [INFO]   📤 Extraction fields being sent: title, price, rating, availability, image_url, detail_url
[2026-04-05T17:22:16.074Z] [INFO]      Field "price" transformers: [{"type":"trim"}]
[2026-04-05T17:22:16.074Z] [INFO]      Field "rating" transformers: [{"type":"replace","searchValue":"star-rating ","replaceValue":""}]
[2026-04-05T17:22:16.074Z] [INFO]      Field "availability" transformers: [{"type":"trim"}]
[2026-04-05T17:22:16.075Z] [INFO]      Field "image_url" transformers: [{"type":"replace","searchValue":"../../","replaceValue":"https://books.toscrape.com/"}]
[2026-04-05T17:22:16.075Z] [INFO]      Field "detail_url" transformers: [{"type":"replace","searchValue":"^","replaceValue":"https://books.toscrape.com/catalogue/"}]
[2026-04-05T17:22:16.075Z] [INFO]   📤 Sending extraction request...
[2026-04-05T17:22:16.163Z] [INFO]   📝 Extracted values:
[2026-04-05T17:22:16.163Z] [INFO]     title: "A Light in the ..."
[2026-04-05T17:22:16.163Z] [INFO]     price: "£51.77"
[2026-04-05T17:22:16.163Z] [INFO]     rating: "Three"
[2026-04-05T17:22:16.163Z] [INFO]     availability: "In stock"
[2026-04-05T17:22:16.164Z] [INFO]     image_url: "https://books.toscrape.com/media/cache/2c/da/2cdad..."
[2026-04-05T17:22:16.164Z] [INFO]     detail_url: "https://books.toscrape.com/catalogue/a-light-in-th..."
[2026-04-05T17:22:16.164Z] [SUCCESS]   ✓ Extracted row #1
[2026-04-05T17:22:16.164Z] [INFO]   📊 Total rows collected: 1
[2026-04-05T17:22:16.288Z] [INFO]   ⏱ Execution time: 215ms
[2026-04-05T17:22:16.388Z] [BLOCK] ▶ Executing: Open detail page for full extraction [Scope: ol.row > li[0]]
[2026-04-05T17:22:16.388Z] [INFO]   📋 Config: {"selector":{"type":"css","value":"h3 > a"},"openInNewTab":true,"delayAfter":1000}
[2026-04-05T17:22:16.388Z] [INFO]   🔧 Compiled: executor=executeClick, parent=a9495c68-fd4b-4a83-b795-98056484f611, branch=children, children=1, elseChildren=0
[2026-04-05T17:22:16.388Z] [INFO]   🧭 Runtime: scope=css:ol.row > li[0], macros=none, vars(local=0, global=0, blueprint=0)
[2026-04-05T17:22:16.388Z] [INFO]   🆕 Click will open new tab
[2026-04-05T17:22:16.389Z] [INFO]   🎯 Selector: h3 > a
[2026-04-05T17:22:16.389Z] [INFO]   📌 Selector type: css
[2026-04-05T17:22:16.389Z] [INFO]   🔍 Has scope: Yes
[2026-04-05T17:22:16.389Z] [INFO]   🖱 Sending click command...
[2026-04-05T17:22:16.593Z] [INFO]   ✨ New tab created: 2100541217
[2026-04-05T17:22:16.639Z] [SUCCESS] ✓ Clicked: h3 > a
[2026-04-05T17:22:16.639Z] [INFO]   ⏳ Waiting for new tab (max 5s)...
[2026-04-05T17:22:16.640Z] [INFO]   ↳ Switched to new tab (id: 2100541217)
[2026-04-05T17:22:16.640Z] [INFO]   ⏳ Waiting for content script in new tab...
[2026-04-05T17:22:17.198Z] [INFO]   👶 Executing 1 children in new tab...
[2026-04-05T17:22:17.295Z] [BLOCK] ▶ Executing: Extract book details from detail page [Scope: ol.row > li[0]]
[2026-04-05T17:22:17.295Z] [INFO]   📋 Config: {"fields":[{"key":"upc","selector":{"type":"css","value":"tr:nth-child(1) > td"},"attribute":"text",...
[2026-04-05T17:22:17.295Z] [INFO]   🔧 Compiled: executor=executeExtractScope, parent=64197c48-c36d-4b2a-875d-db0897cbfcf9, branch=children, children=0, elseChildren=0
[2026-04-05T17:22:17.295Z] [INFO]   🧭 Runtime: scope=css:ol.row > li[0], macros=none, vars(local=0, global=0, blueprint=0)
[2026-04-05T17:22:17.295Z] [INFO]   📦 Extract Scope
[2026-04-05T17:22:17.295Z] [INFO]   📊 Fields to extract: 2
[2026-04-05T17:22:17.295Z] [INFO]   🔄 Reset scope: No
[2026-04-05T17:22:17.295Z] [INFO]   🔍 Has parent scope: Yes
[2026-04-05T17:22:17.295Z] [INFO]     1. upc: selector="tr:nth-child(1) > td" attr="text"
[2026-04-05T17:22:17.295Z] [INFO]     2. description: selector="#product_description + p" attr="text"
[2026-04-05T17:22:17.296Z] [INFO]   📤 Extraction fields being sent: upc, description
[2026-04-05T17:22:17.296Z] [INFO]   📤 Sending extraction request...
[2026-04-05T17:22:17.411Z] [ERROR]   ❌ Error on attempt 1: Element not found: ol.row > li [0]
[2026-04-05T17:22:17.411Z] [INFO]   📍 Error stack: Error: Element not found: ol.row > li [0]
[2026-04-05T17:22:17.412Z] [ERROR]   💥 All 1 attempts failed. Stopping execution.
[2026-04-05T17:22:17.531Z] [ERROR]   ❌ Error in new tab execution: Element not found: ol.row > li [0]
[2026-04-05T17:22:17.531Z] [INFO]   🗑 Closing new tab 2100541217...
[2026-04-05T17:22:17.673Z] [ERROR] ❌ Target tab closed by user
[2026-04-05T17:22:17.786Z] [INFO]   ↳ Closed tab 2100541217
[2026-04-05T17:22:17.786Z] [INFO]   🔙 Switched back to tab 2100541214
[2026-04-05T17:22:17.867Z] [ERROR]   ❌ Error on attempt 1: Execution aborted
[2026-04-05T17:22:17.867Z] [INFO]   📍 Error stack: Error: Execution aborted
[2026-04-05T17:22:17.867Z] [ERROR]   💥 All 1 attempts failed. Stopping execution.
[2026-04-05T17:22:17.987Z] [WARN]     ⚠ Item 1 failed: Execution aborted
[2026-04-05T17:22:17.987Z] [INFO]     🔄 Attempting recovery for next iteration...
[2026-04-05T17:22:18.275Z] [ERROR]     ❌ Recovery failed: Execution aborted. Stopping loop.
[2026-04-05T17:22:18.275Z] [INFO]   ↩️ Restored return URL: null
[2026-04-05T17:22:18.275Z] [SUCCESS] ✓ Loop completed: 20 iterations
[2026-04-05T17:22:18.416Z] [INFO]   ⏱ Execution time: 2734ms
[2026-04-05T17:22:18.521Z] [INFO]     🔍 Looking for next button...
[2026-04-05T17:22:18.584Z] [ERROR]   ❌ Error on attempt 1: Execution aborted
[2026-04-05T17:22:18.584Z] [INFO]   📍 Error stack: Error: Execution aborted
[2026-04-05T17:22:18.584Z] [ERROR]   💥 All 1 attempts failed. Stopping execution.
[2026-04-05T17:22:18.619Z] [WARN] ⏹ Execution stopped by user
[2026-04-05T17:22:18.654Z] [INFO] 💾 Checkpoint saved for resume
[2026-04-05T17:22:18.654Z] [INFO]   📊 Loop state: {"e279d069-bc3a-4932-8046-2a989a1b2f33":0,"a9495c68-fd4b-4a83-b795-98056484f611":0}