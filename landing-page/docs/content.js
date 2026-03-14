// OctoGrab Documentation Content — injected via JS to avoid HTML file size limits
const main = document.getElementById('content-placeholder');
main.innerHTML = `

<!-- INTRODUCTION -->
<section id="introduction">
    <div class="hero-doc">
        <img src="octograb-logo.png" alt="OctoGrab" class="hero-doc-logo">
        <h1>OctoGrab Documentation</h1>
        <p class="hero-doc-sub">The complete guide to building web scraping automations with OctoGrab — a visual, no-code Chrome extension.</p>
    </div>
    <div class="callout callout-info">
        <div class="callout-title">Welcome!</div>
        <p>OctoGrab is a free, open-source Chrome extension that lets you extract structured data from any website using a visual blueprint builder. No coding required.</p>
    </div>
    <h2>What is OctoGrab?</h2>
    <p>OctoGrab is a browser-based web scraping tool that runs entirely in your Chrome sidebar. Instead of writing Python scripts or configuring complex APIs, you build <strong>blueprints</strong> — visual workflows made of drag-and-drop blocks. Each block represents an action: navigate to a URL, click a button, loop over elements, extract data, and more.</p>
    <p>When you run a blueprint, OctoGrab takes control of the active browser tab, executing each block in sequence. It navigates pages, clicks elements, waits for content to load, and collects data into a structured table that you can export as CSV, JSON, or Excel.</p>

    <!-- HOW IT WORKS DIAGRAM -->
    <div class="diagram">
        <div class="diagram-title">How OctoGrab Works</div>
        <div class="diagram-flow">
            <div class="diagram-node diagram-node-blue">
                <div class="diagram-node-icon">1</div>
                <div class="diagram-node-label">Build Blueprint</div>
                <div class="diagram-node-desc">Drag &amp; drop blocks</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-green">
                <div class="diagram-node-icon">2</div>
                <div class="diagram-node-label">Run</div>
                <div class="diagram-node-desc">Click Play</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-teal">
                <div class="diagram-node-icon">3</div>
                <div class="diagram-node-label">Extract</div>
                <div class="diagram-node-desc">Data fills table</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-pink">
                <div class="diagram-node-icon">4</div>
                <div class="diagram-node-label">Export</div>
                <div class="diagram-node-desc">CSV / JSON / Excel</div>
            </div>
        </div>
    </div>
    <h3>Key Features</h3>
    <ul>
        <li><strong>Visual Blueprint Builder</strong> — Drag-and-drop blocks to define scraping workflows</li>
        <li><strong>10 Block Types</strong> — Navigate, Click, Input, Wait, Scroll, Go Back, Loop Elements, Loop Pagination, Extract Data, If/Else</li>
        <li><strong>4 Selector Types</strong> — CSS, XPath, Text matching, ARIA Role</li>
        <li><strong>14 Data Transformers</strong> — Trim, uppercase, regex, parse numbers, currency conversion, and more</li>
        <li><strong>Static &amp; Formula Fields</strong> — Add constants, UUIDs, auto-increment IDs, timestamps, and computed values</li>
        <li><strong>3 Export Formats</strong> — CSV, JSON, Excel (.xlsx)</li>
        <li><strong>Pause &amp; Resume</strong> — Stop long-running scrapes and continue later</li>
        <li><strong>Import/Export Blueprints</strong> — Share and reuse blueprints as JSON files</li>
        <li><strong>100% Private</strong> — All data stays in your browser, no servers involved</li>
    </ul>
</section>

<!-- INSTALLATION -->
<section id="installation">
    <h2>Installation</h2>
    <h3>From Chrome Web Store</h3>
    <ol>
        <li>Visit the OctoGrab page on the Chrome Web Store</li>
        <li>Click <strong>"Add to Chrome"</strong></li>
        <li>Confirm the permissions dialog</li>
        <li>The OctoGrab icon appears in your extensions toolbar</li>
    </ol>
    <h3>Manual Installation (Developer Mode)</h3>
    <ol>
        <li>Download or clone the repository from <a href="https://github.com/ayoub-sahraoui/octograb" target="_blank">GitHub</a></li>
        <li>Run <code>npm install</code> and <code>npm run build</code></li>
        <li>Open <code>chrome://extensions</code> in Chrome</li>
        <li>Enable <strong>"Developer mode"</strong> (top right toggle)</li>
        <li>Click <strong>"Load unpacked"</strong></li>
        <li>Select the <code>.output/chrome-mv3</code> folder</li>
    </ol>
    <h3>Opening the Sidebar</h3>
    <p>Click the OctoGrab icon in the Chrome toolbar. The extension opens as a <strong>sidebar panel</strong> on the right side of your browser.</p>
    <div class="screenshot-placeholder-doc"><p>Extension Icon &amp; Sidebar Opening</p><span>Replace with screenshot of Chrome toolbar with OctoGrab icon highlighted</span></div>
    <div class="callout callout-tip">
        <div class="callout-title">Tip</div>
        <p>Pin the OctoGrab extension to your toolbar for quick access. Right-click the extension icon and select "Pin".</p>
    </div>
    <div class="screenshot-placeholder-doc screenshot-placeholder-doc-lg"><p>OctoGrab Extension Overview</p><span>Replace with screenshot showing the sidebar open next to a webpage</span></div>
</section>

<!-- QUICK START -->
<section id="quick-start">
    <h2>Quick Start Guide</h2>
    <p>Build your first scraping blueprint in under 5 minutes.</p>
    <div class="steps-doc">
        <div class="step-doc"><div class="step-doc-num">1</div><div class="step-doc-body"><h4>Create a New Blueprint</h4><p>Click the <strong>+</strong> button in the sidebar header. Enter a name and click <strong>Create Blueprint</strong>.</p></div></div>
        <div class="step-doc"><div class="step-doc-num">2</div><div class="step-doc-body"><h4>Add a Navigate Block</h4><p>Click <strong>"Add Block"</strong> → select <strong>Navigate</strong> → enter a URL (e.g., <code>https://books.toscrape.com</code>).</p></div></div>
        <div class="step-doc"><div class="step-doc-num">3</div><div class="step-doc-body"><h4>Add a Loop Elements Block</h4><p>Add <strong>Loop Elements</strong>. Set the selector to <code>article.product_pod</code> to match each book card.</p></div></div>
        <div class="step-doc"><div class="step-doc-num">4</div><div class="step-doc-body"><h4>Add Extract Data (Inside the Loop)</h4><p>Inside the loop, add <strong>Extract Data</strong>. Add fields: <code>title</code> → <code>h3 a</code> (text), <code>price</code> → <code>.price_color</code> (text).</p></div></div>
        <div class="step-doc"><div class="step-doc-num">5</div><div class="step-doc-body"><h4>Run the Blueprint</h4><p>Click <strong>Play</strong>. Watch data fill the results table in real time.</p></div></div>
        <div class="step-doc"><div class="step-doc-num">6</div><div class="step-doc-body"><h4>Export Your Data</h4><p>Click <strong>CSV</strong>, <strong>JSON</strong>, or <strong>Excel</strong> to download.</p></div></div>
    </div>
    <div class="screenshot-placeholder-doc"><p>Quick Start Result</p><span>Replace with screenshot of extracted data</span></div>
</section>

<!-- UI OVERVIEW -->
<section id="ui-overview">
    <h2>UI Overview</h2>
    <div class="screenshot-placeholder-doc screenshot-placeholder-doc-lg"><p>Full Sidebar UI</p><span>Replace with annotated screenshot of the full sidebar showing all areas</span></div>

    <!-- UI MAP DIAGRAM -->
    <div class="diagram">
        <div class="diagram-title">Sidebar Navigation Map</div>
        <div class="diagram-flow diagram-flow-wrap">
            <div class="diagram-node diagram-node-blue">
                <div class="diagram-node-icon"><i data-lucide="home"></i></div>
                <div class="diagram-node-label">Home</div>
                <div class="diagram-node-desc">Blueprint list</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-green">
                <div class="diagram-node-icon"><i data-lucide="wrench"></i></div>
                <div class="diagram-node-label">Builder</div>
                <div class="diagram-node-desc">Edit &amp; run</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-pink">
                <div class="diagram-node-icon"><i data-lucide="bar-chart-3"></i></div>
                <div class="diagram-node-label">Data</div>
                <div class="diagram-node-desc">View &amp; export</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-slate">
                <div class="diagram-node-icon"><i data-lucide="settings"></i></div>
                <div class="diagram-node-label">Settings</div>
                <div class="diagram-node-desc">Storage &amp; config</div>
            </div>
        </div>
    </div>

    <h3>Home Page</h3>
    <p>Lists all saved blueprints. Create new ones, import from JSON, or run/edit/delete existing blueprints.</p>
    <div class="screenshot-placeholder-doc"><p>Home Page</p><span>Replace with screenshot of the Home page with blueprint list</span></div>

    <h3>Blueprint Builder</h3>
    <p>The main workspace: <strong>Toolbar</strong> (Play, Pause, Stop, Save, Import, Export) | <strong>Block List</strong> (drag-and-drop reorder) | <strong>Block Config Panel</strong> (opens on click) | <strong>Execution Results Drawer</strong> (live data table + logs + export).</p>
    <div class="screenshot-placeholder-doc screenshot-placeholder-doc-lg"><p>Blueprint Builder</p><span>Replace with annotated screenshot of the builder showing toolbar, block list, and config panel</span></div>

    <h3>Extracted Data Page</h3>
    <p>Browse all extracted data from all runs. Filter, search, and export.</p>
    <div class="screenshot-placeholder-doc"><p>Extracted Data Table</p><span>Replace with screenshot of the data table with export buttons</span></div>

    <h3>Settings Page</h3>
    <p>Export/import the database, clear execution history, view storage statistics.</p>
    <div class="screenshot-placeholder-doc"><p>Settings Page</p><span>Replace with screenshot of the settings page</span></div>
</section>

<!-- BLUEPRINTS -->
<section id="blueprints">
    <h2>What Are Blueprints?</h2>
    <p>A <strong>blueprint</strong> is a saved automation workflow — a sequence of blocks executed top-to-bottom. Think of it as a recipe: each step tells OctoGrab what to do next.</p>
    <div class="code-block"><pre>Blueprint: "Amazon Product Scraper"
├── Navigate → https://amazon.com/s?k=laptop
├── Wait → selector visible: .s-result-item
├── Loop Pagination (max 5 pages)
│   ├── Loop Elements → .s-result-item
│   │   └── Extract Data → title, price, rating
│   └── [next page: .s-pagination-next]</pre></div>
    <p>Blueprints are stored locally in IndexedDB. Export as JSON to share or back up.</p>
</section>

<!-- BLOCKS -->
<section id="blocks">
    <h2>Understanding Blocks</h2>
    <p>Blocks are the building units. Each performs a single action. Some contain <strong>children</strong> (nested blocks).</p>

    <!-- BLOCK TYPES VISUAL -->
    <div class="block-visual-grid">
        <div class="block-visual-item bv-blue"><span class="bv-icon"><i data-lucide="globe"></i></span><span class="bv-label">Navigate</span></div>
        <div class="block-visual-item bv-orange"><span class="bv-icon"><i data-lucide="mouse-pointer-click"></i></span><span class="bv-label">Click</span></div>
        <div class="block-visual-item bv-purple"><span class="bv-icon"><i data-lucide="type"></i></span><span class="bv-label">Input</span></div>
        <div class="block-visual-item bv-yellow"><span class="bv-icon"><i data-lucide="clock"></i></span><span class="bv-label">Wait</span></div>
        <div class="block-visual-item bv-indigo"><span class="bv-icon"><i data-lucide="arrow-down"></i></span><span class="bv-label">Scroll</span></div>
        <div class="block-visual-item bv-slate"><span class="bv-icon"><i data-lucide="undo-2"></i></span><span class="bv-label">Go Back</span></div>
        <div class="block-visual-item bv-green"><span class="bv-icon"><i data-lucide="repeat"></i></span><span class="bv-label">Loop Elements</span></div>
        <div class="block-visual-item bv-teal"><span class="bv-icon"><i data-lucide="book-open"></i></span><span class="bv-label">Pagination</span></div>
        <div class="block-visual-item bv-pink"><span class="bv-icon"><i data-lucide="database"></i></span><span class="bv-label">Extract Data</span></div>
        <div class="block-visual-item bv-cyan"><span class="bv-icon"><i data-lucide="git-branch"></i></span><span class="bv-label">If / Else</span></div>
    </div>

    <h3>Block Types Overview</h3>
    <table class="ref-table">
        <thead><tr><th>Block</th><th>Type</th><th>Has Children</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><span class="badge badge-blue">Navigate</span></td><td><code>navigate</code></td><td>No</td><td>Go to a URL</td></tr>
            <tr><td><span class="badge badge-orange">Click</span></td><td><code>click</code></td><td>No</td><td>Click an element</td></tr>
            <tr><td><span class="badge badge-purple">Input</span></td><td><code>input</code></td><td>No</td><td>Type text into a field</td></tr>
            <tr><td><span class="badge badge-yellow">Wait</span></td><td><code>wait</code></td><td>No</td><td>Wait for a condition</td></tr>
            <tr><td><span class="badge badge-indigo">Scroll</span></td><td><code>scroll</code></td><td>No</td><td>Scroll the page</td></tr>
            <tr><td><span class="badge badge-slate">Go Back</span></td><td><code>go_back</code></td><td>No</td><td>Navigate back</td></tr>
            <tr><td><span class="badge badge-green">Loop Elements</span></td><td><code>loop_elements</code></td><td>Yes</td><td>Loop over matching elements</td></tr>
            <tr><td><span class="badge badge-teal">Loop Pagination</span></td><td><code>loop_pagination</code></td><td>Yes</td><td>Paginate through pages</td></tr>
            <tr><td><span class="badge badge-pink">Extract Data</span></td><td><code>extract_scope</code></td><td>Yes</td><td>Extract fields from the page</td></tr>
            <tr><td><span class="badge badge-cyan">If / Else</span></td><td><code>condition</code></td><td>Yes (Then+Else)</td><td>Conditional branching</td></tr>
        </tbody>
    </table>
    <h3>Common Block Properties</h3>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>label</code></td><td>string</td><td>Block type</td><td>Custom display label</td></tr>
            <tr><td><code>enabled</code></td><td>boolean</td><td><code>true</code></td><td>Disabled blocks are skipped</td></tr>
            <tr><td><code>description</code></td><td>string</td><td><code>""</code></td><td>Optional note</td></tr>
            <tr><td><code>onError</code></td><td>enum</td><td><code>"stop"</code></td><td><code>stop</code> | <code>skip</code> | <code>retry</code></td></tr>
            <tr><td><code>maxRetries</code></td><td>number</td><td><code>0</code></td><td>Retry count (when onError is retry)</td></tr>
            <tr><td><code>retryDelay</code></td><td>ms</td><td><code>0</code></td><td>Delay between retries</td></tr>
        </tbody>
    </table>
</section>

<!-- SELECTORS -->
<section id="selectors">
    <h2>Selectors</h2>
    <p>Selectors tell OctoGrab which element(s) to target. Four types are supported:</p>
    <div class="grid-2">
        <div class="info-card"><h4>CSS Selectors</h4><p>Standard CSS syntax. Most common.</p><div class="code-inline"><code>.product-card h2.title</code></div><div class="code-inline"><code>#main .price</code></div><div class="code-inline"><code>div[data-type="product"]</code></div></div>
        <div class="info-card"><h4>XPath Selectors</h4><p>More powerful. Can traverse parents and use text.</p><div class="code-inline"><code>//div[@class='product']//h2</code></div><div class="code-inline"><code>//a[contains(text(),'Next')]</code></div></div>
        <div class="info-card"><h4>Text Selectors</h4><p>Match elements by visible text content.</p><div class="code-inline"><code>Add to Cart</code></div><div class="code-inline"><code>Next Page</code></div></div>
        <div class="info-card"><h4>Role Selectors</h4><p>Match by ARIA role attribute.</p><div class="code-inline"><code>button</code></div><div class="code-inline"><code>link</code></div></div>
    </div>
    <h3>Selector Properties</h3>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>type</code></td><td><code>css</code> | <code>xpath</code> | <code>text</code> | <code>role</code></td><td>Selector strategy</td></tr>
            <tr><td><code>value</code></td><td>string</td><td>The selector expression</td></tr>
            <tr><td><code>timeout</code></td><td>ms</td><td>Wait time for element to appear</td></tr>
            <tr><td><code>waitForVisible</code></td><td>boolean</td><td>Wait until element is visible</td></tr>
        </tbody>
    </table>
    <div class="callout callout-tip"><div class="callout-title">Finding selectors</div><p>Right-click any element → <strong>Inspect</strong> → right-click in Elements panel → <strong>Copy &gt; Copy selector</strong> (CSS) or <strong>Copy &gt; Copy XPath</strong>.</p></div>
</section>

<!-- SCOPES -->
<section id="scopes">
    <h2>Scopes &amp; Context</h2>
    <p>A <strong>scope</strong> is the DOM context in which blocks operate. Loop Elements sets the scope to each matched element. Child blocks search within that element.</p>
    <div class="code-block"><pre>Loop Elements (.product-card)    ← scope = each .product-card
├── Extract Data                 ← searches within current card
│   ├── title → h3 (text)       ← h3 inside this card only
│   └── price → .price (text)   ← .price inside this card only</pre></div>
    <p>Extract Data also has <strong>Scope Selector</strong> (narrow further) and <strong>Reset Scope</strong> (go back to full document).</p>
</section>

<!-- ERROR HANDLING -->
<section id="error-handling">
    <h2>Error Handling</h2>
    <p>Every block has three error strategies:</p>
    <div class="grid-3">
        <div class="info-card"><h4><span class="badge badge-red">Stop</span></h4><p>Immediately stop the entire blueprint. Default. Use for critical steps.</p></div>
        <div class="info-card"><h4><span class="badge badge-yellow">Skip</span></h4><p>Skip this block and continue. Good for optional elements.</p></div>
        <div class="info-card"><h4><span class="badge badge-blue">Retry</span></h4><p>Retry up to <code>maxRetries</code> times with <code>retryDelay</code>. Good for flaky elements.</p></div>
    </div>
</section>

<!-- BLOCK: NAVIGATE -->
<section id="block-navigate">
    <h2><span class="badge badge-blue">Navigate</span> Block</h2>
    <p>Navigates the browser tab to a specified URL.</p>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>url</code></td><td>string</td><td>Yes</td><td>The URL to navigate to (must include <code>https://</code>)</td></tr>
            <tr><td><code>waitUntil</code></td><td>enum</td><td>No</td><td><code>load</code> | <code>domcontentloaded</code> | <code>networkidle</code> | <code>timeout</code></td></tr>
            <tr><td><code>behavior</code></td><td>enum</td><td>No</td><td><code>same_tab</code> (default) | <code>new_tab</code> | <code>replace</code></td></tr>
            <tr><td><code>timeout</code></td><td>ms</td><td>No</td><td>Maximum time to wait for navigation</td></tr>
        </tbody>
    </table>
    <div class="callout callout-warning"><div class="callout-title">Important</div><p>Always include the full URL with protocol (<code>https://</code>). Relative URLs are not supported.</p></div>
    <div class="screenshot-placeholder-doc"><p>Navigate Block Config</p><span>Replace with screenshot of the Navigate block configuration panel</span></div>
</section>

<!-- BLOCK: CLICK -->
<section id="block-click">
    <h2><span class="badge badge-orange">Click</span> Block</h2>
    <p>Clicks on a page element matched by a selector.</p>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>selector</code></td><td>Selector</td><td>Yes</td><td>The element to click</td></tr>
            <tr><td><code>delayBefore</code></td><td>ms</td><td>No</td><td>Wait before clicking</td></tr>
            <tr><td><code>delayAfter</code></td><td>ms</td><td>No</td><td>Wait after clicking</td></tr>
            <tr><td><code>openInNewTab</code></td><td>boolean</td><td>No</td><td>Open link in new tab</td></tr>
            <tr><td><code>waitAfterClick</code></td><td>ms</td><td>No</td><td>Additional wait after click completes</td></tr>
        </tbody>
    </table>
    <h3>Common Use Cases</h3>
    <ul>
        <li>Clicking "Load More" buttons</li>
        <li>Clicking into product detail pages</li>
        <li>Closing popups or cookie banners</li>
        <li>Clicking tabs or filters</li>
    </ul>
    <div class="screenshot-placeholder-doc"><p>Click Block Config</p><span>Replace with screenshot of the Click block configuration panel</span></div>
</section>

<!-- BLOCK: INPUT -->
<section id="block-input">
    <h2><span class="badge badge-purple">Input</span> Block</h2>
    <p>Types text into an input field, textarea, or contenteditable element.</p>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>selector</code></td><td>Selector</td><td>Yes</td><td>The input element</td></tr>
            <tr><td><code>value</code></td><td>string</td><td>Yes</td><td>Text to type</td></tr>
            <tr><td><code>delayBefore</code></td><td>ms</td><td>No</td><td>Wait before typing</td></tr>
            <tr><td><code>delayAfter</code></td><td>ms</td><td>No</td><td>Wait after typing</td></tr>
        </tbody>
    </table>
    <h3>Example: Search &amp; Extract</h3>
    <div class="code-block"><pre>Navigate → https://example.com
Input → #search-box, value: "laptop"
Click → #search-button
Wait → selector visible: .results
Loop Elements → .result-item
└── Extract Data → title, price, url</pre></div>
</section>

<!-- BLOCK: WAIT -->
<section id="block-wait">
    <h2><span class="badge badge-yellow">Wait</span> Block</h2>
    <p>Pauses execution until a condition is met. Essential for dynamic pages.</p>
    <h3>Wait Types</h3>
    <table class="ref-table">
        <thead><tr><th>Type</th><th>Description</th><th>Config</th></tr></thead>
        <tbody>
            <tr><td><code>timeout</code></td><td>Wait a fixed time</td><td><code>timeout</code> (ms)</td></tr>
            <tr><td><code>selector_visible</code></td><td>Wait for element to become visible</td><td><code>selector</code>, <code>timeout</code></td></tr>
            <tr><td><code>selector_hidden</code></td><td>Wait for element to disappear</td><td><code>selector</code>, <code>timeout</code></td></tr>
            <tr><td><code>network_idle</code></td><td>Wait for network to settle</td><td><code>idleTime</code> (ms)</td></tr>
            <tr><td><code>dom_content_loaded</code></td><td>Wait for DOM ready</td><td><code>timeout</code></td></tr>
        </tbody>
    </table>
    <div class="callout callout-warning"><div class="callout-title">Avoid fixed timeouts</div><p>Using <code>selector_visible</code> is more reliable — it adapts to actual page load speed.</p></div>
</section>

<!-- BLOCK: SCROLL -->
<section id="block-scroll">
    <h2><span class="badge badge-indigo">Scroll</span> Block</h2>
    <p>Scrolls the page or an element. Essential for infinite scroll and lazy-loaded content.</p>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>target</code></td><td><code>window</code> | <code>element</code></td><td>Yes</td><td>What to scroll</td></tr>
            <tr><td><code>behavior</code></td><td>enum</td><td>Yes</td><td><code>bottom</code> | <code>top</code> | <code>pixels</code> | <code>element_into_view</code></td></tr>
            <tr><td><code>pixels</code></td><td>number</td><td>If pixels</td><td>Number of pixels to scroll</td></tr>
            <tr><td><code>selector</code></td><td>Selector</td><td>If element</td><td>Container or target element</td></tr>
            <tr><td><code>smooth</code></td><td>boolean</td><td>No</td><td>Smooth scroll animation</td></tr>
            <tr><td><code>delayAfter</code></td><td>ms</td><td>No</td><td>Wait after scrolling</td></tr>
        </tbody>
    </table>
</section>

<!-- BLOCK: GO BACK -->
<section id="block-go-back">
    <h2><span class="badge badge-slate">Go Back</span> Block</h2>
    <p>Navigates back in browser history. Essential for "click detail → extract → go back" patterns.</p>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody><tr><td><code>steps</code></td><td>number</td><td>No</td><td>Pages to go back (default: 1)</td></tr></tbody>
    </table>
    <h3>Typical Pattern</h3>
    <div class="code-block"><pre>Loop Elements → .product-link
├── Click → a.product-link     (goes to detail page)
├── Wait → selector visible: .detail
├── Extract Data → name, description, price
└── Go Back                     (returns to list)</pre></div>
</section>

<!-- BLOCK: LOOP ELEMENTS -->
<section id="block-loop-elements">
    <h2><span class="badge badge-green">Loop Elements</span> Block</h2>
    <p>Iterates over all elements matching a selector. Each iteration sets the <strong>scope</strong> and runs all children within that element.</p>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>selector</code></td><td>Selector</td><td>Yes</td><td>CSS/XPath matching multiple elements</td></tr>
            <tr><td><code>maxIterations</code></td><td>number</td><td>No</td><td>Max elements to process (0 = all)</td></tr>
        </tbody>
    </table>
    <h3>How It Works</h3>
    <ol>
        <li>Finds all matching elements</li>
        <li>For each element: sets it as scope → runs all child blocks</li>
        <li>After all elements, continues to next sibling block</li>
    </ol>
    <div class="callout callout-tip"><div class="callout-title">Tip</div><p>Set <code>maxIterations: 3</code> during development for faster testing. Remove it for full runs.</p></div>

    <!-- LOOP SCOPE DIAGRAM -->
    <div class="diagram">
        <div class="diagram-title">How Loop Scope Works</div>
        <div class="diagram-scope">
            <div class="diagram-scope-outer">
                <div class="diagram-scope-label">Page DOM</div>
                <div class="diagram-scope-items">
                    <div class="diagram-scope-item diagram-scope-active">
                        <div class="diagram-scope-item-label">Item 1 <span class="diagram-scope-tag">&#8592; current scope</span></div>
                        <div class="diagram-scope-children">
                            <span>title: h3 (text)</span>
                            <span>price: .price (text)</span>
                        </div>
                    </div>
                    <div class="diagram-scope-item">
                        <div class="diagram-scope-item-label">Item 2</div>
                    </div>
                    <div class="diagram-scope-item">
                        <div class="diagram-scope-item-label">Item 3</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- BLOCK: LOOP PAGINATION -->
<section id="block-loop-pagination">
    <h2><span class="badge badge-teal">Loop Pagination</span> Block</h2>
    <p>Handles multi-page navigation automatically. Executes children on each page, then goes to next.</p>
    <h3>Pagination Types</h3>
    <div class="grid-2">
        <div class="info-card"><h4>Button Pagination</h4><p>Clicks a "Next" button each time. Most common. Config: <code>nextButtonSelector</code></p></div>
        <div class="info-card"><h4>Scroll Pagination</h4><p>Scrolls to load more (infinite scroll). Config: <code>scrollTarget</code>, <code>scrollStrategy</code></p></div>
    </div>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>paginationType</code></td><td><code>button</code> | <code>scroll</code></td><td>Yes</td><td>Pagination method</td></tr>
            <tr><td><code>nextButtonSelector</code></td><td>Selector</td><td>If button</td><td>"Next Page" button</td></tr>
            <tr><td><code>maxPages</code></td><td>number</td><td>No</td><td>Safety limit for pages</td></tr>
            <tr><td><code>delayBetweenPages</code></td><td>ms</td><td>No</td><td>Delay after each page change</td></tr>
            <tr><td><code>onNoNextButton</code></td><td><code>stop</code> | <code>error</code></td><td>No</td><td>Behavior on last page</td></tr>
            <tr><td><code>scrollTarget</code></td><td><code>window</code> | <code>element</code></td><td>If scroll</td><td>What to scroll</td></tr>
            <tr><td><code>scrollStrategy</code></td><td>enum</td><td>If scroll</td><td><code>fixed_amount</code> | <code>scroll_to_bottom</code> | <code>scroll_to_last_item</code></td></tr>
            <tr><td><code>itemSelector</code></td><td>Selector</td><td>If scroll</td><td>Items to monitor for new content</td></tr>
        </tbody>
    </table>
    <h3>Example</h3>
    <div class="code-block"><pre>Loop Pagination (max: 10, next: li.next a)
├── Loop Elements → .product-card
│   └── Extract Data → title, price
└── [auto-clicks li.next a after each page]</pre></div>
</section>

<!-- BLOCK: EXTRACT -->
<section id="block-extract">
    <h2><span class="badge badge-pink">Extract Data</span> Block</h2>
    <p>The core extraction block. Extracts one row per execution. Usually placed inside a Loop Elements block.</p>

    <!-- EXTRACTION FLOW DIAGRAM -->
    <div class="diagram">
        <div class="diagram-title">Extraction Data Flow</div>
        <div class="diagram-flow">
            <div class="diagram-node diagram-node-blue">
                <div class="diagram-node-icon"><i data-lucide="search"></i></div>
                <div class="diagram-node-label">Select</div>
                <div class="diagram-node-desc">Find element</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-green">
                <div class="diagram-node-icon"><i data-lucide="file-text"></i></div>
                <div class="diagram-node-label">Read</div>
                <div class="diagram-node-desc">Get attribute</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-purple">
                <div class="diagram-node-icon"><i data-lucide="wand-sparkles"></i></div>
                <div class="diagram-node-label">Transform</div>
                <div class="diagram-node-desc">Clean data</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-pink">
                <div class="diagram-node-icon"><i data-lucide="database"></i></div>
                <div class="diagram-node-label">Store</div>
                <div class="diagram-node-desc">Add to table</div>
            </div>
        </div>
    </div>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>fields</code></td><td>ExtractionField[]</td><td>Yes</td><td>List of fields to extract</td></tr>
            <tr><td><code>scopeSelector</code></td><td>Selector</td><td>No</td><td>Narrow scope to a container</td></tr>
            <tr><td><code>resetScope</code></td><td>boolean</td><td>No</td><td>Reset to full document scope</td></tr>
        </tbody>
    </table>
</section>

<!-- BLOCK: CONDITION -->
<section id="block-condition">
    <h2><span class="badge badge-cyan">If / Else</span> Block</h2>
    <p>Conditional branching. Executes <strong>Then</strong> or <strong>Else</strong> children based on a check.</p>
    <h3>Condition Checks</h3>
    <table class="ref-table">
        <thead><tr><th>Check</th><th>Description</th><th>Value?</th></tr></thead>
        <tbody>
            <tr><td><code>exists</code></td><td>Element exists in DOM</td><td>No</td></tr>
            <tr><td><code>not_exists</code></td><td>Element does NOT exist</td><td>No</td></tr>
            <tr><td><code>visible</code></td><td>Element is visible</td><td>No</td></tr>
            <tr><td><code>hidden</code></td><td>Element is hidden</td><td>No</td></tr>
            <tr><td><code>text_contains</code></td><td>Text contains value</td><td>String</td></tr>
            <tr><td><code>text_equals</code></td><td>Text exactly matches</td><td>String</td></tr>
            <tr><td><code>text_regex</code></td><td>Text matches regex</td><td>Pattern</td></tr>
            <tr><td><code>count_equals</code></td><td>Element count equals N</td><td>Number</td></tr>
            <tr><td><code>count_greater_than</code></td><td>Element count &gt; N</td><td>Number</td></tr>
        </tbody>
    </table>
    <div class="code-block"><pre>If / Else → .out-of-stock, check: not_exists
├── Then: Extract Data → title, price, status="In Stock"
└── Else: (skip this product)</pre></div>
</section>

<!-- EXTRACTION FIELDS -->
<section id="extraction-fields">
    <h2>Extraction Fields</h2>
    <p>Each field in Extract Data defines one column. Two modes:</p>
    <div class="grid-2">
        <div class="info-card"><h4>Extracted (default)</h4><p>Uses a <strong>selector + attribute</strong> to pull data from the page.</p></div>
        <div class="info-card"><h4>Static</h4><p>Generates values locally: constant, UUID, random number, date, auto-increment.</p></div>
    </div>
    <table class="ref-table">
        <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>key</code></td><td>string</td><td>Yes</td><td>Column name (e.g., <code>title</code>)</td></tr>
            <tr><td><code>selector</code></td><td>Selector</td><td>Extracted</td><td>Element to extract from</td></tr>
            <tr><td><code>attribute</code></td><td>string</td><td>Extracted</td><td><code>text</code>, <code>href</code>, <code>src</code>, etc.</td></tr>
            <tr><td><code>transformers</code></td><td>array</td><td>No</td><td>Post-processing pipeline</td></tr>
            <tr><td><code>required</code></td><td>boolean</td><td>No</td><td>Skip row if empty</td></tr>
            <tr><td><code>defaultValue</code></td><td>any</td><td>No</td><td>Fallback when empty</td></tr>
            <tr><td><code>multiple</code></td><td>boolean</td><td>No</td><td>Extract all matches as array</td></tr>
            <tr><td><code>formula</code></td><td>string</td><td>No</td><td>Post-processing math formula</td></tr>
        </tbody>
    </table>
</section>

<!-- STATIC FIELDS -->
<section id="static-fields">
    <h2>Static Fields</h2>
    <p>Generate values without reading from the page. Switch field mode to <strong>"Static"</strong>.</p>
    <table class="ref-table">
        <thead><tr><th>Type</th><th>Description</th><th>Config</th><th>Example</th></tr></thead>
        <tbody>
            <tr><td><code>constant</code></td><td>Fixed value for every row</td><td><code>staticValue</code></td><td><code>"electronics"</code></td></tr>
            <tr><td><code>uuid</code></td><td>Unique UUID v4 per row</td><td>None</td><td><code>"a1b2c3d4-..."</code></td></tr>
            <tr><td><code>random_number</code></td><td>Random integer in range</td><td><code>staticMin</code>, <code>staticMax</code></td><td><code>42</code></td></tr>
            <tr><td><code>date</code></td><td>Current date/time</td><td><code>staticDateFormat</code></td><td><code>"2026-03-13"</code></td></tr>
            <tr><td><code>auto_increment</code></td><td>Counter per row</td><td><code>staticStartFrom</code></td><td><code>1, 2, 3...</code></td></tr>
        </tbody>
    </table>
</section>

<!-- FORMULAS -->
<section id="formulas">
    <h2>Formulas</h2>
    <p>Compute values from other fields using <code>{{fieldKey}}</code> references. Evaluated after all other fields.</p>
    <h3>Supported</h3>
    <ul>
        <li><strong>Arithmetic</strong>: <code>+</code> <code>-</code> <code>*</code> <code>/</code></li>
        <li><strong>Parentheses</strong>: <code>(</code> <code>)</code></li>
        <li><strong>Functions</strong>: <code>round()</code>, <code>floor()</code>, <code>ceil()</code>, <code>abs()</code>, <code>min()</code>, <code>max()</code>, <code>pow()</code>, <code>sqrt()</code></li>
    </ul>
    <h3>Examples</h3>
    <table class="ref-table">
        <thead><tr><th>Formula</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>{{price}} * 1.2</code></td><td>Add 20% markup</td></tr>
            <tr><td><code>{{price}} * {{qty}}</code></td><td>Calculate total</td></tr>
            <tr><td><code>round({{price}} * 0.85)</code></td><td>15% discount, rounded</td></tr>
            <tr><td><code>({{original}} - {{sale}}) / {{original}} * 100</code></td><td>Discount %</td></tr>
        </tbody>
    </table>
</section>

<!-- TRANSFORMERS -->
<section id="transformers">
    <h2>Transformers</h2>
    <p>Post-processing steps applied to extracted values in order (pipeline).</p>
    <table class="ref-table">
        <thead><tr><th>Transformer</th><th>Description</th><th>Config</th></tr></thead>
        <tbody>
            <tr><td><code>trim</code></td><td>Remove whitespace</td><td>—</td></tr>
            <tr><td><code>uppercase</code></td><td>UPPERCASE</td><td>—</td></tr>
            <tr><td><code>lowercase</code></td><td>lowercase</td><td>—</td></tr>
            <tr><td><code>capitalize</code></td><td>First letter capital</td><td>—</td></tr>
            <tr><td><code>title_case</code></td><td>Each Word Capitalized</td><td>—</td></tr>
            <tr><td><code>replace</code></td><td>Find &amp; replace</td><td><code>searchValue</code>, <code>replaceValue</code>, <code>global</code></td></tr>
            <tr><td><code>regex</code></td><td>Regex extract or replace</td><td><code>pattern</code>, <code>flags</code>, <code>replacement</code> | <code>extractGroup</code></td></tr>
            <tr><td><code>parse_number</code></td><td>Parse to number</td><td>—</td></tr>
            <tr><td><code>parse_date</code></td><td>Reformat date</td><td><code>inputFormat</code>, <code>outputFormat</code></td></tr>
            <tr><td><code>parse_json</code></td><td>Parse JSON string</td><td>—</td></tr>
            <tr><td><code>split</code></td><td>Split by delimiter</td><td><code>delimiter</code>, <code>index</code></td></tr>
            <tr><td><code>currency_convert</code></td><td>Convert currencies</td><td><code>fromCurrency</code>, <code>toCurrency</code>, <code>fixedRate</code></td></tr>
        </tbody>
    </table>
    <h3>Pipeline Example</h3>
    <div class="code-block"><pre>Field: price
├── Selector: .price-tag → "$1,299.99"
├── Transformer 1: regex ([\\d.,]+) → "1,299.99"
├── Transformer 2: replace ("," → "") → "1299.99"
└── Transformer 3: parse_number → 1299.99</pre></div>
</section>

<!-- ATTRIBUTES -->
<section id="attributes">
    <h2>Attributes</h2>
    <p>Determines what value to extract from the selected element.</p>
    <table class="ref-table">
        <thead><tr><th>Attribute</th><th>Description</th><th>Example Output</th></tr></thead>
        <tbody>
            <tr><td><code>text</code></td><td>Visible text content</td><td><code>"MacBook Pro"</code></td></tr>
            <tr><td><code>innerHTML</code></td><td>Inner HTML markup</td><td><code>"&lt;strong&gt;Bold&lt;/strong&gt;"</code></td></tr>
            <tr><td><code>outerHTML</code></td><td>Full element HTML</td><td><code>"&lt;a href=...&gt;Link&lt;/a&gt;"</code></td></tr>
            <tr><td><code>href</code></td><td>Link URL</td><td><code>"https://..."</code></td></tr>
            <tr><td><code>src</code></td><td>Image/media source</td><td><code>"https://.../photo.jpg"</code></td></tr>
            <tr><td><code>value</code></td><td>Input element value</td><td><code>"user@email.com"</code></td></tr>
            <tr><td><code>class</code></td><td>CSS classes</td><td><code>"btn btn-primary"</code></td></tr>
            <tr><td><code>id</code></td><td>Element ID</td><td><code>"main-title"</code></td></tr>
            <tr><td><code>data-*</code></td><td>Data attributes</td><td><code>"product-123"</code></td></tr>
            <tr><td><code>custom</code></td><td>Any HTML attribute</td><td>Enter attribute name</td></tr>
        </tbody>
    </table>
</section>

<!-- TUTORIAL: SIMPLE -->
<section id="tut-simple">
    <div class="screenshot-placeholder-doc screenshot-placeholder-doc-lg"><p>Tutorial: Final Result Preview</p><span>Replace with screenshot showing the completed scrape with data table filled</span></div>
    <h2>Tutorial: Scrape a Product List</h2>
    <p>Scrape book titles and prices from <a href="https://books.toscrape.com" target="_blank">books.toscrape.com</a>.</p>
    <div class="steps-doc">
        <div class="step-doc"><div class="step-doc-num">1</div><div class="step-doc-body"><h4>Create Blueprint</h4><p>Click + → Name "Book Scraper" → Create</p></div></div>
        <div class="step-doc"><div class="step-doc-num">2</div><div class="step-doc-body"><h4>Navigate</h4><p>URL: <code>https://books.toscrape.com</code></p></div></div>
        <div class="step-doc"><div class="step-doc-num">3</div><div class="step-doc-body"><h4>Loop Elements</h4><p>Selector: <code>article.product_pod</code></p></div></div>
        <div class="step-doc"><div class="step-doc-num">4</div><div class="step-doc-body"><h4>Extract Data (inside loop)</h4><p><code>title</code> → <code>h3 a</code> (text), <code>price</code> → <code>.price_color</code> (text), <code>rating</code> → <code>p.star-rating</code> (class), <code>link</code> → <code>h3 a</code> (href)</p></div></div>
        <div class="step-doc"><div class="step-doc-num">5</div><div class="step-doc-body"><h4>Run &amp; Export</h4><p>Click Play → 20 rows → Download CSV</p></div></div>
    </div>
    <div class="screenshot-placeholder-doc"><p>Book Scraper Results</p><span>Replace with screenshot of the extracted books data table</span></div>
</section>

<!-- TUTORIAL: DETAIL -->
<section id="tut-detail">
    <h2>Tutorial: Detail Page Scraping</h2>
    <p>Click into each item, extract from the detail page, then go back to the list.</p>
    <div class="code-block"><pre>Blueprint: "Book Detail Scraper"
├── Navigate → https://books.toscrape.com
├── Loop Elements → article.product_pod (max: 5)
│   ├── Click → h3 a
│   ├── Wait → selector visible: .product_page
│   ├── Extract Data
│   │   ├── title → h1 (text)
│   │   ├── price → .price_color (text)
│   │   ├── description → #product_description ~ p (text)
│   │   └── upc → table tr:first-child td (text)
│   └── Go Back</pre></div>
    <div class="callout callout-tip"><div class="callout-title">Pro Tip</div><p>Set <code>maxIterations: 3</code> while building. Remove it for full runs.</p></div>
</section>

<!-- TUTORIAL: PAGINATION -->
<section id="tut-pagination">
    <h2>Tutorial: Multi-Page Scraping</h2>
    <p>Wrap extraction inside a Pagination Loop to auto-navigate pages.</p>
    <div class="code-block"><pre>Blueprint: "All Books Scraper"
├── Navigate → https://books.toscrape.com
├── Loop Pagination (max: 50, next: li.next a)
│   └── Loop Elements → article.product_pod
│       └── Extract Data → title, price</pre></div>
    <p>The loop: executes children → clicks "Next" → repeats until maxPages or no next button.</p>
</section>

<!-- TUTORIAL: SEARCH -->
<section id="tut-search">
    <h2>Tutorial: Search &amp; Extract</h2>
    <div class="code-block"><pre>Blueprint: "Search Extractor"
├── Navigate → https://example-shop.com
├── Input → #search-input, value: "wireless headphones"
├── Click → #search-button
├── Wait → selector visible: .search-results
├── Loop Elements → .result-item
│   └── Extract Data → name, price, rating, url</pre></div>
</section>

<!-- EXECUTION -->
<section id="execution">
    <h2>Execution Engine</h2>

    <!-- EXECUTION LIFECYCLE DIAGRAM -->
    <div class="diagram">
        <div class="diagram-title">Execution Lifecycle</div>
        <div class="diagram-flow diagram-flow-wrap">
            <div class="diagram-node diagram-node-slate">
                <div class="diagram-node-icon"><i data-lucide="circle"></i></div>
                <div class="diagram-node-label">Idle</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-green">
                <div class="diagram-node-icon"><i data-lucide="play"></i></div>
                <div class="diagram-node-label">Running</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="arrow-left-right"></i></div>
            <div class="diagram-node diagram-node-yellow">
                <div class="diagram-node-icon"><i data-lucide="pause"></i></div>
                <div class="diagram-node-label">Paused</div>
            </div>
            <div class="diagram-arrow"><i data-lucide="chevron-right"></i></div>
            <div class="diagram-node diagram-node-teal">
                <div class="diagram-node-icon"><i data-lucide="check-circle"></i></div>
                <div class="diagram-node-label">Done</div>
            </div>
        </div>
    </div>
    <p>When you click Play, blocks process sequentially:</p>
    <ol>
        <li><strong>Init</strong> — Identifies target tab, resets state</li>
        <li><strong>Execute</strong> — Each block runs in order</li>
        <li><strong>Scope</strong> — Loops set scope for children</li>
        <li><strong>Errors</strong> — Block's <code>onError</code> strategy applies</li>
        <li><strong>Data</strong> — Extract blocks push rows in real-time</li>
        <li><strong>Done</strong> — Status updates, data ready for export</li>
    </ol>
    <h3>States</h3>
    <table class="ref-table">
        <thead><tr><th>Status</th><th>Description</th></tr></thead>
        <tbody>
            <tr><td><code>idle</code></td><td>Nothing running</td></tr>
            <tr><td><code>running</code></td><td>Actively executing</td></tr>
            <tr><td><code>paused</code></td><td>Paused (can resume)</td></tr>
            <tr><td><code>done</code></td><td>Finished successfully</td></tr>
            <tr><td><code>error</code></td><td>Stopped due to error</td></tr>
        </tbody>
    </table>
</section>

<!-- PAUSE & RESUME -->
<section id="pause-resume">
    <h2>Pause &amp; Resume</h2>
    <ul>
        <li><strong>Pause</strong> — Current block finishes, then stops</li>
        <li><strong>Resume</strong> — Click Play again to continue</li>
        <li><strong>Stop</strong> — Abort entirely; data up to this point is preserved</li>
    </ul>
    <div class="callout callout-info"><div class="callout-title">Data is always preserved</div><p>Even on stop or error, all extracted rows are saved and exportable.</p></div>
</section>

<!-- IMPORT / EXPORT -->
<section id="import-export">
    <h2>Import / Export Blueprints</h2>
    <h3>Export</h3>
    <p>Click <strong>Export</strong> in the builder toolbar → downloads a <code>.json</code> file with all blocks and config.</p>
    <h3>Import</h3>
    <p>Click <strong>Import</strong> → select a <code>.json</code> file → blueprint is loaded and added to your list.</p>
    <div class="callout callout-tip"><div class="callout-title">Sharing</div><p>Export and share JSON files with your team. Anyone with OctoGrab can import them.</p></div>
</section>

<!-- DATA EXPORT -->
<section id="data-export">
    <h2>Data Export Formats</h2>
    <table class="ref-table">
        <thead><tr><th>Format</th><th>Extension</th><th>Best For</th></tr></thead>
        <tbody>
            <tr><td><strong>CSV</strong></td><td>.csv</td><td>Spreadsheets, databases, general use</td></tr>
            <tr><td><strong>JSON</strong></td><td>.json</td><td>APIs, programming, data pipelines</td></tr>
            <tr><td><strong>Excel</strong></td><td>.xlsx</td><td>Rich spreadsheets, sharing with non-technical users</td></tr>
        </tbody>
    </table>
    <p>Export from: <strong>Execution Results Drawer</strong> (after running) or <strong>Extracted Data Page</strong> (all accumulated data).</p>
</section>

<!-- TIPS -->
<section id="tips">
    <h2>Tips &amp; Best Practices</h2>
    <h3>Building Blueprints</h3>
    <ul>
        <li><strong>Start small</strong> — Build one block at a time. Use <code>maxIterations: 3</code> on loops during dev.</li>
        <li><strong>Use descriptive labels</strong> — "Click product link" is better than "Click".</li>
        <li><strong>Save often</strong> — Blueprints are stored locally.</li>
        <li><strong>Read the logs</strong> — The execution log shows exactly what happened. Use it for debugging.</li>
    </ul>
    <h3>Selectors</h3>
    <ul>
        <li><strong>Be specific</strong> — <code>.product-card .title</code> beats <code>h3</code></li>
        <li><strong>Avoid fragile selectors</strong> — Random IDs and deep nesting break easily</li>
        <li><strong>Test in DevTools</strong> — Run <code>document.querySelectorAll('your-selector')</code> in the console to verify</li>
        <li><strong>Use XPath for text</strong> — <code>//a[contains(text(),'Next')]</code> when CSS can't match text</li>
    </ul>
    <h3>Performance</h3>
    <ul>
        <li><strong>Add delays wisely</strong> — Too short = errors; too long = slow. Use <code>selector_visible</code> waits.</li>
        <li><strong>Set maxPages</strong> — Always set a limit on pagination to prevent infinite loops.</li>
        <li><strong>Use onError: skip</strong> — For optional fields that may not exist on every page.</li>
        <li><strong>Export during runs</strong> — You can export data at any time, even while running.</li>
    </ul>
    <h3>Troubleshooting</h3>
    <ul>
        <li><strong>Element not found</strong> — Check selector in DevTools. The element may be inside an iframe or dynamically loaded.</li>
        <li><strong>Empty values</strong> — Verify the attribute type. Text content uses <code>text</code>, links use <code>href</code>.</li>
        <li><strong>Wrong data</strong> — Check scope. If inside a loop, selectors are relative to the loop element.</li>
        <li><strong>Page not loading</strong> — Add a Wait block with <code>selector_visible</code> after Navigate or Click.</li>
    </ul>
</section>
`;
